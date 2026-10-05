import { useEffect, useRef, useState } from 'react'
import { api, inr, inrShort, fmtDate, riskLabel } from '../api.js'
import { Icon, CropIcon } from '../icons.jsx'
import { PriceChart, CompareBars, Timeline, Scenarios, Gauge } from '../charts.jsx'

const SOILS = [['alluvial', 'Alluvial'], ['black', 'Black (regur)'], ['red', 'Red'], ['sandy', 'Sandy'], ['loamy', 'Loamy'], ['clay', 'Clay']]
const WATER = [['low', 'Low (rain-fed)'], ['medium', 'Medium (borewell)'], ['high', 'High (canal / assured)']]

export default function Analyze({ latest, setLatest, pick }) {
  const [f, setF] = useState({ location: '', area: 2, soil: 'loamy', water: 'medium', budget: 100000 })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(pick)
  const resultsRef = useRef(null)

  useEffect(() => { api('/farm').then(r => r.farm && setF({ location: r.farm.location, area: r.farm.area, soil: r.farm.soil, water: r.farm.water, budget: r.farm.budget })).catch(() => {}) }, [])
  useEffect(() => { if (pick) setSel(pick) }, [pick])
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function run(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await api('/farm', 'PUT', { ...f, area: +f.area, budget: +f.budget })
      const r = await api('/analyze', 'POST')
      setLatest(r); setSel(r.crops[0].crop)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const crops = latest?.crops || []
  const chosen = crops.find(c => c.crop === sel) || crops[0]

  return (
    <>
      <header className="page-head"><div><h1>Crop analysis</h1><p>Enter your farm details. We compare crops and build a plan.</p></div></header>
      <form className="card form" onSubmit={run}>
        <label>Location (village / district)<input required value={f.location} onChange={set('location')} placeholder="Warangal, Telangana" /></label>
        <label>Land area (acres)<input required type="number" min="0.1" max="10000" step="0.1" value={f.area} onChange={set('area')} /></label>
        <label>Soil type<select value={f.soil} onChange={set('soil')}>{SOILS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Water availability<select value={f.water} onChange={set('water')}>{WATER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Cultivation budget (₹)<input required type="number" min="1000" step="1000" value={f.budget} onChange={set('budget')} /><small className="hint">{inr(f.budget || 0)}</small></label>
        <button className="primary" disabled={busy}>{busy ? <><span className="spinner sm" /> Analysing…</> : <><Icon name="Sparkles" size={16} />Compare crops</>}</button>
        {err && <div className="error wide" role="alert">{err}</div>}
      </form>

      {busy && <div className="card loading"><div className="spinner" /><div><strong>Running AI models</strong><p className="muted">Fetching weather, predicting yield, price and disease risk for 14 crops…</p></div></div>}

      {!busy && crops.length > 0 && <div ref={resultsRef}>
        <Hero c={crops[0]} budget={latest.budget} weather={latest.weather} />
        <section className="card">
          <h3>Crop comparison <small>click a crop to see its plan</small></h3>
          <CompareBars crops={crops} selected={chosen?.crop} onSelect={setSel} />
          <div className="scroll"><table className="cmp"><thead><tr><th>#</th><th>Crop</th><th>Sow</th><th>Yield</th><th>Cost</th><th>Revenue</th><th>Profit</th><th>ROI</th><th>Water</th><th>Risk</th></tr></thead>
            <tbody>{crops.map(c => (
              <tr key={c.crop} className={chosen?.crop === c.crop ? 'sel' : ''} onClick={() => setSel(c.crop)}>
                <td>{c.rank}</td>
                <td><span className="cell-crop"><CropIcon crop={c.crop} size={26} /><strong>{c.crop}</strong></span>{c.rank === 1 && <span className="badge">Best</span>}{!c.withinBudget && <span className="badge warn">Over budget</span>}</td>
                <td>{c.waitDays <= 7 ? <span className="badge">Now</span> : <span className="muted">{c.waitDays}d</span>}</td>
                <td>{c.totalYield} q</td><td>{inrShort(c.cost)}</td><td>{inrShort(c.revenue)}</td>
                <td className={c.profit >= 0 ? 'up' : 'down'}>{inrShort(c.profit)}</td><td>{c.roi}%</td>
                <td>{Math.round(c.waterAvailRatio * 100)}%</td><td><span className={'risk r' + riskLabel(c.overallRisk)[1]}>{riskLabel(c.overallRisk)[0]}</span></td></tr>))}</tbody></table></div>
        </section>
        {chosen && <Plan c={chosen} />}
      </div>}
    </>
  )
}

function Hero({ c, budget, weather }) {
  return (
    <section className="hero tall">
      <CropIcon crop={c.crop} size={64} />
      <div className="hero-body">
        <span className="eyebrow">Best choice for your farm</span>
        <h2>{c.crop}<span className="pill">{c.season}</span></h2>
        <ul className="reasons">{c.reasons.map(r => <li key={r}><Icon name="Check" size={15} stroke={2.4} />{r}</li>)}</ul>
        <div className="kpis"><div><b>{inrShort(c.profit)}</b><span>Expected profit</span></div><div><b>{c.roi}%</b><span>Return on cost</span></div><div><b>{c.totalYield} q</b><span>Total yield</span></div><div><b>{inrShort(c.cost)}</b><span>Investment</span></div></div>
        {weather && <p className="note">Based on {weather.temp}°C, {weather.humidity}% humidity and ~{weather.rainfall} mm/month rain ({weather.source}). Budget {inrShort(budget)}.</p>}
      </div>
    </section>
  )
}

function Plan({ c }) {
  const p = c.plan
  const byMonth = {}
  p.irrigation.forEach(i => { const k = new Date(i.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); (byMonth[k] = byMonth[k] || []).push(i) })
  return (
    <section className="card plan">
      <div className="plan-head"><h3>Farming plan: {c.crop} <small>{c.durationDays} days · {c.yieldPerAcre} q/acre expected</small></h3><button className="ghost noprint" onClick={() => window.print()}><Icon name="Printer" size={16} />Print / save PDF</button></div>
      <Timeline c={c} />
      <div className="grid2 gap">
        <div className="sub"><h4>Price forecast <small>₹ per quintal, next 18 months</small></h4><PriceChart data={c.priceForecast} harvestIdx={c.harvestIdx} sellIdx={c.sellIdx} breakEven={c.breakEvenPrice} />
          <p className="muted">Your break-even price is {inr(c.breakEvenPrice)}/q. Selling in {c.bestSellMonth} at ~{inr(c.bestSellPrice)}/q gives a {Math.round((1 - c.breakEvenPrice / c.bestSellPrice) * 100)}% safety margin.</p></div>
        <div className="sub"><h4>Profit outlook</h4><Scenarios s={c.scenarios} />
          <h4>Risk</h4><Gauge value={c.overallRisk} label={riskLabel(c.overallRisk)[0] + ' overall risk'} /><Gauge value={c.diseaseRisk} label="Disease pressure" /><Gauge value={Math.max(0, 1 - c.waterAvailRatio)} label="Water shortfall" /></div>
      </div>
      <div className="grid2 gap">
        <div className="sub"><h4><Icon name="Droplets" size={16} />Irrigation calendar <small>{p.irrigation.length} irrigations · ~{p.irrigation[0].waterMm} mm each</small></h4>
          {Object.entries(byMonth).map(([m, list]) => (<div key={m} className="cal"><b>{m}</b><span>{list.map(i => <i key={i.date}>{new Date(i.date).getDate()}</i>)}</span></div>))}
          <h4><Icon name="FlaskConical" size={16} />Fertilizer schedule</h4>
          <ul className="steps">{p.fertilizer.map(x => <li key={x.stage}><b>{x.stage}</b> <small>Day {x.day} · {fmtDate(x.date)}</small><span>{x.advice}</span></li>)}</ul></div>
        <div className="sub"><h4><Icon name="ShieldCheck" size={16} />Disease prevention</h4><ul className="bul">{p.prevention.map(x => <li key={x}>{x}</li>)}</ul>
          <h4><Icon name="Bug" size={16} />Watch for</h4><div className="chips">{c.diseases.map(d => <span key={d}>{d}</span>)}</div></div>
      </div>
    </section>
  )
}
