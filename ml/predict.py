"""Reads a JSON command from stdin, prints JSON to stdout.
  farm dict                       -> ranked crop analysis
  {"_cmd": "market_all"}          -> price table + forecasts
  {"_cmd": "model_info"}          -> training metrics
"""
import sys, os, json, datetime, warnings
warnings.filterwarnings("ignore")
import numpy as np, joblib
from crops import CROPS, CROP_NAMES, WATER_MM, PRICE
import train

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def load():
    if not all(os.path.exists(train.P(n)) for n in ("yield", "price", "disease")):
        train.train_all()
    return joblib.load(train.P("yield")), joblib.load(train.P("price")), joblib.load(train.P("disease"))


def next_sow(months, today):
    best = None
    for m in months:
        y = today.year if m >= today.month else today.year + 1
        d = datetime.date(y, m, 1)
        if m == today.month and y == today.year:
            d = today
        if best is None or d < best:
            best = d
    return best, (best - today).days


def price_curve(pm, ci, today, n=18):
    ms = [(today.month - 1 + k) % 12 + 1 for k in range(n)]
    preds = pm.predict([train.price_features(ci, mm, 60 + k) for k, mm in enumerate(ms)])
    out = []
    for k, mm in enumerate(ms):
        yy = today.year + (today.month - 1 + k) // 12
        out.append({"month": MONTHS[mm - 1], "label": f"{MONTHS[mm - 1]} {str(yy)[2:]}", "k": k, "price": round(float(preds[k]))})
    return out


def season_label(m):
    return "Kharif" if m in (5, 6, 7, 8) else "Rabi" if m in (10, 11, 12, 1) else "Zaid"


def analyse(farm):
    ym, pm, dm = load()
    today = datetime.date.today()
    soil = farm.get("soil", "loamy").lower()
    area = max(float(farm.get("area", 1)), 0.1)
    budget = float(farm.get("budget", 1e9)); water = farm.get("water", "medium")
    temp = float(farm.get("temp", 27)); hum = float(farm.get("humidity", 65)); rain_month = float(farm.get("rainfall", 80))
    rows = []
    for ci, name in enumerate(CROP_NAMES):
        c = CROPS[name]
        sow_date, wait = next_sow(c["sow"], today)
        harvest = sow_date + datetime.timedelta(days=c["days"])
        wr = min(1.6, (WATER_MM[water] + rain_month * c["days"] / 30 * 0.6) / c["water"])
        suit = c["soils"].get(soil, .5)
        t_dev = train.temp_penalty(temp, *c["temp"])
        y_pa = float(ym.predict([train.yield_features(ci, suit, wr, t_dev, hum)])[0])
        yield_q = y_pa * area; cost = c["cost"] * area
        curve = price_curve(pm, ci, today)
        hk = max(0, min((harvest.year - today.year) * 12 + harvest.month - today.month, len(curve) - 1))
        peak, amp, trend, storable = PRICE[name]
        window = curve[hk: hk + (5 if storable else 1)] or [curve[-1]]
        best = max(window, key=lambda r: r["price"]); price_h = curve[hk]["price"]
        revenue = yield_q * best["price"]; profit = revenue - cost
        pr = dm.predict_proba([train.disease_features(c["disease"], hum, t_dev, rain_month, suit)])[0]
        risk_dis = float(pr[0] * .15 + pr[1] * .45 + pr[2] * .8) if len(pr) == 3 else .4
        risk_water = max(0, 1 - wr)
        risk_price = amp * (1.2 if not storable else .6) + (0.0 if suit > .5 else .1)
        risk = round(float(min(1, .4 * risk_dis + .35 * risk_water + .25 * min(1, risk_price * 1.6))), 2)
        roi = profit / cost if cost else 0
        be = cost / yield_q if yield_q else 0
        within = cost <= budget
        scen = {"pessimistic": round(revenue * .8 * .85 - cost * 1.1), "expected": round(profit), "optimistic": round(revenue * 1.15 * 1.1 - cost * .95)}
        rows.append(dict(
            crop=name, season=season_label(sow_date.month), soilSuitability=round(suit, 2), yieldPerAcre=round(y_pa, 1), totalYield=round(yield_q, 1),
            cost=round(cost), revenue=round(revenue), profit=round(profit), roi=round(roi * 100, 1), breakEvenPrice=round(be),
            waterNeedMm=c["water"], waterAvailRatio=round(wr, 2), diseaseRisk=round(risk_dis, 2), overallRisk=risk,
            withinBudget=within, durationDays=c["days"], sowDate=sow_date.isoformat(), waitDays=wait, inSeason=wait <= 45,
            harvestDate=harvest.isoformat(), priceAtHarvest=price_h, bestSellMonth=best["label"], bestSellPrice=best["price"],
            priceNow=curve[0]["price"], priceForecast=curve, harvestIdx=hk, sellIdx=best["k"], storable=storable, scenarios=scen,
            diseases=c["diseases"], plan=build_plan(c, sow_date, harvest, area, wr, best["label"], risk_dis, hum),
            _roi=roi, _risk=risk, _suit=suit, _wef=min(1, 700 / c["water"])))
    maxp = max(1, max(r["profit"] for r in rows))
    for r in rows:
        sc = .42 * max(-1, r["profit"] / maxp) + .2 * np.tanh(r["_roi"] / 1.5) + .18 * (1 - r["_risk"]) + .12 * r["_wef"] * r["_suit"]
        sc -= .25 * min(1, r["waitDays"] / 120)
        if r["profit"] <= 0: sc -= .5
        r["score"] = round(float(sc), 3)
    # affordable + profitable + plantable-soon first, then by score
    rows.sort(key=lambda r: (not r["withinBudget"], r["profit"] <= 0, r["waitDays"] > 120, -r["score"]))
    rows = rows[:6]
    for i, r in enumerate(rows):
        r["rank"] = i + 1
        r["reasons"] = reasons(r, soil, water, i == 0)
        for k in ("_roi", "_risk", "_suit", "_wef"): r.pop(k)
    return {"recommended": rows[0]["crop"], "crops": rows, "generatedOn": today.isoformat(), "budget": budget}


