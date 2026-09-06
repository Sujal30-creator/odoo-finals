# DealFlow360 - Frontend

This directory contains the user interface and client-side application for **DealFlow360**, an intelligent B2B Sales Operations Platform.

## 🚀 Overview
The frontend provides intuitive interfaces for:
- Internal Sales Teams (Quotations, Discount Evaluation, Deal Health, AI Features)
- Managers & Finance (Approval Routing & Escalation, Fulfillment, Billing)
- Customer Portals (Quotation viewing, Negotiation)

## 🛠 Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (with modern CSS custom properties and Glassmorphism design)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## ⚙️ Setup & Installation
1. Navigate to this directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (Optional):
   The application defaults to `http://localhost:8000` for the backend API. 
   If your backend runs on a different port, create a `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8001
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🎨 Design Principles
We prioritize modern, dynamic, and premium web design.
- Utilize highly polished UI components
- Ensure responsive layouts and fluid interactions
- Implement subtle micro-animations for an elevated user experience
