from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, usuarios, configuracion, auditoria

app = FastAPI(
    title="Medussa API",
    description="Sistema de Gestión de Inventarios - Control Multiempresa",
    version="1.0.0"
)

# 1. Configuración de CORS para el Frontend (Angular localhost:4200)
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Configuración de Seguridad para Swagger (El "candado")
# Importante: tokenUrl debe coincidir con la ruta exacta de tu login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# 3. Inclusión de Rutas (Endpoints)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
app.include_router(configuracion.router, prefix="/api/v1/configuracion", tags=["Configuración"])
app.include_router(auditoria.router, prefix="/api/v1/auditoria", tags=["Auditoría"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "API Medussa operativa",
        "version": "1.0.0",
        "docs": "/docs"
    }