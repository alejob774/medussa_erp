from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.session import Base

class Configuracion(Base):
    __tablename__ = "configuraciones"
    __table_args__ = {"schema": "configuracion"} 

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(100), unique=True, nullable=False)
    nit = Column(String(20), unique=True, nullable=False)
    direccion = Column(String(150), nullable=False)
    ciudad = Column(String(100), nullable=False)
    pais = Column(String(100), nullable=False)
    moneda = Column(String(10), nullable=False)
    zona_horaria = Column(String(50), nullable=False)
    formato_fecha = Column(String(20), nullable=True)
    telefono = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    logo = Column(String(255), nullable=True)
    
    # CORRECCIÓN: Se agrega unique=True para permitir llaves foráneas desde otras tablas
    empresa_id = Column(String, index=True, unique=True, nullable=False) 
    
    sector = Column(String(100), nullable=True)
    estado = Column(Boolean, server_default=text('true'))
    fecha_inicio_operacion = Column(DateTime, nullable=True)
    configuraciones_iniciales = Column(JSONB, nullable=True)
    
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_modificacion = Column(DateTime(timezone=True), onupdate=func.now())    

class Modulo(Base):
    __tablename__ = "modulos"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    icono = Column(String(50), nullable=True)
    orden = Column(Integer, default=0)
    estado = Column(Boolean, server_default=text('true'))

class Menu(Base):
    __tablename__ = "menus"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    modulo_id = Column(Integer, ForeignKey("configuracion.modulos.id"))

class EmpresaSector(Base):
    __tablename__ = "empresa_sector"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class ParametroGeneral(Base):
    __tablename__ = "parametros_generales"
    __table_args__ = {"schema": "configuracion"}
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, nullable=False)
    valor = Column(Text, nullable=True)