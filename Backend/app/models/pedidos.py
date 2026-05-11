from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    uuid_movil = Column(String(50), unique=True, index=True, nullable=False) # Para idempotencia
    empresa_id = Column(String(50), nullable=False, index=True)
    numero_pedido = Column(String(20), unique=True) # Correlativo oficial ERP
    cliente_id = Column(Integer, ForeignKey("configuracion.clientes.id"))
    vendedor_id = Column(Integer)
    estado = Column(String(20), default="Creada") # Creada, Rechazada, Enviada
    total = Column(Float, default=0.0)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    detalles = relationship("PedidoDetalle", back_populates="pedido")

class PedidoDetalle(Base):
    __tablename__ = "pedido_detalles"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("comercial.pedidos.id"))
    producto_id = Column(Integer, nullable=False)
    bodega_id = Column(Integer, nullable=False)
    cantidad = Column(Float, nullable=False)
    precio_unitario = Column(Float, nullable=False)

    pedido = relationship("Pedido", back_populates="detalles")