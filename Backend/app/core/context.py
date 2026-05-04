# app/core/context.py
from contextvars import ContextVar
from typing import Optional

# Variable de contexto global para el Tenant (empresa_id)
_company_id_ctx_var: ContextVar[Optional[str]] = ContextVar("company_id", default=None)

def set_company_context(company_id: str) -> None:
    """Establece el ID de la empresa para la solicitud actual."""
    _company_id_ctx_var.set(company_id)

def get_company_context() -> Optional[str]:
    """Obtiene el ID de la empresa de la solicitud actual."""
    return _company_id_ctx_var.get()