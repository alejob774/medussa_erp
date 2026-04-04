# app/utils/auditoria.py
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.auditoria import Auditoria

async def registrar_log(
    db: Session,
    request: Request,
    user_id: int = None, # Cambiado a opcional
    user_name: str = "SISTEMA",
    empresa_id: str = "GENERAL",
    modulo: str = "GENERAL",
    accion: str = "ACCION",
    descripcion: str = None,
    antes: dict = None,
    despues: dict = None
):
    # Si viene 0, lo tratamos como None para que no rompa la FK si no existe el usuario
    final_user_id = user_id if user_id != 0 else None
    
    log = Auditoria(
        user_id=final_user_id,
        user_name=user_name,
        empresa_id=empresa_id,
        modulo=modulo,
        accion=accion,
        descripcion=descripcion,
        ip_origen=request.client.host,
        user_agent=request.headers.get("user-agent", "unknown"),
        payload_antes=antes,
        payload_despues=despues
    )
    db.add(log)
    db.commit()