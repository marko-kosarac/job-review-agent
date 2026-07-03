from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# SQLAlchemy needs the psycopg2 dialect prefix instead of asyncpg's
db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# pool_pre_ping: test each pooled connection with a lightweight query before
# handing it out, and transparently reconnect if it's dead. Without this,
# hosted Postgres providers that close idle SSL connections server-side
# (Neon, Supabase, etc.) cause "SSL connection has been closed unexpectedly"
# once a pooled connection has sat idle for a while — which got a lot more
# likely once multiple job pipelines started checking out connections
# concurrently. pool_recycle proactively retires connections older than 5
# minutes so they never get old enough to hit the provider's idle timeout.
engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=300)
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
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS job_title VARCHAR"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS location VARCHAR"))