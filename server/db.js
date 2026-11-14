const mongoose = require('mongoose')
const dotenv = require('dotenv')

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
  lastLogin: { type: String, default: 'Never' }
}, { timestamps: true })

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String, default: '' },
  category: { type: String, default: '' },
  dosage: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  status: { type: String, default: 'In Stock' }
}, { timestamps: true })

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, required: true },
  available: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 },
  minimum: { type: Number, default: 0 },
  status: { type: String, default: 'Normal' },
  location: { type: String, default: '' },
  expiry: { type: String, default: '' }
}, { timestamps: true })

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  purchases: { type: Number, default: 0 },
  balance: { type: String, default: '$0.00' }
}, { timestamps: true })

const purchaseSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  supplier: { type: String, required: true },
  date: { type: String, default: '' },
  items: { type: Number, default: 0 },
  amount: { type: String, default: '$0.00' },
  status: { type: String, default: 'Pending' }
}, { timestamps: true })

const saleSchema = new mongoose.Schema({
  invoice: { type: String, required: true },
  customer: { type: String, default: 'Walk-in Customer' },
  date: { type: String, default: '' },
  items: { type: Number, default: 0 },
  payment: { type: String, default: 'Cash' },
  total: { type: String, default: '$0.00' },
  status: { type: String, default: 'Completed' }
}, { timestamps: true })

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  prescriptions: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  balance: { type: String, default: '$0.00' },
  status: { type: String, default: 'Active' }
}, { timestamps: true })

const alertSchema = new mongoose.Schema({
  alert: { type: String, required: true },
  medicine: { type: String, required: true },
  batch: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  threshold: { type: Number, default: 0 },
  expiry: { type: String, default: '' },
  severity: { type: String, default: 'Warning' }
}, { timestamps: true })

const reportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  period: { type: String, default: '' },
  date: { type: String, default: '' },
  author: { type: String, default: 'Administrator' },
  format: { type: String, default: 'PDF' },
  status: { type: String, default: 'Ready' }
}, { timestamps: true })

const stockHistorySchema = new mongoose.Schema({
  date: { type: String, default: '' },
  medicine: { type: String, required: true },
  batch: { type: String, default: '' },
  type: { type: String, default: 'Adjustment' },
  quantity: { type: Number, default: 0 },
  previous: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  reference: { type: String, default: '' }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users')
const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema, 'medicines')
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
  return mongoose.connection
}

module.exports = {
  connectDB,
  models
}
