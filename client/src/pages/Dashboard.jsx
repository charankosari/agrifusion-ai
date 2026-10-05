import { useEffect, useState } from 'react'
import { api, inr, inrShort, fmtDate, riskLabel, isFresh } from '../api.js'
import { Spark } from '../charts.jsx'
import { Icon, CropIcon } from '../icons.jsx'

const Delta = ({ v }) => <span className={'delta ' + (v >= 0 ? 'up' : 'down')}><Icon name={v >= 0 ? 'ArrowUpRight' : 'ArrowDownRight'} size={14} stroke={2.2} />{Math.abs(v)}%</span>
const wIcon = d => (d.rain > 5 ? 'CloudRain' : d.rain > 0.5 ? 'CloudSunRain' : 'Sun')

export default function Dashboard({ user, latest, setLatest, goAnalyze, open }) {
  const [weather, setWeather] = useState(null)
  const [market, setMarket] = useState([])
  const [history, setHistory] = useState([])
  const [farm, setFarm] = useState(null)

  useEffect(() => {
    api('/weather').then(r => setWeather(r.weather)).catch(() => {})
    api('/farm').then(r => setFarm(r.farm)).catch(() => {})
    api('/market').then(r => setMarket(r.crops)).catch(() => {})
    api('/analyses').then(r => { setHistory(r.analyses); const f = r.analyses.find(a => isFresh(a.result)); if (!latest && f) setLatest({ ...f.result, weather: f.weather }) }).catch(() => {})
  }, [])

  const top = isFresh(latest) ? latest.crops[0] : null
  const hour = new Date().getHours()
  const hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const stats = [
    { icon: 'Thermometer', label: 'Temperature', value: weather ? `${weather.temp}°C` : '-', note: weather ? weather.source : 'Save farm details first' },
    { icon: 'Droplets', label: 'Humidity', value: weather ? `${weather.humidity}%` : '-', note: weather ? (weather.humidity > 80 ? 'High disease pressure' : weather.humidity < 40 ? 'Dry air, check irrigation' : 'Comfortable range') : 'Waiting for data' },
    { icon: 'CloudRain', label: 'Rain chance', value: weather ? `${weather.rainChance}%` : '-', note: weather ? `About ${weather.rainfall} mm this month` : 'Next 7 days' },
    { icon: 'Sprout', label: 'Best crop now', value: top ? top.crop : '-', note: top ? `${riskLabel(top.overallRisk)[0]} risk, ${inrShort(top.profit)} profit` : 'Run a crop analysis' },
  ]
  return (
    <>
      <header className="page-head"><div><h1>{hi}, {user.name.split(' ')[0]}</h1><p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}{farm ? ` · ${farm.location} · ${farm.area} acre ${farm.soil} soil` : ''}</p></div>
        <button className="primary" onClick={goAnalyze}>{top ? 'Re-analyse my farm' : 'Analyse my farm'}<Icon name="ArrowRight" size={16} /></button></header>

      {top ? (
        <section className="hero">
          <CropIcon crop={top.crop} size={64} />
          <div className="hero-body">
            <span className="eyebrow">Recommended for your farm</span>
            <h2>{top.crop}<span className="pill">{top.season}</span></h2>
            <p>{top.reasons[0]}. {top.reasons[1]}.</p>
            <div className="kpis"><div><b>{inrShort(top.profit)}</b><span>Expected profit</span></div><div><b>{top.roi}%</b><span>Return on cost</span></div><div><b>{top.totalYield} q</b><span>Total yield</span></div><div><b>{top.bestSellMonth}</b><span>Best time to sell</span></div></div>
          </div>
          <button className="primary" onClick={() => open(top.crop)}>View plan<Icon name="ArrowRight" size={16} /></button>
        </section>
      ) : (
        <section className="hero">
          <span className="crop-ic" style={{ width: 64, height: 64, color: 'var(--g)', background: 'var(--gt)' }}><Icon name="Sprout" size={32} /></span>
          <div className="hero-body"><h2>Find your most profitable crop</h2><p>Enter your location, soil, water and budget. We compare 14 crops and build a full farming plan.</p></div>
          <button className="primary" onClick={goAnalyze}>Get started<Icon name="ArrowRight" size={16} /></button>
        </section>
      )}

      <section className="grid4">{stats.map(s => (
        <div key={s.label} className="stat"><span className="stat-ic"><Icon name={s.icon} size={18} /></span><small>{s.label}</small><strong>{s.value}</strong><em>{s.note}</em></div>))}
      </section>

      {weather?.daily?.length > 0 && (
        <section className="card"><div className="card-h"><h3>7-day forecast</h3><small>{farm?.location}</small></div>
          <div className="week">{weather.daily.map(d => (
            <div key={d.date} className="day"><small>{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}</small><Icon name={wIcon(d)} size={22} /><b>{Math.round(d.max)}°</b><em>{Math.round(d.min)}°</em><i>{d.rain.toFixed(1)} mm</i></div>))}</div></section>
      )}

      <section className="grid2">
        <div className="card">
          <div className="card-h"><h3>Market prices</h3><small>₹ per quintal</small></div>
          <div className="scroll"><table><thead><tr><th>Crop</th><th>Price</th><th>2-month</th><th>Trend</th></tr></thead>
            <tbody>{market.slice(0, 7).map(m => (
              <tr key={m.crop}><td><span className="cell-crop"><CropIcon crop={m.crop} size={26} />{m.crop}</span></td><td>{inr(m.price)}</td>
                <td><Delta v={m.change} /></td><td><Spark data={m.forecast} color={m.change >= 0 ? 'var(--g)' : 'var(--r)'} /></td></tr>))}</tbody></table></div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Recent analyses</h3></div>
          {history.length === 0 && <p className="muted">No analyses yet. Run your first one.</p>}
          <ul className="history">{history.map(h => (
            <li key={h.id}><button onClick={() => { if (isFresh(h.result)) { setLatest({ ...h.result, weather: h.weather }); open(h.recommended) } else goAnalyze() }}>
              <CropIcon crop={h.recommended} size={36} /><span className="h-t"><strong>{h.recommended}</strong><small>{h.farm.location} · {h.farm.area} acre · {h.farm.soil}</small></span><small>{isFresh(h.result) ? fmtDate(h.createdAt) : 'Re-run'}</small></button></li>))}</ul>
        </div>
      </section>
    </>
  )
}
