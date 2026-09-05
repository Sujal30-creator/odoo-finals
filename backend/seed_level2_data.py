import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import PriceList, WarehouseSplit, NegotiationComment

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_data():
    db = SessionLocal()
    
    inserted_prices = 0
    inserted_splits = 0
    inserted_comments = 0
    
    try:
        # Seed Price Lists
        price_tiers = [
            {"product_id": 1, "customer_tier": "basic", "price": 1200.00, "currency": "USD"},
            {"product_id": 1, "customer_tier": "premium", "price": 1000.00, "currency": "USD"},
            {"product_id": 1, "customer_tier": "enterprise", "price": 900.00, "currency": "USD"},
            {"product_id": 2, "customer_tier": "basic", "price": 500.00, "currency": "USD"},
            {"product_id": 2, "customer_tier": "premium", "price": 450.00, "currency": "USD"},
        ]
        for pt in price_tiers:
            exists = db.query(PriceList).filter_by(
                product_id=pt["product_id"], 
                customer_tier=pt["customer_tier"]
            ).first()
            if not exists:
                db.add(PriceList(**pt))
                inserted_prices += 1
                
        # Seed Warehouse Splits
        splits = [
            {"order_id": 1, "product_id": 1, "warehouse_id": 1, "quantity": 6, "is_backorder": False},
            {"order_id": 1, "product_id": 1, "warehouse_id": 2, "quantity": 4, "is_backorder": False},
            {"order_id": 2, "product_id": 2, "warehouse_id": 1, "quantity": 10, "is_backorder": True},
        ]
        for sp in splits:
            exists = db.query(WarehouseSplit).filter_by(
                order_id=sp["order_id"],
                product_id=sp["product_id"],
                warehouse_id=sp["warehouse_id"]
            ).first()
            if not exists:
                db.add(WarehouseSplit(**sp))
                inserted_splits += 1
                
        # Seed Negotiation Comments
        comments = [
            {"quotation_id": 1, "customer_id": 1, "comment": "Can we get 25% discount? We are ordering a lot.", "proposed_discount_percent": 25.0},
            {"quotation_id": 1, "user_id": 2, "comment": "25% is too high for basic tier, but we can offer 15%.", "proposed_discount_percent": 15.0},
            {"quotation_id": 2, "customer_id": 2, "comment": "Requesting volume pricing adjustment.", "proposed_discount_percent": 10.0}
        ]
        for c in comments:
            exists = db.query(NegotiationComment).filter_by(
                quotation_id=c["quotation_id"],
                comment=c["comment"]
            ).first()
            if not exists:
                db.add(NegotiationComment(**c))
                inserted_comments += 1
                
        db.commit()
        
        # Validation checks
        total_prices = db.query(PriceList).count()
        total_splits = db.query(WarehouseSplit).count()
        total_comments = db.query(NegotiationComment).count()
        
        print(f"Insertion Complete!")
        print(f"PriceLists: Inserted {inserted_prices} new records (Total: {total_prices})")
        print(f"WarehouseSplits: Inserted {inserted_splits} new records (Total: {total_splits})")
        print(f"NegotiationComments: Inserted {inserted_comments} new records (Total: {total_comments})")
        
    except Exception as e:
        db.rollback()
        print(f"Failed to seed data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
