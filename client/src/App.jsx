import { useEffect, useRef, useState } from 'react'
import './App.css'
import './Login.css'

const API_BASE = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? '' : 'http://localhost:5000')

const navigation = [
  ['dashboard', 'Dashboard'],
  ['pill', 'Medicines'],
  ['cube', 'Inventory'],
  ['truck', 'Suppliers'],
  ['box', 'Purchases'],
  ['cart', 'Sales & Billing'],
  ['users', 'Customers'],
  ['bell', 'Alerts'],
  ['report', 'Reports'],
  ['history', 'Stock History'],
  ['user', 'User Management'],
]

function formatDate(date, format) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  if (format === 'Month DD, YYYY') return `${month} ${day}, ${year}`
  if (format === 'YYYY Month DD') return `${year} ${month} ${day}`
  return `${day} ${month} ${year}`
}

function isExpiredDate(expiryDate) {
  if (!expiryDate) return false
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ? new Date(`${expiryDate}T23:59:59.999`)
    : new Date(expiryDate)
  return !Number.isNaN(expiry.getTime()) && expiry < new Date()
}

function getStoredToken() {
  return localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
}

function authenticatedFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getStoredToken()}` }
  return fetch(url, { ...options, headers })
}

function getDisplayName(email) {
  const localPart = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return localPart ? localPart.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ') : 'Administrator'
}

function getInitials(name) {
  return name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase()
}

async function readApiResponse(response) {
  const body = await response.text()
  if (!body.trim()) return {}

  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`)
  }
}

function Icon({ name, size = 21 }) {
  const paths = {
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    pill: <><path d="M8.5 15.5 15.5 8.5a4.24 4.24 0 0 0-6-6l-7 7a4.24 4.24 0 0 0 6 6Z" /><path d="m6 12 6-6" /><path d="m15.5 8.5 7 7a4.24 4.24 0 0 1-6 6l-7-7" /></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
    box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
    cart: <><path d="M3 4h2l2.2 11h10.9l2-8H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11a3 3 0 1 0 0-6M17 15c2.2 0 4 1.5 4 4" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" /></>,
    report: <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h4M8 13h8M8 17h6" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6M12 7v5l3 2" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7.6v-2h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L9 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /><path d="M18 12h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    pills: <><circle cx="9" cy="9" r="4" /><circle cx="15" cy="15" r="4" /><path d="m6 12 6-6M12 18l6-6" /></>,
    warning: <><path d="m12 4 9 16H3L12 4Z" /><path d="M12 9v5M12 17h.01" /></>,
    pulse: <path d="M3 13h4l2-6 4 12 2-6h6" />,
  }

  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function SignIn({ onSignIn }) {
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (isRegistering && (!name.trim() || !phone.trim())) {
      setError('Please enter your name and phone number.')
      return
    }
    if (!email.trim() || !password || (isRegistering && password !== confirmPassword)) {
      setError(isRegistering && password !== confirmPassword ? 'Passwords do not match.' : 'Please complete all required fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}${isRegistering ? '/api/auth/register' : '/api/auth/login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), password })
      })
      const data = await readApiResponse(response)
      if (!response.ok) {
        throw new Error(data.error || (isRegistering ? 'Registration failed' : 'Authentication failed'))
      }
      if (isRegistering) {
        setMessage(data.message || 'Registration successful. You can now sign in.')
        setIsRegistering(false)
        setPassword('')
        setConfirmPassword('')
      } else {
        onSignIn(data.token, data.user, keepSignedIn)
      }
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Unable to reach the MediCore server. Start the API server and make sure MongoDB is running.'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-container">
      <section className="left-panel">
        <header className="brand">
          <div className="brand-mark">M<span>+</span></div>
          <div>
            <div className="brand-name">MediCore</div>
            <div className="brand-caption">PHARMACY SYSTEMS</div>
          </div>
        </header>
        <div className="operational"><span /> Systems operational</div>
        <div className="dashboard-content">
          <div className="intelligence"><Icon name="spark" size={16} /> PHARMACY INTELLIGENCE</div>
          <h1>Your pharmacy,<br />always in control.</h1>
          <div className="overview-card">
            <div className="overview-heading">
              <div><div className="eyebrow">TODAY&apos;S OVERVIEW</div><strong>Inventory health</strong></div>
              <div className="window-dots"><i /><i /><i /></div>
            </div>
            <div className="inventory-cards">
              <div className="inventory-card"><div className="metric-icon blue"><Icon name="pills" size={22} /></div><strong>1,284</strong><span>Medicines</span></div>
              <div className="inventory-card"><div className="metric-icon amber"><Icon name="warning" size={22} /></div><strong>18</strong><span>Low stock</span></div>
              <div className="inventory-card"><div className="metric-icon teal"><Icon name="cube" size={22} /></div><strong>96%</strong><span>In stock</span></div>
            </div>
            <div className="chart-card">
              <div className="chart-title"><span>Stock activity</span><strong>Last 7 days</strong></div>
              <Icon name="pulse" size={29} />
              <div className="chart-bars">{[38, 51, 43, 61, 54, 78, 68, 85, 58, 76, 64, 89].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            </div>
          </div>
        </div>
        <footer>© 2025 MEDICORE PHARMACY SYSTEMS</footer>
      </section>
      <section className="right-panel">
        <div className="login-card">
          <div className="login-icon"><Icon name="lock" size={26} /></div>
          <div className="access-header">{isRegistering ? 'STAFF REGISTRATION' : 'STAFF ACCESS'}</div>
          <h2>{isRegistering ? 'Create your account' : 'Welcome back'}</h2>
          <p className="form-subtitle">{isRegistering ? 'Register for access to MediCore.' : 'Sign in to manage your pharmacy operations.'}</p>
          {error && (
            <div className="login-error-message">
              <Icon name="shield" size={16} />
              <span>{error}</span>
            </div>
          )}
          {message && <div className="login-success-message">{message}</div>}
          <form onSubmit={handleSubmit}>
            {isRegistering && <><div className="form-group"><label htmlFor="name">Full name</label><div className="input-wrapper"><Icon name="user" size={22} /><input id="name" value={name} onChange={(event) => setName(event.target.value)} required /></div></div><div className="form-group"><label htmlFor="phone">Phone number</label><div className="input-wrapper"><Icon name="mail" size={22} /><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div></div></>}
            <div className="form-group"><label htmlFor="email">Email address</label><div className="input-wrapper"><Icon name="mail" size={22} /><input type="email" id="email" placeholder="name@pharmacy.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></div>
            <div className="form-group password-group"><div className="label-row"><label htmlFor="password">Password</label></div><div className="input-wrapper"><Icon name="lock" size={22} /><input type={showPassword ? 'text' : 'password'} id="password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={21} /></button></div></div>
            {isRegistering && <div className="form-group"><label htmlFor="confirm-password">Confirm password</label><div className="input-wrapper"><Icon name="lock" size={22} /><input type="password" id="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div></div>}
            {!isRegistering && <label className="checkbox-label"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /><span>Keep me signed in on this device</span></label>}
            <button type="submit" className="submit-button" disabled={loading}>{loading ? (isRegistering ? 'Creating account...' : 'Signing in...') : <>{isRegistering ? 'Create staff account' : 'Sign in to MediCore'} <Icon name="arrow" size={21} /></>}</button>
          </form>
          <div className="card-divider" />
          <div className="admin-link"><span>{isRegistering ? 'Already have an account?' : 'Need a staff account?'}</span><button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); setMessage('') }}>{isRegistering ? 'Sign in instead' : 'Register here'} <Icon name="arrow" size={18} /></button></div>
        </div>
        <div className="protected"><Icon name="shield" size={18} /> Protected with secure, role-based access</div>
      </section>
    </main>
  )
}


function MetricCard({ icon, label, tone, value, detail }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon name={icon} size={23} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong className="metric-value">{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function DashboardOverview({ onNavigate }) {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    fetch(`${API_BASE}/api/medicines`)
      .then((response) => readApiResponse(response).then((data) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load dashboard inventory')
        setMedicines(data)
      }))
      .catch(() => setMedicines([]))
      .finally(() => setLoading(false))
  }, [])

  const batches = medicines.flatMap((medicine) => medicine.batches || [])
  const availableStock = batches.reduce((total, batch) => total + (Number(batch.quantity) || 0), 0)
  const lowStock = batches.filter((batch) => {
    const quantity = Number(batch.quantity) || 0
    const minimum = batch.minimumStock !== undefined && batch.minimumStock !== null ? (Number(batch.minimumStock) || 0) : 10
    return quantity <= minimum
  }).length
  const expiredOrExpiring = batches.filter((batch) => batch.expiryDate && new Date(batch.expiryDate) <= new Date(now + 30 * 24 * 60 * 60 * 1000)).length
  const inStockRate = batches.length ? Math.round((batches.filter((batch) => Number(batch.quantity) > 0).length / batches.length) * 100) : 0
  const value = (number) => loading ? '...' : number.toLocaleString()

  return <div className="content">
    <div className="welcome-row">
      <p>Here&apos;s what&apos;s happening today.</p>
      <div className="quick-actions"><button className="secondary-button" type="button" onClick={() => onNavigate('Purchases')}><Icon name="plus" size={18} /> New purchase</button><button className="primary-button" type="button" onClick={() => onNavigate('Sales & Billing')}><Icon name="cart" size={19} /> Create sale</button></div>
    </div>
    <section className="metrics-grid" aria-label="Pharmacy summary">
      <MetricCard icon="pill" label="Total medicines" tone="blue" value={value(medicines.length)} detail={`${batches.length.toLocaleString()} batches`} />
      <MetricCard icon="cube" label="Available stock" tone="green" value={value(availableStock)} detail="Units across batches" />
      <MetricCard icon="report" label="In-stock batches" tone="purple" value={loading ? '...' : `${inStockRate}%`} detail={`${batches.filter((batch) => Number(batch.quantity) > 0).length} active batches`} />
      <MetricCard icon="bell" label="Needs attention" tone="orange" value={value(lowStock + expiredOrExpiring)} detail={`${lowStock} low stock · ${expiredOrExpiring} expiring`} />
    </section>
    <section className="primary-grid">
      <article className="panel sales-panel">
        <div className="panel-header"><div><h2>Inventory overview</h2><p>Live stock health across medicine batches</p></div><a href="#medicines" onClick={(event) => { event.preventDefault(); onNavigate('Medicines') }}>Manage medicines <Icon name="arrow" size={16} /></a></div>
        <div className="dashboard-inventory-summary"><strong>{value(availableStock)}</strong><span>units currently available</span><div className="inventory-progress"><i style={{ width: `${inStockRate}%` }} /></div><small>{loading ? 'Loading inventory...' : `${inStockRate}% of batches have available stock`}</small></div>
      </article>
      <article className="panel alerts-panel">
        <div className="panel-header"><div><h2>Inventory alerts</h2><p>Items requiring action</p></div><a href="#medicines" onClick={(event) => { event.preventDefault(); onNavigate('Medicines') }}>View medicines <Icon name="arrow" size={16} /></a></div>
        {loading ? <div className="alert-empty">Loading alerts...</div> : lowStock + expiredOrExpiring === 0 ? <div className="alert-empty"><div className="empty-state-icon"><Icon name="bell" size={23} /></div><strong>No alerts</strong><span>All medicine batches are healthy.</span></div> : <div className="dashboard-alert-list"><span><Icon name="warning" size={17} /> {lowStock} low-stock batch{lowStock === 1 ? '' : 'es'}</span><span><Icon name="warning" size={17} /> {expiredOrExpiring} expiring within 30 days</span></div>}
      </article>
    </section>
    <section className="secondary-grid">
      <article className="panel activity-panel"><div className="panel-header"><div><h2>Recent batches</h2><p>Latest batch records</p></div><a href="#medicines" onClick={(event) => { event.preventDefault(); onNavigate('Medicines') }}>View all <Icon name="arrow" size={16} /></a></div>{batches.length ? <div className="dashboard-batch-list">{batches.slice(0, 5).map((batch) => <div key={batch._id}><strong>{batch.batchNumber}</strong><span>{batch.quantity} units · {batch.expiryDate || 'No expiry date'}</span></div>)}</div> : <EmptyRows type="stock" />}</article>
      <article className="panel activity-panel"><div className="panel-header"><div><h2>Catalog summary</h2><p>Medicine records by category</p></div><a href="#medicines" onClick={(event) => { event.preventDefault(); onNavigate('Medicines') }}>View catalog <Icon name="arrow" size={16} /></a></div>{medicines.length ? <div className="dashboard-batch-list">{[...new Set(medicines.map((medicine) => medicine.category || 'Uncategorized'))].slice(0, 5).map((item) => <div key={item}><strong>{item}</strong><span>{medicines.filter((medicine) => (medicine.category || 'Uncategorized') === item).length} medicines</span></div>)}</div> : <EmptyRows type="stock" />}</article>
    </section>
  </div>
}

