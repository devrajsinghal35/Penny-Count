# Penny-Count — Financial Intelligence & Budget Tracking Platform

A full-stack personal finance application that calculates real-time Safe-to-Spend limits using a rules-based financial model. It includes intelligent spending analysis, field-level data encryption (AES-256), and an automated DevSecOps CI/CD pipeline.

**Live API**: [penny-count-backend.onrender.com](https://penny-count-backend.onrender.com) | **Repository**: [devrajsinghal35/Penny-Count](https://github.com/devrajsinghal35/Penny-Count)

---

## Core Highlights

- **Data Security & Privacy**: Sensitive financial data is encrypted at rest using AES-256 (Fernet). External assistant queries are sanitized to shield user PII.
- **Financial Intelligence**: Spending assistant powered by Gemini API delivers transaction reviews, anomaly checks, and financial insights formatted in Indian Rupees (₹).
- **Safe-to-Spend Engine**: Daily spending limits calculated dynamically from recurring commitments, historical averages for essentials, and a 10% safety buffer.
- **DevSecOps Pipeline**: Automated GitHub Actions workflow running static analysis (`bandit`), dependency audits (`safety`, `pip-audit`), and frontend security checks (`npm audit`).
- **Decoupled Architecture**: React SPA frontend with custom styling and a Flask REST API backend backed by SQLite with SQLAlchemy ORM.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React, Vite, Vanilla CSS |
| **Backend** | Python, Flask, Gunicorn, Google Gemini API |
| **Database / ORM** | SQLite, SQLAlchemy |
| **Security & Auth** | JWT (PyJWT), Werkzeug password hashing, AES-256 (Cryptography) |
| **DevSecOps** | GitHub Actions, Bandit, Safety, Pip-Audit, npm audit |
| **Infrastructure** | Render (`render.yaml`), Vercel (`vercel.json`) |

---

## Key Features

- **Safe-to-Spend Engine** — Computes real-time daily discretionary spending allowances by factoring in upcoming fixed bills (rent, SIP, EMI), daily essentials, and current account balances.
- **Real-Time Guardrails** — Warns the user when entering an expense that exceeds the daily safe-to-spend threshold.
- **Data Protection at Rest** — Transaction titles and descriptions are transparently encrypted and decrypted using AES-256 before storage in SQLite.
- **Interactive Financial Analytics** — Visual monthly cashflow trends and category-wise expense distributions with interactive breakdowns.
- **Spending & Anomaly Assistant** — Contextual audit assistant that identifies duplicate transactions, irregular category spikes, and potential overspending.
- **Demo Data Seeding** — One-click seeding of realistic historical data and recurring commitments for testing.

---

## Architecture

```
React Frontend (Vercel) ──► REST API + JWT over HTTPS ──► Flask Backend (Render) ──► SQLAlchemy / SQLite
```

- **Frontend**: Single-page application built with React and Vite, utilizing client-side route rewrites for static hosting.
- **Backend**: WSGI application served via Gunicorn, exposing REST endpoints with JWT authorization headers and CORS policies.

---

## Local Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py
```

The API will be available at `http://127.0.0.1:5055`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The client will start at `http://localhost:5173`.

---

## Deployment

- **Backend (Render)**: Configured via `render.yaml`. Builds using `pip install -r requirements.txt` and starts with `gunicorn wsgi:app`. Requires `SECRET_KEY` and optional `GEMINI_API_KEY`.
- **Frontend (Vercel)**: Configured via `vercel.json` with SPA routing rewrites. Set `VITE_API_URL` to point to the deployed backend URL.

---

## Project Structure

```
Penny-Count/
├── .github/
│   └── workflows/devsecops.yml  # Automated SAST & security pipeline
├── render.yaml                  # Render service blueprint
├── SECURITY.md                  # Security policies and vulnerability reporting
├── THREAT_MODEL.md              # STRIDE model & OWASP API security mapping
├── backend/
│   ├── app.py                   # Application factory and blueprint registration
│   ├── config.py                # Environment and database configuration
│   ├── wsgi.py                  # Production WSGI server entry point
│   ├── database/                # SQLite database storage
│   ├── models/                  # SQLAlchemy models (User, Transaction with AES-256)
│   ├── routes/                  # API endpoints (Auth, Transactions, AI Assistant)
│   ├── services/                # Safe-to-Spend algorithms and token management
│   └── utils/                   # Encryption utilities (Fernet / AES-256)
└── frontend/
    ├── vercel.json              # SPA rewrite configuration
    ├── vite.config.js           # Vite build configuration
    ├── package.json             # Frontend dependencies and scripts
    ├── index.html               # HTML entry template
    ├── public/                  # Static assets (favicon, background image)
    └── src/
        ├── api.js               # HTTP client with JWT interceptor
        ├── index.css            # Styles and design tokens
        ├── main.jsx             # React application entry point
        └── App.jsx              # Main application views and state management
```

---

## License

MIT License
