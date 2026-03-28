from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from ..db.session import Base

class ParametrosGenerales(Base):
    __tablename__ = "parametros_generales"
    __table_args__ = {"schema": "configuracion"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre_empresa = Column(String(150), nullable=False)
    nit = Column(String(20), nullable=False)
    moneda = Column(String(10), nullable=False)
    zona_horaria = Column(String(50), nullable=False)
    formato_fecha = Column(String(20), nullable=False)
    correo_corporativo = Column(String(100), nullable=True)
    
    estado = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)