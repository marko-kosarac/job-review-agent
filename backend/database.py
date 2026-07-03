from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# SQLAlchemy needs the psycopg2 dialect prefix instead of asyncpg's
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
    # create_all() won't add columns to a table that already exists (e.g. from
    # before the `language` column was introduced), so patch it in separately.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'en'"))