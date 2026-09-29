# Security Policy

## Supported Versions

Currently, only the main branch is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Penny-Count, please send an e-mail to the maintainer. We will address it as quickly as possible.

## Security Practices Implemented

To align with modern DevSecOps and Cybersecurity Engineering principles, this project implements:

1. **Automated Security Scanning:**
   - GitHub Actions workflow running `bandit` for Python SAST.
   - `safety` and `npm audit` for dependency vulnerability checks.
2. **Secure Architecture:**
   - Stateless authentication via JSON Web Tokens (JWT).
   - Passwords secured using strong cryptographic hashes (`Werkzeug`).
   - Prevention of SQL Injection via SQLAlchemy ORM (parameterized queries).
   - Strict Cross-Origin Resource Sharing (CORS) configurations.
3. **Data Protection:**
   - All external communications are forced over HTTPS.

For more details on our architectural security considerations, please see our [Threat Model](THREAT_MODEL.md).