function EmptyRows({ type }) {
  return (
    <div className="empty-list">
      <div className="empty-state-icon"><Icon name={type === 'sales' ? 'report' : 'cube'} size={24} /></div>
      <strong>No records yet</strong>
      <span>{type === 'sales' ? 'Sales will appear here once they are added.' : 'Inventory activity will appear here once it is added.'}</span>
    </div>
  )
}

function MedicineCatalog({ canEdit }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [medicines, setMedicines] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadMedicines = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/medicines`)
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to load medicines')
      setMedicines(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedicines()
    fetch(`${API_BASE}/api/suppliers`)
      .then((response) => readApiResponse(response).then((data) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load suppliers')
        setSuppliers(data)
      }))
      .catch((err) => setError(err.message))
  }, [])

  const categories = [...new Set(medicines.map((medicine) => medicine.category).filter(Boolean))].sort()
  const filteredMedicines = medicines.filter((medicine) => {
    const matchesQuery = Object.values(medicine).some((value) => typeof value !== 'object' && String(value).toLowerCase().includes(query.toLowerCase()))
    return matchesQuery && (!category || medicine.category === category)
  })
  const openMedicine = (medicine = {}) => {
    setError('')
    setForm({ name: '', genericName: '', category: '', dosage: '', manufacturer: '', purchasePrice: 0, sellingPrice: 0, status: 'In Stock', ...medicine, brandName: medicine.brandName || medicine.name || '' })
    setModal({ type: 'medicine', item: medicine._id ? medicine : null })
  }
  const openBatch = (medicine, batch = {}) => {
    setError('')
    setForm({ medicineId: medicine._id, batchNumber: '', quantity: 0, minimumStock: 10, manufacturingDate: '', expiryDate: '', purchasePrice: 0, sellingPrice: 0, location: '', ...batch, minimumStock: batch.minimumStock ?? 10, supplier: batch.supplier?._id || batch.supplier || '' })
    setModal({ type: 'batch', item: batch._id ? batch : null, medicine })
  }
  const save = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const isBatch = modal.type === 'batch'
      const url = isBatch
        ? `${API_BASE}${modal.item ? `/api/batches/${modal.item._id}` : `/api/medicines/${form.medicineId}/batches`}`
        : `${API_BASE}/api/medicines${modal.item ? `/${modal.item._id}` : ''}`
      const payload = { ...form }
      delete payload.medicineId
      const response = await authenticatedFetch(url, { method: modal.item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to save record')
      setModal(null)
      await loadMedicines()
    } catch (err) {
      setError(err.message)
    }
  }
  const remove = async (url, message) => {
    if (!window.confirm(message)) return
    try {
      const response = await authenticatedFetch(`${API_BASE}${url}`, { method: 'DELETE' })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to delete record')
      await loadMedicines()
    } catch (err) {
      setError(err.message)
    }
  }
  const exportCsv = () => {
    const rows = [['Brand', 'Generic', 'Category', 'Manufacturer', 'Batch', 'Supplier', 'Quantity', 'Manufactured', 'Expiry', 'Purchase price', 'Selling price']]
    filteredMedicines.forEach((medicine) => (medicine.batches || []).forEach((batch) => rows.push([medicine.brandName || medicine.name, medicine.genericName, medicine.category, medicine.manufacturer, batch.batchNumber, batch.supplier?.name || '', batch.quantity, batch.manufacturingDate, batch.expiryDate, batch.purchasePrice, batch.sellingPrice])))
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = 'medicines.csv'
    link.click()
  }

  return (
    <div className="medicine-content">
      <section className="medicine-panel">
        <div className="medicine-heading">
          <div>
            <h2>Medicine catalog</h2>
            <p>Manage medicines, batches, pricing, and expiry details.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => openMedicine()} disabled={!canEdit}><Icon name="pill" size={19} /> Add medicine</button>
        </div>
        <div className="medicine-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine catalog..." aria-label="Search medicine catalog" /></label>
          <select className="catalog-button category-filter" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button className="catalog-button" type="button" onClick={exportCsv}><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="medicine-table-wrap">
          <table className="medicine-table">
            <thead><tr><th>Brand</th><th>Generic</th><th>Category</th><th>Manufacturer</th><th>Batch</th><th>Supplier</th><th>Quantity</th><th>Manufactured</th><th>Expiry</th><th>Prices</th><th>Actions</th></tr></thead>
            <tbody>{filteredMedicines.flatMap((medicine) => (medicine.batches?.length ? medicine.batches : [null]).map((batch) => <tr key={`${medicine._id}-${batch?._id || 'empty'}`}>
              <td><strong>{medicine.brandName || medicine.name}</strong></td><td>{medicine.genericName || '-'}</td><td>{medicine.category || '-'}</td><td>{medicine.manufacturer || '-'}</td><td>{batch?.batchNumber || 'No batches'}</td><td>{batch?.supplier?.name || '-'}</td><td>{batch?.quantity ?? 0}</td><td>{batch?.manufacturingDate || '-'}</td><td>{batch?.expiryDate || '-'}</td><td>{batch ? `Rs. ${batch.purchasePrice} / ${batch.sellingPrice}` : medicine.sellingPrice ? `Rs. ${medicine.sellingPrice}` : '-'}</td>
              <td className="table-actions"><button type="button" disabled={!canEdit} onClick={() => openMedicine(medicine)}>Edit</button>{batch ? <><button type="button" disabled={!canEdit} onClick={() => openBatch(medicine, batch)}>View / edit</button><button type="button" disabled={!canEdit} onClick={() => remove(`/api/batches/${batch._id}`, 'Delete this batch?')}>Delete batch</button></> : <button type="button" disabled={!canEdit} onClick={() => openBatch(medicine)}>Add batch</button>}<button type="button" disabled={!canEdit} onClick={() => remove(`/api/medicines/${medicine._id}`, 'Delete this medicine and all its batches?')}>Delete</button></td>
            </tr>))}</tbody>
          </table>
          {loading && <div className="catalog-empty">Loading medicines...</div>}
          {!loading && filteredMedicines.length === 0 && <div className="catalog-empty">No medicines match your search.</div>}
          {error && <div className="catalog-error">{error}</div>}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredMedicines.length} of {medicines.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button>Next</button></div>
        </div>
      </section>
      {modal && <div className="modal-backdrop" onClick={() => setModal(null)}>
        <form className="modal-card" onSubmit={save} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><h3>{modal.type === 'batch' ? `${modal.item ? 'Edit' : 'Add'} batch` : `${modal.item ? 'Edit' : 'Add'} medicine`}</h3><p>{modal.type === 'batch' ? modal.medicine.name : 'Keep medicine details and categories up to date.'}</p></div><button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close"><Icon name="close" size={18} /></button></div>
          <div className="modal-body medicine-form">
            {modal.type === 'medicine' ? <>
              {[['brandName', 'Brand name'], ['genericName', 'Generic name'], ['category', 'Category'], ['dosage', 'Dosage'], ['manufacturer', 'Manufacturer'], ['purchasePrice', 'Default purchase price'], ['sellingPrice', 'Default selling price']].map(([field, label]) => <label key={field} className="settings-field"><span>{label}</span><input type={['purchasePrice', 'sellingPrice'].includes(field) ? 'number' : 'text'} min="0" required={field === 'brandName'} value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value, ...(field === 'brandName' ? { name: event.target.value } : {}) })} /></label>)}
              <label className="settings-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></label>
            </> : <>
              <label className="settings-field"><span>Supplier</span><select value={form.supplier || ''} onChange={(event) => setForm({ ...form, supplier: event.target.value })}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>
              {[['batchNumber', 'Batch number'], ['quantity', 'Quantity'], ['minimumStock', 'Low-stock threshold'], ['manufacturingDate', 'Manufacturing date'], ['expiryDate', 'Expiry date'], ['purchasePrice', 'Purchase price'], ['sellingPrice', 'Selling price'], ['location', 'Location']].map(([field, label]) => <label key={field} className="settings-field"><span>{label}</span><input type={['manufacturingDate', 'expiryDate'].includes(field) ? 'date' : ['quantity', 'minimumStock', 'purchasePrice', 'sellingPrice'].includes(field) ? 'number' : 'text'} min="0" required={field === 'batchNumber'} value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}
            </>}
            {error && <div className="login-error-message">{error}</div>}
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" type="submit">Save</button></div>
        </form>
      </div>}
    </div>
  )
}

function InventoryStock({ canEdit }) {
  const [query, setQuery] = useState('')
  const [inventory, setInventory] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ batchId: '', mode: 'set', quantity: 0, reference: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [inventoryResponse, medicineResponse] = await Promise.all([
        fetch(`${API_BASE}/api/inventory`),
        fetch(`${API_BASE}/api/medicines`)
      ])
      const inventoryData = await readApiResponse(inventoryResponse)
      const medicineData = await readApiResponse(medicineResponse)
      if (!inventoryResponse.ok) throw new Error(inventoryData.error || 'Unable to load inventory')
      if (!medicineResponse.ok) throw new Error(medicineData.error || 'Unable to load batches')
      setInventory(inventoryData)
      setBatches(medicineData.flatMap((medicine) => (medicine.batches || []).map((batch) => ({ ...batch, medicineName: medicine.brandName || medicine.name }))))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const saveAdjustment = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/stock-adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to adjust stock')
      setModal(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const exportCsv = () => {
    const rows = [['Medicine', 'Batch', 'Available', 'Reserved', 'Minimum', 'Status', 'Location', 'Expiry'], ...filteredInventory.map((item) => [item.name, item.batch, item.available, item.reserved, item.minimum, item.status, item.location, item.expiry])]
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = 'inventory.csv'
    link.click()
  }
  const filteredInventory = inventory.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="inventory-content">
      <section className="inventory-panel">
        <div className="inventory-heading">
          <div>
            <h2>Current inventory</h2>
            <p>Track available quantities and stock by batch.</p>
          </div>
          <button className="primary-button" type="button" disabled={!canEdit} onClick={() => { setError(''); setForm({ batchId: batches[0]?._id || '', mode: 'set', quantity: 0, reference: '' }); setModal(true) }}><Icon name="cube" size={19} /> Adjust stock</button>
        </div>
        <div className="inventory-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current inventory..." aria-label="Search current inventory" /></label>
          <button className="catalog-button" type="button" onClick={exportCsv}><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="inventory-table-wrap">
          <table className="medicine-table inventory-table">
            <thead><tr><th>Item</th><th>Batch</th><th>Available</th><th>Reserved</th><th>Minimum</th><th>Status</th><th>Location</th></tr></thead>
            <tbody>{filteredInventory.map((item) => <tr key={item.batch}>
              <td><strong>{item.name}</strong></td><td>{item.batch}</td><td>{item.available}</td><td>{item.reserved}</td><td>{item.minimum}</td><td>{item.status}</td><td>{item.location}</td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="inventory-empty-space">Loading inventory...</div>}
          {!loading && filteredInventory.length === 0 && <div className="inventory-empty-space" aria-label="No inventory records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredInventory.length} of {inventory.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
      {modal && <div className="modal-backdrop" onClick={() => setModal(false)}>
        <form className="modal-card" onSubmit={saveAdjustment} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><h3>Adjust stock</h3><p>Set, add, or remove units for a medicine batch.</p></div><button className="modal-close" type="button" onClick={() => setModal(false)} aria-label="Close"><Icon name="close" size={18} /></button></div>
          <div className="modal-body medicine-form">
            <label className="settings-field"><span>Medicine batch</span><select value={form.batchId} onChange={(event) => setForm({ ...form, batchId: event.target.value })} required><option value="">Select batch</option>{batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.medicineName} - {batch.batchNumber} ({batch.quantity} units)</option>)}</select></label>
            <label className="settings-field"><span>Adjustment type</span><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="set">Set exact quantity</option><option value="add">Add incoming units</option><option value="remove">Remove units</option></select></label>
            <label className="settings-field"><span>Quantity</span><input type="number" min="0" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
            <label className="settings-field"><span>Reference / reason</span><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Damage, correction, count, etc." /></label>
            {error && <div className="login-error-message">{error}</div>}
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(false)}>Cancel</button><button className="primary-button" type="submit">Apply adjustment</button></div>
        </form>
      </div>}
    </div>
  )
}

function SupplierDirectory({ canEdit }) {
  const [query, setQuery] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/suppliers`)
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to load suppliers')
      setSuppliers(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const openSupplier = (supplier = {}, mode = supplier._id ? 'edit' : 'create') => {
    setError('')
    setForm({ name: '', contact: '', phone: '', email: '', address: '', ...supplier })
    setModal(mode)
  }
  const save = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/suppliers${form._id ? `/${form._id}` : ''}`, {
        method: form._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to save supplier')
      setModal(null)
      await load()
    } catch (err) { setError(err.message) }
  }
  const remove = async (supplier) => {
    if (!window.confirm(`Delete ${supplier.name}?`)) return
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/suppliers/${supplier._id}`, { method: 'DELETE' })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to delete supplier')
      await load()
    } catch (err) { setError(err.message) }
  }
  const filteredSuppliers = suppliers.filter((supplier) =>
    Object.values(supplier).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="supplier-content">
      <section className="supplier-panel">
        <div className="supplier-heading">
          <div>
            <h2>Supplier directory</h2>
            <p>Manage supplier contacts, balances, and purchase history.</p>
          </div>
          <button className="primary-button" type="button" disabled={!canEdit} onClick={() => openSupplier()}><Icon name="truck" size={19} /> Add supplier</button>
        </div>
        <div className="supplier-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier directory..." aria-label="Search supplier directory" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
        </div>
        <div className="supplier-table-wrap">
          <table className="medicine-table supplier-table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Purchases</th><th>Balance</th><th>Actions</th></tr></thead>
            <tbody>{filteredSuppliers.map((supplier) => <tr key={supplier.name}>
              <td><strong>{supplier.name}</strong></td><td>{supplier.contact || '-'}</td><td>{supplier.phone || '-'}</td><td>{supplier.email || '-'}</td><td>{supplier.address || '-'}</td><td>{supplier.purchases}</td><td>{supplier.balance}</td><td className="table-actions"><button type="button" onClick={() => openSupplier(supplier, 'view')}>View</button><button type="button" disabled={!canEdit} onClick={() => openSupplier(supplier)}>Edit</button><button type="button" disabled={!canEdit} onClick={() => remove(supplier)}>Delete</button></td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="supplier-empty-space">Loading suppliers...</div>}
          {filteredSuppliers.length === 0 && <div className="supplier-empty-space" aria-label="No supplier records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredSuppliers.length} of {suppliers.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
      {modal && <div className="modal-backdrop" onClick={() => setModal(null)}>
        <form className="modal-card" onSubmit={save} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><h3>{modal === 'view' ? 'Supplier details' : form._id ? 'Edit supplier' : 'Add supplier'}</h3><p>Store supplier contact and address details.</p></div><button className="modal-close" type="button" onClick={() => setModal(null)}><Icon name="close" size={18} /></button></div>
          <div className="modal-body medicine-form">
            {[['name', 'Supplier name'], ['contact', 'Contact person'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address']].map(([field, label]) => <label className="settings-field" key={field}><span>{label}</span><input disabled={modal === 'view'} type={field === 'email' ? 'email' : 'text'} required={field === 'name'} value={form[field] || ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}
            {error && <div className="login-error-message">{error}</div>}
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(null)}>{modal === 'view' ? 'Close' : 'Cancel'}</button>{modal !== 'view' && <button className="primary-button" type="submit">Save supplier</button>}</div>
        </form>
      </div>}
    </div>
  )
}

function PurchaseOrders({ canEdit }) {
  const [query, setQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [purchases, setPurchases] = useState([])
  const [batches, setBatches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [form, setForm] = useState({ reference: '', supplier: '', date: '', lineItems: [{ batchId: '', quantity: 1, purchasePrice: 0 }] })
  const load = async () => {
    setLoading(true)
    try {
      const [purchaseResponse, medicineResponse, supplierResponse] = await Promise.all([fetch(`${API_BASE}/api/purchases`), fetch(`${API_BASE}/api/medicines`), fetch(`${API_BASE}/api/suppliers`)])
      const purchaseData = await readApiResponse(purchaseResponse)
      const medicineData = await readApiResponse(medicineResponse)
      const supplierData = await readApiResponse(supplierResponse)
      if (!purchaseResponse.ok) throw new Error(purchaseData.error || 'Unable to load purchases')
      if (!medicineResponse.ok) throw new Error(medicineData.error || 'Unable to load medicines')
      if (!supplierResponse.ok) throw new Error(supplierData.error || 'Unable to load suppliers')
      setPurchases(purchaseData)
      setSuppliers(supplierData)
      setBatches(medicineData.flatMap((medicine) => (medicine.batches || []).map((batch) => ({ ...batch, medicineName: medicine.brandName || medicine.name }))))
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const save = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: form.reference,
          supplier: form.supplier,
          date: form.date,
          lineItems: form.lineItems.map((line) => ({ ...line, quantity: Number(line.quantity), purchasePrice: Number(line.purchasePrice) }))
        })
      })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to record purchase')
      setModal(null)
      await load()
    } catch (err) { setError(err.message) }
  }
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesQuery = Object.values(purchase).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))
    const matchesSupplier = !supplierFilter || purchase.supplier === supplierFilter
    const matchesDate = !dateFilter || purchase.date === dateFilter
    return matchesQuery && matchesSupplier && matchesDate
  })
  const purchaseTotal = form.lineItems.reduce((total, line) =>
    total + (Number(line.quantity) || 0) * (Number(line.purchasePrice) || 0), 0)
  const updateLine = (index, field, value) => setForm((current) => ({
    ...current,
    lineItems: current.lineItems.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
  }))

  return (
    <div className="purchase-content">
      <section className="purchase-panel">
        <div className="purchase-heading">
          <div><h2>Purchase orders</h2><p>Record incoming stock and supplier invoices.</p></div>
          <button className="primary-button" type="button" disabled={!canEdit} onClick={() => { setError(''); setForm({ reference: `PO-${Date.now().toString().slice(-6)}`, supplier: suppliers[0]?._id || '', date: new Date().toISOString().slice(0, 10), lineItems: [{ batchId: batches[0]?._id || '', quantity: 1, purchasePrice: 0 }] }); setModal('create') }}><Icon name="box" size={19} /> New purchase</button>
        </div>
        <div className="purchase-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, supplier, or date..." /></label>
          <select className="category-filter" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} aria-label="Filter by supplier"><option value="">All suppliers</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier.name}>{supplier.name}</option>)}</select>
          <input className="purchase-date-filter" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by purchase date" />
          {(supplierFilter || dateFilter) && <button type="button" className="catalog-button" onClick={() => { setSupplierFilter(''); setDateFilter('') }}>Clear filters</button>}
        </div>
        <div className="purchase-table-wrap">
          <table className="medicine-table purchase-table"><thead><tr><th>Reference / Invoice</th><th>Supplier</th><th>Date</th><th>Items</th><th>Total amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredPurchases.map((purchase) => <tr key={purchase._id}><td><strong>{purchase.reference}</strong></td><td>{purchase.supplier}</td><td>{purchase.date}</td><td>{purchase.items}</td><td>{purchase.amount}</td><td>{purchase.status}</td><td className="table-actions"><button type="button" onClick={() => { setSelectedPurchase(purchase); setModal('view') }}>View</button></td></tr>)}</tbody>
          </table>
          {loading && <div className="purchase-empty-space">Loading purchases...</div>}
          {!loading && filteredPurchases.length === 0 && <div className="purchase-empty-space" aria-label="No purchase order records" />}
        </div>
        <div className="medicine-footer"><span>Showing {filteredPurchases.length} of {purchases.length} records</span></div>
      </section>
      {modal === 'create' && <div className="modal-backdrop" onClick={() => setModal(null)}>
        <form className="modal-card" onSubmit={save} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><h3>New purchase</h3><p>Receiving stock will increase the selected batch automatically.</p></div><button className="modal-close" type="button" onClick={() => setModal(null)}><Icon name="close" size={18} /></button></div>
          <div className="modal-body medicine-form">
            <label className="settings-field"><span>Reference / Invoice number</span><input required value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
            <label className="settings-field"><span>Supplier</span><select required value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>
            <label className="settings-field"><span>Date</span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <div className="purchase-line-items">
              {form.lineItems.map((line, index) => <div className="purchase-line" key={index}>
                <label className="settings-field"><span>Medicine batch</span><select required value={line.batchId} onChange={(event) => updateLine(index, 'batchId', event.target.value)}><option value="">Select batch</option>{batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.medicineName} - {batch.batchNumber}</option>)}</select></label>
                <label className="settings-field"><span>Quantity</span><input type="number" min="1" required value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></label>
                <label className="settings-field"><span>Unit price</span><input type="number" min="0" step="0.01" required value={line.purchasePrice} onChange={(event) => updateLine(index, 'purchasePrice', event.target.value)} /></label>
                {form.lineItems.length > 1 && <button type="button" className="purchase-remove-line" onClick={() => setForm({ ...form, lineItems: form.lineItems.filter((_, lineIndex) => lineIndex !== index) })} aria-label="Remove purchase item"><Icon name="close" size={16} /></button>}
              </div>)}
              <button type="button" className="secondary-button purchase-add-line" onClick={() => setForm({ ...form, lineItems: [...form.lineItems, { batchId: '', quantity: 1, purchasePrice: 0 }] })}><Icon name="plus" size={17} /> Add medicine</button>
              <div className="purchase-total">Total purchase amount <strong>Rs. {purchaseTotal.toFixed(2)}</strong></div>
            </div>
            {error && <div className="login-error-message">{error}</div>}
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" type="submit">Receive stock</button></div>
        </form>
      </div>}
      {modal === 'view' && selectedPurchase && <div className="modal-backdrop" onClick={() => setModal(null)}>
        <section className="modal-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><h3>Purchase details</h3><p>{selectedPurchase.reference}</p></div><button className="modal-close" type="button" onClick={() => setModal(null)}><Icon name="close" size={18} /></button></div>
          <div className="modal-body purchase-detail">
            <div className="purchase-detail-summary">
              <span><small>Supplier</small><strong>{selectedPurchase.supplier}</strong></span>
              <span><small>Purchase date</small><strong>{selectedPurchase.date}</strong></span>
              <span><small>Total amount</small><strong>{selectedPurchase.amount}</strong></span>
              <span><small>Status</small><strong>{selectedPurchase.status}</strong></span>
            </div>
            <table className="medicine-table purchase-detail-table">
              <thead><tr><th>Medicine</th><th>Batch</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead>
              <tbody>{(selectedPurchase.lineItems || []).map((line, index) => <tr key={`${line.batchId}-${index}`}><td>{line.medicine || '-'}</td><td>{line.batchNumber || line.batchId}</td><td>{line.quantity}</td><td>Rs. {Number(line.purchasePrice || 0).toFixed(2)}</td><td>Rs. {(Number(line.quantity || 0) * Number(line.purchasePrice || 0)).toFixed(2)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Close</button></div>
        </section>
      </div>}
    </div>
  )
}

function SalesBilling({ canEdit }) {
  const [query, setQuery] = useState('')
  const [sales, setSales] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState([])
  const [lastSale, setLastSale] = useState(null)
  const [form, setForm] = useState(() => ({ invoice: `INV-${Date.now().toString().slice(-6)}`, customer: 'Walk-in Customer', date: new Date().toISOString().slice(0, 10), payment: 'Cash' }))
  const load = async () => {
    setLoading(true)
    try {
      const [salesResponse, medicineResponse] = await Promise.all([
        fetch(`${API_BASE}/api/sales`),
        fetch(`${API_BASE}/api/medicines`)
      ])
      const salesData = await readApiResponse(salesResponse)
      const medicineData = await readApiResponse(medicineResponse)
      if (!salesResponse.ok) throw new Error(salesData.error || 'Unable to load sales history')
      if (!medicineResponse.ok) throw new Error(medicineData.error || 'Unable to load medicines')
      setSales(salesData)
      setBatches(medicineData.flatMap((medicine) => (medicine.batches || []).map((batch) => ({ ...batch, medicineName: medicine.brandName || medicine.name }))))
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const openSale = () => {
    setError('')
    setLastSale(null)
    setForm({ invoice: `INV-${Date.now().toString().slice(-6)}`, customer: 'Walk-in Customer', date: new Date().toISOString().slice(0, 10), payment: 'Cash' })
    setCart([])
  }
  const addToCart = (batch) => {
    if (!canEdit || Number(batch.quantity) <= 0) return
    setCart((current) => {
      const existing = current.find((item) => item.batchId === batch._id)
      if (existing) {
        return current.map((item) => item.batchId === batch._id
          ? { ...item, quantity: Math.min(item.quantity + 1, Number(batch.quantity)) }
          : item)
      }
      return [...current, { batchId: batch._id, medicineName: batch.medicineName, batchNumber: batch.batchNumber, quantity: 1, available: Number(batch.quantity), sellingPrice: Number(batch.sellingPrice || batch.price || 0) }]
    })
  }
  const changeQuantity = (batchId, quantity) => {
    setCart((current) => current.map((item) => item.batchId === batchId
      ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.available)) }
      : item))
  }
  const removeFromCart = (batchId) => setCart((current) => current.filter((item) => item.batchId !== batchId))
  const subtotal = cart.reduce((total, item) => total + item.quantity * item.sellingPrice, 0)
  const save = async (event) => {
    event.preventDefault()
    if (!cart.length) {
      setError('Add at least one medicine to the bill.')
      return
    }
    setError('')
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lineItems: cart.map(({ batchId, quantity, sellingPrice }) => ({ batchId, quantity, sellingPrice })) })
      })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to record sale')
      setLastSale(data)
      setCart([])
      setForm({ invoice: `INV-${Date.now().toString().slice(-6)}`, customer: 'Walk-in Customer', date: new Date().toISOString().slice(0, 10), payment: 'Cash' })
      await load()
    } catch (err) { setError(err.message) }
  }
  const availableBatches = batches.filter((batch) => !isExpiredDate(batch.expiryDate) && `${batch.medicineName} ${batch.batchNumber}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="pos-content">
      <div className="pos-grid">
        <section className="pos-products">
          <div className="pos-section-heading"><div><h2>New sale</h2><p>Search medicines and add available batches</p></div></div>
          <label className="pos-search"><Icon name="search" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine by name, generic, or batch..." aria-label="Search medicine by name, generic, or batch" /></label>
          <div className="pos-product-grid">
            {loading && <p className="pos-empty">Loading medicines...</p>}
            {!loading && availableBatches.map((batch) => <button className="pos-product-card" type="button" key={batch._id} disabled={!canEdit || Number(batch.quantity) <= 0} onClick={() => addToCart(batch)}>
              <span className="pos-product-icon"><Icon name="pill" size={23} /></span>
              <span className="pos-product-copy"><strong>{batch.medicineName}</strong><small>{batch.quantity} in stock · Rs. {Number(batch.sellingPrice || batch.price || 0).toLocaleString()}</small></span>
              <span className="pos-add">+</span>
            </button>)}
            {!loading && availableBatches.length === 0 && <p className="pos-empty">No available medicines found.</p>}
          </div>
        </section>
        <form className="pos-bill" onSubmit={save}>
          <div className="pos-section-heading"><div><h2>Current bill</h2><p>Invoice #{form.invoice || 'New'} · {cart.length} {cart.length === 1 ? 'item' : 'items'}</p></div></div>
          <div className="pos-bill-items">
            {cart.map((item) => <div className="pos-bill-item" key={item.batchId}>
              <div><strong>{item.medicineName}</strong><small>{item.quantity} × Rs. {item.sellingPrice.toLocaleString()}</small></div>
              <strong>Rs. {(item.quantity * item.sellingPrice).toLocaleString()}</strong>
              <div className="pos-quantity"><button type="button" onClick={() => changeQuantity(item.batchId, item.quantity - 1)}>-</button><input value={item.quantity} onChange={(event) => changeQuantity(item.batchId, event.target.value)} aria-label={`Quantity for ${item.medicineName}`} /><button type="button" onClick={() => changeQuantity(item.batchId, item.quantity + 1)}>+</button><button className="pos-remove" type="button" onClick={() => removeFromCart(item.batchId)} aria-label={`Remove ${item.medicineName}`}>×</button></div>
            </div>)}
            {!cart.length && <div className="pos-bill-empty">Add medicines to start a new bill.</div>}
          </div>
          <div className="pos-bill-summary">
            <label><span>Customer</span><input value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} /></label>
            <label><span>Payment</span><select value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}><option>Cash</option><option>Card</option><option>Bank transfer</option></select></label>
            <div className="pos-total-row"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            <div className="pos-total-row"><span>Discount</span><span>Rs. 0</span></div>
            <div className="pos-total"><strong>Total</strong><strong>Rs. {subtotal.toLocaleString()}</strong></div>
          </div>
          {error && <div className="login-error-message">{error}</div>}
          <button className="pos-complete" type="submit" disabled={!canEdit || !cart.length}><Icon name="print" size={20} /> Complete sale &amp; print</button>
        </form>
      </div>
      {lastSale ? (
        <section className="pos-sale-confirmation" aria-live="polite">
          <div className="pos-sale-confirmation-heading"><div><strong>Sale completed</strong><span>Invoice #{lastSale.invoice}</span></div><strong>{lastSale.total}</strong></div>
          <div className="pos-sale-details"><span><small>Customer</small>{lastSale.customer}</span><span><small>Items</small>{lastSale.items}</span><span><small>Payment</small>{lastSale.payment}</span><span><small>Date</small>{lastSale.date}</span></div>
          <button className="secondary-button" type="button" disabled={!canEdit} onClick={openSale}><Icon name="plus" size={18} /> New bill</button>
        </section>
      ) : (
        <button className="pos-new-sale secondary-button" type="button" disabled={!canEdit} onClick={openSale}><Icon name="plus" size={18} /> New bill</button>
      )}
      <section className="pos-history">
        <div className="pos-history-heading"><div><h2>Sales history</h2><p>Completed sales and billing records</p></div><span>{sales.length} {sales.length === 1 ? 'sale' : 'sales'}</span></div>
        <div className="pos-history-table-wrap">
          <table className="medicine-table pos-history-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{sales.map((sale) => <tr key={sale._id || sale.id || sale.invoice}><td><strong>{sale.invoice}</strong></td><td>{sale.customer}</td><td>{sale.date}</td><td>{sale.items}</td><td>{sale.payment}</td><td>{sale.total}</td><td>{sale.status}</td></tr>)}</tbody>
          </table>
          {!loading && sales.length === 0 && <div className="pos-history-empty">No completed sales yet.</div>}
        </div>
      </section>
    </div>
  )
}

function CustomerDirectory() {
  const [query, setQuery] = useState('')
  const customers = []
  const filteredCustomers = customers.filter((customer) =>
    Object.values(customer).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="customer-content">
      <section className="customer-panel">
        <div className="customer-heading">
          <div>
            <h2>Customer directory</h2>
            <p>Manage customer profiles, contact details, and prescription history.</p>
          </div>
          <button className="primary-button"><Icon name="users" size={19} /> Add customer</button>
        </div>
        <div className="customer-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer directory..." aria-label="Search customer directory" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="customer-table-wrap">
          <table className="medicine-table customer-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Prescriptions</th><th>Total Orders</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>{filteredCustomers.map((customer) => <tr key={customer.id || customer.phone || customer.name}>
              <td><strong>{customer.name}</strong></td><td>{customer.phone}</td><td>{customer.email}</td><td>{customer.prescriptions}</td><td>{customer.orders}</td><td>{customer.balance}</td><td>{customer.status}</td>
            </tr>)}</tbody>
          </table>
          {filteredCustomers.length === 0 && <div className="customer-empty-space" aria-label="No customer records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredCustomers.length} of {customers.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function ReportsDirectory({ canEdit }) {
  const [analytics, setAnalytics] = useState(null)
  const [reports, setReports] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [salesList, setSalesList] = useState([])
  const [purchasesList, setPurchasesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sales')
  const [salesSubTab, setSalesSubTab] = useState('daily')
  const [inventorySubTab, setInventorySubTab] = useState('current')
  const [purchasesSubTab, setPurchasesSubTab] = useState('supplier')
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [isGenModalOpen, setIsGenModalOpen] = useState(false)
  const [genForm, setGenForm] = useState({
    category: 'Sales',
    type: 'Daily Sales',
    startDate: '',
    endDate: '',
    supplierId: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, reportsRes, suppliersRes, salesRes, purchasesRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/analytics`),
        fetch(`${API_BASE}/api/reports`),
        fetch(`${API_BASE}/api/suppliers`),
        fetch(`${API_BASE}/api/sales`),
        fetch(`${API_BASE}/api/purchases`)
      ])
      const [analyticsData, reportsData, suppliersData, salesData, purchasesData] = await Promise.all([
        readApiResponse(analyticsRes),
        readApiResponse(reportsRes),
        readApiResponse(suppliersRes),
        readApiResponse(salesRes),
        readApiResponse(purchasesRes)
      ])
      if (analyticsRes.ok) setAnalytics(analyticsData)
      if (reportsRes.ok) setReports(Array.isArray(reportsData) ? reportsData : [])
      if (suppliersRes.ok) setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      if (salesRes.ok) setSalesList(Array.isArray(salesData) ? salesData : [])
      if (purchasesRes.ok) setPurchasesList(Array.isArray(purchasesData) ? purchasesData : [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenGenerateModal = () => {
    const cat = activeTab === 'inventory' ? 'Inventory' : activeTab === 'purchases' ? 'Purchases' : 'Sales'
    let typ = 'Daily Sales'
    if (cat === 'Sales') {
      if (salesSubTab === 'monthly') typ = 'Monthly Sales'
      else if (salesSubTab === 'range') typ = 'Sales by Date Range'
      else typ = 'Daily Sales'
    } else if (cat === 'Inventory') {
      if (inventorySubTab === 'low-stock') typ = 'Low Stock Audit'
      else if (inventorySubTab === 'expired') typ = 'Expired Medicines Audit'
      else if (inventorySubTab === 'near-expiry') typ = 'Near Expiry Audit'
      else typ = 'Current Stock Audit'
    } else if (cat === 'Purchases') {
      if (purchasesSubTab === 'supplier') typ = 'Purchases by Supplier'
      else if (purchasesSubTab === 'date') typ = 'Purchases by Date Range'
      else typ = 'Purchase History'
    }

    setGenForm({
      category: cat,
      type: typ,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      supplierId: suppliers[0]?.name || ''
    })
    setGenError('')
    setIsGenModalOpen(true)
  }

  const handleCategoryChange = (cat) => {
    let typ = 'Daily Sales'
    if (cat === 'Inventory') typ = 'Current Stock Audit'
    else if (cat === 'Purchases') typ = 'Purchases by Supplier'
    setGenForm((prev) => ({
      ...prev,
      category: cat,
      type: typ
    }))
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    setGenError('')
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm)
      })
      const data = await readApiResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to generate report')
      setIsGenModalOpen(false)
      await loadData()
      setSelectedReport(data)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this generated report record?')) return
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/reports/${reportId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await readApiResponse(res)
        throw new Error(data.error || 'Failed to delete report')
      }
      setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId))
      if (selectedReport && (selectedReport._id || selectedReport.id) === reportId) {
        setSelectedReport(null)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const exportToCSV = (filename, headers, rows) => {
    const escapeCell = (val) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(','))
    ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const normQuery = query.trim().toLowerCase()

  const filteredReports = reports.filter((r) =>
    [r.name, r.category, r.period, r.author, r.status].some((v) => String(v || '').toLowerCase().includes(normQuery))
  )

  const dailySales = analytics?.sales?.dailySales || analytics?.sales?.dailyBreakdown || []
  const filteredDailySales = dailySales.filter((r) => String(r.date || '').toLowerCase().includes(normQuery))

  const monthlySales = analytics?.sales?.monthlySales || analytics?.sales?.monthlyBreakdown || []
  const filteredMonthlySales = monthlySales.filter((r) => String(r.month || '').toLowerCase().includes(normQuery))

  const detailedSales = salesList.length > 0 ? salesList : (analytics?.sales?.recentSales || [])
  const filteredDetailedSales = detailedSales.filter((r) => {
    const matchesQuery = [r.invoice, r.customer, r.payment].some((v) => String(v || '').toLowerCase().includes(normQuery))
    const sDate = (r.date || '').slice(0, 10)
    const matchesDate = (!dateFilter.start || sDate >= dateFilter.start) && (!dateFilter.end || sDate <= dateFilter.end)
    return matchesQuery && matchesDate
  })

  const stockValuation = analytics?.inventory?.currentStock || analytics?.inventory?.stockValuationItems || []
  const filteredStockValuation = stockValuation.filter((r) => [r.medicineName, r.medicine, r.batchNumber, r.batch].some((v) => String(v || '').toLowerCase().includes(normQuery)))

  const lowStock = analytics?.inventory?.lowStockList || analytics?.inventory?.lowStockItems || []
  const filteredLowStock = lowStock.filter((r) => [r.medicineName, r.medicine, r.category].some((v) => String(v || '').toLowerCase().includes(normQuery)))

  const expired = analytics?.inventory?.expiredList || analytics?.inventory?.expiredItems || []
  const filteredExpired = expired.filter((r) => [r.medicineName, r.medicine, r.batchNumber, r.batch].some((v) => String(v || '').toLowerCase().includes(normQuery)))

  const nearExpiry = analytics?.inventory?.nearExpiryList || analytics?.inventory?.nearExpiryItems || []
  const filteredNearExpiry = nearExpiry.filter((r) => [r.medicineName, r.medicine, r.batchNumber, r.batch].some((v) => String(v || '').toLowerCase().includes(normQuery)))

  const supplierPurchases = analytics?.purchases?.purchasesBySupplier || analytics?.purchases?.supplierBreakdown || []
  const filteredSupplierPurchases = supplierPurchases.filter((r) => String(r.supplier || '').toLowerCase().includes(normQuery))

  const datePurchases = analytics?.purchases?.purchasesByDate || analytics?.purchases?.dateBreakdown || []
  const filteredDatePurchases = datePurchases.filter((r) => String(r.date || '').toLowerCase().includes(normQuery))

  const purchaseHistory = purchasesList.length > 0 ? purchasesList : (analytics?.purchases?.recentPurchases || [])
  const filteredPurchaseHistory = purchaseHistory.filter((r) => [r.reference, r.supplier].some((v) => String(v || '').toLowerCase().includes(normQuery)))

  const handleActiveExport = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    if (activeTab === 'archive') {
      const headers = ['Report Name', 'Category', 'Period', 'Generated By', 'Created Date', 'Total Amount', 'Items Count', 'Status']
      const rows = filteredReports.map((r) => [r.name, r.category, r.period, r.author, r.date, Number(r.totalAmount || 0).toFixed(2), r.itemCount || 0, r.status])
      exportToCSV(`medicore-reports-archive-${stamp}.csv`, headers, rows)
    } else if (activeTab === 'sales') {
      if (salesSubTab === 'daily') {
        const headers = ['Date', 'Completed Orders', 'Total Sales Revenue (Rs)', 'Average Per Order (Rs)']
        const rows = filteredDailySales.map((r) => [r.date, r.count ?? r.orders ?? 0, Number(r.total ?? r.revenue ?? 0).toFixed(2), (Number(r.total ?? r.revenue ?? 0) / (Number(r.count ?? r.orders) || 1)).toFixed(2)])
        exportToCSV(`medicore-daily-sales-${stamp}.csv`, headers, rows)
      } else if (salesSubTab === 'monthly') {
        const headers = ['Month', 'Completed Orders', 'Total Sales Revenue (Rs)', 'Average Per Order (Rs)']
        const rows = filteredMonthlySales.map((r) => [r.month, r.count ?? r.orders ?? 0, Number(r.total ?? r.revenue ?? 0).toFixed(2), (Number(r.total ?? r.revenue ?? 0) / (Number(r.count ?? r.orders) || 1)).toFixed(2)])
        exportToCSV(`medicore-monthly-sales-${stamp}.csv`, headers, rows)
      } else {
        const headers = ['Invoice #', 'Date & Time', 'Customer', 'Payment Method', 'Items Count', 'Total Amount (Rs)', 'Status']
        const rows = filteredDetailedSales.map((r) => [r.invoice, r.date, r.customer, r.payment, r.items, Number(String(r.amount ?? r.total ?? 0).replace(/[^0-9.-]/g, '')).toFixed(2), r.status])
        exportToCSV(`medicore-sales-range-${stamp}.csv`, headers, rows)
      }
    } else if (activeTab === 'inventory') {
      if (inventorySubTab === 'current') {
        const headers = ['Medicine', 'Batch #', 'Stock Quantity', 'Purchase Cost (Rs)', 'Selling Price (Rs)', 'Total Stock Valuation (Rs)']
        const rows = filteredStockValuation.map((r) => [r.medicineName || r.medicine, r.batchNumber || r.batch, r.quantity, Number(r.purchasePrice ?? r.costPrice ?? 0).toFixed(2), Number(r.sellingPrice || 0).toFixed(2), Number(r.stockValue ?? r.totalValue ?? 0).toFixed(2)])
        exportToCSV(`medicore-stock-valuation-${stamp}.csv`, headers, rows)
      } else if (inventorySubTab === 'low-stock') {
        const headers = ['Medicine', 'Category', 'Available Stock', 'Minimum Threshold', 'Status']
        const rows = filteredLowStock.map((r) => [r.medicineName || r.medicine, r.category, r.quantity ?? r.stock ?? 0, r.minimumStock ?? r.threshold ?? 0, r.status || 'Low Stock'])
        exportToCSV(`medicore-low-stock-audit-${stamp}.csv`, headers, rows)
      } else if (inventorySubTab === 'expired') {
        const headers = ['Medicine', 'Batch #', 'Expired Quantity', 'Expiry Date', 'Unit Cost (Rs)', 'Valuation Loss (Rs)']
        const rows = filteredExpired.map((r) => [r.medicineName || r.medicine, r.batchNumber || r.batch, r.quantity, r.expiryDate || r.expiry, Number(r.purchasePrice ?? r.price ?? 0).toFixed(2), Number(r.stockValue ?? (Number(r.quantity || 0) * Number(r.purchasePrice ?? r.price ?? 0))).toFixed(2)])
        exportToCSV(`medicore-expired-medicines-${stamp}.csv`, headers, rows)
      } else {
        const headers = ['Medicine', 'Batch #', 'Quantity', 'Expiry Date', 'Unit Price (Rs)', 'Status']
        const rows = filteredNearExpiry.map((r) => [r.medicineName || r.medicine, r.batchNumber || r.batch, r.quantity, r.expiryDate || r.expiry, Number(r.sellingPrice ?? r.price ?? 0).toFixed(2), r.status || 'Expiring Soon'])
        exportToCSV(`medicore-near-expiry-${stamp}.csv`, headers, rows)
      }
    } else if (activeTab === 'purchases') {
      if (purchasesSubTab === 'supplier') {
        const headers = ['Supplier Name', 'Purchase Orders Fulfilled', 'Total Purchase Amount (Rs)', 'Average Per Order (Rs)']
        const rows = filteredSupplierPurchases.map((r) => [r.supplier, r.count ?? r.orders ?? 0, Number(r.total ?? r.totalAmount ?? 0).toFixed(2), (Number(r.total ?? r.totalAmount ?? 0) / (Number(r.count ?? r.orders) || 1)).toFixed(2)])
        exportToCSV(`medicore-purchases-by-supplier-${stamp}.csv`, headers, rows)
      } else if (purchasesSubTab === 'date') {
        const headers = ['Date', 'Purchase Orders Fulfilled', 'Total Purchase Amount (Rs)']
        const rows = filteredDatePurchases.map((r) => [r.date, r.count ?? r.orders ?? 0, Number(r.total ?? r.totalAmount ?? 0).toFixed(2)])
        exportToCSV(`medicore-purchases-by-date-${stamp}.csv`, headers, rows)
      } else {
        const headers = ['Purchase Reference', 'Supplier', 'Date', 'Items Count', 'Total Amount (Rs)', 'Status']
        const rows = filteredPurchaseHistory.map((r) => [r.reference, r.supplier, r.date, r.items, Number(String(r.amount ?? r.total ?? 0).replace(/[^0-9.-]/g, '')).toFixed(2), r.status])
        exportToCSV(`medicore-purchase-history-${stamp}.csv`, headers, rows)
      }
    }
  }

  const exportSingleReportCSV = (report) => {
    if (!report) return
    const filename = `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    const details = report.details || []
    if (details.length === 0) {
      exportToCSV(filename, ['Summary'], [[report.summary || 'No records']])
      return
    }
    const headers = Object.keys(details[0])
    const rows = details.map((item) => headers.map((key) => item[key]))
    exportToCSV(filename, headers, rows)
  }

  return (
    <div className="report-content">
      <section className="report-summary-grid" aria-label="Reporting KPI metrics">
        <article className="report-summary-card sales">
          <div>
            <span>Total Sales Revenue</span>
            <strong>Rs. {Number(analytics?.sales?.totalAmount ?? analytics?.sales?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <small>{analytics?.sales?.totalTransactions ?? analytics?.sales?.salesCount ?? 0} orders completed</small>
          </div>
          <div className="alert-summary-icon"><Icon name="cart" size={24} /></div>
        </article>

        <article className="report-summary-card today">
          <div>
            <span>Today's Sales</span>
            <strong>Rs. {Number(analytics?.sales?.todayAmount ?? analytics?.sales?.todayRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <small>Daily pharmacy sales volume</small>
          </div>
          <div className="alert-summary-icon"><Icon name="pulse" size={24} /></div>
        </article>

        <article className="report-summary-card inventory">
          <div>
            <span>Stock Valuation</span>
            <strong>Rs. {Number(analytics?.inventory?.totalStockValue ?? analytics?.inventory?.totalStockValuation ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <small>{analytics?.inventory?.totalStockUnits ?? analytics?.inventory?.totalUnits ?? 0} units across {analytics?.inventory?.totalBatches ?? 0} batches</small>
          </div>
          <div className="alert-summary-icon"><Icon name="cube" size={24} /></div>
        </article>

        <article className="report-summary-card purchases">
          <div>
            <span>Purchase Expenses</span>
            <strong>Rs. {Number(analytics?.purchases?.totalAmount ?? analytics?.purchases?.totalPurchases ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <small>{analytics?.purchases?.totalOrders ?? analytics?.purchases?.ordersCount ?? 0} purchase orders fulfilled</small>
          </div>
          <div className="alert-summary-icon"><Icon name="truck" size={24} /></div>
        </article>
      </section>

      <section className="report-panel">
        <div className="report-heading">
          <div>
            <h2>Analytics &amp; reports</h2>
            <p>Generate, export, and review sales summaries, inventory audits, and supplier purchases.</p>
          </div>
          <div className="report-actions-group">
            <button className="primary-button" type="button" disabled={!canEdit} onClick={handleOpenGenerateModal}>
              <Icon name="report" size={19} /> Generate report
            </button>
          </div>
        </div>

        <div className="report-nav-tabs">
          <button type="button" className={`report-tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            <Icon name="cart" size={16} /> Sales Reports
          </button>
          <button type="button" className={`report-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Icon name="cube" size={16} /> Inventory Reports
          </button>
          <button type="button" className={`report-tab-btn ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>
            <Icon name="truck" size={16} /> Purchase Reports
          </button>
          <button type="button" className={`report-tab-btn ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>
            <Icon name="history" size={16} /> Saved Reports Archive
            <span className="report-tab-badge">{reports.length}</span>
          </button>
        </div>

        {activeTab === 'sales' && (
          <div className="report-sub-toolbar">
            <div className="report-pills-row">
              <button type="button" className={`report-pill-btn ${salesSubTab === 'daily' ? 'active' : ''}`} onClick={() => setSalesSubTab('daily')}>Daily Sales</button>
              <button type="button" className={`report-pill-btn ${salesSubTab === 'monthly' ? 'active' : ''}`} onClick={() => setSalesSubTab('monthly')}>Monthly Sales</button>
              <button type="button" className={`report-pill-btn ${salesSubTab === 'range' ? 'active' : ''}`} onClick={() => setSalesSubTab('range')}>Sales by Date Range</button>
            </div>
            {salesSubTab === 'range' && (
              <div className="report-pills-row">
                <input type="date" className="report-filter-date" value={dateFilter.start} onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} title="Start Date" />
                <span>to</span>
                <input type="date" className="report-filter-date" value={dateFilter.end} onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} title="End Date" />
                {(dateFilter.start || dateFilter.end) && (
                  <button type="button" className="secondary-button" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => setDateFilter({ start: '', end: '' })}>Clear</button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="report-sub-toolbar">
            <div className="report-pills-row">
              <button type="button" className={`report-pill-btn ${inventorySubTab === 'current' ? 'active' : ''}`} onClick={() => setInventorySubTab('current')}>Current Stock Valuation</button>
              <button type="button" className={`report-pill-btn ${inventorySubTab === 'low-stock' ? 'active' : ''}`} onClick={() => setInventorySubTab('low-stock')}>Low-Stock Audit</button>
              <button type="button" className={`report-pill-btn ${inventorySubTab === 'expired' ? 'active' : ''}`} onClick={() => setInventorySubTab('expired')}>Expired Medicines</button>
              <button type="button" className={`report-pill-btn ${inventorySubTab === 'near-expiry' ? 'active' : ''}`} onClick={() => setInventorySubTab('near-expiry')}>Near-Expiry Medicines</button>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="report-sub-toolbar">
            <div className="report-pills-row">
              <button type="button" className={`report-pill-btn ${purchasesSubTab === 'supplier' ? 'active' : ''}`} onClick={() => setPurchasesSubTab('supplier')}>Purchases by Supplier</button>
              <button type="button" className={`report-pill-btn ${purchasesSubTab === 'date' ? 'active' : ''}`} onClick={() => setPurchasesSubTab('date')}>Purchases by Date</button>
              <button type="button" className={`report-pill-btn ${purchasesSubTab === 'history' ? 'active' : ''}`} onClick={() => setPurchasesSubTab('history')}>Purchase History</button>
            </div>
          </div>
        )}

        <div className="report-toolbar">
          <label className="catalog-search">
            <Icon name="search" size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records in active report view..." aria-label="Search report records" />
          </label>
          <button className="catalog-button" type="button" onClick={() => window.print()}>
            <Icon name="print" size={18} /> Print
          </button>
          <button className="catalog-button" type="button" onClick={handleActiveExport}>
            <Icon name="download" size={18} /> Export CSV
          </button>
        </div>

        <div className="report-table-wrap">
          {activeTab === 'archive' && (
            <table className="medicine-table report-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Category</th>
                  <th>Period</th>
                  <th>Generated By</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report._id || report.id || report.name}>
                    <td><strong>{report.name}</strong></td>
                    <td>{report.category}</td>
                    <td>{report.period}</td>
                    <td>{report.author}</td>
                    <td>{report.itemCount || (report.details?.length || 0)}</td>
                    <td>Rs. {Number(report.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{report.date || (report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-')}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => setSelectedReport(report)} title="View complete report details">View</button>
                        <button type="button" onClick={() => exportSingleReportCSV(report)} title="Export this report to CSV">CSV</button>
                        <button type="button" onClick={() => { setSelectedReport(report); setTimeout(() => window.print(), 100); }} title="Print report">Print</button>
                        {canEdit && <button type="button" onClick={() => handleDeleteReport(report._id || report.id)} style={{ color: '#b42318' }} title="Delete record">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'sales' && salesSubTab === 'daily' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Completed Orders</th>
                  <th>Total Sales Revenue</th>
                  <th>Average Revenue Per Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredDailySales.map((r, i) => (
                  <tr key={r.date || i}>
                    <td><strong>{r.date}</strong></td>
                    <td>{r.count ?? r.orders ?? 0} orders</td>
                    <td>Rs. {Number(r.total ?? r.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {(Number(r.total ?? r.revenue ?? 0) / (Number(r.count ?? r.orders) || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'sales' && salesSubTab === 'monthly' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Completed Orders</th>
                  <th>Total Sales Revenue</th>
                  <th>Average Revenue Per Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlySales.map((r, i) => (
                  <tr key={r.month || i}>
                    <td><strong>{r.month}</strong></td>
                    <td>{r.count ?? r.orders ?? 0} orders</td>
                    <td>Rs. {Number(r.total ?? r.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {(Number(r.total ?? r.revenue ?? 0) / (Number(r.count ?? r.orders) || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'sales' && salesSubTab === 'range' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th>Items Count</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetailedSales.map((r, i) => (
                  <tr key={r.invoice || i}>
                    <td><strong>{r.invoice}</strong></td>
                    <td>{r.date}</td>
                    <td>{r.customer}</td>
                    <td>{r.payment}</td>
                    <td>{r.items}</td>
                    <td>Rs. {Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className="report-status-badge">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inventory' && inventorySubTab === 'current' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch #</th>
                  <th>Available Stock</th>
                  <th>Purchase Cost</th>
                  <th>Selling Price</th>
                  <th>Total Stock Valuation</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockValuation.map((r, i) => (
                  <tr key={`${r.medicineName || r.medicine}-${r.batchNumber || r.batch}-${i}`}>
                    <td><strong>{r.medicineName || r.medicine}</strong></td>
                    <td>{r.batchNumber || r.batch}</td>
                    <td>{r.quantity} units</td>
                    <td>Rs. {Number(r.purchasePrice ?? r.costPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {Number(r.sellingPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {Number(r.stockValue ?? r.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inventory' && inventorySubTab === 'low-stock' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Minimum Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLowStock.map((r, i) => (
                  <tr key={`${r.medicineName || r.medicine}-${i}`}>
                    <td><strong>{r.medicineName || r.medicine}</strong></td>
                    <td>{r.category}</td>
                    <td><strong style={{ color: '#b42318' }}>{r.quantity ?? r.stock ?? 0} units</strong></td>
                    <td>{r.minimumStock ?? r.threshold ?? 0} units</td>
                    <td><span className="report-status-badge danger">Low Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inventory' && inventorySubTab === 'expired' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch #</th>
                  <th>Expired Quantity</th>
                  <th>Expiry Date</th>
                  <th>Unit Cost</th>
                  <th>Valuation Loss</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpired.map((r, i) => (
                  <tr key={`${r.medicineName || r.medicine}-${r.batchNumber || r.batch}-${i}`}>
                    <td><strong>{r.medicineName || r.medicine}</strong></td>
                    <td>{r.batchNumber || r.batch}</td>
                    <td><strong style={{ color: '#b42318' }}>{r.quantity} units</strong></td>
                    <td>{r.expiryDate || r.expiry}</td>
                    <td>Rs. {Number(r.purchasePrice ?? r.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {Number(r.stockValue ?? (Number(r.quantity || 0) * Number(r.purchasePrice ?? r.price ?? 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inventory' && inventorySubTab === 'near-expiry' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch #</th>
                  <th>Available Quantity</th>
                  <th>Expiry Date</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredNearExpiry.map((r, i) => (
                  <tr key={`${r.medicineName || r.medicine}-${r.batchNumber || r.batch}-${i}`}>
                    <td><strong>{r.medicineName || r.medicine}</strong></td>
                    <td>{r.batchNumber || r.batch}</td>
                    <td>{r.quantity} units</td>
                    <td>{r.expiryDate || r.expiry}</td>
                    <td>Rs. {Number(r.sellingPrice ?? r.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className="report-status-badge warning">Expiring Within 30 Days</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'purchases' && purchasesSubTab === 'supplier' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Purchase Orders Fulfilled</th>
                  <th>Total Purchase Amount</th>
                  <th>Average Amount Per Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierPurchases.map((r, i) => (
                  <tr key={r.supplier || i}>
                    <td><strong>{r.supplier}</strong></td>
                    <td>{r.count ?? r.orders ?? 0} orders</td>
                    <td>Rs. {Number(r.total ?? r.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {(Number(r.total ?? r.totalAmount ?? 0) / (Number(r.count ?? r.orders) || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'purchases' && purchasesSubTab === 'date' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Purchase Orders Fulfilled</th>
                  <th>Total Purchase Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredDatePurchases.map((r, i) => (
                  <tr key={r.date || i}>
                    <td><strong>{r.date}</strong></td>
                    <td>{r.count ?? r.orders ?? 0} orders</td>
                    <td>Rs. {Number(r.total ?? r.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'purchases' && purchasesSubTab === 'history' && (
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Reference / PO #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Items Count</th>
                  <th>Total Purchase Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchaseHistory.map((r, i) => (
                  <tr key={r.reference || i}>
                    <td><strong>{r.reference}</strong></td>
                    <td>{r.supplier}</td>
                    <td>{r.date}</td>
                    <td>{r.items}</td>
                    <td>Rs. {Number(String(r.amount ?? r.total ?? 0).replace(/[^0-9.-]/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className="report-status-badge">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {loading && <div className="report-empty-space" style={{ display: 'grid', placeItems: 'center', color: '#647895' }}>Loading analytics data...</div>}
          {!loading && (
            ((activeTab === 'archive' && filteredReports.length === 0) ||
             (activeTab === 'sales' && salesSubTab === 'daily' && filteredDailySales.length === 0) ||
             (activeTab === 'sales' && salesSubTab === 'monthly' && filteredMonthlySales.length === 0) ||
             (activeTab === 'sales' && salesSubTab === 'range' && filteredDetailedSales.length === 0) ||
             (activeTab === 'inventory' && inventorySubTab === 'current' && filteredStockValuation.length === 0) ||
             (activeTab === 'inventory' && inventorySubTab === 'low-stock' && filteredLowStock.length === 0) ||
             (activeTab === 'inventory' && inventorySubTab === 'expired' && filteredExpired.length === 0) ||
             (activeTab === 'inventory' && inventorySubTab === 'near-expiry' && filteredNearExpiry.length === 0) ||
             (activeTab === 'purchases' && purchasesSubTab === 'supplier' && filteredSupplierPurchases.length === 0) ||
             (activeTab === 'purchases' && purchasesSubTab === 'date' && filteredDatePurchases.length === 0) ||
             (activeTab === 'purchases' && purchasesSubTab === 'history' && filteredPurchaseHistory.length === 0)) && (
              <div className="report-empty-space" aria-label="No report records found" style={{ display: 'grid', placeItems: 'center', color: '#8899ac' }}>No report records found matching current criteria.</div>
            )
          )}
        </div>

        <div className="medicine-footer">
          <span>Active View: {activeTab === 'archive' ? 'Saved Reports Log' : activeTab === 'sales' ? `Sales (${salesSubTab})` : activeTab === 'inventory' ? `Inventory (${inventorySubTab})` : `Purchases (${purchasesSubTab})`}</span>
          <div className="pagination">
            <button disabled>Previous</button>
            <button className="current-page">1</button>
            <button disabled>Next</button>
          </div>
        </div>
      </section>

      {isGenModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsGenModalOpen(false)}>
          <form className="modal-card" onSubmit={handleGenerate} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Generate New Pharmacy Report</h3>
                <p>Compile a verified operational snapshot into MongoDB.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsGenModalOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal-body medicine-form">
              <label className="settings-field">
                <span>Category</span>
                <select value={genForm.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                  <option value="Sales">Sales</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Purchases">Purchases</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Report Type</span>
                <select value={genForm.type} onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}>
                  {genForm.category === 'Sales' && (
                    <>
                      <option value="Daily Sales">Daily Sales</option>
                      <option value="Monthly Sales">Monthly Sales</option>
                      <option value="Sales by Date Range">Sales by Date Range</option>
                    </>
                  )}
                  {genForm.category === 'Inventory' && (
                    <>
                      <option value="Current Stock Audit">Current Stock Audit</option>
                      <option value="Low Stock Audit">Low Stock Audit</option>
                      <option value="Expired Medicines Audit">Expired Medicines Audit</option>
                      <option value="Near Expiry Audit">Near Expiry Audit</option>
                    </>
                  )}
                  {genForm.category === 'Purchases' && (
                    <>
                      <option value="Purchases by Supplier">Purchases by Supplier</option>
                      <option value="Purchases by Date Range">Purchases by Date Range</option>
                      <option value="Purchase History">Purchase History</option>
                    </>
                  )}
                </select>
              </label>

              {(genForm.type === 'Daily Sales' || genForm.type === 'Monthly Sales' || genForm.type === 'Sales by Date Range' || genForm.type === 'Purchases by Date Range') && (
                <label className="settings-field">
                  <span>Start Date / Target Date</span>
                  <input type="date" value={genForm.startDate} onChange={(e) => setGenForm({ ...genForm, startDate: e.target.value })} />
                </label>
              )}

              {(genForm.type === 'Sales by Date Range' || genForm.type === 'Purchases by Date Range') && (
                <label className="settings-field">
                  <span>End Date</span>
                  <input type="date" value={genForm.endDate} onChange={(e) => setGenForm({ ...genForm, endDate: e.target.value })} />
                </label>
              )}

              {genForm.type === 'Purchases by Supplier' && (
                <label className="settings-field">
                  <span>Supplier</span>
                  <select value={genForm.supplierId} onChange={(e) => setGenForm({ ...genForm, supplierId: e.target.value })}>
                    <option value="">All Suppliers</option>
                    {suppliers.map((s) => (
                      <option key={s._id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {genError && <div className="login-error-message">{genError}</div>}
            </div>
            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={() => setIsGenModalOpen(false)}>Cancel</button>
              <button className="primary-button" type="submit" disabled={isGenerating}>
                {isGenerating ? 'Compiling Report...' : 'Generate & Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedReport && (
        <div className="modal-backdrop" onClick={() => setSelectedReport(null)}>
          <section className="modal-card report-detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedReport.name}</h3>
                <p>Category: <strong>{selectedReport.category}</strong> | Period: <strong>{selectedReport.period}</strong></p>
              </div>
              <button className="modal-close" type="button" onClick={() => setSelectedReport(null)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: '10px' }}>
              <div className="report-detail-summary-banner">
                <strong>Executive Summary</strong>
                <p>{selectedReport.summary || 'Compiled pharmacy audit records snapshot.'}</p>
              </div>

              <div className="report-detail-meta">
                <span>Generated by: <strong>{selectedReport.author}</strong></span>
                <span>Date: <strong>{selectedReport.date || (selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : '-')}</strong></span>
                <span>Total Items: <strong>{selectedReport.itemCount || (selectedReport.details?.length || 0)}</strong></span>
                <span>Total Amount: <strong>Rs. {Number(selectedReport.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>

              <div className="report-detail-table-wrap">
                <table className="medicine-table">
                  <thead>
                    <tr>
                      {selectedReport.details && selectedReport.details.length > 0 && selectedReport.details[0].medicineName ? (
                        <>
                          <th>Medicine</th>
                          <th>Batch #</th>
                          <th>Quantity</th>
                          <th>Cost Price</th>
                          <th>Selling Price</th>
                          <th>Stock Valuation</th>
                          <th>Expiry Date</th>
                        </>
                      ) : selectedReport.details && selectedReport.details.length > 0 && selectedReport.details[0].reference ? (
                        <>
                          <th>Reference</th>
                          <th>Date</th>
                          <th>Customer / Supplier</th>
                          <th>Items</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </>
                      ) : (
                        Object.keys(selectedReport.details?.[0] || { Note: 'No data' }).map((k) => (
                          <th key={k}>{k.toUpperCase()}</th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.details || []).map((row, idx) => (
                      <tr key={idx}>
                        {row.medicineName ? (
                          <>
                            <td><strong>{row.medicineName}</strong></td>
                            <td>{row.batchNumber || '-'}</td>
                            <td>{row.quantity}</td>
                            <td>Rs. {Number(row.purchasePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>Rs. {Number(row.sellingPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>Rs. {Number(row.stockValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>{row.expiryDate || '-'}</td>
                          </>
                        ) : row.reference ? (
                          <>
                            <td><strong>{row.reference}</strong></td>
                            <td>{row.date}</td>
                            <td>{row.customer || row.supplier || '-'}</td>
                            <td>{row.items}</td>
                            <td>Rs. {Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td><span className="report-status-badge">{row.status || 'Completed'}</span></td>
                          </>
                        ) : (
                          Object.values(row).map((v, cIdx) => (
                            <td key={cIdx}>{String(v ?? '')}</td>
                          ))
                        )}
                      </tr>
                    ))}
                    {(!selectedReport.details || selectedReport.details.length === 0) && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No detail rows recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ gap: '10px' }}>
              <button className="catalog-button print-include" type="button" onClick={() => window.print()}>
                <Icon name="print" size={18} /> Print Report
              </button>
              <button className="catalog-button print-include" type="button" onClick={() => exportSingleReportCSV(selectedReport)}>
                <Icon name="download" size={18} /> Export CSV
              </button>
              <button className="secondary-button" type="button" onClick={() => setSelectedReport(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function StockHistory() {
  const [query, setQuery] = useState('')
  const [stockHistory, setStockHistory] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API_BASE}/api/stock-history`)
      .then((response) => readApiResponse(response).then((data) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load stock history')
        setStockHistory(data)
      }))
      .catch(() => setStockHistory([]))
      .finally(() => setLoading(false))
  }, [])
  const normalizedQuery = query.trim().toLowerCase()
  const filteredHistory = stockHistory.filter((item) =>
    [item.date, item.medicine, item.batch, item.type, item.quantity, item.previous, item.balance, item.reference]
      .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)),
  )

  return (
    <div className="history-content">
      <section className="history-panel">
        <div className="history-heading">
          <div>
            <h2>Stock movement history</h2>
            <p>Audit trail of all medicine batch adjustments, receipts, and sales.</p>
          </div>
          <button className="primary-button"><Icon name="download" size={18} /> Export log</button>
        </div>
        <div className="history-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock movement records..." aria-label="Search stock movement records" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="history-table-wrap">
          <table className="medicine-table history-table">
            <thead><tr><th>Date &amp; Time</th><th>Medicine</th><th>Batch</th><th>Type</th><th>Quantity</th><th>Previous</th><th>New Balance</th><th>Reference</th></tr></thead>
            <tbody>{filteredHistory.map((item) => <tr key={item._id || item.id || `${item.date}-${item.batch}-${item.type}`}>
              <td>{item.date}</td><td><strong>{item.medicine}</strong></td><td>{item.batch}</td><td>{item.type}</td><td>{item.quantity}</td><td>{item.previous}</td><td>{item.balance}</td><td>{item.reference}</td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="history-empty-space">Loading stock history...</div>}
          {!loading && filteredHistory.length === 0 && <div className="history-empty-space" aria-label="No stock history records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredHistory.length} of {stockHistory.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function Alerts({ notificationsEnabled, onToggleNotifications, showSidebarCount, onToggleSidebarCount }) {
  const [query, setQuery] = useState('')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API_BASE}/api/alerts`)
      .then((response) => readApiResponse(response).then((data) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load alerts')
        setAlerts(data)
      }))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])
  const lowStockCount = alerts.filter((item) => item.alert !== 'Near expiry' && item.alert !== 'Expired').length
  const nearExpiryCount = alerts.filter((item) => item.alert === 'Near expiry').length
  const expiredCount = alerts.filter((item) => item.alert === 'Expired').length
  const filteredAlerts = alerts.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="alerts-content">
      <section className="alert-summary-grid" aria-label="Alert summary">
        <article className="alert-summary-card low-stock">
          <div><span>Low stock</span><strong>{loading ? '...' : lowStockCount}</strong><small><i>↗</i> Batch stock at threshold</small></div>
          <div className="alert-summary-icon"><Icon name="cube" size={25} /></div>
        </article>
        <article className="alert-summary-card near-expiry">
          <div><span>Near expiry</span><strong>{loading ? '...' : nearExpiryCount}</strong><small><i>↗</i> Within next 30 days</small></div>
          <div className="alert-summary-icon"><Icon name="history" size={25} /></div>
        </article>
        <article className="alert-summary-card expired">
          <div><span>Expired</span><strong>{loading ? '...' : expiredCount}</strong><small><i>↗</i> Blocked from sale</small></div>
          <div className="alert-summary-icon"><Icon name="close" size={25} /></div>
        </article>
      </section>
      <section className="alerts-panel">
        <div className="alerts-heading">
          <div>
            <h2>Inventory alerts</h2>
            <p>Active low-stock thresholds, expiry warnings, and critical notices.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setIsConfigOpen(true)}>
            <Icon name="bell" size={19} /> Configure alerts
          </button>
        </div>
        <div className="alerts-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory alerts..." aria-label="Search inventory alerts" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="alerts-table-wrap">
          <table className="medicine-table alerts-table">
            <thead><tr><th>Alert</th><th>Medicine</th><th>Batch</th><th>Current Stock</th><th>Threshold</th><th>Expiry</th><th>Severity</th></tr></thead>
            <tbody>{filteredAlerts.map((item) => <tr key={item._id}>
              <td><strong>{item.alert}</strong></td><td>{item.medicine}</td><td>{item.batch}</td><td>{item.stock}</td><td>{item.threshold}</td><td>{item.expiry}</td><td>{item.severity}</td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="alerts-empty-space">Loading alerts...</div>}
          {!loading && filteredAlerts.length === 0 && <div className="alerts-empty-space" aria-label="No alert records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredAlerts.length} of {alerts.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>

      {isConfigOpen && (
        <div className="modal-backdrop" onClick={() => setIsConfigOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <div>
                <h3 id="modal-title">Configure alerts</h3>
                <p>Manage alert preferences and sidebar indicators</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsConfigOpen(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal-body">
              <label className="toggle-row">
                <div className="toggle-text">
                  <strong>System notifications</strong>
                  <span>Enable or disable inventory alerts and notices</span>
                </div>
                <input
                  type="checkbox"
                  className="toggle-switch"
                  checked={notificationsEnabled}
                  onChange={onToggleNotifications}
                />
              </label>
              <label className="toggle-row">
                <div className="toggle-text">
                  <strong>Show sidebar notification count</strong>
                  <span>Display alert number badge on the left side menu</span>
                </div>
                <input
                  type="checkbox"
                  className="toggle-switch"
                  checked={showSidebarCount}
                  onChange={onToggleSidebarCount}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="primary-button" type="button" onClick={() => setIsConfigOpen(false)}>
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserManagement() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'Staff', access: 'Standard', status: 'Active', employeeId: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const getToken = () => localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
  const getUserId = (user) => {
    const id = user?._id || user?.id
    return id ? String(id) : ''
  }
  const loadUsers = async () => {
    const response = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${getToken()}` } })
    const data = await readApiResponse(response)
    if (!response.ok) throw new Error(data.error || 'Unable to load users')
    setUsers(data)
  }

  useEffect(() => {
    loadUsers().catch((err) => setError(err.message))
  }, [])

  const openForm = (user = null) => {
    setEditingUser(user || { _id: null })
    setError('')
    setForm(user
      ? { name: user.name, email: user.email, phone: user.phone || '', password: '', role: user.role, access: user.access || 'Standard', status: user.status || 'Active', employeeId: user.employeeId || '' }
      : { name: '', email: '', phone: '', password: '', role: 'Staff', access: 'Standard', status: 'Active', employeeId: '' })
  }

  const saveUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = { ...form }
      const userId = getUserId(editingUser)
      const isEditing = Boolean(userId)
      if (isEditing && !body.password) delete body.password
      const response = await fetch(userId ? `${API_BASE}/api/users/${userId}` : `${API_BASE}/api/users`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to save user')
      await loadUsers()
      setEditingUser(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeUser = async (user) => {
    if (!window.confirm(`Remove ${user.name}'s account?`)) return
    try {
      const userId = getUserId(user)
      if (!userId) throw new Error('This account has no valid ID. Refresh the user list and try again.')
      const response = await fetch(`${API_BASE}/api/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to remove user')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredUsers = users.filter((user) =>
    Object.values(user).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="users-content">
      <section className="users-panel">
        <div className="users-heading">
          <div>
            <h2>User management</h2>
            <p>Manage system users, assign roles, and monitor account access permissions.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => openForm()}><Icon name="user" size={19} /> Add user</button>
        </div>
        <div className="users-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user accounts..." aria-label="Search user accounts" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="users-table-wrap">
          <table className="medicine-table users-table">
            <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Phone</th><th>Access Level</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredUsers.map((user) => <tr key={user._id || user.id || user.email || user.name}>
              <td><strong>{user.name}</strong></td><td>{user.role}</td><td>{user.email}</td><td>{user.phone || '—'}</td><td>{user.access || 'Standard'}</td><td>{user.lastLogin || 'Never'}</td><td>{user.status || 'Active'}</td><td><button className="catalog-button" type="button" onClick={() => openForm(user)}>Edit</button> <button className="catalog-button" type="button" onClick={() => removeUser(user)}>Remove</button></td>
            </tr>)}</tbody>
          </table>
          {filteredUsers.length === 0 && <div className="users-empty-space" aria-label="No user records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredUsers.length} of {users.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
      {error && <div className="login-error-message">{error}</div>}
      {editingUser !== null && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <form className="modal-card" onSubmit={saveUser} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h3>{getUserId(editingUser) ? 'Update account' : 'Add staff account'}</h3><p>Set account details and access permissions.</p></div><button className="modal-close" type="button" onClick={() => setEditingUser(null)}><Icon name="close" size={18} /></button></div>
            <div className="modal-body">
              <label className="settings-field"><span>Full name</span><input name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="settings-field"><span>Email</span><input type="email" name="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={Boolean(getUserId(editingUser))} /></label>
              <label className="settings-field"><span>Phone</span><input name="phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label className="settings-field"><span>{getUserId(editingUser) ? 'New password (optional)' : 'Password'}</span><input type="password" name="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!getUserId(editingUser)} minLength="8" /></label>
              <label className="settings-field"><span>Role</span><select name="role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Staff</option><option>Administrator</option></select></label>
              <label className="settings-field"><span>Access</span><select name="access" value={form.access} onChange={(event) => setForm({ ...form, access: event.target.value })}><option>Standard</option><option>Full Access</option></select></label>
              <label className="settings-field"><span>Status</span><select name="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option><option>Suspended</option></select></label>
              <label className="settings-field"><span>Employee ID</span><input name="employeeId" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} /></label>
            </div>
            {error && <div className="login-error-message">{error}</div>}
            <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save account'}</button></div>
          </form>
        </div>
      )}
    </div>
  )
}


function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showSidebarCount, setShowSidebarCount] = useState(true)
  const [alertCount, setAlertCount] = useState(0)
  const [currentDate] = useState(() => new Date())
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [dateFormat, setDateFormat] = useState('DD Month YYYY')
  const [currency, setCurrency] = useState('PKR (Rs.)')
  const [automaticLock, setAutomaticLock] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [profileNameInput, setProfileNameInput] = useState('')
  const [profilePhoneInput, setProfilePhoneInput] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const profileMenuRef = useRef(null)

  const applyUserData = (user) => {
    setCurrentUser(user)
    setProfileNameInput(user.name || '')
    setProfilePhoneInput(user.phone || '')
    if (user.settings) {
      if (user.settings.dateFormat) setDateFormat(user.settings.dateFormat)
      if (user.settings.currency) setCurrency(user.settings.currency)
      if (user.settings.automaticLock !== undefined) setAutomaticLock(user.settings.automaticLock)
      if (user.settings.sessionTimeout) setSessionTimeout(user.settings.sessionTimeout)
      if (user.settings.defaultPaymentMethod) setPaymentMethod(user.settings.defaultPaymentMethod)
      if (user.settings.isDarkTheme !== undefined) setIsDarkTheme(user.settings.isDarkTheme)
      if (user.settings.notificationsEnabled !== undefined) setNotificationsEnabled(user.settings.notificationsEnabled)
      if (user.settings.showSidebarCount !== undefined) setShowSidebarCount(user.settings.showSidebarCount)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Unauthorized')
          return res.json()
        })
        .then((user) => {
          applyUserData(user)
          setSignedIn(true)
        })
        .catch(() => {
          localStorage.removeItem('medicore_token')
          sessionStorage.removeItem('medicore_token')
          setSignedIn(false)
        })
    }
  }, [])

  useEffect(() => {
    if (!signedIn) return undefined
    const loadAlertCount = () => {
      fetch(`${API_BASE}/api/alerts`)
        .then((response) => readApiResponse(response))
        .then((data) => setAlertCount(Array.isArray(data) ? data.length : 0))
        .catch(() => setAlertCount(0))
    }
    loadAlertCount()
    const interval = window.setInterval(loadAlertCount, 30000)
    return () => window.clearInterval(interval)
  }, [signedIn])

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined

    function closeProfileMenu(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    function closeProfileMenuOnEscape(event) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeProfileMenu)
    document.addEventListener('keydown', closeProfileMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu)
      document.removeEventListener('keydown', closeProfileMenuOnEscape)
    }
  }, [isProfileMenuOpen])

  const handleSignIn = (token, user, keepSignedIn) => {
    if (keepSignedIn) {
      localStorage.setItem('medicore_token', token)
    } else {
      sessionStorage.setItem('medicore_token', token)
    }
    applyUserData(user)
    setSignedIn(true)
  }

  const handleSignOut = () => {
    localStorage.removeItem('medicore_token')
    sessionStorage.removeItem('medicore_token')
    setSignedIn(false)
    setCurrentUser(null)
    setActivePage('Dashboard')
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const token = localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileNameInput, phone: profilePhoneInput })
      })
      const data = await res.json()
      if (res.ok && data.user) {
        applyUserData(data.user)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSavingProfile(false)
      setIsProfileModalOpen(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const token = localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
      const updatedSettings = {
        dateFormat,
        currency,
        automaticLock,
        sessionTimeout,
        defaultPaymentMethod: paymentMethod,
        isDarkTheme,
        notificationsEnabled,
        showSidebarCount
      }

      const res = await fetch(`${API_BASE}/api/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: updatedSettings })
      })
      const data = await res.json()
      if (res.ok && data.user) {
        applyUserData(data.user)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setIsSavingSettings(false)
      setIsSettingsModalOpen(false)
    }
  }

  const handleSavePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    if (passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(passwordForm.newPassword.length < 8 ? 'New password must be at least 8 characters.' : 'Passwords do not match.')
      return
    }
    setIsSavingPassword(true)
    try {
      const token = localStorage.getItem('medicore_token') || sessionStorage.getItem('medicore_token')
      const response = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      })
      const data = await readApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'Unable to update password')
      setIsPasswordModalOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (!signedIn) {
    return <SignIn onSignIn={handleSignIn} />
  }

  const isAdministrator = currentUser?.role === 'Administrator'
  const canEdit = isAdministrator || currentUser?.access === 'Full Access'
  const visibleNavigation = navigation.filter(([, label]) => {
    if (label === 'User Management') {
      return isAdministrator
    }
    return true
  })

  const userName = currentUser?.name || 'Administrator'
  const userEmail = currentUser?.email || 'admin@medicore.com'
  const userRole = currentUser?.role || 'Staff'
  const userInitials = getInitials(userName)
  const employeeId = currentUser?.employeeId || 'ADM-001'
  const lastLogin = currentUser?.lastLogin || 'Never'
  const userStatus = currentUser?.status || 'Active'

  return (
    <div className={isDarkTheme ? 'dashboard-app dark-theme' : 'dashboard-app'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M<span>+</span></div>
          <div><strong>MediCore</strong><small>PHARMACY SYSTEMS</small></div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {visibleNavigation.map(([icon, label]) => (
            <a className={activePage === label ? 'nav-item active' : 'nav-item'} href={`#${label.toLowerCase().replaceAll(' ', '-')}`} onClick={(event) => { event.preventDefault(); setActivePage(label) }} key={label}>
              <Icon name={icon} /><span>{label}</span>{label === 'Alerts' && showSidebarCount && alertCount > 0 && <b className="alert-count">{alertCount}</b>}
            </a>
          ))}
        </nav>

        <button className="sign-out" type="button" onClick={handleSignOut}><Icon name="arrow" /><span>Sign out</span></button>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="page-title"><h1>{activePage === 'Medicines' ? 'Medicine & Batch Management' : activePage === 'Inventory' ? 'Inventory & Stock' : activePage === 'Suppliers' ? 'Suppliers' : activePage === 'Purchases' ? 'Purchases' : activePage === 'Sales & Billing' ? 'Sales & Billing' : activePage === 'Customers' ? 'Customer Directory' : activePage === 'Stock History' ? 'Stock Movement History' : activePage === 'Alerts' ? 'Inventory Alerts' : activePage === 'Reports' ? 'Analytics & Reports' : activePage === 'User Management' ? 'User Management' : 'Dashboard'}</h1><span>{formatDate(currentDate, dateFormat)}</span></div>
          <div className="topbar-actions">
            <label className="search-box"><Icon name="search" size={20} /><input placeholder="Search records..." aria-label="Search records" /></label>
            <button className="notification-button" type="button" onClick={() => setActivePage('Alerts')} aria-label="Notifications"><Icon name="bell" size={21} />{notificationsEnabled && <i />}</button>
            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button className="profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}>
                <span className="avatar">{userInitials}</span>
                <span className="profile-copy"><strong>{userName}</strong><small>{userRole}</small></span>
                <Icon name="chevron" size={17} />
              </button>
              {isProfileMenuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-header">
                    <span className="profile-menu-avatar">{userInitials}</span>
                    <div className="profile-menu-identity">
                      <strong>{userName}</strong>
                      <span>{userEmail}</span>
                    </div>
                    <span className="profile-role"><Icon name="shield" size={14} /> {userRole.toUpperCase()}</span>
                  </div>
                  <div className="profile-menu-items">
                    <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); setIsProfileModalOpen(true) }}><Icon name="user" size={22} />My profile</button>
                    <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); setIsSettingsModalOpen(true) }}><Icon name="settings" size={22} />Account settings</button>
                    <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); setPasswordError(''); setIsPasswordModalOpen(true) }}><Icon name="lock" size={22} />Change password</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {isProfileModalOpen && (
          <div className="modal-backdrop profile-modal-backdrop" onClick={() => setIsProfileModalOpen(false)}>
            <div className="profile-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
              <div className="profile-modal-heading">
                <div>
                  <h2 id="profile-modal-title">My Profile</h2>
                  <p>Manage your personal and account information</p>
                </div>
                <button className="profile-modal-close" type="button" onClick={() => setIsProfileModalOpen(false)} aria-label="Close profile">
                  <Icon name="close" size={20} />
                </button>
                <div className="profile-modal-identity">
                  <span className="profile-modal-avatar">{userInitials}</span>
                  <div>
                    <h3>{userName}</h3>
                    <div className="profile-modal-status"><span className="profile-role"><Icon name="shield" size={14} /> {userRole.toUpperCase()}</span><span><i /> {userStatus}</span></div>
                  </div>
                </div>
              </div>
              <div className="profile-modal-body">
                <label><span>FULL NAME</span><input value={profileNameInput} onChange={(event) => setProfileNameInput(event.target.value)} /></label>
                <label><span>EMAIL ADDRESS</span><input value={userEmail} readOnly disabled /></label>
                <label><span>PHONE NUMBER</span><input value={profilePhoneInput} onChange={(event) => setProfilePhoneInput(event.target.value)} placeholder="+92 300 0000000" /></label>
                <label><span>EMPLOYEE ID</span><input value={employeeId} readOnly disabled /></label>
                <label><span>ROLE</span><input value={userRole} readOnly disabled /></label>
                <label><span>LAST LOGIN</span><input value={lastLogin} readOnly disabled /></label>
              </div>
              <div className="profile-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                <button className="primary-button" type="button" disabled={!canEdit || isSavingProfile} onClick={handleSaveProfile}>{isSavingProfile ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        )}

        {isSettingsModalOpen && (
          <div className="modal-backdrop profile-modal-backdrop" onClick={() => setIsSettingsModalOpen(false)}>
            <div className="settings-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
              <div className="settings-modal-header">
                <div>
                  <h2 id="settings-modal-title">Account Settings</h2>
                  <p>Customize your pharmacy workspace preferences</p>
                </div>
                <button className="profile-modal-close" type="button" onClick={() => setIsSettingsModalOpen(false)} aria-label="Close account settings">
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="settings-modal-body">
                <label className="settings-field"><span>Date format</span><select value={dateFormat} onChange={(event) => setDateFormat(event.target.value)}><option>DD Month YYYY</option><option>Month DD, YYYY</option><option>YYYY Month DD</option></select></label>
                <label className="settings-field"><span>Currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>PKR (Rs.)</option><option>USD ($)</option><option>EUR (€)</option></select></label>
                <label className="settings-toggle"><span><strong>Automatic screen lock</strong><small>Lock the dashboard when it is inactive</small></span><input type="checkbox" className="toggle-switch" checked={automaticLock} onChange={(event) => setAutomaticLock(event.target.checked)} /></label>
                <label className="settings-field"><span>Session timeout</span><select value={sessionTimeout} onChange={(event) => setSessionTimeout(event.target.value)}><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option><option>Never</option></select></label>
                <label className="settings-field"><span>Default payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>Card</option><option>Bank transfer</option></select></label>
                <label className="settings-toggle"><span><strong>Dark theme</strong><small>Use a darker appearance across the dashboard</small></span><input type="checkbox" className="toggle-switch" checked={isDarkTheme} onChange={(event) => setIsDarkTheme(event.target.checked)} /></label>
              </div>
              <div className="profile-modal-footer">
                <button className="secondary-button" type="button" onClick={() => setIsSettingsModalOpen(false)}>Cancel</button>
                <button className="primary-button" type="button" disabled={!canEdit || isSavingSettings} onClick={handleSaveSettings}>{isSavingSettings ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        )}

        {isPasswordModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsPasswordModalOpen(false)}>
            <form className="modal-card" onSubmit={handleSavePassword} onClick={(event) => event.stopPropagation()}>
              <div className="modal-header"><div><h3>Change password</h3><p>Update your secure MediCore password.</p></div><button className="modal-close" type="button" onClick={() => setIsPasswordModalOpen(false)}><Icon name="close" size={18} /></button></div>
              <div className="modal-body">
                <label className="settings-field"><span>Current password</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label>
                <label className="settings-field"><span>New password</span><input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></label>
                <label className="settings-field"><span>Confirm new password</span><input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></label>
                {passwordError && <div className="login-error-message">{passwordError}</div>}
              </div>
              <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={!canEdit || isSavingPassword}>{isSavingPassword ? 'Updating...' : 'Update password'}</button></div>
            </form>
          </div>
        )}

        {activePage === 'Medicines' ? <MedicineCatalog canEdit={canEdit} /> : activePage === 'Inventory' ? <InventoryStock canEdit={canEdit} /> : activePage === 'Suppliers' ? <SupplierDirectory canEdit={canEdit} /> : activePage === 'Purchases' ? <PurchaseOrders canEdit={canEdit} /> : activePage === 'Sales & Billing' ? <SalesBilling canEdit={canEdit} /> : activePage === 'Customers' ? <CustomerDirectory /> : activePage === 'Stock History' ? <StockHistory /> : activePage === 'Alerts' ? <Alerts notificationsEnabled={notificationsEnabled} onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)} showSidebarCount={showSidebarCount} onToggleSidebarCount={() => setShowSidebarCount((prev) => !prev)} /> : activePage === 'Reports' ? <ReportsDirectory canEdit={canEdit} /> : activePage === 'User Management' ? (isAdministrator ? <UserManagement /> : <div className="content"><div className="welcome-row"><p>Access restricted. Administrator access required.</p></div></div>) : <DashboardOverview onNavigate={setActivePage} />}
      </main>
    </div>
  )
}


export default App
