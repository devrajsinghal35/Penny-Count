# 💰 Penny-Count — Secure AI-Powered Financial Intelligence Platform

A full-stack, secure-by-design personal finance tracker that computes real-time Safe-to-Spend limits using a rules-based financial model. It features AI-assisted spending analysis, field-level data encryption (AES-256), and a robust DevSecOps CI/CD pipeline.

**Live Demo**: *[Add Link]* | **Repo**: [devrajsinghal35/Penny-Count](https://github.com/devrajsinghal35/Penny-Count)

---

## 🧠 Why This Project Stands Out

- **Data Security & Privacy**: Implements OWASP API Security best practices. Sensitive financial data is encrypted at rest using AES-256 (Cryptography), with PII stripped before external AI API calls.
- **AI & Intelligent Automation**: Built an AI-assisted financial agent (Google Gemini API) to deliver real-time spending risk analysis, detect anomalous transactions, and answer financial queries in Indian Rupees (₹).
- **DevSecOps & CI/CD**: Integrated a GitHub Actions pipeline performing automated SAST scans (`Bandit`) and dependency audits (`npm audit`, `safety check`) before deployment.
- **Decoupled Microservice Architecture**: Designed and shipped a React SPA on Vercel + Flask REST API on Render rather than a monolith — mirrors how production fintech systems are actually deployed.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React (Vite), custom "Cyber-Emerald" CSS design system |
| **Backend** | Python, Flask, Gunicorn, Google Gemini API |
| **Database / ORM** | SQLite, SQLAlchemy |
| **Security & Auth** | JWT, Werkzeug, AES-256 (Cryptography) |
| **DevSecOps** | GitHub Actions, Bandit, Safety, npm audit |
| **Infra** | `render.yaml` Blueprint, `vercel.json` SPA routing |

---

## ✨ Key Features

- **🤖 AI Financial & Security Assistant** — Ask questions about spending habits or detect suspicious charges, with built-in data privacy guardrails.
- **🔒 Data Encryption at Rest** — Sensitive transaction fields are encrypted using AES-256 to ensure data confidentiality.
- **🛡️ Safe-to-Spend Engine** — Daily safe spending limit calculated from fixed monthly commitments, upcoming bills, and a 10% safety buffer.
- **🚦 Real-Time Guardrails** — Live warnings before saving a transaction that would exceed the daily threshold.
- **📊 Interactive Visual Analytics** — Spending trends and breakdown charts with transparent popovers.

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
├── .github/
│   └── workflows/devsecops.yml  # Automated SAST & dependency scanning
├── render.yaml
├── SECURITY.md                  # Vulnerability disclosure policy
├── THREAT_MODEL.md              # STRIDE threat model & OWASP API mitigations
├── backend/
│   ├── app.py                   # Flask app factory & CORS config
│   ├── config.py                # Database & security settings
│   ├── wsgi.py                  # Production WSGI entry point
│   ├── models/                  # SQLAlchemy ORM models (AES-256 encrypted)
│   ├── routes/                  # REST API blueprints (Auth, Transactions, AI)
│   ├── services/                # Safe-to-Spend business logic
│   └── utils/                   # Encryption helpers (cryptography)
└── frontend/
    ├── vercel.json              # SPA routing rewrites
    └── src/
        ├── api.js               # Fetch client with JWT auth
        ├── index.css            # Cyber-Emerald design system
        └── App.jsx              # Dashboard UI & AI Assistant modal
```

---

## 📄 License

MIT License · Built by [devrajsinghal35](https://github.com/devrajsinghal35)
