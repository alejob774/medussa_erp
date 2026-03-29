from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from app.db.session import engine, Base
from app.api.v1 import configuracion, auth
import app.models as models
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware

# 1. Intentar sincronizar la base de datos
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Conexión exitosa a PostgreSQL: Esquemas sincronizados.")
except Exception as e:
    print(f"❌ Error de conexión: {e}")

# 2. CREAR LA INSTANCIA DE FASTAPI (Esto debe ir antes de los routers)
# Esto habilita el esquema de seguridad en la documentación
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# Cambia OAuth2PasswordBearer por HTTPBearer
security_scheme = HTTPBearer()

app = FastAPI(
    title="Medussa ERP",
    description="Backend con Seguridad JWT",
    version="1.0.0",
    # Esta configuración es la que hace aparecer el candado y el botón
    swagger_ui_parameters={"operationsSorter": "method"} 
)

origins = [
    "http://localhost:3000",    # Puerto común de React
    "http://localhost:5173",    # Puerto común de Vite
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En desarrollo puedes usar "*" para no bloquear nada
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. INCLUIR LOS ROUTERS (Ahora que 'app' ya existe)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(configuracion.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "API Medussa Operativa", "status": "online"}