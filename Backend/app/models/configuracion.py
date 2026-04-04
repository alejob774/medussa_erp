from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.db.session import Base

class Configuracion(Base):
    __tablename__ = "configuraciones"
    __table_args__ = {"schema": "configuracion"} 

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(200), nullable=False, unique=True) # 
    nit = Column(String(50), nullable=False, unique=True) # [cite: 43, 60]
    direccion = Column(String(200), nullable=True)
    telefono = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    logo = Column(String(255), nullable=True) # URL o path del logo 
    sector = Column(String(100), nullable=False) # 
    estado = Column(Boolean, default=True, nullable=False) # [cite: 43, 47]
    
    # Parámetros Multiempresa
    ciudad = Column(String(100), nullable=False)
    pais = Column(String(100), nullable=False)
    moneda = Column(String(10), nullable=False)
    zona_horaria = Column(String(50), nullable=False)
    fecha_inicio_operacion = Column(DateTime, nullable=True)
    configuraciones_iniciales = Column(JSON, nullable=False) # 
    
    empresa_id = Column(String(50), unique=True, index=True, nullable=False) 
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_modificacion = Column(DateTime(timezone=True), onupdate=func.now())

class EmpresaSector(Base): # Catálogo para el selector de Juan Camilo [cite: 68, 75]
    __tablename__ = "empresa_sector"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "seguridad"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)