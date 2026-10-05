import { useEffect, useState } from 'react'
import { api, inr } from '../api.js'
import { Icon, CropIcon } from '../icons.jsx'
import { Spark, PriceChart } from '../charts.jsx'

export default function Market() {
  const [crops, setCrops] = useState([])
  const [sel, setSel] = useState(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { api('/market').then(r => { setCrops(r.crops); setSel(r.crops[0]?.crop) }).catch(e => setErr(e.message)) }, [])
  const c = crops.find(x => x.crop === sel)
  const list = crops.filter(x => x.crop.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <header className="page-head"><div><h1>Market intelligence</h1><p>12-month AI price forecast per crop (₹ per quintal)</p></div><label className="search"><Icon name="Search" size={16} /><input placeholder="Search crop" value={q} onChange={e => setQ(e.target.value)} /></label></header>
      {err && <div className="error">{err}</div>}
      <section className="mgrid">
        <div className="mlist">{list.map(m => (
          <button key={m.crop} className={'mcard' + (sel === m.crop ? ' on' : '')} onClick={() => setSel(m.crop)}>
            <CropIcon crop={m.crop} size={36} /><span className="m-t"><strong>{m.crop}</strong><small>{m.demand}</small></span>
            <Spark data={m.forecast} color={m.change >= 0 ? 'var(--g)' : 'var(--r)'} w={70} /><span className="m-p"><b>{inr(m.price)}</b><em className={'delta ' + (m.change >= 0 ? 'up' : 'down')}><Icon name={m.change >= 0 ? 'ArrowUpRight' : 'ArrowDownRight'} size={13} stroke={2.2} />{Math.abs(m.change)}%</em></span></button>))}</div>
        <div className="card mdetail">{c ? <>
          <div className="card-h"><h3>{c.crop} price forecast</h3><small>₹ per quintal</small></div>
          <PriceChart data={c.forecast} />
          <div className="grid3 gap"><div className="mini"><small>Today</small><strong>{inr(c.price)}</strong></div><div className="mini"><small>Peak</small><strong>{c.peakMonth}</strong><em>{inr(c.peakPrice)}</em></div><div className="mini"><small>Lowest</small><strong>{c.lowMonth}</strong><em>{inr(c.lowPrice)}</em></div></div>
          <p className="advice"><b>{c.advice}.</b> {c.storable ? `${c.crop} can be stored, so waiting for the ${c.peakMonth} peak can raise returns by ${Math.round((c.peakPrice / c.price - 1) * 100)}%.` : `${c.crop} is perishable, so plan to sell soon after harvest.`}</p></> : <p className="muted">Loading…</p>}</div>
      </section>
    </>
  )
}
