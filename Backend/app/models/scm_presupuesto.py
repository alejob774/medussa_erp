from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class CentroCosto(Base):
    __tablename__ = "centros_costo"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), unique=True) # Ej: PROD-01, ADM-01

class Presupuesto(Base):
    __tablename__ = "scm_presupuesto"
    __table_args__ = {"schema": "scm"}
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    anio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    centro_costo_id = Column(Integer, ForeignKey("configuracion.centros_costo.id"))
    categoria_id = Column(String(50)) # Materia Prima, Empaques, etc.
    valor_aprobado = Column(Numeric(15, 2), nullable=False)
    valor_ejecutado = Column(Numeric(15, 2), default=0)
    estado = Column(String(20), default="ACTIVO")

class PresupuestoAlerta(Base):
    __tablename__ = "scm_presupuesto_alerta"
    __table_args__ = {"schema": "scm"}
    id = Column(Integer, primary_key=True, index=True)
    presupuesto_id = Column(Integer, ForeignKey("scm.scm_presupuesto.id"))
    tipo_alerta = Column(String(50)) # SOBREGASTO, CRITICO
    descripcion = Column(Text)
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())