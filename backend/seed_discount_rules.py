import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import DiscountRule

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_discount_rules():
    db = SessionLocal()
    
    rules = [
        {"tier": "basic", "category": None, "max_discount_percent": 5.00},
        {"tier": None, "category": "software", "max_discount_percent": 10.00},
        {"tier": "enterprise", "category": "hardware", "max_discount_percent": 20.00},
        {"tier": "premium", "category": "services", "max_discount_percent": 0.00},
    ]
    
    inserted = 0
    skipped = 0
    
    try:
        for r in rules:
            # Idempotency check: tier and category
            exists = db.query(DiscountRule).filter_by(
                tier=r["tier"],
                category=r["category"]
            ).first()
            
            if not exists:
                db.add(DiscountRule(**r))
                inserted += 1
            else:
                skipped += 1
                
        db.commit()
        
        print("--- SEED RESULTS ---")
        print(f"Inserted: {inserted}")
        print(f"Skipped (already present): {skipped}")
        
        print("\n--- CURRENT RECORDS ---")
        all_rules = db.query(DiscountRule).all()
        for rule in all_rules:
            print(f"ID: {rule.id} | Tier: {rule.tier} | Category: {rule.category} | Max Discount: {rule.max_discount_percent}%")
            
    except Exception as e:
        db.rollback()
        print(f"Failed to seed discount rules: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_discount_rules()
