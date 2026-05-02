from pydantic import BaseModel
from typing import List, Optional

class DashboardResponse(BaseModel):
    success: bool
    data: dict # Contendrá ventasMes, otif, margenEstimado, etc.

class DashboardFiltros(BaseModel):
    empresaId: int
    fechaDesde: str
    fechaHasta: str
    sedeId: Optional[int] = None[cite: 22]