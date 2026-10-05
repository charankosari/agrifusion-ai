import { fmtDate, inr, inrShort } from './api.js'
import { Icon, CropIcon } from './icons.jsx'

export function Spark({ data, color = '#2f8f5b', w = 90, h = 28 }) {
  const v = data.map(d => d.price), lo = Math.min(...v), r = Math.max(...v) - lo || 1
  const pts = v.map((p, i) => `${(i / (v.length - 1)) * w},${h - 3 - ((p - lo) / r) * (h - 6)}`).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} /></svg>
}

// Large price forecast chart with y axis, harvest + sell markers and optional break-even line
export function PriceChart({ data, harvestIdx, sellIdx, breakEven }) {
  const W = 600, H = 240, L = 52, R = 14, T = 20, B = 34
  const v = data.map(d => d.price)
  let lo = Math.min(...v, breakEven || Infinity), hi = Math.max(...v)
  const pad = (hi - lo) * 0.12 || 50; lo -= pad; hi += pad
  const x = i => L + (i / (data.length - 1)) * (W - L - R)
  const y = p => T + (1 - (p - lo) / (hi - lo)) * (H - T - B)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.price)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - B} L${x(0)},${H - B} Z`
  const ticks = [0, 1, 2, 3].map(k => lo + ((hi - lo) * k) / 3)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Price forecast chart">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--g)" stopOpacity=".28" /><stop offset="1" stopColor="var(--g)" stopOpacity="0" /></linearGradient></defs>
      {ticks.map(t => (<g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">{Math.round(t)}</text></g>))}
      {data.map((d, i) => i % 2 === 0 && <text key={i} x={x(i)} y={H - 12} textAnchor="middle" className="ax">{d.label}</text>)}
      <path d={area} fill="url(#pg)" />
      <path d={line} fill="none" stroke="var(--g)" strokeWidth="2.6" strokeLinejoin="round" />
      {breakEven > 0 && <g><line x1={L} x2={W - R} y1={y(breakEven)} y2={y(breakEven)} stroke="var(--r)" strokeDasharray="5 4" /><text x={W - R} y={y(breakEven) - 5} textAnchor="end" className="ax" fill="var(--r)">Break-even {inr(breakEven)}</text></g>}
      {harvestIdx != null && <g><line x1={x(harvestIdx)} x2={x(harvestIdx)} y1={T} y2={H - B} stroke="var(--b)" strokeDasharray="4 4" /><text x={x(harvestIdx)} y={T - 6} textAnchor="middle" className="ax" fill="var(--b)">Harvest</text></g>}
      {sellIdx != null && <g><circle cx={x(sellIdx)} cy={y(data[sellIdx].price)} r="6" fill="var(--o)" stroke="var(--card)" strokeWidth="2" /><text x={x(sellIdx)} y={y(data[sellIdx].price) - 12} textAnchor="middle" className="ax" fill="var(--o)" fontWeight="700">Sell · {inr(data[sellIdx].price)}</text></g>}
    </svg>
  )
}

// Cost vs revenue bars for each crop, profit on the right
export function CompareBars({ crops, selected, onSelect }) {
  const max = Math.max(...crops.map(c => Math.max(c.revenue, c.cost)))
  return (
    <div className="cbars">
      {crops.map(c => (
        <button key={c.crop} className={'cbar' + (selected === c.crop ? ' on' : '')} onClick={() => onSelect(c.crop)}>
          <span className="cb-name"><CropIcon crop={c.crop} size={28} />{c.crop}</span>
          <span className="cb-track"><i className="rev" style={{ width: `${(c.revenue / max) * 100}%` }} /><i className="cost" style={{ width: `${(c.cost / max) * 100}%` }} /></span>
          <span className={'cb-profit ' + (c.profit >= 0 ? 'up' : 'down')}>{inrShort(c.profit)}</span>
        </button>
      ))}
      <div className="legend"><span><i className="rev" /> Revenue</span><span><i className="cost" /> Cost</span><span>Profit →</span></div>
    </div>
  )
}

export function Timeline({ c }) {
  const steps = [['Sprout', 'Sow', c.sowDate, c.waitDays <= 7 ? 'Ready now' : `in ${c.waitDays} days`], ['Tractor', 'Harvest', c.harvestDate, `${c.durationDays} days later`], ['Banknote', 'Sell', null, c.bestSellMonth]]
  return (
    <div className="timeline">
      {steps.map(([ic, t, d, n], i) => (
        <div key={t} className="tl-step"><div className="tl-dot"><Icon name={ic} size={20} /></div><div><small>{t}</small><strong>{d ? fmtDate(d) : n}</strong><em>{d ? n : c.storable ? 'Store and wait for the peak' : 'Sell fresh at harvest'}</em></div>{i < 2 && <div className="tl-line" />}</div>
      ))}
    </div>
  )
}

export function Scenarios({ s }) {
  const items = [['Bad season', s.pessimistic, 'r'], ['Expected', s.expected, 'g'], ['Good season', s.optimistic, 'b']]
  const max = Math.max(...items.map(i => Math.abs(i[1])), 1)
  return (
    <div className="scen">
      {items.map(([l, v, k]) => (
        <div key={l} className="scen-row"><span>{l}</span><div className="scen-track"><i className={k + (v < 0 ? ' neg' : '')} style={{ width: `${(Math.abs(v) / max) * 100}%` }} /></div><strong className={v >= 0 ? 'up' : 'down'}>{inrShort(v)}</strong></div>
      ))}
      <p className="muted">Bad season: yield -20%, price -15%, costs +10%. Good season: yield +15%, price +10%.</p>
    </div>
  )
}

export function Gauge({ value, label }) {
  const pct = Math.round(value * 100), col = value > 0.4 ? 'var(--r)' : value > 0.2 ? 'var(--o)' : 'var(--g)'
  return (
    <div className="gauge"><div className="g-track"><i style={{ width: `${Math.max(6, pct)}%`, background: col }} /></div><span>{label} · {pct}%</span></div>
  )
}
