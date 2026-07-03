from sqlalchemy import Column, String, Float, Text, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_url = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    cv_text = Column(Text, nullable=True)
    job_text = Column(Text, nullable=True)
    match_analysis = Column(Text, nullable=True)
    cover_letter = Column(Text, nullable=True)
    company_profile = Column(Text, nullable=True)
    match_score = Column(Float, nullable=True)
    language = Column(String, nullable=True, default="en")
    created_at = Column(DateTime, server_default=func.now())