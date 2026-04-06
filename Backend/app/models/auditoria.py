# app/models/auditoria.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class Auditoria(Base):
    __tablename__ = "auditoria" # El nombre real en la DB
    __table_args__ = {"schema": "seguridad"} # El esquema correcto

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=True)
    empresa_id = Column(String, nullable=True)
    modulo = Column(String, nullable=False)
    accion = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    ip_origen = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    payload_antes = Column(JSON, nullable=True)
    payload_despues = Column(JSON, nullable=True)