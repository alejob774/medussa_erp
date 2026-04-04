from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.db.session import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False) # Requerido por HU-011 
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    cargo = Column(String(150), nullable=False) # Requerido por HU-011 
    celular = Column(String(20), nullable=False) # Requerido por HU-011 
    telefono_fijo = Column(String(20), nullable=True)
    rol = Column(String(20)) 
    estado = Column(Boolean, default=True) # Para Soft Delete 

# Renombramos y actualizamos para coincidir con la lógica Multiempresa
class UsuarioEmpresaConfig(Base):
    __tablename__ = "usuario_empresa_config"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seguridad.usuarios.id", ondelete="CASCADE"))
    empresa_id = Column(String(50), nullable=False) # Identificador de empresa 
    rol_id = Column(Integer, ForeignKey("seguridad.roles.id")) # Rol por empresa 
    perfil_id = Column(Integer, nullable=True) # Perfil por empresa