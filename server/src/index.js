import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDb, db } from './db.js'
import { runPython, geocode, getWeather } from './services.js'

const app = express()
app.use(cors())
app.use(express.json())
const SECRET = process.env.JWT_SECRET || 'dev-secret'
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: e.message }) })
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' })
const pub = u => ({ id: u.id, name: u.name, email: u.email })

function auth(req, res, next) {
  try { req.uid = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET).id; next() }
  catch { res.status(401).json({ error: 'Please log in' }) }
}

// ---- Authentication ------------------------------------------------------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ character password are required' })
  if (await db.findOne('users', { email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' })
  const u = await db.insert('users', { name, email: email.toLowerCase(), password: await bcrypt.hash(password, 10) })
  res.json({ token: sign(u), user: pub(u) })
}))

app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await db.findOne('users', { email: (req.body.email || '').toLowerCase() })
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Invalid email or password' })
  res.json({ token: sign(u), user: pub(u) })
}))

app.get('/api/me', auth, wrap(async (req, res) => {
  const u = await db.findOne('users', { id: req.uid }) || await db.findOne('users', { _id: req.uid })
  res.json({ user: u && pub(u) })
}))

// ---- Farm details ----------------------------------------------------------
app.get('/api/farm', auth, wrap(async (req, res) => res.json({ farm: await db.findOne('farms', { userId: req.uid }) })))

app.put('/api/farm', auth, wrap(async (req, res) => {
  const { location, area, soil, water, budget } = req.body
  if (!location || !(area > 0 && area <= 10000) || !soil || !water || !(budget >= 1000)) return res.status(400).json({ error: 'Enter a location, an area between 0.1 and 10000 acres, soil, water and a budget of at least ₹1,000' })
  const geo = await geocode(location)
  const farm = await db.upsert('farms', { userId: req.uid }, { location, lat: geo.lat, lon: geo.lon, area: +area, soil, water, budget: +budget })
  res.json({ farm })
}))

// ---- Weather / analysis / market -------------------------------------------
app.get('/api/weather', auth, wrap(async (req, res) => {
  const farm = await db.findOne('farms', { userId: req.uid })
  if (!farm) return res.json({ weather: null })
  res.json({ weather: await getWeather(farm.lat, farm.lon) })
}))

app.post('/api/analyze', auth, wrap(async (req, res) => {
  const farm = await db.findOne('farms', { userId: req.uid })
  if (!farm) return res.status(400).json({ error: 'Save your farm details first' })
  const weather = await getWeather(farm.lat, farm.lon)
  const result = await runPython({ soil: farm.soil, area: farm.area, water: farm.water, budget: farm.budget, temp: weather.temp, humidity: weather.humidity, rainfall: weather.rainfall })
  const saved = await db.insert('analyses', { userId: req.uid, farm: { location: farm.location, area: farm.area, soil: farm.soil, water: farm.water, budget: farm.budget }, weather, result })
  res.json({ id: saved.id, weather, ...result })
}))

app.get('/api/analyses', auth, wrap(async (req, res) => {
  const list = await db.find('analyses', { userId: req.uid }, { limit: 10 })
  res.json({ analyses: list.map(a => ({ id: a.id || a._id, createdAt: a.createdAt, recommended: a.result.recommended, farm: a.farm, result: a.result, weather: a.weather })) })
}))

const cache = {}
const cached = async (key, ttl, fn) => { const c = cache[key]; if (c && Date.now() - c.t < ttl) return c.v; const v = await fn(); cache[key] = { t: Date.now(), v }; return v }
app.get('/api/market', auth, wrap(async (req, res) => res.json({ crops: await cached('market', 10 * 60 * 1000, () => runPython({ _cmd: 'market_all' })) })))

app.get('/api/model-info', auth, wrap(async (req, res) => res.json(await cached('info', 60 * 60 * 1000, () => runPython({ _cmd: 'model_info' })))))

app.get('/api/health', (req, res) => res.json({ ok: true }))

const port = process.env.PORT || 5000
const store = await connectDb(process.env.MONGODB_URI)
app.listen(port, () => console.log(`AgriFusion API on http://localhost:${port}  (storage: ${store})`))
