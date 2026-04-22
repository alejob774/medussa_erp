# app/api/v1/__init__.py

"""
Índice de Módulos API v1 - Medussa ERP
Este archivo centraliza las importaciones de los routers para ser consumidos por el main.
"""

# Módulo: Núcleo y Seguridad (Core)
from . import auth           # HU-001: Autenticación JWT
from . import usuarios       # HU-002: Gestión de Usuarios
from . import configuracion  # HU-003: Multiempresa y Configuración General
from . import auditoria      # HU-004: Logs de Auditoría
from . import seguridad      # HU-005: Roles y Permisos

# Módulo: Operaciones Core (Comercial y Logística)
from . import inventario     # HU-010: Maestro de Productos e Inventarios
from . import clientes       # HU-012: Gestión de Clientes
from . import vendedores     # HU-013: Gestión de Fuerza de Ventas
from . import conductores    # HU-014: Maestro de Conductores
from . import rutas          # HU-015: Logística y Distribución
from . import equipos        # HU-016: Mantenimiento de Equipos
from . import proveedores    # Maestro de Proveedores

# Módulo: Producción y Calidad
from . import oee            # HU-020: Eficiencia General de los Equipos
from . import bom            # HU-021: Listas de Materiales (Recetas/Fórmulas)
from . import calidad        # HU-022: Control de Calidad en Proceso
from . import mps            # HU-023: Plan Maestro de Producción
from . import tpm            # HU-024: Mantenimiento Productivo Total

# Módulo: SCM (Supply Chain Management)
from . import demanda           # HU-025: Planeación de la Demanda (Forecast)
from . import analisis_demanda  # HU-026: Dashboard de Análisis de Demanda
from . import desarrollo_productos # HU-027: Diseño y Desarrollo de Productos
from . import scm_compras_api   # HU-028: Análisis Estratégico de Compras
from . import scm_presupuesto_api # HU-029: Gestión de Presupuestos de Compra
from . import scm_inventario_api  # HU-030: Ciclo de Inventarios
from . import scm_layout_api      # HU-031: Control de Layout
from . import wms_api             # HU-032: Picking & Packing (WMS Operativo)