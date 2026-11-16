const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const { connectDB, models } = require('./db')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'medicore_secret_key'

app.use(cors())
app.use(express.json())

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Access token required' })
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' })
    req.user = decoded
    next()
  })
}

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = await models.User.findOne({ email: normalizedEmail })
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive or suspended. Contact administrator.' })
    }
    const now = new Date()
    user.lastLogin = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    await user.save()

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        access: user.access,
        status: user.status,
        employeeId: user.employeeId,
        lastLogin: user.lastLogin,
        settings: user.settings
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await models.User.findById(req.user.id).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body
    const user = await models.User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (name) user.name = name
    if (phone !== undefined) user.phone = phone
    await user.save()
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        access: user.access,
        status: user.status,
        employeeId: user.employeeId,
        lastLogin: user.lastLogin,
        settings: user.settings
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/auth/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body
    const user = await models.User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (settings) {
      user.settings = { ...(user.settings ? user.settings.toObject() : {}), ...settings }
      await user.save()
    }
    res.json({
      message: 'Settings updated successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        access: user.access,
        status: user.status,
        employeeId: user.employeeId,
        lastLogin: user.lastLogin,
        settings: user.settings
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const data = await models.User.find().select('-password')
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { name, role, email, phone, password, access, status, employeeId } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await models.User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }
    const newUser = await models.User.create({
      name,
      role: role || 'Staff',
      email: normalizedEmail,
      phone: phone || '',
      password,
      access: access || 'Standard',
      status: status || 'Active',
      employeeId: employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`
    })
    res.status(201).json(newUser)
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
