# Architecture

## System Overview

Frontend
   ↓
Backend API
   ↓
Application Services
   ↓
Database / External APIs / AI Models

## Components

### Frontend

Responsibility:
- User interface
- User interaction
- API calls

Location:
`src/frontend/`

### Backend

Responsibility:
- API endpoints
- Business logic
- Validation

Location:
`src/backend/`

### AI / Agent Layer

Responsibility:
- AI inference
- Agent orchestration
- Prompt execution

Location:
`src/agents/`

### Database

Responsibility:
- Persistence
- Retrieval

## Rules

- Frontend should not directly access the database.
- Backend owns business logic.
- AI layer should expose clear interfaces.
- External services must be isolated behind service modules.