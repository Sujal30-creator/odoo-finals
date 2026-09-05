from sqlalchemy import text
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db
import models

app = FastAPI(title="DealFlow360 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root(models):
    return {"message": "DealFlow360 API is running"}


@app.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"database_connected": result == 1}


@app.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return products