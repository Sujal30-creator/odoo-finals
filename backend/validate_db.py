from database import engine, Base
import models
import traceback

try:
    Base.metadata.create_all(bind=engine)
    print("SUCCESS: Tables created successfully.")
    for table in Base.metadata.sorted_tables:
        print(f"TABLE: {table.name}")
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
