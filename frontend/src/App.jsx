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
  const [showCommitmentsDetails, setShowCommitmentsDetails] = useState(false);
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
      console.log('Safe to Spend API response:', safeData);
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

  const handleClearAllData = async () => {
    if (!window.confirm("Are you sure you want to delete all transaction data? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api.delete('/transactions/clear-all');
      showToast("All transaction data cleared successfully!", "success");
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
    setLoading(true);
    try {
      await api.delete(`/transactions/${id}`);
      showToast('Transaction deleted.');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
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

  // --- SVG Chart Helpers ---
  const renderTrendChart = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    // Generate last 6 rolling months array
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        label: monthNames[d.getMonth()],
        val: 0
      });
    }

    // Accumulate actual expense amounts from live transactions
    (transactions || []).forEach(tx => {
      if (tx.type === 'expense' && tx.date) {
        const parts = tx.date.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const target = months.find(item => item.year === y && item.monthIdx === m);
          if (target) {
            target.val += Number(tx.amount || 0);
          }
        }
      }
    });

    const currentMonthVal = months[months.length - 1].val;
    const prevMonthVal = months[months.length - 2].val;
    
    let changePercentageStr = '0% this month';
    let isIncrease = false;
    if (prevMonthVal > 0) {
      const diff = ((currentMonthVal - prevMonthVal) / prevMonthVal) * 100;
      isIncrease = diff > 0;
      changePercentageStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% this month`;
    } else if (currentMonthVal > 0) {
      isIncrease = true;
      changePercentageStr = '+100% this month';
    }

    const maxVal = Math.max(...months.map(m => m.val), 1000);
    const width = 360;
    const height = 130;
    const padding = 20;

    const coords = months.map((p, idx) => {
      const x = padding + (idx * ((width - 2 * padding) / (months.length - 1)));
      const y = height - padding - ((p.val / maxVal) * (height - 2 * padding));
      return { x, y, label: p.label, val: p.val };
    });

    const pathD = coords.reduce((acc, pt, i, a) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = a[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

    return (
      <div className="trend-chart-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spending Velocity</span>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-1)', fontFamily: 'Outfit, sans-serif' }}>{formatINR(currentMonthVal)}</div>
          </div>
          <span className={`badge ${isIncrease ? 'expense' : 'income'}`} style={{ fontSize: '0.75rem' }}>
            {changePercentageStr}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#trendGradient)" />

          {/* Smooth bezier curve */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />

          {/* Glowing pulse dots */}
          {coords.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="5" fill="#080c14" stroke="#10b981" strokeWidth="3" />
              <text x={pt.x} y={height - 2} textAnchor="middle" fill="var(--text-3)" fontSize="10" fontWeight="600">{pt.label}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderBarChart = () => {
    const breakdown = summary.categoryBreakdown || [];
    const maxAmount = breakdown.length > 0 ? Math.max(...breakdown.map(i => i.amount)) : 0;

    if (breakdown.length === 0 || maxAmount === 0) {
      return (
        <div className="empty-state">
          <span className="emoji">📊</span>
          <p>No expense data available for breakdown</p>
        </div>
      );
    }

    const colors = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#6b7280'];

    return (
      <div className="bar-chart-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        {breakdown.map((item, idx) => {
          const percentage = (item.amount / maxAmount) * 100;
          const color = colors[idx % colors.length];
          return (
            <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-1)' }}>{item.category}</span>
                <span style={{ fontWeight: '700', fontFamily: 'Outfit, sans-serif', color: 'var(--text-1)' }}>{formatINR(item.amount)}</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                <div 
                  style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    background: `linear-gradient(90deg, ${color}, #06b6d4)`, 
                    borderRadius: '6px',
                    boxShadow: `0 0 10px ${color}80`,
                    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Auth Render Screens ---
  if (!user) {
    if (currentPage === 'register') {
      return (
        <div className="auth-split-wrapper">
          <div className="auth-hero-pane" style={{ backgroundImage: `linear-gradient(135deg, rgba(8, 12, 20, 0.85), rgba(15, 23, 42, 0.92)), url('/finance_hero.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="hero-content">
              <div className="logo-badge">₹</div>
              <h2>Penny-Count Finance Hub</h2>
              <p>Experience real-time spending intelligence, double-entry cashflow ledgering, and AI-driven budget guardrails.</p>
              
              <div className="hero-features">
                <div className="feature-item">
                  <span className="icon">🛡️</span>
                  <div>
                    <strong>Safe-to-Spend Guard</strong>
                    <p>Real-time calculation protecting your upcoming bills.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="icon">📊</span>
                  <div>
                    <strong>Interactive Analytics</strong>
                    <p>Visual category bar charts & cashflow breakdowns.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-form-pane">
            <div className="auth-card-inner">
              <div className="auth-header">
                <h2>Create Your Account</h2>
                <p>Join Penny-Count to simplify your financial management.</p>
              </div>

              <form className="form" onSubmit={handleRegister}>
                <div className="input-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={regName} 
                    onChange={e => setRegName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={regEmail} 
                    onChange={e => setRegEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={regPassword} 
                    onChange={e => setRegPassword(e.target.value)} 
                    minLength="6" 
                    required 
                  />
                </div>

                <button type="submit" className="btn-primary-glow">Create Account</button>
                
                <p className="auth-switch-text">
                  Already registered?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('login'); }}>
                    Sign in here
                  </a>
                </p>
              </form>
            </div>
          </div>
          {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
      );
    }

    return (
      <div className="auth-split-wrapper">
        <div className="auth-hero-pane" style={{ backgroundImage: `linear-gradient(135deg, rgba(8, 12, 20, 0.85), rgba(15, 23, 42, 0.92)), url('/finance_hero.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="hero-content">
            <div className="logo-badge">₹</div>
            <h2>Penny-Count Finance Hub</h2>
            <p>Your intelligent, high-precision financial dashboard with real-time budget guardrails.</p>
            
            <div className="hero-features">
              <div className="feature-item">
                <span className="icon">⚡</span>
                <div>
                  <strong>Instant Sample Seeding</strong>
                  <p>Load instant demo transactions to test cashflow scenarios.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">🔐</span>
                <div>
                  <strong>Bank-Grade Security</strong>
                  <p>Stateless JWT authentication & encrypted password hashes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-pane">
          <div className="auth-card-inner">
            <div className="auth-header">
              <h2>Sign In to Penny-Count</h2>
              <p>Enter your details below to access your financial hub.</p>
            </div>

            <form className="form" onSubmit={handleLogin}>
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary-glow">Sign In</button>

              <p className="auth-switch-text">
                New to Penny-Count?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('register'); }}>
                  Create an account
                </a>
              </p>
            </form>
          </div>
        </div>
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
          <span>Penny-Count</span>
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1>Dashboard</h1>
                <p>Track your budget summary and category spending</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                <button 
                  className="btn-ghost" 
                  onClick={handleClearAllData} 
                  style={{ 
                    border: '1px solid var(--danger)', 
                    color: 'var(--danger)', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🗑️ Delete Seed Data
                </button>
              </div>
            </div>

            {/* Safe-to-Spend Feature */}
            {safeToSpend && (
              <div className="card safe-to-spend-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--bg-2), var(--bg-3))', border: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-2)' }}>Safe to Spend</h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--text-1)' }}>
                      {formatINR(safeToSpend.safe_to_spend)}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'var(--accent-glow)', color: 'var(--text-1)', padding: '0.25rem 0.6rem' }}>
                        {formatINR(safeToSpend.daily_safe_to_spend)} / day
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: safeToSpend.safe_to_spend < 0 ? 'var(--expense)' : 'var(--income)' }}>
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
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Current Balance</div>
                        <div style={{ fontWeight: 'bold' }}>{formatINR(safeToSpend.current_balance)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Upcoming Commitments
                          {safeToSpend.upcoming_commitments_details && safeToSpend.upcoming_commitments_details.length > 0 && (
                            <span 
                              onClick={() => setShowCommitmentsDetails(!showCommitmentsDetails)} 
                              style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem', fontWeight: '500' }}
                            >
                              {showCommitmentsDetails ? '(less)' : '(show more)'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--expense)' }}>-{formatINR(safeToSpend.upcoming_commitments)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Expected Essential</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--expense)' }}>-{formatINR(safeToSpend.expected_essential_spending)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Safety Buffer</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--expense)' }}>-{formatINR(safeToSpend.safety_buffer)}</div>
                      </div>
                    </div>

                    {showCommitmentsDetails && safeToSpend.upcoming_commitments_details && safeToSpend.upcoming_commitments_details.length > 0 && (
                      <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-1)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Upcoming Bills & Commitments Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {safeToSpend.upcoming_commitments_details.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingBottom: idx < safeToSpend.upcoming_commitments_details.length - 1 ? '0.5rem' : '0', borderBottom: idx < safeToSpend.upcoming_commitments_details.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-1)' }}>{item.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Category: {item.category}</span>
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontWeight: '700', color: 'var(--expense)' }}>-{formatINR(item.amount)}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Expected pay date: {item.expected_date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-2)', textAlign: 'right' }}>
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

            {/* Visual breakdown, Trend Chart, and Recent Transactions */}
            <div className="chart-section" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="card chart-card">
                <h3>Cashflow Trend</h3>
                {renderTrendChart()}
              </div>

              <div className="card chart-card">
                <h3>Expense Breakdown</h3>
                {renderBarChart()}
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
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input 
                      type="month" 
                      value={filterMonth} 
                      onChange={e => setFilterMonth(e.target.value)} 
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                      style={{ width: 'auto', display: 'inline-block', cursor: 'pointer' }} 
                    />
                    {filterMonth && (
                      <button 
                        type="button"
                        className="btn-ghost"
                        onClick={() => setFilterMonth('')}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
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
