from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID

class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    roles: List[str] = ["Administrador"]
    empresa_id: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str