from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

# Tabla intermedia para la relación Vendedor -> Clientes (1:N)
vendedor_cliente = Table(
    "vendedor_cliente",
    Base.metadata,
    Column("vendedor_id", Integer, ForeignKey("configuracion.vendedores.id"), primary_key=True),
    Column("cliente_id", Integer, ForeignKey("configuracion.clientes.id"), primary_key=True),
    schema="configuracion"
)

class Vendedor(Base):
    __tablename__ = "vendedores"
    __table_args__ = {"schema": "configuracion"}

    id = Column(Integer, primary_key=True, index=True)
    id_ven = Column(String(20), unique=True, nullable=False, index=True) # ID Único
    nombre_ven = Column(String(150), nullable=False) # Nombre Obligatorio
    estado = Column(Boolean, default=True) # Soft Delete
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con clientes
    clientes = relationship("Cliente", secondary=vendedor_cliente, backref="vendedores")