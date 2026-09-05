# DealFlow360 API Contract

This document is the shared contract between frontend and backend.

API changes must be coordinated.

---

## Authentication

### POST /api/auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}