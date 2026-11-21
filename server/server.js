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

async function requireWriteAccess(req, res, next) {
  try {
    const user = await models.User.findById(req.user.id).select('role access')
    if (!user) return res.status(401).json({ error: 'User account not found' })
    if (user.role !== 'Administrator' && user.access !== 'Full Access') {
      return res.status(403).json({ error: 'Full Access is required to make changes' })
    }
    next()
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
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

async function recordStockMovement({ medicine, batch, type, quantity, previous, balance, reference = '' }) {
  await models.StockHistory.create({
    date: new Date().toISOString(),
    medicine: medicine?.name || String(medicine || ''),
    batch: batch?.batchNumber || String(batch || ''),
    type,
    quantity,
    previous,
    balance,
    reference
  })
}

function isExpired(expiryDate) {
  if (!expiryDate) return false
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ? new Date(`${expiryDate}T23:59:59.999`)
    : new Date(expiryDate)
  return !Number.isNaN(expiry.getTime()) && expiry < new Date()
}

async function refreshInventoryAndAlerts() {
  const medicines = await models.Medicine.find().lean()
  const batches = await models.MedicineBatch.find().populate('supplier', 'name').lean()

  await models.Inventory.deleteMany({})
  if (batches.length) {
    await models.Inventory.insertMany(batches.map((batch) => {
      const medicine = medicines.find((item) => String(item._id) === String(batch.medicine))
      const minimum = batch.minimumStock !== undefined && batch.minimumStock !== null ? Math.max(0, Number(batch.minimumStock) || 0) : 10
      const available = Number(batch.quantity) || 0
      return {
        name: medicine?.name || 'Unknown medicine',
        batch: batch.batchNumber,
        available,
        reserved: 0,
        minimum,
        status: available <= 0 ? 'Out of Stock' : available <= minimum ? 'Low Stock' : 'Normal',
        location: batch.location || '',
        expiry: batch.expiryDate || ''
      }
    }))
  }

  await models.Alert.deleteMany({})
  const alerts = []
  const now = new Date()
  const nearExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  for (const batch of batches) {
    const medicine = medicines.find((item) => String(item._id) === String(batch.medicine))
    const available = Number(batch.quantity) || 0
    const minimum = batch.minimumStock !== undefined && batch.minimumStock !== null ? Math.max(0, Number(batch.minimumStock) || 0) : 10
    if (available <= minimum) {
      alerts.push({
        alert: available <= 0 ? 'Out of stock' : 'Low stock',
        medicine: medicine?.name || 'Unknown medicine',
        batch: batch.batchNumber,
        stock: available,
        threshold: minimum,
        expiry: batch.expiryDate || '',
        severity: available <= 0 ? 'Critical' : 'Warning'
      })
    }
    if (batch.expiryDate) {
      const expiry = new Date(batch.expiryDate)
      if (!Number.isNaN(expiry.getTime()) && expiry <= nearExpiry) {
        alerts.push({
          alert: expiry < now ? 'Expired' : 'Near expiry',
          medicine: medicine?.name || 'Unknown medicine',
          batch: batch.batchNumber,
          stock: available,
          threshold: minimum,
          expiry: batch.expiryDate,
          severity: expiry < now ? 'Critical' : 'Warning'
        })
      }
    }
  }
  if (alerts.length) await models.Alert.insertMany(alerts)
}

function getPurchaseAmount(purchase) {
  const numericTotal = Number(purchase.totalAmount)
  if (Number.isFinite(numericTotal) && numericTotal > 0) return numericTotal
  const numericAmount = Number(String(purchase.amount || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numericAmount) ? numericAmount : 0
}

async function refreshSupplierBalances() {
  const suppliers = await models.Supplier.find()
  const purchases = await models.Purchase.find().lean()
  for (const supplier of suppliers) {
    const supplierPurchases = purchases.filter((purchase) =>
      (purchase.supplierId && String(purchase.supplierId) === String(supplier._id)) ||
      purchase.supplier === supplier.name
    )
    const balanceAmount = supplierPurchases.reduce((total, purchase) => total + getPurchaseAmount(purchase), 0)
    supplier.purchases = supplierPurchases.length
    supplier.balanceAmount = balanceAmount
    supplier.balance = `Rs. ${balanceAmount.toFixed(2)}`
    await supplier.save()
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
      { id: user._id, email: user.email, role: user.role, access: user.access },
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

app.put('/api/auth/password', authenticateToken, requireWriteAccess, async (req, res) => {
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

app.put('/api/auth/profile', authenticateToken, requireWriteAccess, async (req, res) => {
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

app.put('/api/auth/settings', authenticateToken, requireWriteAccess, async (req, res) => {
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
    if (access !== undefined && !['Standard', 'Full Access'].includes(access)) {
      return res.status(400).json({ error: 'Access must be Standard or Full Access' })
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
    if (updates.access !== undefined && !['Standard', 'Full Access'].includes(updates.access)) {
      return res.status(400).json({ error: 'Access must be Standard or Full Access' })
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
    const batches = await models.MedicineBatch.find().populate('supplier', 'name').sort({ expiryDate: 1 }).lean()
    const data = medicines.map((medicine) => ({
      ...medicine,
      batches: batches.filter((batch) => String(batch.medicine) === String(medicine._id))
    }))
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/medicines', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { name, brandName, genericName, category, dosage, manufacturer, purchasePrice, sellingPrice, status } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Medicine name is required' })
    const medicine = await models.Medicine.create({
      name: name.trim(),
      brandName: brandName?.trim() || name.trim(),
      genericName: genericName?.trim() || '',
      category: category?.trim() || '',
      dosage: dosage?.trim() || '',
      manufacturer: manufacturer?.trim() || '',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      status: status || 'In Stock'
    })
    res.status(201).json({ ...medicine.toObject(), batches: [] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/medicines/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const allowed = ['name', 'brandName', 'genericName', 'category', 'dosage', 'manufacturer', 'purchasePrice', 'sellingPrice', 'status']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.name !== undefined) {
      if (!String(updates.name).trim()) return res.status(400).json({ error: 'Medicine name is required' })
      updates.name = String(updates.name).trim()
    }
    if (updates.brandName !== undefined) updates.brandName = String(updates.brandName).trim()
    for (const field of ['purchasePrice', 'sellingPrice']) {
      if (updates[field] !== undefined) updates[field] = Number(updates[field])
    }
    const medicine = await models.Medicine.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean()
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    const batches = await models.MedicineBatch.find({ medicine: medicine._id }).populate('supplier', 'name').sort({ expiryDate: 1 }).lean()
    res.json({ ...medicine, batches })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/medicines/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const medicine = await models.Medicine.findByIdAndDelete(req.params.id)
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    await models.MedicineBatch.deleteMany({ medicine: medicine._id })
    await refreshInventoryAndAlerts()
    res.json({ message: 'Medicine deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/medicines/:id/batches', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid medicine ID' })
    const { supplier, batchNumber, quantity, minimumStock, manufacturingDate, expiryDate, purchasePrice, sellingPrice, location } = req.body
    if (!batchNumber?.trim()) return res.status(400).json({ error: 'Batch number is required' })
    const medicine = await models.Medicine.findById(req.params.id)
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    const stock = Math.max(0, Number(quantity) || 0)
    const batch = await models.MedicineBatch.create({
      medicine: req.params.id,
      supplier: supplier && mongoose.isValidObjectId(supplier) ? supplier : null,
      batchNumber: batchNumber.trim(),
      quantity: stock,
      minimumStock: Math.max(0, Number(minimumStock) || 10),
      manufacturingDate: manufacturingDate || '',
      expiryDate: expiryDate || '',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      location: location?.trim() || ''
    })
    if (stock > 0) await recordStockMovement({ medicine, batch, type: 'Opening stock', quantity: stock, previous: 0, balance: stock, reference: 'Batch creation' })
    await refreshInventoryAndAlerts()
    res.status(201).json(batch)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/batches/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid batch ID' })
    const allowed = ['supplier', 'batchNumber', 'quantity', 'minimumStock', 'manufacturingDate', 'expiryDate', 'purchasePrice', 'sellingPrice', 'location']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.batchNumber !== undefined) {
      if (!String(updates.batchNumber).trim()) return res.status(400).json({ error: 'Batch number is required' })
      updates.batchNumber = String(updates.batchNumber).trim()
    }
    for (const field of ['quantity', 'minimumStock', 'purchasePrice', 'sellingPrice']) {
      if (updates[field] !== undefined) updates[field] = Number(updates[field])
    }
    if (updates.supplier !== undefined) {
      if (updates.supplier && !mongoose.isValidObjectId(updates.supplier)) return res.status(400).json({ error: 'Invalid supplier ID' })
      updates.supplier = updates.supplier || null
    }
    const existing = await models.MedicineBatch.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Batch not found' })
    const previous = existing.quantity
    const batch = await models.MedicineBatch.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (updates.quantity !== undefined && Number(updates.quantity) !== previous) {
      const medicine = await models.Medicine.findById(existing.medicine)
      const difference = Number(updates.quantity) - previous
      await recordStockMovement({ medicine, batch, type: difference >= 0 ? 'Stock adjustment (+)' : 'Stock adjustment (-)', quantity: Math.abs(difference), previous, balance: batch.quantity, reference: 'Manual adjustment' })
    }
    await refreshInventoryAndAlerts()
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/batches/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid batch ID' })
    const batch = await models.MedicineBatch.findById(req.params.id)
    if (!batch) return res.status(404).json({ error: 'Batch not found' })
    const medicine = await models.Medicine.findById(batch.medicine)
    await recordStockMovement({ medicine, batch, type: 'Stock removal', quantity: batch.quantity, previous: batch.quantity, balance: 0, reference: 'Batch deletion' })
    await models.MedicineBatch.findByIdAndDelete(req.params.id)
    await refreshInventoryAndAlerts()
    res.json({ message: 'Batch deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/stock-adjustments', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { batchId, quantity, mode = 'set', reference = 'Manual stock adjustment' } = req.body
    if (!mongoose.isValidObjectId(batchId)) return res.status(400).json({ error: 'A valid batch is required' })
    const batch = await models.MedicineBatch.findById(batchId)
    if (!batch) return res.status(404).json({ error: 'Batch not found' })
    const amount = Number(quantity)
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Quantity must be a non-negative number' })
    const previous = batch.quantity
    const next = mode === 'add' ? previous + amount : mode === 'remove' ? Math.max(0, previous - amount) : amount
    if (mode === 'remove' && amount > previous) return res.status(409).json({ error: 'Cannot remove more stock than is available' })
    batch.quantity = next
    await batch.save()
    if (next !== previous) {
      const medicine = await models.Medicine.findById(batch.medicine)
      await recordStockMovement({
        medicine,
        batch,
        type: mode === 'add' ? 'Stock adjustment (+)' : mode === 'remove' ? 'Stock adjustment (-)' : 'Stock adjustment',
        quantity: Math.abs(next - previous),
        previous,
        balance: next,
        reference
      })
    }
    await refreshInventoryAndAlerts()
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/inventory', async (req, res) => {
  try {
    await refreshInventoryAndAlerts()
    const data = await models.Inventory.find()
    res.json(data.sort((a, b) => String(a.name).localeCompare(String(b.name))))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/suppliers', async (req, res) => {
  try {
    await refreshSupplierBalances()
    res.json(await models.Supplier.find().sort({ name: 1 }))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/suppliers', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Supplier name is required' })
    const supplier = await models.Supplier.create({
      name: name.trim(),
      contact: contact?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim().toLowerCase() || '',
      address: address?.trim() || ''
    })
    res.status(201).json(supplier)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/suppliers/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid supplier ID' })
    const allowed = ['name', 'contact', 'phone', 'email', 'address']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    const existingSupplier = await models.Supplier.findById(req.params.id)
    if (!existingSupplier) return res.status(404).json({ error: 'Supplier not found' })
    if (updates.name !== undefined) {
      if (!String(updates.name).trim()) return res.status(400).json({ error: 'Supplier name is required' })
      updates.name = String(updates.name).trim()
    }
    for (const field of ['contact', 'phone', 'address']) {
      if (updates[field] !== undefined) updates[field] = String(updates[field]).trim()
    }
    if (updates.email !== undefined) updates.email = String(updates.email).trim().toLowerCase()
    const supplier = await models.Supplier.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    if (updates.name !== undefined && updates.name !== existingSupplier.name) {
      await models.Purchase.updateMany(
        { $or: [{ supplierId: supplier._id }, { supplier: existingSupplier.name }] },
        { $set: { supplier: supplier.name } }
      )
    }
    res.json(supplier)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/suppliers/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid supplier ID' })
    const supplier = await models.Supplier.findByIdAndDelete(req.params.id)
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    await models.MedicineBatch.updateMany({ supplier: supplier._id }, { $set: { supplier: null } })
    res.json({ message: 'Supplier deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/purchases', async (req, res) => {
  try {
    const data = await models.Purchase.find().sort({ createdAt: -1 })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/purchases', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { reference, supplier, date, status, lineItems = [] } = req.body
    if (!reference?.trim() || !supplier?.trim()) return res.status(400).json({ error: 'Reference and supplier are required' })
    if (!Array.isArray(lineItems) || lineItems.length === 0) return res.status(400).json({ error: 'Add at least one purchase item' })
    if (!mongoose.isValidObjectId(supplier)) return res.status(400).json({ error: 'A valid supplier is required' })
    if (await models.Purchase.exists({ reference: reference.trim() })) {
      return res.status(409).json({ error: 'A purchase with this reference or invoice number already exists' })
    }
    const supplierRecord = await models.Supplier.findById(supplier)
    if (!supplierRecord) return res.status(404).json({ error: 'Supplier not found' })

    let itemCount = 0
    let amount = 0
    const storedLineItems = []
    for (const line of lineItems) {
      if (!mongoose.isValidObjectId(line.batchId)) return res.status(400).json({ error: 'A valid batch is required for every purchase item' })
      const quantity = Math.max(0, Number(line.quantity) || 0)
      if (quantity <= 0) return res.status(400).json({ error: 'Purchase quantities must be greater than zero' })
      const batch = await models.MedicineBatch.findById(line.batchId)
      if (!batch) return res.status(404).json({ error: 'Purchase batch not found' })
      const purchasePrice = Math.max(0, Number(line.purchasePrice) || 0)
      batch.supplier = supplierRecord._id
      const previous = batch.quantity
      batch.quantity = previous + quantity
      batch.purchasePrice = purchasePrice
      await batch.save()
      const medicine = await models.Medicine.findById(batch.medicine)
      await recordStockMovement({ medicine, batch, type: 'Purchase received', quantity, previous, balance: batch.quantity, reference: reference.trim() })
      itemCount += quantity
      amount += quantity * purchasePrice
      storedLineItems.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        medicine: medicine?.brandName || medicine?.name || 'Unknown medicine',
        quantity,
        purchasePrice
      })
    }
    const purchase = await models.Purchase.create({
      reference: reference.trim(),
      supplier: supplierRecord.name,
      supplierId: supplierRecord._id,
      date: date || new Date().toISOString().slice(0, 10),
      items: itemCount,
      amount: `Rs. ${amount.toFixed(2)}`,
      totalAmount: amount,
      status: status || 'Completed',
      lineItems: storedLineItems
    })
    supplierRecord.purchases += 1
    supplierRecord.balanceAmount = (Number(supplierRecord.balanceAmount) || 0) + amount
    supplierRecord.balance = `Rs. ${supplierRecord.balanceAmount.toFixed(2)}`
    await supplierRecord.save()
    await refreshSupplierBalances()
    await refreshInventoryAndAlerts()
    res.status(201).json(purchase)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/sales', async (req, res) => {
  try {
    const data = await models.Sale.find().sort({ createdAt: -1 })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sales', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { invoice, customer, date, payment, status, lineItems = [] } = req.body
    if (!invoice?.trim()) return res.status(400).json({ error: 'Invoice number is required' })
    if (!Array.isArray(lineItems) || lineItems.length === 0) return res.status(400).json({ error: 'Add at least one sale item' })
    if (await models.Sale.exists({ invoice: invoice.trim() })) {
      return res.status(409).json({ error: 'An invoice with this number already exists' })
    }

    let itemCount = 0
    let total = 0
    for (const line of lineItems) {
      if (!mongoose.isValidObjectId(line.batchId)) return res.status(400).json({ error: 'A valid batch is required for every sale item' })
      const quantity = Math.max(0, Number(line.quantity) || 0)
      if (quantity <= 0) return res.status(400).json({ error: 'Sale quantities must be greater than zero' })
      const batch = await models.MedicineBatch.findById(line.batchId)
      if (!batch) return res.status(404).json({ error: 'Sale batch not found' })
      if (isExpired(batch.expiryDate)) {
        return res.status(409).json({ error: `Cannot sell expired batch ${batch.batchNumber}` })
      }
      if (batch.quantity < quantity) return res.status(409).json({ error: `Insufficient stock for batch ${batch.batchNumber}` })
      const previous = batch.quantity
      batch.quantity -= quantity
      await batch.save()
      const medicine = await models.Medicine.findById(batch.medicine)
      await recordStockMovement({ medicine, batch, type: 'Sale', quantity, previous, balance: batch.quantity, reference: invoice.trim() })
      itemCount += quantity
      total += quantity * (line.sellingPrice !== undefined ? Math.max(0, Number(line.sellingPrice) || 0) : batch.sellingPrice)
    }
    const customerName = customer?.trim() || 'Walk-in Customer'
    let customerRecord = null
    if (customerName !== 'Walk-in Customer') {
      customerRecord = await models.Customer.findOne({ name: customerName })
      if (!customerRecord) {
        customerRecord = await models.Customer.create({ name: customerName, status: 'Active' })
      }
    } else {
      customerRecord = await models.Customer.findOne({ walkIn: true })
      if (!customerRecord) {
        customerRecord = await models.Customer.create({
          name: 'Walk-in Customer',
          phone: '',
          email: '',
          walkIn: true,
          status: 'Active'
        })
      }
    }
    const sale = await models.Sale.create({
      invoice: invoice.trim(),
      customer: customerName,
      customerId: customerRecord._id,
      date: date || new Date().toISOString().slice(0, 10),
      items: itemCount,
      payment: payment || 'Cash',
      total: `Rs. ${total.toFixed(2)}`,
      status: status || 'Completed',
      lineItems
    })
    customerRecord.orders = (Number(customerRecord.orders) || 0) + 1
    await customerRecord.save()
    await refreshInventoryAndAlerts()
    res.status(201).json(sale)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/customers', async (req, res) => {
  try {
    const customers = await models.Customer.find().sort({ name: 1 }).lean()
    const sales = await models.Sale.find().sort({ createdAt: -1 }).lean()
    const data = customers.map((customer) => {
      const history = sales.filter((sale) =>
        (sale.customerId && String(sale.customerId) === String(customer._id)) ||
        sale.customer === customer.name
      )
      return {
        ...customer,
        orders: history.length,
        purchaseHistory: history
      }
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/customers', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { name, phone, email, status } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Customer name is required' })
    if (!phone?.trim()) return res.status(400).json({ error: 'Customer phone number is required' })
    if (await models.Customer.exists({ name: name.trim(), walkIn: false })) {
      return res.status(409).json({ error: 'A customer with this name already exists' })
    }
    const customer = await models.Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || '',
      walkIn: false,
      status: status || 'Active'
    })
    res.status(201).json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/customers/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid customer ID' })
    const customer = await models.Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    if (customer.walkIn) return res.status(400).json({ error: 'The walk-in customer profile cannot be edited' })
    const allowed = ['name', 'phone', 'email', 'status']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    if (updates.name !== undefined) {
      if (!String(updates.name).trim()) return res.status(400).json({ error: 'Customer name is required' })
      updates.name = String(updates.name).trim()
    }
    if (updates.phone !== undefined) {
      if (!String(updates.phone).trim()) return res.status(400).json({ error: 'Customer phone number is required' })
      updates.phone = String(updates.phone).trim()
    }
    if (updates.email !== undefined) updates.email = String(updates.email).trim().toLowerCase()
    const oldName = customer.name
    Object.assign(customer, updates)
    await customer.save()
    if (updates.name !== undefined && updates.name !== oldName) {
      await models.Sale.updateMany(
        { $or: [{ customerId: customer._id }, { customer: oldName }] },
        { $set: { customer: customer.name } }
      )
    }
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/customers/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid customer ID' })
    const customer = await models.Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    if (customer.walkIn) return res.status(400).json({ error: 'The walk-in customer profile cannot be deleted' })
    await models.Customer.findByIdAndDelete(req.params.id)
    await models.Sale.updateMany({ customerId: customer._id }, { $set: { customerId: null, customer: 'Walk-in Customer' } })
    res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/alerts', async (req, res) => {
  try {
    await refreshInventoryAndAlerts()
    const data = await models.Alert.find().sort({ severity: 1, medicine: 1 })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/reports/analytics', async (req, res) => {
  try {
    const [sales, medicines, batches, purchases, suppliers] = await Promise.all([
      models.Sale.find().lean(),
      models.Medicine.find().lean(),
      models.MedicineBatch.find().populate('supplier', 'name').lean(),
      models.Purchase.find().lean(),
      models.Supplier.find().lean()
    ])

    const todayStr = new Date().toISOString().slice(0, 10)
    let totalSalesAmount = 0
    let todaySalesAmount = 0
    let totalSalesItems = 0
    const dailySalesMap = {}
    const monthlySalesMap = {}

    for (const sale of sales) {
      const amt = Number(String(sale.total || '').replace(/[^0-9.-]/g, '')) || 0
      totalSalesAmount += amt
      const sDate = sale.date || (sale.createdAt ? new Date(sale.createdAt).toISOString().slice(0, 10) : todayStr)
      if (sDate === todayStr) {
        todaySalesAmount += amt
      }
      totalSalesItems += Number(sale.items) || 0

      if (!dailySalesMap[sDate]) {
        dailySalesMap[sDate] = { date: sDate, total: 0, count: 0, items: 0 }
      }
      dailySalesMap[sDate].total += amt
      dailySalesMap[sDate].count += 1
      dailySalesMap[sDate].items += Number(sale.items) || 0

      const monthStr = sDate.slice(0, 7)
      if (!monthlySalesMap[monthStr]) {
        monthlySalesMap[monthStr] = { month: monthStr, total: 0, count: 0, items: 0 }
      }
      monthlySalesMap[monthStr].total += amt
      monthlySalesMap[monthStr].count += 1
      monthlySalesMap[monthStr].items += Number(sale.items) || 0
    }

    const dailySales = Object.values(dailySalesMap).sort((a, b) => b.date.localeCompare(a.date))
    const monthlySales = Object.values(monthlySalesMap).sort((a, b) => b.month.localeCompare(a.month))

    let totalStockUnits = 0
    let totalStockValue = 0
    const now = new Date()
    const nearExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const currentStock = []
    const lowStockList = []
    const expiredList = []
    const nearExpiryList = []

    for (const batch of batches) {
      const med = medicines.find((item) => String(item._id) === String(batch.medicine))
      const qty = Number(batch.quantity) || 0
      const pPrice = Number(batch.purchasePrice) || 0
      const sPrice = Number(batch.sellingPrice || batch.price) || 0
      const minStock = batch.minimumStock !== undefined && batch.minimumStock !== null ? Number(batch.minimumStock) : 10
      totalStockUnits += qty
      totalStockValue += qty * pPrice

      const row = {
        medicineId: med?._id,
        medicineName: med?.name || 'Unknown medicine',
        genericName: med?.genericName || '',
        category: med?.category || 'General',
        batchNumber: batch.batchNumber,
        quantity: qty,
        minimumStock: minStock,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        stockValue: qty * pPrice,
        expiryDate: batch.expiryDate || '',
        supplierName: batch.supplier?.name || '',
        status: qty <= 0 ? 'Out of Stock' : qty <= minStock ? 'Low Stock' : 'In Stock'
      }
      currentStock.push(row)

      if (qty <= minStock) {
        lowStockList.push(row)
      }

      if (batch.expiryDate) {
        const exp = new Date(batch.expiryDate)
        if (!Number.isNaN(exp.getTime())) {
          if (exp < now) {
            expiredList.push(row)
          } else if (exp <= nearExpiryDate) {
            nearExpiryList.push(row)
          }
        }
      }
    }

    let totalPurchasesAmount = 0
    let totalPurchasesItems = 0
    const supplierPurchasesMap = {}
    const datePurchasesMap = {}

    for (const purchase of purchases) {
      const amt = getPurchaseAmount(purchase)
      totalPurchasesAmount += amt
      totalPurchasesItems += Number(purchase.items) || 0
      const sName = purchase.supplier || 'Unknown Supplier'

      if (!supplierPurchasesMap[sName]) {
        supplierPurchasesMap[sName] = { supplier: sName, total: 0, count: 0, items: 0 }
      }
      supplierPurchasesMap[sName].total += amt
      supplierPurchasesMap[sName].count += 1
      supplierPurchasesMap[sName].items += Number(purchase.items) || 0

      const pDate = purchase.date ? String(purchase.date).slice(0, 10) : todayStr
      if (!datePurchasesMap[pDate]) {
        datePurchasesMap[pDate] = { date: pDate, total: 0, count: 0, items: 0 }
      }
      datePurchasesMap[pDate].total += amt
      datePurchasesMap[pDate].count += 1
      datePurchasesMap[pDate].items += Number(purchase.items) || 0
    }

    const purchasesBySupplier = Object.values(supplierPurchasesMap).sort((a, b) => b.total - a.total)
    const purchasesByDate = Object.values(datePurchasesMap).sort((a, b) => b.date.localeCompare(a.date))

    res.json({
      sales: {
        totalAmount: totalSalesAmount,
        todayAmount: todaySalesAmount,
        totalTransactions: sales.length,
        totalItemsSold: totalSalesItems,
        dailySales,
        monthlySales
      },
      inventory: {
        totalMedicines: medicines.length,
        totalBatches: batches.length,
        totalStockUnits,
        totalStockValue,
        currentStock,
        lowStockList,
        expiredList,
        nearExpiryList
      },
      purchases: {
        totalAmount: totalPurchasesAmount,
        totalOrders: purchases.length,
        totalItemsPurchased: totalPurchasesItems,
        purchasesBySupplier,
        purchasesByDate
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/reports', async (req, res) => {
  try {
    const data = await models.Report.find().sort({ createdAt: -1 })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await models.Report.findById(req.params.id)
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json(report)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/reports/generate', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { category, type, startDate, endDate, supplierId } = req.body
    if (!type) return res.status(400).json({ error: 'Report type is required' })

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    let periodLabel = 'All Time'
    let summary = ''
    let totalAmount = 0
    let itemCount = 0
    let details = []

    if (category === 'Sales') {
      const sales = await models.Sale.find().lean()
      let filtered = sales
      if (type === 'Daily Sales') {
        const targetDate = startDate || todayStr
        periodLabel = targetDate
        filtered = sales.filter((s) => (s.date || '').slice(0, 10) === targetDate)
      } else if (type === 'Monthly Sales') {
        const targetMonth = startDate ? startDate.slice(0, 7) : todayStr.slice(0, 7)
        periodLabel = targetMonth
        filtered = sales.filter((s) => (s.date || '').slice(0, 7) === targetMonth)
      } else if (type === 'Sales by Date Range') {
        periodLabel = `${startDate || 'Start'} to ${endDate || 'Today'}`
        filtered = sales.filter((s) => {
          const sDate = (s.date || '').slice(0, 10)
          if (startDate && sDate < startDate) return false
          if (endDate && sDate > endDate) return false
          return true
        })
      }

      details = filtered.map((s) => {
        const amt = Number(String(s.total || '').replace(/[^0-9.-]/g, '')) || 0
        totalAmount += amt
        itemCount += Number(s.items) || 0
        return {
          reference: s.invoice,
          date: s.date,
          customer: s.customer,
          payment: s.payment,
          items: s.items,
          amount: amt,
          status: s.status
        }
      })
      summary = `${filtered.length} sales recorded. Total revenue: Rs. ${totalAmount.toFixed(2)}.`
    } else if (category === 'Inventory') {
      const [medicines, batches] = await Promise.all([
        models.Medicine.find().lean(),
        models.MedicineBatch.find().populate('supplier', 'name').lean()
      ])
      const nearExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      let rows = batches.map((batch) => {
        const med = medicines.find((item) => String(item._id) === String(batch.medicine))
        const qty = Number(batch.quantity) || 0
        const pPrice = Number(batch.purchasePrice) || 0
        const minStock = batch.minimumStock !== undefined && batch.minimumStock !== null ? Number(batch.minimumStock) : 10
        return {
          medicineName: med?.name || 'Unknown medicine',
          genericName: med?.genericName || '',
          category: med?.category || 'General',
          batchNumber: batch.batchNumber,
          quantity: qty,
          minimumStock: minStock,
          purchasePrice: pPrice,
          sellingPrice: Number(batch.sellingPrice || batch.price) || 0,
          stockValue: qty * pPrice,
          expiryDate: batch.expiryDate || '',
          supplierName: batch.supplier?.name || '',
          isExpired: batch.expiryDate ? new Date(batch.expiryDate) < now : false,
          isNearExpiry: batch.expiryDate ? (new Date(batch.expiryDate) >= now && new Date(batch.expiryDate) <= nearExpiryDate) : false
        }
      })

      if (type === 'Low Stock Audit') {
        periodLabel = 'Threshold Check'
        rows = rows.filter((r) => r.quantity <= r.minimumStock)
      } else if (type === 'Expired Medicines Audit') {
        periodLabel = 'Expired Batches'
        rows = rows.filter((r) => r.isExpired)
      } else if (type === 'Near Expiry Audit') {
        periodLabel = 'Next 30 Days'
        rows = rows.filter((r) => r.isNearExpiry)
      } else {
        periodLabel = 'Full Stock Audit'
      }

      details = rows
      for (const r of rows) {
        totalAmount += r.stockValue
        itemCount += r.quantity
      }
      summary = `${rows.length} batches evaluated. Total stock quantity: ${itemCount} units. Valuation: Rs. ${totalAmount.toFixed(2)}.`
    } else if (category === 'Purchases') {
      const purchases = await models.Purchase.find().lean()
      let filtered = purchases

      if (type === 'Purchases by Supplier') {
        periodLabel = supplierId || 'All Suppliers'
        if (supplierId) {
          filtered = purchases.filter((p) => p.supplier === supplierId)
        }
      } else if (type === 'Purchases by Date Range') {
        periodLabel = `${startDate || 'Start'} to ${endDate || 'Today'}`
        filtered = purchases.filter((p) => {
          const pDate = (p.date || '').slice(0, 10)
          if (startDate && pDate < startDate) return false
          if (endDate && pDate > endDate) return false
          return true
        })
      } else {
        periodLabel = 'All Purchases'
      }

      details = filtered.map((p) => {
        const amt = getPurchaseAmount(p)
        totalAmount += amt
        itemCount += Number(p.items) || 0
        return {
          reference: p.reference,
          date: p.date,
          supplier: p.supplier,
          items: p.items,
          amount: amt,
          status: p.status
        }
      })
      summary = `${filtered.length} purchase orders recorded. Total purchase expense: Rs. ${totalAmount.toFixed(2)}.`
    }

    const report = await models.Report.create({
      name: `${type} Report`,
      category: category || 'General',
      period: periodLabel,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: req.user?.name || req.user?.email || 'Administrator',
      format: 'PDF',
      status: 'Ready',
      summary,
      totalAmount,
      itemCount,
      details
    })

    res.status(201).json(report)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/reports/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const deleted = await models.Report.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Report not found' })
    res.json({ message: 'Report deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/stock-history', async (req, res) => {
  try {
    const data = await models.StockHistory.find().sort({ createdAt: -1 })
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
