const mongoose = require('mongoose')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medicore'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true, default: 'Staff' },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  access: { type: String, default: 'Standard' },
  status: { type: String, default: 'Active' },
  lastLogin: { type: String, default: 'Never' },
  employeeId: { type: String, default: 'ADM-001' },
  settings: {
    dateFormat: { type: String, default: 'DD Month YYYY' },
    currency: { type: String, default: 'PKR (Rs.)' },
    automaticLock: { type: Boolean, default: true },
    sessionTimeout: { type: String, default: '30 minutes' },
    defaultPaymentMethod: { type: String, default: 'Cash' },
    isDarkTheme: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: true },
    emailAlertsEnabled: { type: Boolean, default: true },
    showSidebarCount: { type: Boolean, default: true }
  }
}, { timestamps: true })

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || this.password.startsWith('$2')) return
  this.password = await bcrypt.hash(this.password, 12)
})

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brandName: { type: String, default: '' },
  genericName: { type: String, default: '' },
  category: { type: String, default: '' },
  dosage: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  purchasePrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  status: { type: String, default: 'In Stock' }
}, { timestamps: true })

const medicineBatchSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, default: 0, min: 0 },
  minimumStock: { type: Number, default: 10, min: 0 },
  manufacturingDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  purchasePrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  location: { type: String, default: '' }
}, { timestamps: true })

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, required: true },
  available: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 },
  minimum: { type: Number, default: 0 },
  status: { type: String, default: 'Normal' },
  expiryStatus: { type: String, default: 'Valid' },
  location: { type: String, default: '' },
  expiry: { type: String, default: '' }
}, { timestamps: true })

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  purchases: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0, min: 0 },
  balance: { type: String, default: 'Rs. 0.00' }
}, { timestamps: true })

const purchaseSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  date: { type: String, default: '' },
  items: { type: Number, default: 0 },
  amount: { type: String, default: '$0.00' },
  totalAmount: { type: Number, default: 0, min: 0 },
  lineItems: { type: Array, default: [] },
  status: { type: String, default: 'Pending' }
}, { timestamps: true })

const saleSchema = new mongoose.Schema({
  invoice: { type: String, required: true },
  customer: { type: String, default: 'Walk-in Customer' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  date: { type: String, default: '' },
  items: { type: Number, default: 0 },
  payment: { type: String, default: 'Cash' },
  total: { type: String, default: '$0.00' },
  totalAmount: { type: Number, default: 0, min: 0 },
  lineItems: { type: Array, default: [] },
  status: { type: String, default: 'Completed' }
}, { timestamps: true })

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  walkIn: { type: Boolean, default: false },
  prescriptions: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  balance: { type: String, default: '$0.00' },
  status: { type: String, default: 'Active' }
}, { timestamps: true })

const alertSchema = new mongoose.Schema({
  alert: { type: String, required: true },
  medicine: { type: String, required: true },
  batch: { type: String, default: '' },
  alertKey: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  threshold: { type: Number, default: 0 },
  expiry: { type: String, default: '' },
  severity: { type: String, default: 'Warning' },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date, default: null }
}, { timestamps: true })

const reportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  period: { type: String, default: '' },
  date: { type: String, default: '' },
  author: { type: String, default: 'Administrator' },
  format: { type: String, default: 'PDF' },
  status: { type: String, default: 'Ready' },
  summary: { type: String, default: '' },
  totalAmount: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  details: { type: Array, default: [] }
}, { timestamps: true })

const stockHistorySchema = new mongoose.Schema({
  date: { type: String, default: '' },
  medicine: { type: String, required: true },
  batch: { type: String, default: '' },
  type: { type: String, default: 'Adjustment' },
  quantity: { type: Number, default: 0 },
  previous: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  reference: { type: String, default: '' },
  performedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performedBy: { type: String, default: 'System' }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users')
const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema, 'medicines')
const MedicineBatch = mongoose.models.MedicineBatch || mongoose.model('MedicineBatch', medicineBatchSchema, 'medicine_batches')
const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema, 'inventory')
const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema, 'suppliers')
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema, 'purchases')
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema, 'sales')
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema, 'customers')
const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema, 'alerts')
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema, 'reports')
const StockHistory = mongoose.models.StockHistory || mongoose.model('StockHistory', stockHistorySchema, 'stock_history')

const models = {
  User,
  Medicine,
  MedicineBatch,
  Inventory,
  Supplier,
  Purchase,
  Sale,
  Customer,
  Alert,
  Report,
  StockHistory
}

async function connectDB() {
  await mongoose.connect(MONGODB_URI)
  for (const model of Object.values(models)) {
    await model.createCollection()
  }
  const existingAdmin = await models.User.findOne({ email: 'admin@medicore.com' })
  if (!existingAdmin) {
    await models.User.create({
      name: 'Administrator',
      role: 'Administrator',
      email: 'admin@medicore.com',
      phone: '+92 300 1234567',
      password: 'admin123',
      access: 'Full Access',
      status: 'Active',
      employeeId: 'ADM-001',
      lastLogin: 'Never',
      settings: {
        dateFormat: 'DD Month YYYY',
        currency: 'PKR (Rs.)',
        automaticLock: true,
        sessionTimeout: '30 minutes',
        defaultPaymentMethod: 'Cash',
        isDarkTheme: false,
        notificationsEnabled: true,
        emailAlertsEnabled: true,
        showSidebarCount: true
      }
    })
  }
  return mongoose.connection
}

module.exports = {
  connectDB,
  models
}
