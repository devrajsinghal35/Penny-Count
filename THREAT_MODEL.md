# Threat Model: Penny-Count

## Overview
This document outlines the threat modeling for the Penny-Count personal finance application. It aims to identify potential security threats and define the mitigation strategies implemented in the system, aligning with the OWASP Top 10 API Security Risks.

## System Architecture
- **Frontend:** React SPA (Vercel)
- **Backend:** Python Flask API (Render)
- **Database:** SQLite (SQLAlchemy ORM)

## Threat Vectors (STRIDE Model)

| Threat Type | Description in Context | Mitigations Implemented |
| :--- | :--- | :--- |
| **Spoofing** | An attacker impersonates a legitimate user to access their financial data. | - **JWT Authentication:** Short-lived tokens with strong signing keys.<br>- **Secure Passwords:** Hashed and salted using `Werkzeug` (PBKDF2/scrypt). |
| **Tampering** | Modifying transaction data or Safe-to-Spend calculations in transit or in the database. | - **TLS/HTTPS:** Enforced across all Vercel and Render endpoints.<br>- **ORM usage:** Parameterized queries via SQLAlchemy prevent SQL manipulation. |
| **Repudiation** | A user or attacker performs an action (e.g., deleting a transaction) without it being logged. | - (Planned) Audit logging for sensitive CRUD operations. |
| **Information Disclosure** | Exposure of sensitive financial data (balance, transactions) or PII. | - **CORS Configuration:** API locked to specific frontend origins.<br>- (Planned) Data at Rest Encryption: AES-256 for sensitive transaction fields.<br>- Avoided exposing stack traces in production (Flask `debug=False`). |
| **Denial of Service** | Overwhelming the backend API to prevent users from accessing their limits. | - (Planned) Rate limiting on authentication and data creation endpoints (`Flask-Limiter`). |
| **Elevation of Privilege** | A user accessing data belonging to another user. | - **BOLA Mitigation:** Every API endpoint validates that the requested resource belongs to the `user_id` extracted from the JWT. |

## OWASP API Security Top 10 - Mitigation Mapping

1. **Broken Object Level Authorization (BOLA):**
   - *Mitigation:* The `get_jwt_identity()` is strictly checked against the `user_id` of the requested models before read/write operations.
2. **Broken Authentication:**
   - *Mitigation:* JWTs are signed securely. Passwords are not stored in plaintext.
3. **Broken Object Property Level Authorization:**
   - *Mitigation:* Explicit field extraction from JSON payloads; ignoring extraneous fields (Mass Assignment prevention).
4. **Unrestricted Resource Consumption:**
   - *Mitigation:* Pagination (planned) and payload size limits.
5. **Broken Function Level Authorization:**
   - *Mitigation:* Flat hierarchy currently, but JWT claims validate user scopes.
6. **Unrestricted Access to Sensitive Business Flows:**
   - *Mitigation:* (Planned) Rate limiting on login and transaction creation.
7. **Server Side Request Forgery (SSRF):**
   - *Mitigation:* The application does not fetch remote resources based on user input.
8. **Security Misconfiguration:**
   - *Mitigation:* DevSecOps pipeline implemented for automated security scanning. Infrastructure defined via code (`render.yaml`).
9. **Improper Inventory Management:**
   - *Mitigation:* Code is centralized. Moving towards OpenAPI specification for API documentation.
10. **Unsafe Consumption of APIs:**
    - *Mitigation:* (For future AI endpoints) Strict sanitization of AI model outputs and timeout handling for external API calls.
