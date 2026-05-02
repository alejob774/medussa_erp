from contextvars import ContextVar
from typing import Optional

# Variable de contexto global para el aislamiento de datos
_company_id_ctx_var: ContextVar[Optional[str]] = ContextVar("company_id", default=None)

def get_company_context() -> Optional[str]:
    """Obtiene el ID de la empresa del contexto actual."""
    return _company_id_ctx_var.get()

def set_company_context(empresa_id: str):
    """Establece el ID de la empresa en el contexto."""
    _company_id_ctx_var.set(empresa_id)