# app/models/desarrollo_productos.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class ProyectoProducto(Base):
    __tablename__ = "scm_nuevo_producto"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    nombre_producto = Column(String(100), nullable=False)
    categoria = Column(String(50))
    sku_propuesto = Column(String(50))
    mercado_objetivo = Column(String(100))
    fecha_lanzamiento = Column(Date)
    proyeccion_ventas = Column(Numeric(12, 2))
    responsable_id = Column(Integer)
    estado_proyecto = Column(String(20), default="IDEA") # IDEA, EVALUACION, APROBADO, LANZADO
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    bom_preliminar = relationship("ProyectoBOM", back_populates="proyecto", cascade="all, delete-orphan")

class ProyectoBOM(Base):
    __tablename__ = "scm_nuevo_producto_bom"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    proyecto_id = Column(Integer, ForeignKey("scm.scm_nuevo_producto.id"), nullable=False)
    item_codigo = Column(String(50))
    descripcion = Column(String(200))
    cantidad = Column(Numeric(12, 4))
    unidad_medida = Column(String(10))
    costo_estimado = Column(Numeric(12, 2))

    proyecto = relationship("ProyectoProducto", back_populates="bom_preliminar")