# 💰 Penny-Count — Personal Finance & Spending Intelligence

A modern, high-performance personal finance tracking and spending intelligence application built with a **React SPA** (Vite, Custom Cyber-Emerald CSS) and a **Python Flask REST API** (SQLAlchemy ORM, SQLite database, JWT authentication).

---

## 🚀 Deployment Guide

### 1. Deploying Backend to Render

1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint** (or **Web Service**).
3. Connect your GitHub repository: `devrajsinghal35/Penny-Count`.
4. Render will automatically detect `render.yaml` configuration.
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn wsgi:app`
5. Set environment variables in Render Dashboard:
   - `SECRET_KEY`: Set a long random secret key.
   - `PYTHON_VERSION`: `3.11.5`
6. Click **Deploy**. Render will host your API at `https://<your-render-app>.onrender.com`.

---

### 2. Deploying Frontend to Vercel

1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `devrajsinghal35/Penny-Count`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Add `VITE_API_URL` = `https://<your-render-app>.onrender.com/api`
6. Click **Deploy**. Vercel will host your frontend SPA!

---

## 🛠️ Local Development Setup

### Backend (Flask API)
```bash
cd backend

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python3 app.py
```
*Backend API will run at http://localhost:5000 (or http://localhost:5002 via Flask CLI).*

### Frontend (React SPA)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Frontend will run at http://localhost:5173.*

---

## 📐 Architecture & Project Structure

```
Penny-Count/
├── render.yaml               # Render Infrastructure Blueprint
├── README.md                 # Project Documentation
├── backend/                  # Flask REST API Microservice
│   ├── app.py                # Flask app factory & CORS configuration
│   ├── config.py             # Database & security settings
│   ├── requirements.txt      # Python dependencies (Flask, SQLAlchemy, PyJWT, Gunicorn)
│   ├── wsgi.py               # WSGI production server entry point
│   ├── models/               # SQLAlchemy ORM models (User, Transaction)
│   ├── routes/               # REST API blueprints (Auth, Transactions)
│   └── services/             # Finance Service & Safe-to-Spend logic
└── frontend/                 # React SPA (Vite)
    ├── package.json          # Frontend dependencies & scripts
    ├── vercel.json           # Vercel routing rewrites for SPA
    ├── vite.config.js        # Vite configuration
    └── src/
        ├── api.js            # Fetch wrapper with Authorization Bearer header & VITE_API_URL support
        ├── index.css         # Modern Cyber-Emerald design system
        └── App.jsx           # Application components, views, and state management
```

---

## ✨ Features

- **Double-Entry Style Ledger**: Dynamic CRUD management of cashflows, income, and expenses with automatic classification.
- **Safe-to-Spend Engine 🛡️**: Calculates exact daily safe spending buffer after accounting for recurring commitments and safety buffers.
- **Real-Time Guardrails**: Inline warning alerts inside the transaction flow when an expense exceeds daily thresholds.
- **Interactive Analytics**: Clear popovers, visual spending charts, and transaction breakdowns.
- **Stateless JWT Authentication**: Secure password hashing with Werkzeug and JWT tokens with PyJWT.
- **Sample Data Seeding**: Quick demo mode to seed realistic transaction history.

---

## 📄 License

MIT License. Designed & Developed by [devrajsinghal35](https://github.com/devrajsinghal35).
