# app/utils/auditoria.py
from fastapi import Request
from fastapi.encoders import jsonable_encoder # <--- Importante
from sqlalchemy.orm import Session
from typing import Optional
from app.models.auditoria import Auditoria

async def registrar_log(
    db: Session,
    request: Request,
    user_id: Optional[int] = None,
    user_name: str = "SISTEMA",
    empresa_id: str = "GENERAL",
    modulo: str = "GENERAL",
    accion: str = "ACCION",
    descripcion: Optional[str] = None,
    payload_antes: Optional[dict] = None,
    payload_despues: Optional[dict] = None
):
    # Convertimos los diccionarios a formatos serializables (Decimal -> float/int)
    # antes de pasarlos al modelo de SQLAlchemy
    payload_antes_json = jsonable_encoder(payload_antes) if payload_antes else None
    payload_despues_json = jsonable_encoder(payload_despues) if payload_despues else None

    log = Auditoria(
        user_id=user_id if user_id != 0 else None,
        user_name=user_name,
        empresa_id=empresa_id,
        modulo=modulo,
        accion=accion,
        descripcion=descripcion,
        ip_origen=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "unknown"),
        payload_antes=payload_antes_json, # <--- Usar versión serializada
        payload_despues=payload_despues_json # <--- Usar versión serializada
    )
    db.add(log)
    db.commit()
    db.refresh(log)