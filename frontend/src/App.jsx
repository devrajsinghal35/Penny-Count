import React, { useState, useEffect } from 'react';
import { api, getToken, setToken, clearToken, getUser, setUser, clearUser, formatINR } from './api';

export default function App() {
  // --- Auth State ---
  const [user, setAuthState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  
  // --- Navigation State ---
  const [currentPage, setCurrentPage] = useState(user ? 'dashboard' : 'login');
  
  // --- Form States (Auth) ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // --- Dashboard & Transactions State ---
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, categoryBreakdown: [] });
  const [transactions, setTransactions] = useState([]);
  const [safeToSpend, setSafeToSpend] = useState(null);
  const [showSafeBreakdown, setShowSafeBreakdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Filters ---
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  // --- Transaction Form State (Add / Edit) ---
  const [txId, setTxId] = useState(null); // null for Add, number for Edit
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('expense');
  const [txCategory, setTxCategory] = useState('Food');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Categories list
  const categories = ['Food', 'Shopping', 'Entertainment', 'Housing', 'Utilities', 'Travel', 'Salary', 'Investment', 'Other'];

  // --- Toast Helper ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Load Data ---
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const summaryData = await api.get('/transactions/summary');
      setSummary(summaryData);
      
      const safeData = await api.get('/financial/safe-to-spend');
      setSafeToSpend(safeData);
      
      const queryParams = [];
      if (filterType !== 'all') queryParams.push(`type=${filterType}`);
      if (filterMonth) queryParams.push(`month=${filterMonth}`);
      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      
      const txData = await api.get(`/transactions${queryString}`);
      setTransactions(txData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filterType, filterMonth]);

  // --- Auth Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email: loginEmail, password: loginPassword });
      setToken(res.token);
      setUser(res.user);
      setTokenState(res.token);
      setAuthState(res.user);
      showToast(`Welcome back, ${res.user.name}!`);
      setCurrentPage('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { name: regName, email: regEmail, password: regPassword });
      setToken(res.token);
      setUser(res.user);
      setTokenState(res.token);
      setAuthState(res.user);
      showToast(`Welcome, ${res.user.name}! Account created.`);
      setCurrentPage('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    clearToken();
    clearUser();
    setTokenState(null);
    setAuthState(null);
    showToast('Logged out successfully.');
    setCurrentPage('login');
  };

  const handleLoadDemo = async () => {
    if (!window.confirm("This will replace all your current transactions with realistic sample data for testing. Proceed?")) return;
    setLoading(true);
    try {
      await api.post('/transactions/seed-demo');
      showToast("Sample data loaded successfully!", "success");
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Transaction Handlers ---
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const payload = {
      title: txTitle,
      amount: parseFloat(txAmount),
      type: txType,
      category: txCategory,
      description: txDescription,
      date: txDate
    };

    try {
      if (txId) {
        // Edit Mode
        await api.put(`/transactions/${txId}`, payload);
        showToast('Transaction updated successfully.');
      } else {
        // Add Mode
        await api.post('/transactions', payload);
        showToast('Transaction added successfully.');
      }
      
      // Reset Form
      resetTransactionForm();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditClick = (tx) => {
    setTxId(tx.id);
    setTxTitle(tx.title);
    setTxAmount(tx.amount);
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxDescription(tx.description || '');
    setTxDate(tx.date);
    setCurrentPage('transactions');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      showToast('Transaction deleted.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resetTransactionForm = () => {
    setTxId(null);
    setTxTitle('');
    setTxAmount('');
    setTxType('expense');
    setTxCategory('Food');
    setTxDescription('');
    setTxDate(new Date().toISOString().split('T')[0]);
  };

  // --- SVG Donut Helpers ---
  const renderDonutChart = () => {
    const breakdown = summary.categoryBreakdown || [];
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    if (total === 0) {
      return (
        <div className="empty-state">
          <span className="emoji">📊</span>
          <p>No expense data available for breakdown</p>
        </div>
      );
    }

    const radius = 50;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    
    // Modern colors for charts
    const colors = [
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#06b6d4', // Cyan
      '#3b82f6', // Blue
      '#6b7280'  // Gray
    ];

    let currentOffset = 0;

    return (
      <div className="chart-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <svg width="220" height="220" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={radius} fill="transparent" stroke="var(--border)" strokeWidth={strokeWidth} />
          {breakdown.map((item, idx) => {
            const percentage = (item.amount / total) * 100;
            const strokeLength = (percentage / 100) * circumference;
            const strokeOffset = circumference - strokeLength + currentOffset;
            currentOffset -= strokeLength;

            return (
              <circle
                key={item.category}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            );
          })}
        </svg>

        <ul className="legend-list" style={{ width: '100%' }}>
          {breakdown.map((item, idx) => (
            <li key={item.category} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: colors[idx % colors.length] }}></span>
              <span className="legend-label">{item.category}</span>
              <span className="legend-value">{formatINR(item.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // --- Auth Render Screens ---
  if (!user) {
    if (currentPage === 'register') {
      return (
        <div className="auth-page">
          <div className="auth-brand">
            <div className="logo-mark">₹</div>
            <h1>FinGuard</h1>
            <p>Your beautiful financial hub</p>
          </div>
          <form className="card form" onSubmit={handleRegister}>
            <h3>Create Account</h3>
            <p style={{ marginBottom: '0.5rem' }}>Sign up to start tracking your finances.</p>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={regName} 
              onChange={e => setRegName(e.target.value)} 
              required 
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={regEmail} 
              onChange={e => setRegEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password (min 6 chars)" 
              value={regPassword} 
              onChange={e => setRegPassword(e.target.value)} 
              minLength="6" 
              required 
            />
            <button type="submit" className="btn-primary">Register</button>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem' }}>
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('login'); }}>
                Login here
              </a>
            </p>
          </form>
          {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
      );
    }

    return (
      <div className="auth-page">
        <div className="auth-brand">
          <div className="logo-mark">₹</div>
          <h1>FinGuard</h1>
          <p>Your beautiful financial hub</p>
        </div>
        <form className="card form" onSubmit={handleLogin}>
          <h3>Sign In</h3>
          <p style={{ marginBottom: '0.5rem' }}>Enter your credentials to access your dashboard.</p>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={loginEmail} 
            onChange={e => setLoginEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={loginPassword} 
            onChange={e => setLoginPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary">Login</button>
          <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem' }}>
            New to FinGuard?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('register'); }}>
              Create an account
            </a>
          </p>
        </form>
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    );
  }

  // --- Main Application Layout ---
  return (
    <div className="page-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-mark">₹</div>
          <span>FinGuard</span>
        </div>
        
        <nav>
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setCurrentPage('dashboard')}
          >
            <span className="icon">📊</span>
            Dashboard
          </button>
          <button 
            className={`nav-link ${currentPage === 'transactions' ? 'active' : ''}`} 
            onClick={() => { setCurrentPage('transactions'); resetTransactionForm(); }}
          >
            <span className="icon">💸</span>
            Transactions
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="content">
        
        {currentPage === 'dashboard' && (
          <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1>Dashboard</h1>
                <p>Track your budget summary and category spending</p>
              </div>
              <button 
                className="btn-ghost" 
                onClick={handleLoadDemo} 
                style={{ 
                  border: '1px solid var(--primary)', 
                  color: 'var(--primary)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🚀 Try with Sample Data
              </button>
            </div>

            {/* Safe-to-Spend Feature */}
            {safeToSpend && (
              <div className="card safe-to-spend-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2))', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-2)' }}>Safe to Spend</h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--text-1)' }}>
                      {formatINR(safeToSpend.safe_to_spend)}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {formatINR(safeToSpend.daily_safe_to_spend)} / day
                      </span>
                      <span style={{ fontSize: '0.9rem', color: safeToSpend.safe_to_spend < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {safeToSpend.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <button className="btn-ghost" onClick={() => setShowSafeBreakdown(!showSafeBreakdown)}>
                      {showSafeBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
                    </button>
                  </div>
                </div>

                {showSafeBreakdown && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Current Balance</div>
                      <div style={{ fontWeight: 'bold' }}>{formatINR(safeToSpend.current_balance)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Upcoming Commitments</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>-{formatINR(safeToSpend.upcoming_commitments)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Expected Essential</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>-{formatINR(safeToSpend.expected_essential_spending)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Safety Buffer</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>-{formatINR(safeToSpend.safety_buffer)}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-2)', textAlign: 'right' }}>
                      Period: {safeToSpend.calculation_period}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KPI Cards */}
            <div className="summary-grid">
              <div className="summary-card income">
                <span className="card-label">Total Income</span>
                <span className="card-value">{formatINR(summary.income)}</span>
                <span className="card-icon">📈</span>
              </div>
              <div className="summary-card expense">
                <span className="card-label">Total Expense</span>
                <span className="card-value">{formatINR(summary.expense)}</span>
                <span className="card-icon">📉</span>
              </div>
              <div className="summary-card balance">
                <span className="card-label">Net Balance</span>
                <span className="card-value">{formatINR(summary.balance)}</span>
                <span className="card-icon">💼</span>
              </div>
            </div>

            {/* Visual breakdown and Recent Transactions */}
            <div className="chart-section">
              <div className="card chart-card">
                <h3>Expense Breakdown by Category</h3>
                {renderDonutChart()}
              </div>

              <div className="card chart-card">
                <h3>Recent Transactions</h3>
                {loading ? (
                  <div className="loader"><div className="spinner"></div></div>
                ) : transactions.length === 0 ? (
                  <div className="empty-state">
                    <span className="emoji">📝</span>
                    <p>No transactions added yet</p>
                  </div>
                ) : (
                  <div className="transaction-list" style={{ maxHeight: '420px' }}>
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="transaction-item">
                        <div className="transaction-info">
                          <strong>{tx.title}</strong>
                          <span className="meta">{tx.category} • {tx.date}</span>
                        </div>
                        <span className={`badge ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {currentPage === 'transactions' && (
          <>
            <div className="page-header">
              <div>
                <h1>{txId ? 'Edit Transaction' : 'Transactions'}</h1>
                <p>{txId ? 'Modify existing transaction details' : 'Manage your cashflow history and add new activities'}</p>
              </div>
              
              {!txId && (
                <div className="filter-bar">
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <input 
                    type="month" 
                    value={filterMonth} 
                    onChange={e => setFilterMonth(e.target.value)} 
                    style={{ width: 'auto', display: 'inline-block' }} 
                  />
                </div>
              )}
            </div>

            <div className="transactions-grid">
              {/* Form Side */}
              <div className="card">
                <form onSubmit={handleSaveTransaction} className="form" style={{ maxWidth: '100%' }}>
                  <h3>{txId ? 'Modify Record' : 'Add Transaction'}</h3>
                  
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Title</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Groceries" 
                    value={txTitle} 
                    onChange={e => setTxTitle(e.target.value)} 
                    required 
                  />

                  <div className="form-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Amount</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={txAmount} 
                        onChange={e => setTxAmount(e.target.value)} 
                        required 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Type</label>
                      <select value={txType} onChange={e => setTxType(e.target.value)}>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Category</label>
                      <select value={txCategory} onChange={e => setTxCategory(e.target.value)}>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Date</label>
                      <input 
                        type="date" 
                        value={txDate} 
                        onChange={e => setTxDate(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Description / Notes (Optional)</label>
                  <textarea 
                    placeholder="Short description..." 
                    value={txDescription} 
                    onChange={e => setTxDescription(e.target.value)} 
                    rows="2"
                  />

                  {/* Safe-to-Spend Warning */}
                  {txType === 'expense' && txAmount && safeToSpend && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem',
                      background: parseFloat(txAmount) > safeToSpend.safe_to_spend ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-2)',
                      color: parseFloat(txAmount) > safeToSpend.safe_to_spend ? 'var(--danger)' : 'var(--text-2)'
                    }}>
                      {parseFloat(txAmount) > safeToSpend.safe_to_spend ? (
                        <>⚠️ This expense exceeds your safe-to-spend limit of <strong>{formatINR(safeToSpend.safe_to_spend)}</strong>.</>
                      ) : (
                        <>This will reduce your safe-to-spend to <strong>{formatINR(safeToSpend.safe_to_spend - parseFloat(txAmount))}</strong>.</>
                      )}
                    </div>
                  )}

                  <div className="form-row" style={{ marginTop: '1rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                      {txId ? 'Update Record' : 'Save Transaction'}
                    </button>
                    {txId && (
                      <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={resetTransactionForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Transactions List Side */}
              <div className="card">
                <h3>Cashflow Records</h3>
                
                {loading ? (
                  <div className="loader"><div className="spinner"></div></div>
                ) : transactions.length === 0 ? (
                  <div className="empty-state">
                    <span className="emoji">💸</span>
                    <p>No records found matching filters</p>
                  </div>
                ) : (
                  <div className="transaction-list">
                    {transactions.map(tx => (
                      <div key={tx.id} className="transaction-item">
                        <div className="transaction-info">
                          <strong>{tx.title}</strong>
                          <span className="meta">{tx.category} • {tx.date}</span>
                          {tx.description && <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', fontStyle: 'italic' }}>{tx.description}</p>}
                        </div>
                        
                        <div className="transaction-actions">
                          <span className={`badge ${tx.type}`} style={{ marginRight: '0.5rem' }}>
                            {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                          </span>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                            onClick={() => handleEditClick(tx)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-danger" 
                            style={{ borderRadius: '4px' }}
                            onClick={() => handleDeleteClick(tx.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Toast Alert popup */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
