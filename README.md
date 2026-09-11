# 💰 Penny-Count — Personal Finance & Spending Intelligence Platform

A full-stack personal finance tracker that goes beyond simple expense logging — it calculates a real-time Safe-to-Spend limit by factoring in fixed commitments, upcoming bills, and a built-in safety buffer, then warns users before they overspend.

**Live Demo**: *[Add Link]* | **Repo**: [devrajsinghal35/Penny-Count](https://github.com/devrajsinghal35/Penny-Count)

---

## 🧠 Why This Project Stands Out

- **Decoupled Microservice Architecture**: Designed and shipped a React SPA on Vercel + Flask REST API on Render rather than a monolith — mirrors how production fintech systems are actually deployed.
- **Safe-to-Spend Engine**: A rules-based financial model, not just CRUD — computes daily spending limits from income, fixed costs, and upcoming bills with a 10% safety margin.
- **Stateless JWT Authentication**: Implemented end-to-end with secure password hashing (Werkzeug) and protected REST endpoints.
- **Automated Deployment Pipeline**: Infrastructure-as-Code (`render.yaml` Blueprint) and environment-based configuration (`VITE_API_URL`).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React (Vite), custom "Cyber-Emerald" CSS design system |
| **Backend** | Python, Flask, Gunicorn |
| **Database / ORM** | SQLite, SQLAlchemy |
| **Auth** | JWT (PyJWT), Werkzeug password hashing |
| **Hosting** | Vercel (frontend), Render (backend) |
| **Infra** | `render.yaml` Blueprint, `vercel.json` SPA routing |

---

## ✨ Key Features

- **🛡️ Safe-to-Spend Engine** — daily safe spending limit calculated from fixed monthly commitments, upcoming bills, and a 10% safety buffer.
- **🚦 Real-Time Guardrails** — live warnings before saving a transaction that would exceed the daily threshold.
- **📒 Double-Entry Style Ledger** — full CRUD for income, expenses, and cashflows with automatic categorization.
- **📊 Interactive Visual Analytics** — spending trends and breakdown charts with transparent popovers.
- **🌱 Instant Sample Data Generator** — one-click demo seeder for realistic test data.

---

## 🏗️ Architecture

```
React SPA (Vercel) ──REST + JWT over HTTPS──► Flask API (Render) ──► SQLAlchemy / SQLite
```

- **Frontend (Vercel)**: Global CDN edge delivery, SPA rewrite rules for client-side routing, `VITE_API_URL` injected at build time.
- **Backend (Render)**: Python WSGI service via `gunicorn wsgi:app`, deployed from a `render.yaml` Blueprint, `flask-cors` locked to the Vercel domain.

---

## 🛠️ Local Development Setup

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py # runs at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev # runs at http://localhost:5173
```

---

## 🚀 Deployment

- **Backend → Render**: New Blueprint → connect repo → Render auto-detects `render.yaml` (root: `backend`, build: `pip install -r requirements.txt`, start: `gunicorn wsgi:app`) → set `SECRET_KEY` and `PYTHON_VERSION`.
- **Frontend → Vercel**: New Project → connect repo → root: `frontend`, framework: `Vite`, build: `npm run build`, output: `dist` → set `VITE_API_URL` to the deployed Render API URL.

---

## 📐 Project Structure

```
Penny-Count/
├── render.yaml
├── backend/
│   ├── app.py          # Flask app factory & CORS config
│   ├── config.py       # Database & security settings
│   ├── wsgi.py         # Production WSGI entry point
│   ├── models/         # SQLAlchemy ORM models
│   ├── routes/         # REST API blueprints
│   └── services/       # Safe-to-Spend business logic
└── frontend/
    ├── vercel.json     # SPA routing rewrites
    └── src/
        ├── api.js      # Fetch client with JWT auth
        ├── index.css   # Design system
        └── App.jsx     # Views & state management
```

---

## 📄 License

MIT License · Built by [devrajsinghal35](https://github.com/devrajsinghal35)
