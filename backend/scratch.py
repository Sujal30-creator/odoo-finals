import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text

load_dotenv()
url = os.getenv("DATABASE_URL")
engine = create_engine(url)
inspector = inspect(engine)

table = "discount_rules"
print(f"--- TABLE: {table} ---")

print("--- COLUMNS ---")
for col in inspector.get_columns(table):
    print(f"Col: {col['name']} | Type: {col['type']} | NotNull: {not col.get('nullable')} | Default: {col.get('default')}")

print("--- FOREIGN KEYS ---")
for fk in inspector.get_foreign_keys(table):
    print(f"FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

print("--- CHECK CONSTRAINTS ---")
with engine.connect() as conn:
    res = conn.execute(text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'discount_rules'::regclass"))
    for row in res:
        print(row[0])

print("\n--- EXISTING ROWS ---")
with engine.connect() as conn:
    res = conn.execute(text(f"SELECT * FROM {table}"))
    rows = [dict(r._mapping) for r in res]
    print(f"Row count: {len(rows)}")
    for r in rows:
        print(r)
