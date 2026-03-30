import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base 

class Usuario(Base):
    __tablename__ = "usuarios"
    # AGREGAMOS EL SCHEMA AQUÍ PARA QUE COINCIDA CON LOS DEMÁS
    __table_args__ = {"schema": "seguridad"} 

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False) 
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String)
    estado = Column(Boolean, default=True)

class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False) 
    descripcion = Column(String(200))
    empresa_id = Column(String, nullable=False)
    permisos = Column(JSON)

class UsuarioEmpresaRol(Base):
    __tablename__ = "usuarios_empresas_roles"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    # IMPORTANTE: El ID de Usuario arriba es Integer, aquí lo tenías como UUID. 
    # Deben ser del mismo tipo. Si tu Usuario.id es Integer, aquí debe ser Integer.
    usuario_id = Column(Integer, ForeignKey("seguridad.usuarios.id"))
    empresa_id = Column(String, nullable=False)
    rol_id = Column(Integer, ForeignKey("seguridad.roles.id"))
    estado = Column(String, default="activo")