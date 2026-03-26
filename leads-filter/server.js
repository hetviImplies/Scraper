import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const DATA_PATH = path.resolve(__dirname, '../datasets/leads.json')

app.use(cors())
app.use(express.json())

app.get('/api/leads', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read leads.json', path: DATA_PATH })
  }
})

app.put('/api/leads/:placeId', (req, res) => {
  try {
    const { placeId } = req.params
    const updates = req.body
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    const idx = data.findIndex(l => l.placeId === placeId)
    if (idx === -1) return res.status(404).json({ error: 'Lead not found' })
    data[idx] = { ...data[idx], ...updates }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
    res.json(data[idx])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead', detail: err.message })
  }
})

app.listen(3001, () => {
  console.log('🚀 API Server → http://localhost:3001')
  console.log('📁 Reading from:', DATA_PATH)
})
