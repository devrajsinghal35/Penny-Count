# 💰 Penny-Count — Personal Finance & Spending Intelligence

A modern, high-performance personal finance tracking and spending intelligence platform built with a **React Single-Page Application** (Vite, Custom Cyber-Emerald CSS) and a **Python Flask REST API** (SQLAlchemy ORM, SQLite, JWT Authentication).

---

## 🌟 Architectural Overview: Why Vercel & Render?

Penny-Count is designed as a **decoupled micro-service architecture**, separating the frontend client interface from the backend financial intelligence engine. This decoupled approach offers high performance, security, global availability, and cost-effective scaling:

```
┌─────────────────────────────────────────┐               ┌─────────────────────────────────────────┐
│           FRONTEND (Vercel)             │               │            BACKEND (Render)             │
│                                         │               │                                         │
│   React SPA (Vite) + Cyber-Emerald CSS  │ ───REST/JWT──►│   Python Flask API + Gunicorn Server    │
│   • Global Edge CDN Distribution        │   Over HTTPS  │   • Safe-to-Spend Intelligence Engine   │
│   • vercel.json SPA Rewrites            │               │   • render.yaml Infrastructure Blueprint│
│   • Environment Injection (VITE_API_URL)│               │   • SQLAlchemy ORM & SQLite Persistence │
└─────────────────────────────────────────┘               └─────────────────────────────────────────┘
```

### ⚡ Why Frontend on Vercel?
* **Optimized Single-Page App Delivery**: Vercel is purpose-built for frontend applications. It provides instant global CDN edge distribution for static assets compiled by Vite (`npm run build`).
* **Seamless SPA Routing**: Configured via `frontend/vercel.json` with rewrite rules so client-side React routes (`/`, `/transactions`, `/dashboard`) reload cleanly without triggering server 404 errors.
* **Environment Variable Injection**: Supports `VITE_API_URL` to connect the production React frontend dynamically to the backend API hosted on Render.

### 🐍 Why Backend on Render?
* **Native Python WSGI Web Hosting**: Render provides robust native support for Python web services powered by `gunicorn wsgi:app`.
* **Infrastructure-as-Code (`render.yaml`)**: Includes a pre-configured Render Blueprint (`render.yaml`) that automates build steps (`pip install -r requirements.txt`), environment setup, and deployment.
* **CORS & JWT Security**: Configured with `flask-cors` to allow cross-origin API requests securely from the Vercel domain while protecting endpoints with JWT Bearer authentication headers.

---

## ✨ Key Features

- **Safe-to-Spend Engine 🛡️**: Calculates exact daily safe spending limits after accounting for fixed monthly commitments, upcoming bills, and a 10% safety buffer.
- **Real-Time Guardrails**: Live warnings inside the transaction flow before saving an expense if it exceeds the daily safe spending threshold.
- **Double-Entry Style Ledger**: Dynamic CRUD management for income, expenses, and cashflows with automatic categorization.
- **Interactive Visual Analytics**: Transparent popovers, spending trends, and visual breakdown charts.
- **Stateless JWT Security**: Secure password hashing with Werkzeug and stateless authentication tokens via PyJWT.
- **Instant Sample Data Generator**: A single-click demo seeder that populates realistic financial transactions for testing.

---

## 🛠️ Local Development Setup

### 1. Backend Setup (Flask API)
```bash
cd backend

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend development server
python3 app.py
```
*Backend API runs locally at `http://localhost:5000` (or `http://localhost:5002`).*

### 2. Frontend Setup (React SPA)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend UI runs locally at `http://localhost:5173`.*

---

## 🚀 Production Deployment Guide

### Step 1: Deploy Backend to Render (Python Flask API)

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and choose **Blueprint**.
3. Connect your repository: `devrajsinghal35/Penny-Count`.
4. Render detects `render.yaml` automatically:
   * **Root Directory**: `backend`
   * **Environment**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `gunicorn wsgi:app`
5. In **Environment Variables**, add:
   * `SECRET_KEY`: Set a secure random key.
   * `PYTHON_VERSION`: `3.11.5`
6. Deploy the web service. Render will provide your production API URL (e.g. `https://penny-count-backend.onrender.com`).

---

### Step 2: Deploy Frontend to Vercel (React SPA)

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your repository: `devrajsinghal35/Penny-Count`.
4. Configure Project Settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Add **Environment Variable**:
   * `VITE_API_URL` = `https://penny-count-backend.onrender.com/api` *(replace with your actual Render API URL)*
6. Click **Deploy**. Vercel will host your live application!

---

## 📐 Project Structure

```
Penny-Count/
├── render.yaml               # Render Infrastructure-as-Code Blueprint
├── README.md                 # Project Overview & Deployment Guide
├── backend/                  # Flask REST API Microservice
│   ├── app.py                # Flask app factory & CORS configuration
│   ├── config.py             # Database & security settings
│   ├── requirements.txt      # Dependencies (Flask, SQLAlchemy, PyJWT, Gunicorn)
│   ├── wsgi.py               # Production WSGI entry point
│   ├── models/               # SQLAlchemy ORM models (User, Transaction)
│   ├── routes/               # REST API blueprints (Auth, Transactions)
│   └── services/             # Finance Service & Safe-to-Spend logic
└── frontend/                 # React SPA (Vite)
    ├── package.json          # Dependencies & build scripts
    ├── vercel.json           # Vercel SPA routing rewrite rules
    ├── vite.config.js        # Vite configuration
    └── src/
        ├── api.js            # Unified fetch client with VITE_API_URL & Bearer auth
        ├── index.css         # Cyber-Emerald design system & animations
        └── App.jsx           # Views, state management, and UI components
```

---

## 📄 License

MIT License. Designed & Developed by [devrajsinghal35](https://github.com/devrajsinghal35).
