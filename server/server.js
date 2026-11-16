const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { connectDB, models } = require('./db')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production')
}
const signingSecret = JWT_SECRET || 'medicore_secret_key'

app.use(cors())
app.use(express.json())

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Access token required' })
  jwt.verify(token, signingSecret, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' })
    req.user = decoded
    next()
  })
}

function requireAdministrator(req, res, next) {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator access required' })
  }
  next()
}

function publicUser(user) {
  return {
    id: String(user._id),
    _id: String(user._id),
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
    const validPassword = user && (
      user.password.startsWith('$2')
        ? await bcrypt.compare(password, user.password)
        : user.password === password
    )
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive or suspended. Contact administrator.' })
    }
    const now = new Date()
    if (!user.password.startsWith('$2')) user.password = await bcrypt.hash(password, 12)
    user.lastLogin = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    await user.save()

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      signingSecret,
      { expiresIn: '7d' }
    )

    res.json({ token, user: publicUser(user) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (await models.User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }
    const user = await models.User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone?.trim() || '',
      role: 'Staff',
      access: 'Standard',
      status: 'Active'
    })
    res.status(201).json({ message: 'Registration successful. You can now sign in.', user: publicUser(user) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and a new password of at least 8 characters are required' })
    }
    const user = await models.User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const valid = user.password.startsWith('$2')
      ? await bcrypt.compare(currentPassword, user.password)
      : user.password === currentPassword
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    user.password = newPassword
    await user.save()
    res.json({ message: 'Password updated successfully' })
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

app.get('/api/users', authenticateToken, requireAdministrator, async (req, res) => {
  try {
    const data = await models.User.find().select('-password')
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', authenticateToken, requireAdministrator, async (req, res) => {
  try {
    const { name, role, email, phone, password, access, status, employeeId } = req.body
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await models.User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }
    const newUser = await models.User.create({
      name: name.trim(),
      role: role === 'Administrator' ? 'Administrator' : 'Staff',
      email: normalizedEmail,
      phone: phone?.trim() || '',
      password,
      access: access || 'Standard',
      status: status || 'Active',
      employeeId: employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`
    })
    res.status(201).json(publicUser(newUser))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/:id', authenticateToken, requireAdministrator, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }
    const allowed = ['name', 'role', 'phone', 'access', 'status', 'employeeId']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' })
    }
    if (updates.role !== undefined && !['Staff', 'Administrator'].includes(updates.role)) {
      return res.status(400).json({ error: 'Role must be Staff or Administrator' })
    }
    if (req.body.password !== undefined) {
      if (!req.body.password || req.body.password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }
      updates.password = req.body.password
    }
    if (updates.name) updates.name = updates.name.trim()
    const user = await models.User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    Object.assign(user, updates)
    await user.save()
    res.json(publicUser(user))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/users/:id', authenticateToken, requireAdministrator, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }
    if (String(req.user.id) === req.params.id) {
      return res.status(400).json({ error: 'You cannot remove your own administrator account' })
    }
    const user = await models.User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User removed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/medicines', async (req, res) => {
  try {
    const medicines = await models.Medicine.find().sort({ name: 1 }).lean()
    const batches = await models.MedicineBatch.find().sort({ expiryDate: 1 }).lean()
    const data = medicines.map((medicine) => ({
      ...medicine,
      batches: batches.filter((batch) => String(batch.medicine) === String(medicine._id))
    }))
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/medicines', async (req, res) => {
  try {
    const { name, genericName, category, dosage, manufacturer, status } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Medicine name is required' })
    const medicine = await models.Medicine.create({
      name: name.trim(),
      genericName: genericName?.trim() || '',
      category: category?.trim() || '',
      dosage: dosage?.trim() || '',
      manufacturer: manufacturer?.trim() || '',
      status: status || 'In Stock'
    })
    res.status(201).json({ ...medicine.toObject(), batches: [] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/medicines/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const allowed = ['name', 'genericName', 'category', 'dosage', 'manufacturer', 'status']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.name !== undefined) {
      if (!String(updates.name).trim()) return res.status(400).json({ error: 'Medicine name is required' })
      updates.name = String(updates.name).trim()
    }
    const medicine = await models.Medicine.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean()
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    const batches = await models.MedicineBatch.find({ medicine: medicine._id }).sort({ expiryDate: 1 }).lean()
    res.json({ ...medicine, batches })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/medicines/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const medicine = await models.Medicine.findByIdAndDelete(req.params.id)
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    await models.MedicineBatch.deleteMany({ medicine: medicine._id })
    res.json({ message: 'Medicine deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/medicines/:id/batches', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const { batchNumber, quantity, expiryDate, purchasePrice, sellingPrice, location } = req.body
    if (!batchNumber?.trim()) return res.status(400).json({ error: 'Batch number is required' })
    if (!(await models.Medicine.exists({ _id: req.params.id }))) return res.status(404).json({ error: 'Medicine not found' })
    const batch = await models.MedicineBatch.create({
      medicine: req.params.id,
      batchNumber: batchNumber.trim(),
      quantity: Number(quantity) || 0,
      expiryDate: expiryDate || '',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      location: location?.trim() || ''
    })
    res.status(201).json(batch)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/batches/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid batch ID' })
    const allowed = ['batchNumber', 'quantity', 'expiryDate', 'purchasePrice', 'sellingPrice', 'location']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.batchNumber !== undefined) {
      if (!String(updates.batchNumber).trim()) return res.status(400).json({ error: 'Batch number is required' })
      updates.batchNumber = String(updates.batchNumber).trim()
    }
    for (const field of ['quantity', 'purchasePrice', 'sellingPrice']) {
      if (updates[field] !== undefined) updates[field] = Number(updates[field])
    }
    const batch = await models.MedicineBatch.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!batch) return res.status(404).json({ error: 'Batch not found' })
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/batches/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid batch ID' })
    const batch = await models.MedicineBatch.findByIdAndDelete(req.params.id)
    if (!batch) return res.status(404).json({ error: 'Batch not found' })
    res.json({ message: 'Batch deleted successfully' })
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
