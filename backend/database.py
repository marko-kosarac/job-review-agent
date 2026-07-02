from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# SQLAlchemy zahtijeva psycopg2 format umjesto asyncpg
db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.fetchone()
    
def create_tables():
    Base.metadata.create_all(engine)