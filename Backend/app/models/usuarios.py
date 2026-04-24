from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    cargo = Column(String(150), nullable=False)
    celular = Column(String(20), nullable=False)
    telefono_fijo = Column(String(20), nullable=True)
    estado = Column(Boolean, default=True)

    # Relación para Joinedload
    membresias_rel = relationship("UsuarioEmpresaConfig", back_populates="usuario_rel", cascade="all, delete-orphan")

class UsuarioEmpresaConfig(Base):
    __tablename__ = "usuario_empresa_config"
    __table_args__ = {"schema": "seguridad"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seguridad.usuarios.id", ondelete="CASCADE"))
    empresa_id = Column(String(50), nullable=False)
    rol_id = Column(Integer, ForeignKey("seguridad.roles.id"))
    perfil_id = Column(Integer, ForeignKey("seguridad.perfiles_empresa.id"), nullable=True)

    # Relaciones para obtener nombres
    usuario_rel = relationship("Usuario", back_populates="membresias_rel")
    rol_rel = relationship("Rol") # Requiere que Rol esté importado o disponible
    perfil_rel = relationship("Perfil")