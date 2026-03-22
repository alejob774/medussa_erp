from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .database import get_db, engine, Base
from . import models, auth_utils

# Crear tablas en el inicio (Solo para Dev)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medussa ERP - Backend Core")

@app.post("/login", tags=["Seguridad"])
def login(user_credentials: dict, db: Session = Depends(get_db)):
    # 1. Buscar usuario
    user = db.query(models.Usuario).filter(models.Usuario.username == user_credentials["username"]).first()
    
    # 2. Validar credenciales
    if not user or not auth_utils.verify_password(user_credentials["password"], user.password_hash):
        # Aquí se debería registrar el intento fallido en auditoria.logs
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # 3. Generar tokens
    access, refresh = auth_utils.create_tokens(str(user.id), user.roles, user.permisos)
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer"
    }