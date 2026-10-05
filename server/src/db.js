// Storage layer: MongoDB (mongoose) when reachable, otherwise a JSON file so the app always runs.
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '..', 'data', 'db.json')
let mode = 'file'
const models = {}

const defs = {
  users: { name: String, email: { type: String, unique: true }, password: String, createdAt: { type: Date, default: Date.now } },
  farms: { userId: String, location: String, lat: Number, lon: Number, area: Number, soil: String, water: String, budget: Number, updatedAt: { type: Date, default: Date.now } },
  analyses: { userId: String, farm: Object, weather: Object, result: Object, createdAt: { type: Date, default: Date.now } },
}

function readFile() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return { users: [], farms: [], analyses: [] } }
}
function writeFile(d) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)) }

export async function connectDb(uri) {
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 })
      for (const [k, v] of Object.entries(defs)) models[k] = mongoose.model(k, new mongoose.Schema(v, { strict: false }))
      mode = 'mongo'
      return 'MongoDB'
    } catch (e) { console.warn('MongoDB unavailable, using JSON file store:', e.message) }
  }
  return 'JSON file'
}

const match = (doc, q) => Object.entries(q).every(([k, v]) => String(doc[k]) === String(v))

export const db = {
  async find(col, q = {}, { sort = 'createdAt', limit = 50 } = {}) {
    if (mode === 'mongo') return (await models[col].find(q).sort({ [sort]: -1 }).limit(limit).lean()).map(o => ({ ...o, id: String(o._id) }))
    return readFile()[col].filter(d => match(d, q)).sort((a, b) => String(b[sort]).localeCompare(String(a[sort]))).slice(0, limit)
  },
  async findOne(col, q) { return (await this.find(col, q, { limit: 1 }))[0] || null },
  async insert(col, data) {
    if (mode === 'mongo') { const d = await models[col].create(data); return { ...d.toObject(), id: String(d._id) } }
    const all = readFile(); const doc = { id: randomUUID(), ...data, createdAt: new Date().toISOString() }
    all[col].push(doc); writeFile(all); return doc
  },
  async upsert(col, q, data) {
    if (mode === 'mongo') { const d = await models[col].findOneAndUpdate(q, data, { upsert: true, new: true }).lean(); return { ...d, id: String(d._id) } }
    const all = readFile(); let doc = all[col].find(d => match(d, q))
    if (doc) Object.assign(doc, data, { updatedAt: new Date().toISOString() })
    else { doc = { id: randomUUID(), ...q, ...data, updatedAt: new Date().toISOString() }; all[col].push(doc) }
    writeFile(all); return doc
  },
}