def reasons(r, soil, water, top):
    out = []
    out.append(f"{soil.title()} soil is a {'strong' if r['soilSuitability'] >= .8 else 'workable' if r['soilSuitability'] >= .55 else 'weak'} match ({round(r['soilSuitability'] * 100)}% suitability)")
    out.append("Sowing window is open now" if r["waitDays"] <= 7 else f"Sowing window opens in {r['waitDays']} days ({r['season']} season)")
    out.append(f"Expected profit ₹{r['profit']:,} ({r['roi']}% return on cost)")
    out.append("Water supply covers the crop's needs" if r["waterAvailRatio"] >= 1 else f"Water supply covers only {round(r['waterAvailRatio'] * 100)}% of need, plan irrigation carefully")
    out.append(f"{'Low' if r['diseaseRisk'] < .3 else 'Moderate' if r['diseaseRisk'] < .55 else 'High'} disease pressure expected")
    if not r["withinBudget"]: out.append("Needs more budget than you entered")
    return out[:5]


def build_plan(c, sow, harvest, area, wr, sell_label, dis_risk, hum):
    n_irr = max(1, c["days"] // c["irrigation_days"])
    mm_per = round(min(c["water"], c["water"] * min(wr, 1)) / n_irr)
    d = lambda k: (sow + datetime.timedelta(days=k)).isoformat()
    irrigation = [{"day": k * c["irrigation_days"], "date": d(k * c["irrigation_days"]), "waterMm": mm_per} for k in range(n_irr)]
    fert = [{"stage": s, "day": day, "date": d(day), "advice": a} for s, day, a in c["fert"]]
    prevent = [f"Scout fields weekly for {c['diseases'][0].lower()} and {c['diseases'][-1].lower()}",
               "Use certified, treated seed and rotate crops each season",
               "Avoid irrigating late in the day to reduce leaf wetness"]
    if dis_risk > .45 or hum > 75: prevent.append("High humidity expected: apply a preventive bio-fungicide spray every 10-14 days")
    if wr < .8: prevent.append("Water is limited: use mulching and drip/furrow irrigation, irrigate at critical stages first")
    return dict(sowing=dict(date=sow.isoformat()), irrigation=irrigation, fertilizer=fert, prevention=prevent,
                harvest=dict(date=harvest.isoformat(), days=c["days"]), sell=dict(month=sell_label))


def market_all():
    ym, pm, dm = load(); today = datetime.date.today(); out = []
    for ci, n in enumerate(CROP_NAMES):
        cur = price_curve(pm, ci, today, 18)
        now, nxt = cur[0]["price"], cur[2]["price"]
        peak = max(cur[:12], key=lambda r: r["price"]); low = min(cur[:12], key=lambda r: r["price"])
        change = round((nxt - now) / now * 100, 1)
        out.append({"crop": n, "price": now, "change": change, "forecast": cur[:12], "storable": PRICE[n][3],
                    "peakMonth": peak["label"], "peakPrice": peak["price"], "lowMonth": low["label"], "lowPrice": low["price"],
                    "demand": "High demand" if change > 3 else ("Moderate demand" if change >= -3 else "Weak demand"),
                    "advice": "Prices falling, avoid holding stock" if change < -3 else "Prices rising, consider holding" if change > 3 else "Stable, sell as needed"})
    return out


if __name__ == "__main__":
    farm = json.load(sys.stdin)
    cmd = farm.get("_cmd")
    if cmd == "market_all": print(json.dumps(market_all()))
    elif cmd == "model_info":
        if not os.path.exists(train.METRICS): load()
        print(open(train.METRICS).read())
    else: print(json.dumps(analyse(farm)))
