const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { connectDB, models } = require('./db')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/status', async (req, res) => {
  try {
    const collections = Object.keys(models)
    res.json({
      status: 'connected',
      database: 'medicore',
      collections
    })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const data = await models.User.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/medicines', async (req, res) => {
  try {
    const data = await models.Medicine.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/inventory', async (req, res) => {
  try {
    const data = await models.Inventory.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/suppliers', async (req, res) => {
  try {
    const data = await models.Supplier.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/purchases', async (req, res) => {
  try {
    const data = await models.Purchase.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/sales', async (req, res) => {
  try {
    const data = await models.Sale.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/customers', async (req, res) => {
  try {
    const data = await models.Customer.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/alerts', async (req, res) => {
  try {
    const data = await models.Alert.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/reports', async (req, res) => {
  try {
    const data = await models.Report.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/stock-history', async (req, res) => {
  try {
    const data = await models.StockHistory.find()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

async function startServer() {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()
