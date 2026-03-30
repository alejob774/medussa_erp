from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from app.api.v1 import auth, usuarios, configuracion

app = FastAPI(
    title="Medussa API",
    description="Sistema de Gestión de Inventarios",
    version="1.0.0"
)

# Esto es lo que activa el "candado" en Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# Inclusión de rutas
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
app.include_router(configuracion.router, prefix="/api/v1/configuracion", tags=["Configuración"])

@app.get("/")
def read_root():
    return {"message": "API Medussa operativa"}