import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Database Connection URL
# Fallback to local SQLite if no postgres URL is provided to avoid breaking dev
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agrisahayak.db")

# Render uses 'postgres://' but sqlalchemy requires 'postgresql://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. History Model Definition
class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    crop_type = Column(String, index=True)
    record_type = Column(String)  # "diagnosis", "irrigation", "soil", "alert"
    summary = Column(String)
    urgency = Column(String, nullable=True)
    lang = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 3. Initialization Function
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created or verified successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
