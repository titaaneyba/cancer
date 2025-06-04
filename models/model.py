from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship, declarative_base
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

Base = declarative_base()

class PacienteCancer(Base):
    __tablename__ = 'pacientes_cancer'

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(50), unique=True)
    age = Column(Integer)
    gender = Column(String(20))
    country_region = Column(String(100))
    year = Column(Integer)
    genetic_risk = Column(String(50))
    air_pollution = Column(Float)
    alcohol_use = Column(Float)
    smoking = Column(Float)
    obesity_level = Column(Float)
    cancer_type = Column(String(100))
    cancer_stage = Column(String(50))
    treatment_cost_usd = Column(Float)
    survival_years = Column(Float)
    target_severity_score = Column(Float)

    def __repr__(self):
        return f"<PacienteCancer(patient_id='{self.patient_id}', cancer_type='{self.cancer_type}')>"

class Usuario(Base, UserMixin):
    __tablename__ = 'usuarios'

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)