from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# SQLAlchemy needs the psycopg2 dialect prefix instead of asyncpg's
db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# pool_pre_ping avoids "SSL connection has been closed unexpectedly" errors
# from hosted Postgres providers (Neon, Supabase, etc.) that close idle
# connections server-side; pool_recycle retires connections before that happens.
engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def create_tables():
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'en'"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS job_title VARCHAR"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS location VARCHAR"))