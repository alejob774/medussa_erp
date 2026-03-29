import uuid
from sqlalchemy import Column, String, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base  # O el nombre del archivo donde definiste Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "seguridad"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    empresa_id = Column(String, nullable=True)  # CRUCIAL para HU-001
    roles = Column(JSON, default=["Usuario"])
    permisos = Column(JSON, default=[])
    # app/models/usuarios.py
    estado = Column(String, default="activo") # Ahora coincide con el INSERT