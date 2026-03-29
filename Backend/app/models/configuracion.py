from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.session import Base  # Asegúrate de que apunte a donde está tu Base

class Configuracion(Base):
    __tablename__ = "configuraciones"
    __table_args__ = {"schema": "configuracion"} # Según tus esquemas de Postgres

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(100), nullable=False)
    nit = Column(String(20), nullable=False)
    direccion = Column(String(150), nullable=False)
    ciudad = Column(String(100), nullable=False)
    pais = Column(String(100), nullable=False)
    moneda = Column(String(10), nullable=False)
    zona_horaria = Column(String(50), nullable=False)
    telefono = Column(String(20), nullable=True)
    formato_fecha = Column(String(20), default="DD/MM/YYYY")
    
    # Este es el campo más importante para la HU-001 (Multi-tenancy)
    empresa_id = Column(String, index=True, nullable=False) 

    def __repr__(self):
        return f"<Configuracion(empresa={self.nombre_empresa}, nit={self.nit})>"