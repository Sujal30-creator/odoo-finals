# DealFlow360 - Backend

This directory contains the backend services and APIs for **DealFlow360**, an intelligent B2B Sales Operations Platform.

## 🚀 Overview
The backend handles the core business logic, including:
- Authentication & Authorization
- Product & Pricing Management
- Discount Governance & Approval Workflows
- Quotation Generation & Margin Calculation
- Inventory & Fulfillment Logic
- Billing & Subscriptions
- **AI Integration**: Next Best Action Engine, Semantic Product Recommendations, AI Pricing Advisor, and Deal Health Anomaly Detection.

## 🛠 Tech Stack
- **Language**: Python 3.9+
- **Framework**: FastAPI
- **Database ORM**: SQLAlchemy (SQLite for local MVP)
- **Server**: Uvicorn
- **AI / Embeddings**: OpenAI API (GPT-4o and text-embedding models)
- **Testing**: Pytest

## ⚙️ Setup & Installation
1. Navigate to this directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment and install dependencies:
   ```bash
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   Create a `.env` file and add your OpenAI API key for AI features:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Run the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## 📖 Architecture & Contracts
Please refer to the main repository's `/docs` folder for architectural decisions, API contracts, and database models.
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `docs/BUSINESS_RULES.md`
