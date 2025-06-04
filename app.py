from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from models.base import engine
from models.model import Usuario, PacienteCancer
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Configuración de la sesión de la base de datos
Session = sessionmaker(bind=engine)
db_session = Session()

# Crear tablas
from models.model import Base
Base.metadata.create_all(engine)

# Verificación de conexión a la base de datos
@app.before_request
def check_db_connection():
    if not hasattr(app, 'db_checked'):
        try:
            db_session.execute(text("SELECT 1"))
            print("✅ Conexión a la base de datos exitosa")
            app.db_checked = True
        except Exception as e:
            print("❌ Error de conexión a la base de datos:", str(e))
            db_session.rollback()
            raise e

# Setup de LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

@login_manager.user_loader
def load_user(user_id):
    return db_session.query(Usuario).get(int(user_id))

# Ruta principal
@app.route('/')
def home():
    return render_template('auth.html')

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form['action']
        username = request.form['username']
        password = request.form['password']
        if action == 'register':
            if db_session.query(Usuario).filter(Usuario.username == username).first():
                flash('El usuario ya existe', 'danger')
            else:
                new_user = Usuario(
                    username=username,
                    password=generate_password_hash(password)
                )
                db_session.add(new_user)
                db_session.commit()
                flash('Usuario creado exitosamente', 'success')
                return redirect(url_for('auth'))
        elif action == 'login':
            user = db_session.query(Usuario).filter(Usuario.username == username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                flash('Sesión iniciada exitosamente', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuario o contraseña incorrectos', 'danger')
                return redirect(url_for('auth'))
    return render_template('auth.html')

@app.route('/dashboard')
@login_required
def dashboard():
    # Cargar todos los pacientes inicialmente
    pacientes = db_session.query(PacienteCancer).all()
    
    # Obtener parámetros de filtro si existen
    cancer_type = request.args.get('cancer_type')
    gender = request.args.get('gender')
    country = request.args.get('country')
    stage = request.args.get('stage')
    
    # Aplicar filtros si se especificaron
    if any([cancer_type, gender, country, stage]):
        query = db_session.query(PacienteCancer)
        
        if cancer_type:
            query = query.filter(PacienteCancer.cancer_type == cancer_type)
        if gender:
            query = query.filter(PacienteCancer.gender == gender)
        if country:
            query = query.filter(PacienteCancer.country_region == country)
        if stage:
            query = query.filter(PacienteCancer.cancer_stage == stage)
            
        pacientes = query.all()
    
    # Obtener opciones únicas para los filtros
    cancer_types = sorted([t[0] for t in db_session.query(PacienteCancer.cancer_type).distinct() if t[0]])
    genders = sorted([g[0] for g in db_session.query(PacienteCancer.gender).distinct() if g[0]])
    countries = sorted([c[0] for c in db_session.query(PacienteCancer.country_region).distinct() if c[0]])
    stages = sorted([s[0] for s in db_session.query(PacienteCancer.cancer_stage).distinct() if s[0]])
    
    return render_template('dashboard.html',
                         username=current_user.username,
                         pacientes=pacientes,
                         cancer_types=cancer_types,
                         genders=genders,
                         countries=countries,
                         stages=stages)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth'))

# API para datos de cáncer
@app.route('/api/cancer')
def api_cancer():
    pacientes = db_session.query(PacienteCancer).all()
    data = []
    for p in pacientes:
        data.append({
            "id": p.id,
            "patient_id": p.patient_id,
            "age": p.age,
            "gender": p.gender,
            "country_region": p.country_region,
            "year": p.year,
            "genetic_risk": p.genetic_risk,
            "air_pollution": p.air_pollution,
            "alcohol_use": p.alcohol_use,
            "smoking": p.smoking,
            "obesity_level": p.obesity_level,
            "cancer_type": p.cancer_type,
            "cancer_stage": p.cancer_stage,
            "treatment_cost_usd": p.treatment_cost_usd,
            "survival_years": p.survival_years,
            "target_severity_score": p.target_severity_score
        })
    return jsonify(data)

@app.route('/api/cancer_filters')
def api_cancer_filters():
    genders = sorted([g[0] for g in db_session.query(PacienteCancer.gender).distinct() if g[0]])
    countries = sorted([c[0] for c in db_session.query(PacienteCancer.country_region).distinct() if c[0]])
    cancer_types = sorted([t[0] for t in db_session.query(PacienteCancer.cancer_type).distinct() if t[0]])
    cancer_stages = sorted([s[0] for s in db_session.query(PacienteCancer.cancer_stage).distinct() if s[0]])

    return jsonify({
        "genders": genders,
        "countries": countries,
        "cancer_types": cancer_types,
        "cancer_stages": cancer_stages
    })

@app.route('/listpatients')
@login_required
def listpatients():
    return render_template('crud/list.html')

@app.route('/api/list_patients')
def api_list_patients():
    pacientes = db_session.query(PacienteCancer).all()
    data = []
    for p in pacientes:
        data.append({
            "id": p.id,
            "patient_id": p.patient_id,
            "age": p.age,
            "gender": p.gender,
            "country_region": p.country_region,
            "year": p.year,
            "genetic_risk": p.genetic_risk,
            "air_pollution": p.air_pollution,
            "alcohol_use": p.alcohol_use,
            "smoking": p.smoking,
            "obesity_level": p.obesity_level,
            "cancer_type": p.cancer_type,
            "cancer_stage": p.cancer_stage,
            "treatment_cost_usd": p.treatment_cost_usd,
            "survival_years": p.survival_years,
            "target_severity_score": p.target_severity_score
        })
    return jsonify(data)

@app.route('/add/patient', methods=['POST'])
def crear_paciente():
    data = request.json
    nuevo = PacienteCancer(
        patient_id=data.get('patient_id'),
        age=int(data.get('age')) if data.get('age') else None,
        gender=data.get('gender'),
        country_region=data.get('country_region'),
        year=int(data.get('year')) if data.get('year') else None,
        genetic_risk=data.get('genetic_risk'),
        air_pollution=float(data.get('air_pollution')),
        alcohol_use=float(data.get('alcohol_use')),
        smoking=float(data.get('smoking')),
        obesity_level=float(data.get('obesity_level')),
        cancer_type=data.get('cancer_type'),
        cancer_stage=data.get('cancer_stage'),
        treatment_cost_usd=float(data.get('treatment_cost_usd')),
        survival_years=float(data.get('survival_years')),
        target_severity_score=float(data.get('target_severity_score'))
    )
    db_session.add(nuevo)
    db_session.commit()
    return jsonify({"mensaje": "Paciente agregado correctamente"})

@app.route('/del/patient/<int:id>', methods=['DELETE'])
def eliminar_paciente(id):
    paciente = db_session.query(PacienteCancer).get(id)
    if paciente:
        db_session.delete(paciente)
        db_session.commit()
        return jsonify({"mensaje": "Paciente eliminado correctamente"})
    return jsonify({"error": "Paciente no encontrado"}), 404

@app.route('/upd/patient/<int:id>', methods=['PUT'])
def actualizar_paciente(id):
    data = request.json
    paciente = db_session.query(PacienteCancer).get(id)
    if not paciente:
        return jsonify({"error": "Paciente no encontrado"}), 404

    paciente.patient_id = data.get("patient_id")
    paciente.age = int(data.get("age")) if data.get("age") else None
    paciente.gender = data.get("gender")
    paciente.country_region = data.get("country_region")
    paciente.year = int(data.get("year")) if data.get("year") else None
    paciente.genetic_risk = data.get("genetic_risk")
    paciente.air_pollution = float(data.get("air_pollution"))
    paciente.alcohol_use = float(data.get("alcohol_use"))
    paciente.smoking = float(data.get("smoking"))
    paciente.obesity_level = float(data.get("obesity_level"))
    paciente.cancer_type = data.get("cancer_type")
    paciente.cancer_stage = data.get("cancer_stage")
    paciente.treatment_cost_usd = float(data.get("treatment_cost_usd"))
    paciente.survival_years = float(data.get("survival_years"))
    paciente.target_severity_score = float(data.get("target_severity_score"))

    db_session.commit()
    return jsonify({"mensaje": "Paciente actualizado correctamente"})

if __name__ == '__main__':
    app.run(debug=True)