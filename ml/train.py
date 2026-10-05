"""Train yield, price and disease-risk models on synthetic data derived from agronomic reference values.
Writes versioned model files + metrics (R2 / MAE / MAPE / accuracy on a held-out split)."""
import os, json, numpy as np, joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_absolute_percentage_error, accuracy_score
from crops import CROPS, CROP_NAMES, PRICE

V = "v3"
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(HERE, "models")
os.makedirs(MODEL_DIR, exist_ok=True)
P = lambda n: os.path.join(MODEL_DIR, f"{n}_{V}.joblib")
METRICS = os.path.join(MODEL_DIR, f"metrics_{V}.json")


def temp_penalty(t, lo, hi):
    return max(lo - t, t - hi, 0)


def yield_features(ci, soil_suit, water_ratio, temp_dev, humidity):
    return [ci, soil_suit, water_ratio, temp_dev, humidity]


def disease_features(susc, humidity, temp_dev, rain, soil_suit):
    return [susc, humidity, temp_dev, rain, soil_suit]


def disease_score(susc, hum, rain, soil):
    return susc * (0.4 + max(0, hum - 55) / 55 + rain / 500) * (0.8 + (1 - soil) * .5)


def price_features(ci, month, t):
    return [ci, np.sin(2 * np.pi * month / 12), np.cos(2 * np.pi * month / 12), t]


def train_yield(n=20000, seed=7):
    rng = np.random.default_rng(seed); X, y = [], []
    for _ in range(n):
        ci = int(rng.integers(len(CROP_NAMES))); c = CROPS[CROP_NAMES[ci]]
        suit = float(rng.uniform(.2, 1)); wr = float(rng.uniform(.3, 1.6)); td = float(rng.uniform(0, 12)); hum = float(rng.uniform(40, 95))
        f = c["yield_q"] * (0.35 + 0.75 * suit) * min(1.0, wr) ** 0.8 * (1 - min(.5, 0.035 * td))
        f *= 1 - max(0, hum - 85) * 0.004 * c["disease"] - max(0, wr - 1.3) * .1
        f *= rng.normal(1, .05)
        X.append(yield_features(ci, suit, wr, td, hum)); y.append(max(f, 0))
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=seed)
    m = RandomForestRegressor(n_estimators=80, min_samples_leaf=8, random_state=seed, n_jobs=-1).fit(Xtr, ytr)
    pred = m.predict(Xte)
    joblib.dump(m, P("yield"))
    return {"name": "Crop yield (Random Forest)", "samples": n, "r2": round(r2_score(yte, pred), 3), "mae": f"{mean_absolute_error(yte, pred):.2f} q/acre",
            "features": ["crop", "soil suitability", "water availability", "temperature deviation", "humidity"]}


def train_price(seed=11):
    rng = np.random.default_rng(seed); X, y = [], []
    for ci, name in enumerate(CROP_NAMES):
        peak, amp, trend, _ = PRICE[name]; base = CROPS[name]["price"]
        for rep in range(6):
            for t in range(120):
                month = (t % 12) + 1
                p = base * (1 + trend) ** (t / 12 - 5) * (1 + amp * np.cos(2 * np.pi * (month - peak) / 12)) * rng.normal(1, .04)
                X.append(price_features(ci, month, t)); y.append(p)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=seed)
    m = GradientBoostingRegressor(n_estimators=200, max_depth=3, random_state=seed).fit(Xtr, ytr)
    joblib.dump(m, P("price"))
    return {"name": "Market price (Gradient Boosting)", "samples": len(X), "r2": round(r2_score(yte, m.predict(Xte)), 3),
            "mae": f"{mean_absolute_percentage_error(yte, m.predict(Xte)) * 100:.1f}% MAPE", "features": ["crop", "month (seasonality)", "price trend"]}


def train_disease(n=15000, seed=5):
    rng = np.random.default_rng(seed); X, y = [], []
    for _ in range(n):
        susc = float(rng.uniform(.2, .85)); hum = float(rng.uniform(35, 98)); td = float(rng.uniform(0, 12)); rain = float(rng.uniform(0, 250)); soil = float(rng.uniform(.2, 1))
        sc = disease_score(susc, hum, rain, soil) + rng.normal(0, .04)
        X.append(disease_features(susc, hum, td, rain, soil)); y.append(0 if sc < .32 else 1 if sc < .62 else 2)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=seed)
    m = RandomForestClassifier(n_estimators=80, min_samples_leaf=8, random_state=seed, n_jobs=-1).fit(Xtr, ytr)
    joblib.dump(m, P("disease"))
    return {"name": "Disease risk (Random Forest classifier)", "samples": n, "r2": None, "mae": f"{accuracy_score(yte, m.predict(Xte)) * 100:.1f}% accuracy",
            "features": ["crop susceptibility", "humidity", "temperature deviation", "rainfall", "soil suitability"]}


def train_all():
    out = {"models": [train_yield(), train_price(), train_disease()], "crops": len(CROP_NAMES),
           "note": "Trained on synthetic data generated from agronomic reference values; metrics are on a held-out synthetic split, not real-world accuracy."}
    json.dump(out, open(METRICS, "w"), indent=1)
    return out


if __name__ == "__main__":
    r = train_all()
    for m in r["models"]: print(m["name"], "| R2:", m["r2"], "|", m["mae"])
    print("models trained ->", MODEL_DIR)
