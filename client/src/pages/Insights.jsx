import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Icon } from '../icons.jsx'

const STEPS = [['ClipboardList', 'Farm inputs', 'Location, land area, soil type, water availability, budget'], ['CloudSun', 'Weather data', 'Live temperature, humidity and rainfall forecast'], ['Cpu', 'ML models', 'Yield, price and disease-risk predictions for each crop'], ['Scale', 'Ranking', 'Profit, ROI, risk, water efficiency and sowing season'], ['ListChecks', 'Farming plan', 'Sowing, irrigation, fertilizer, disease control, harvest and selling time']]

export default function Insights() {
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { api('/model-info').then(setInfo).catch(e => setErr(e.status === 404 ? 'This page needs the updated backend. In the terminal running the server, press Ctrl+C, then run npm start again.' : e.message)) }, [])
  return (
    <>
      <header className="page-head"><div><h1>AI insights</h1><p>How AgriFusion makes its recommendations</p></div></header>
      <section className="card"><h3>Decision pipeline</h3><div className="pipe">{STEPS.map(([i, t, d], n) => (<div key={t} className="pipe-step"><span className="pipe-ic"><Icon name={i} size={20} /></span><b>{n + 1}. {t}</b><small>{d}</small></div>))}</div></section>
      {err && <div className="error">{err}</div>}
      {info && <>
        <section className="grid3 models">{info.models.map(m => (
          <div key={m.name} className="card model"><h3>{m.name}</h3>
            <div className="big">{m.r2 != null ? m.r2 : m.mae.split(' ')[0]}<small>{m.r2 != null ? 'R² score' : 'accuracy'}</small></div>
            <p className="muted">{m.r2 != null ? `Error: ${m.mae}` : 'Low / medium / high classes'} · {m.samples.toLocaleString()} training samples</p>
            <div className="chips">{m.features.map(x => <span key={x}>{x}</span>)}</div></div>))}</section>
        <section className="card"><h3>About the data</h3><p className="muted">{info.note} The knowledge base covers {info.crops} crops with typical Indian yields, costs, prices, seasons and diseases. To improve accuracy, replace the synthetic generator in <code>ml/train.py</code> with real datasets (crop yield records, Agmarknet prices).</p></section>
      </>}
    </>
  )
}
