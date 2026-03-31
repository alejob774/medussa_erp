from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    user_name = Column(String(150))
    empresa_id = Column(String(50), index=True)
    modulo = Column(String(150))
    accion = Column(String(150))
    descripcion = Column(Text)
    ip_origen = Column(String(50))
    user_agent = Column(String(300))
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    payload_antes = Column(JSON)
    payload_despues = Column(JSON)