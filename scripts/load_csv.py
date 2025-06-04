import pandas as pd
from sqlalchemy import create_engine
import os
import sys

# Agrega el path al directorio raíz del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.model import Base, PacienteCancer
from sqlalchemy.orm import sessionmaker

# Configura tu conexión (ajusta según tu configuración)
DATABASE_URL = "postgresql://postgres:renata123@localhost:5432/cancer"

# Crear engine y sesión
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Crear tablas si no existen
Base.metadata.create_all(engine)

# Leer el CSV con pandas
CSV_URL = "https://raw.githubusercontent.com/rudyluis/DashboardJS/refs/heads/main/global_cancer.csv"
df = pd.read_csv(CSV_URL)

# Limpieza y transformación de datos
# Convertir columnas numéricas y manejar valores faltantes
numeric_cols = ['Age', 'Year', 'Air_Pollution', 'Alcohol_Use', 
               'Smoking', 'Obesity_Level', 'Treatment_Cost_USD', 
               'Survival_Years', 'Target_Severity_Score']

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

# Convertir DataFrame en lista de objetos PacienteCancer
records = [
    PacienteCancer(
        patient_id=str(row['Patient_ID']),
        age=int(row['Age']) if not pd.isna(row['Age']) else None,
        gender=row['Gender'],
        country_region=row['Country_Region'],
        year=int(row['Year']) if not pd.isna(row['Year']) else None,
        genetic_risk=row['Genetic_Risk'],
        air_pollution=float(row['Air_Pollution']) if not pd.isna(row['Air_Pollution']) else None,
        alcohol_use=float(row['Alcohol_Use']) if not pd.isna(row['Alcohol_Use']) else None,
        smoking=float(row['Smoking']) if not pd.isna(row['Smoking']) else None,
        obesity_level=float(row['Obesity_Level']) if not pd.isna(row['Obesity_Level']) else None,
        cancer_type=row['Cancer_Type'],
        cancer_stage=row['Cancer_Stage'],
        treatment_cost_usd=float(row['Treatment_Cost_USD']) if not pd.isna(row['Treatment_Cost_USD']) else None,
        survival_years=float(row['Survival_Years']) if not pd.isna(row['Survival_Years']) else None,
        target_severity_score=float(row['Target_Severity_Score']) if not pd.isna(row['Target_Severity_Score']) else None
    )
    for index, row in df.iterrows()
]

# Insertar en la base de datos
try:
    session.bulk_save_objects(records)
    session.commit()
    print(f"✅ Migración de datos completada. Se insertaron {len(records)} registros.")
except Exception as e:
    session.rollback()
    print(f"❌ Error al insertar datos: {str(e)}")
finally:
    session.close()