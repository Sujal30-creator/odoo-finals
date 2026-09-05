# DealFlow360 - Architecture

## High-Level Architecture

Frontend
   |
   v
Backend API
   |
   +--------------------+
   |                    |
   v                    v
Business Services     Database
   |
   +--------+---------+---------+---------+
   |        |         |         |         |
   v        v         v         v         v
Discount  Approval  Inventory  Billing  Deal Health
Engine    Engine    Engine     Engine   Engine
   |
   v
Recommendation Engine

Customer Portal
   |
   v
Restricted Backend APIs
   |
   v
Quotation / Negotiation