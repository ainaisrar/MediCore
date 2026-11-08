import { useEffect, useRef, useState } from 'react'
import './App.css'
import './Login.css'

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

function getDateRealTime() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDisplayName(email) {
  const localPart = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return localPart ? localPart.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ') : 'Administrator'
}

function getInitials(name) {
  return name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase()
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
  const [email, setEmail] = useState('')

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
          <div className="access-header">STAFF ACCESS</div>
          <h2>Welcome back</h2>
          <p className="form-subtitle">Sign in to manage your pharmacy operations.</p>
          <form onSubmit={(event) => { event.preventDefault(); onSignIn(email) }}>
            <div className="form-group"><label htmlFor="email">Email address</label><div className="input-wrapper"><Icon name="mail" size={22} /><input type="email" id="email" placeholder="name@pharmacy.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></div>
            <div className="form-group password-group"><div className="label-row"><label htmlFor="password">Password</label><a href="#forgot">Forgot password?</a></div><div className="input-wrapper"><Icon name="lock" size={22} /><input type={showPassword ? 'text' : 'password'} id="password" placeholder="Enter your password" /><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={21} /></button></div></div>
            <label className="checkbox-label"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /><span>Keep me signed in on this device</span></label>
            <button type="submit" className="submit-button">Sign in to MediCore <Icon name="arrow" size={21} /></button>
          </form>
          <div className="card-divider" />
          <div className="admin-link"><span>Don&apos;t have access yet?</span><a href="#permission">Ask administrator for permission <Icon name="arrow" size={18} /></a></div>
        </div>
        <div className="protected"><Icon name="shield" size={18} /> Protected with secure, role-based access</div>
      </section>
    </main>
  )
}

