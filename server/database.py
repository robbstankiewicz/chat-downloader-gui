from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.schema import Base

import sys
import os
import time

engine = None
SessionLocal = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    global engine, SessionLocal

    SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./../sql_app.db")

    print(f"Using database: {SQLALCHEMY_DATABASE_URL}")

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,
            "isolation_level": None
        },
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    try:
        Base.metadata.create_all(bind=engine)

        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            conn.execute(text("PRAGMA cache_size=10000"))
            conn.execute(text("PRAGMA temp_store=MEMORY"))
            conn.execute(text("PRAGMA mmap_size=134217728"))
            conn.commit()

        print("Db init success")
    except Exception as e:
        print(f"Db init error {e}")
    return

def db_retry_on_lock(func, max_retries=5, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                delay = base_delay * (10 * attempt)
                print(f"Database locked, retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                sys.stdout.flush()
                time.sleep(delay)
                continue
            else:
                raise e
    return None
