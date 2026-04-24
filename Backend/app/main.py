from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import MultiCompanyMiddleware

# Importación de la Base para creación de tablas (Development Mode)
from app.db.session import engine, Base

# Importación de Routers
from app.api.v1 import (
    auth, usuarios, configuracion, auditoria, seguridad,
    inventario, clientes, vendedores, conductores, rutas,
    equipos, proveedores, oee, bom, calidad, mps, tpm,
    demanda, analisis_demanda, desarrollo_productos,
    scm_compras_api, scm_presupuesto_api, scm_inventario_api,
    scm_layout_api, wms_api # <--- Nuevo Router HU-032
)

app = FastAPI(
    title="Medussa ERP API",
    description="Sistema Integral de Gestión - SCM, Producción e Inventarios Multiempresa",
    version="1.5.0"
)

app.add_middleware(MultiCompanyMiddleware)

# 1. Configuración de CORS
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Seguridad Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# -----------------------------------------------------------------------------
# REGISTRO DE RUTAS (ROUTERS) POR MÓDULO
# -----------------------------------------------------------------------------

# BLOQUE: CORE & ADMINISTRACIÓN (HU-001 al HU-005)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Gestión de Usuarios"])
app.include_router(configuracion.router, prefix="/api/v1/configuracion", tags=["Configuración Sistema"])
app.include_router(auditoria.router, prefix="/api/v1/auditoria", tags=["Auditoría"])

# BLOQUE: OPERACIONES & LOGÍSTICA (HU-010 al HU-016)
app.include_router(inventario.router, prefix="/api/v1/inventario", tags=["Inventarios"])
app.include_router(clientes.router, prefix="/api/v1/clientes", tags=["Comercial - Clientes"])
app.include_router(vendedores.router, prefix="/api/v1/vendedores", tags=["Comercial - Vendedores"])
app.include_router(conductores.router, prefix="/api/v1/conductores", tags=["Logística - Conductores"])
app.include_router(rutas.router, prefix="/api/v1/rutas", tags=["Logística - Rutas"])
app.include_router(equipos.router, prefix="/api/v1/equipos", tags=["Activos - Equipos"])
app.include_router(proveedores.router, prefix="/api/v1/proveedores", tags=["Compras - Proveedores"])

# BLOQUE: PRODUCCIÓN & CALIDAD (HU-020 al HU-024)
app.include_router(oee.router, prefix="/api/v1/produccion/oee", tags=["Producción - OEE"])
app.include_router(bom.router, prefix="/api/v1/produccion/bom", tags=["Producción - BOM"])
app.include_router(calidad.router, prefix="/api/v1/produccion/calidad", tags=["Producción - Calidad"])
app.include_router(mps.router, prefix="/api/v1/produccion/mps", tags=["Producción - MPS"])
app.include_router(tpm.router, prefix="/api/v1/produccion/tpm", tags=["Producción - TPM"])

# BLOQUE: SCM & WMS (HU-025 al HU-032)
app.include_router(demanda.router, prefix="/api/v1/scm/demanda", tags=["SCM - Planeación de Demanda"])
app.include_router(analisis_demanda.router, prefix="/api/v1/scm/analisis", tags=["SCM - Análisis de Demanda"])
app.include_router(desarrollo_productos.router, prefix="/api/v1/scm/productos", tags=["SCM - Desarrollo de Productos"])
app.include_router(scm_compras_api.router, prefix="/api/v1/scm/compras", tags=["SCM - Compras Estratégicas"])
app.include_router(scm_presupuesto_api.router, prefix="/api/v1/scm/presupuesto", tags=["SCM - Gestión de Presupuesto"])
app.include_router(scm_inventario_api.router, prefix="/api/v1/scm/inventario/ciclo", tags=["SCM - Ciclo de Inventarios"])
app.include_router(scm_layout_api.router, prefix="/api/v1/scm/inventario/layout", tags=["SCM - Layout Estratégico"])
app.include_router(wms_api.router, prefix="/api/v1/wms", tags=["WMS - Picking & Packing"])

@app.get("/")
def read_root():
    return {"message": "Medussa ERP API Online - WMS Operativo", "version": "1.5.0"}