function MetricCard({ icon, label, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon name={icon} size={23} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <div className="empty-value" />
        <small><i />&nbsp;</small>
      </div>
    </article>
  )
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

const medicines = []

function MedicineCatalog() {
  const [query, setQuery] = useState('')
  const filteredMedicines = medicines.filter((medicine) =>
    Object.values(medicine).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="medicine-content">
      <section className="medicine-panel">
        <div className="medicine-heading">
          <div>
            <h2>Medicine catalog</h2>
            <p>Manage medicines, batches, pricing, and expiry details.</p>
          </div>
          <button className="primary-button"><Icon name="pill" size={19} /> Add medicine</button>
        </div>
        <div className="medicine-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine catalog..." aria-label="Search medicine catalog" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="medicine-table-wrap">
          <table className="medicine-table">
            <thead><tr><th>Medicine</th><th>Generic</th><th>Category</th><th>Manufacturer</th><th>Batch</th><th>Stock</th><th>Expiry</th><th>Price</th></tr></thead>
            <tbody>{filteredMedicines.map((medicine) => <tr key={medicine.batch}>
              <td><strong>{medicine.name}</strong></td><td>{medicine.generic}</td><td>{medicine.category}</td><td>{medicine.manufacturer}</td><td>{medicine.batch}</td><td>{medicine.stock}</td><td>{medicine.expiry}</td><td>{medicine.price}</td>
            </tr>)}</tbody>
          </table>
          {filteredMedicines.length === 0 && <div className="catalog-empty">No medicines match your search.</div>}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredMedicines.length} of {medicines.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function InventoryStock() {
  const [query, setQuery] = useState('')
  const inventory = []
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
          <button className="primary-button"><Icon name="cube" size={19} /> Adjust stock</button>
        </div>
        <div className="inventory-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current inventory..." aria-label="Search current inventory" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="inventory-table-wrap">
          <table className="medicine-table inventory-table">
            <thead><tr><th>Item</th><th>Batch</th><th>Available</th><th>Reserved</th><th>Minimum</th><th>Status</th><th>Location</th></tr></thead>
            <tbody>{filteredInventory.map((item) => <tr key={item.batch}>
              <td><strong>{item.name}</strong></td><td>{item.batch}</td><td>{item.available}</td><td>{item.reserved}</td><td>{item.minimum}</td><td>{item.status}</td><td>{item.location}</td>
            </tr>)}</tbody>
          </table>
          {filteredInventory.length === 0 && <div className="inventory-empty-space" aria-label="No inventory records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredInventory.length} of {inventory.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function SupplierDirectory() {
  const [query, setQuery] = useState('')
  const suppliers = []
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
          <button className="primary-button"><Icon name="truck" size={19} /> Add supplier</button>
        </div>
        <div className="supplier-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier directory..." aria-label="Search supplier directory" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="supplier-table-wrap">
          <table className="medicine-table supplier-table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Purchases</th><th>Balance</th></tr></thead>
            <tbody>{filteredSuppliers.map((supplier) => <tr key={supplier.name}>
              <td><strong>{supplier.name}</strong></td><td>{supplier.contact}</td><td>{supplier.phone}</td><td>{supplier.email}</td><td>{supplier.purchases}</td><td>{supplier.balance}</td>
            </tr>)}</tbody>
          </table>
          {filteredSuppliers.length === 0 && <div className="supplier-empty-space" aria-label="No supplier records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredSuppliers.length} of {suppliers.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function PurchaseOrders() {
  const [query, setQuery] = useState('')
  const purchases = []
  const filteredPurchases = purchases.filter((purchase) =>
    Object.values(purchase).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="purchase-content">
      <section className="purchase-panel">
        <div className="purchase-heading">
          <div>
            <h2>Purchase orders</h2>
            <p>Record incoming stock and supplier invoices.</p>
          </div>
          <button className="primary-button"><Icon name="box" size={19} /> New purchase</button>
        </div>
        <div className="purchase-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search purchase orders..." aria-label="Search purchase orders" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="purchase-table-wrap">
          <table className="medicine-table purchase-table">
            <thead><tr><th>Reference</th><th>Supplier</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{filteredPurchases.map((purchase) => <tr key={purchase.reference}>
              <td><strong>{purchase.reference}</strong></td><td>{purchase.supplier}</td><td>{purchase.date}</td><td>{purchase.items}</td><td>{purchase.amount}</td><td>{purchase.status}</td>
            </tr>)}</tbody>
          </table>
          {filteredPurchases.length === 0 && <div className="purchase-empty-space" aria-label="No purchase order records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredPurchases.length} of {purchases.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
        </div>
      </section>
    </div>
  )
}

function SalesBilling() {
  const [query, setQuery] = useState('')
  const sales = []
  const filteredSales = sales.filter((sale) =>
    Object.values(sale).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="sales-content">
      <section className="billing-panel">
        <div className="billing-heading">
          <div>
            <h2>Sales &amp; billing</h2>
            <p>Generate invoices, process counter sales, and track transactions.</p>
          </div>
          <button className="primary-button"><Icon name="cart" size={19} /> Create sale</button>
        </div>
        <div className="billing-toolbar">
          <label className="catalog-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sales invoices..." aria-label="Search sales invoices" /></label>
          <button className="catalog-button"><Icon name="filter" size={19} /> Filters</button>
          <button className="catalog-button"><Icon name="download" size={18} /> Export</button>
        </div>
        <div className="sales-table-wrap">
          <table className="medicine-table billing-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{filteredSales.map((sale) => <tr key={sale.id || sale.invoice}>
              <td><strong>{sale.invoice}</strong></td><td>{sale.customer}</td><td>{sale.date}</td><td>{sale.items}</td><td>{sale.payment}</td><td>{sale.total}</td><td>{sale.status}</td>
            </tr>)}</tbody>
          </table>
          {filteredSales.length === 0 && <div className="billing-empty-space" aria-label="No sales records" />}
        </div>
        <div className="medicine-footer">
          <span>Showing {filteredSales.length} of {sales.length} records</span>
          <div className="pagination"><button disabled>Previous</button><button className="current-page">1</button><button disabled>Next</button></div>
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

function StockHistory() {
  const [query, setQuery] = useState('')
  const stockHistory = []
  const filteredHistory = stockHistory.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
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
            <tbody>{filteredHistory.map((item) => <tr key={item.id}>
              <td>{item.date}</td><td><strong>{item.medicine}</strong></td><td>{item.batch}</td><td>{item.type}</td><td>{item.quantity}</td><td>{item.previous}</td><td>{item.balance}</td><td>{item.reference}</td>
            </tr>)}</tbody>
          </table>
          {filteredHistory.length === 0 && <div className="history-empty-space" aria-label="No stock history records" />}
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
  const alerts = []
  const filteredAlerts = alerts.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  return (
    <div className="alerts-content">
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
            <tbody>{filteredAlerts.map((item) => <tr key={item.id}>
              <td><strong>{item.alert}</strong></td><td>{item.medicine}</td><td>{item.batch}</td><td>{item.stock}</td><td>{item.threshold}</td><td>{item.expiry}</td><td>{item.severity}</td>
            </tr>)}</tbody>
          </table>
          {filteredAlerts.length === 0 && <div className="alerts-empty-space" aria-label="No alert records" />}
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

function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showSidebarCount, setShowSidebarCount] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const userName = getDisplayName(userEmail)
  const userInitials = getInitials(userName)

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

  if (!signedIn) {
    return <SignIn onSignIn={(email) => { setUserEmail(email); setSignedIn(true) }} />
  }

  return (
    <div className="dashboard-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M<span>+</span></div>
          <div><strong>MediCore</strong><small>PHARMACY SYSTEMS</small></div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(([icon, label]) => (
            <a className={activePage === label ? 'nav-item active' : 'nav-item'} href={`#${label.toLowerCase().replaceAll(' ', '-')}`} onClick={(event) => { event.preventDefault(); setActivePage(label) }} key={label}>
              <Icon name={icon} /><span>{label}</span>{label === 'Alerts' && showSidebarCount && <b className="alert-count">0</b>}
            </a>
          ))}
        </nav>

        <button className="sign-out" type="button" onClick={() => setSignedIn(false)}><Icon name="arrow" /><span>Sign out</span></button>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="page-title"><h1>{activePage === 'Medicines' ? 'Medicine & Batch Management' : activePage === 'Inventory' ? 'Inventory & Stock' : activePage === 'Suppliers' ? 'Suppliers' : activePage === 'Purchases' ? 'Purchases' : activePage === 'Sales & Billing' ? 'Sales & Billing' : activePage === 'Customers' ? 'Customer Directory' : activePage === 'Stock History' ? 'Stock Movement History' : activePage === 'Alerts' ? 'Inventory Alerts' : 'Dashboard'}</h1><span>{getDateRealTime()}</span></div>
          <div className="topbar-actions">
            <label className="search-box"><Icon name="search" size={20} /><input placeholder="Search records..." aria-label="Search records" /></label>
            <button className="notification-button" type="button" onClick={() => setActivePage('Alerts')} aria-label="Notifications"><Icon name="bell" size={21} />{notificationsEnabled && <i />}</button>
            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button className="profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}>
                <span className="avatar">{userInitials}</span>
                <span className="profile-copy"><strong>{userName}</strong><small>Pharmacy account</small></span>
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
                    <span className="profile-role"><Icon name="shield" size={14} /> ADMINISTRATOR</span>
                  </div>
                  <div className="profile-menu-items">
                    <button type="button" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}><Icon name="user" size={22} />My profile</button>
                    <button type="button" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}><Icon name="settings" size={22} />Account settings</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activePage === 'Medicines' ? <MedicineCatalog /> : activePage === 'Inventory' ? <InventoryStock /> : activePage === 'Suppliers' ? <SupplierDirectory /> : activePage === 'Purchases' ? <PurchaseOrders /> : activePage === 'Sales & Billing' ? <SalesBilling /> : activePage === 'Customers' ? <CustomerDirectory /> : activePage === 'Stock History' ? <StockHistory /> : activePage === 'Alerts' ? <Alerts notificationsEnabled={notificationsEnabled} onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)} showSidebarCount={showSidebarCount} onToggleSidebarCount={() => setShowSidebarCount((prev) => !prev)} /> : <div className="content">
          <div className="welcome-row">
            <p>Here&apos;s what&apos;s happening today.</p>
            <div className="quick-actions"><button className="secondary-button" type="button" onClick={() => setActivePage('Purchases')}><Icon name="plus" size={18} /> New purchase</button><button className="primary-button" type="button" onClick={() => setActivePage('Sales & Billing')}><Icon name="cart" size={19} /> Create sale</button></div>
          </div>

          <section className="metrics-grid" aria-label="Pharmacy summary">
            <MetricCard icon="pill" label="Total medicines" tone="blue" />
            <MetricCard icon="cube" label="Available stock" tone="green" />
            <MetricCard icon="report" label="Today&apos;s sales" tone="purple" />
            <MetricCard icon="bell" label="Needs attention" tone="orange" />
          </section>

          <section className="primary-grid">
            <article className="panel sales-panel">
              <div className="panel-header"><div><h2>Sales overview</h2><p>Revenue performance over the last 7 days</p></div><a href="#sales-report">View report <Icon name="arrow" size={16} /></a></div>
              <div className="empty-chart" aria-label="Sales chart awaiting data"><div className="chart-placeholder" /><span>No sales data yet</span></div>
            </article>
            <article className="panel alerts-panel">
              <div className="panel-header"><div><h2>Inventory alerts</h2><p>Items requiring action</p></div><a href="#alerts" onClick={(event) => { event.preventDefault(); setActivePage('Alerts') }}>View all <Icon name="arrow" size={16} /></a></div>
              <div className="alert-empty"><div className="empty-state-icon"><Icon name="bell" size={23} /></div><strong>No alerts yet</strong><span>Low-stock and expiry alerts will appear here.</span></div>
            </article>
          </section>

          <section className="secondary-grid">
            <article className="panel activity-panel"><div className="panel-header"><div><h2>Recent sales</h2><p>Latest invoices generated</p></div><a href="#sales" onClick={(event) => { event.preventDefault(); setActivePage('Sales & Billing') }}>All sales <Icon name="arrow" size={16} /></a></div><EmptyRows type="sales" /></article>
            <article className="panel activity-panel"><div className="panel-header"><div><h2>Recent stock activity</h2><p>Latest inventory movements</p></div><a href="#stock-history" onClick={(event) => { event.preventDefault(); setActivePage('Stock History') }}>View history <Icon name="arrow" size={16} /></a></div><EmptyRows type="stock" /></article>
          </section>
        </div>}
      </main>
    </div>
  )
}

export default App
