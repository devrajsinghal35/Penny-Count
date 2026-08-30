# 💰 FinGuard — Personal Finance Hub

A premium, modern personal finance tracker and spending intelligence tool built using a **React SPA** (Vite, Vanilla CSS) and a **Python Flask API** (SQLAlchemy, SQLite, JWT auth).

## Key Features

- **Double-Entry Style Ledger**: Dynamic CRUD management of cashflows, income, and expenses with automatic classification.
- **Safe-to-Spend Engine 🛡️**: Tells users how much they can safely spend *today* after accounting for historical utility commitments, upcoming bills, and a 10% safety buffer.
- **Real-Time Guardrails**: Live inline warning alerts inside the transaction creation flow before saving an expense if it exceeds the Safe-to-Spend limit.
- **Interactive Breakdown**: Transparent popover charts and visual tables detailing exactly where the budget stands.
- **Stateless Authentication**: Protected API endpoints via robust JWT verification.
- **Instant Seeding Engine**: A "Try with Sample Data" feature that seeds the DB with a realistic monthly cashflow scenario for quick demonstrations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Vanilla CSS (Dark Glassmorphism Theme) |
| **Backend** | Python 3.11+, Flask 3.0 |
| **Database** | SQLite (via SQLAlchemy ORM) |
| **Auth** | JWT (JSON Web Tokens) with PyJWT + Werkzeug hashing |

---

## Architecture & Folder Structure

```
React SPA (Port 5173) ──(JSON/JWT)──> Flask API (Port 5002) ──> SQLAlchemy ──> SQLite
```

The workspace is organized into clean `backend` and `frontend` microservice directories:

```
FinGuard/
├── backend/                  # Flask REST API Microservice
│   ├── app.py                # Flask app factory & entry point
│   ├── config.py             # Database and security configuration
│   ├── requirements.txt      # Python dependencies
│   ├── models/               # SQLAlchemy models (User, Transaction)
│   ├── routes/               # Blueprints (Auth, Transactions)
│   ├── services/             # Finance Service & JWT logic
│   └── database/             # SQLite storage folder
│
├── frontend/                 # React SPA
│   ├── package.json          # Node dependencies & scripts
│   ├── index.html            # Vite app entry
│   └── src/
│       ├── api.js            # Unified fetch wrapper with Auth headers
│       ├── index.css         # Custom Dark-Mode glassmorphic UI styles
│       └── App.jsx           # State manager, Routing, Views, & Components
```

---

## Setup & Run

### 1. Run the Flask Backend
```bash
# Navigate to backend directory
cd backend

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python3 -m flask run --port=5002
```
The Flask API runs at **http://localhost:5002**.

### 2. Run the React Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend starts at **http://localhost:5173**. Open it in your browser.

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Registers a new user. Returns a signed JWT.
- `POST /api/auth/login` — Verifies user credentials. Returns a signed JWT.
- `GET /api/auth/me` — Retrieves current authenticated profile.

### Transactions & Intelligence (`/api/transactions` & `/api/financial`)
- `GET /api/transactions` — Lists transactions (filterable by `type` and `month`).
- `POST /api/transactions` — Add a new transaction record.
- `PUT /api/transactions/<id>` — Modify an existing transaction.
- `DELETE /api/transactions/<id>` — Remove a transaction.
- `GET /api/transactions/summary` — High-level KPI balance figures.
- `GET /api/financial/safe-to-spend` — Real-time Safe-to-Spend calculations.
- `POST /api/transactions/seed-demo` — Populates account with sample data.

---

## Security Best Practices
- **Password Security**: Passwords are securely hashed with Werkzeug hashing before storage.
- **JWT Protection**: Secure API endpoints reject requests without a valid `Authorization: Bearer <token>` header.
- **SQL Injection Prevention**: Built entirely with SQLAlchemy parameterized query generation to guarantee database sanitization.
