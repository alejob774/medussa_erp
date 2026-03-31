# app/utils/auditoria.py
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.auditoria import Auditoria

async def registrar_log(
    db: Session,
    request: Request,
    user_id: int,
    user_name: str,
    empresa_id: str,
    modulo: str,
    accion: str,
    descripcion: str = None,
    antes: dict = None,
    despues: dict = None
):
    # Esta función centraliza la creación del registro
    log = Auditoria(
        user_id=user_id,
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