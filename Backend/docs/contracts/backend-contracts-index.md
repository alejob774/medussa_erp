# Backend Contracts Index - Auditoria Fullstack

Fecha de auditoria: 2026-05-02  
Frontend auditado: `medussa_erp_frontend`, rama `devJ`, worktree limpio.  
Backend auditado: `medussa_erp_backend`, rama `HU-Developing`, worktree con documentacion nueva/no trackeada en `Backend/docs/`.  
Documentos previos en `Backend/docs/contracts/`: encontrados en la rama actual del backend y actualizados completamente para este alcance.

## Resumen ejecutivo

El frontend `devJ` ya contiene una experiencia ERP amplia en modo mock-first/API-ready: login, shell, selector multiempresa, maestros, SCM HU-025 a HU-032, produccion HU-020 a HU-024, Inventory Core, Costs Core y BI HU-033 a HU-038. El backend `HU-Developing` no esta en el mismo nivel contractual. Tiene routers FastAPI y modelos iniciales para varias areas, pero todavia no ofrece una API fullstack estable para cerrar las HUs reales del frontend.

La brecha principal no es solo de nombres de endpoints. Hay capas completas ausentes (`/inventory-core`, `/costs-core`), rutas SCM incompatibles con el frontend, servicios dummy, funciones llamadas pero no implementadas, modelos con campos que no existen, multiempresa inconsistente y seguridad administrativa no expuesta.

## Que si esta listo o cerca

- Auth login existe en `POST /api/v1/auth/login` y devuelve JWT bearer.
- Logout existe en `POST /api/v1/auth/logout` y registra auditoria, aunque no invalida token.
- Empresas/configuracion tiene list/create/update/delete bajo `/api/v1/configuracion`.
- Clientes y vendedores tienen CRUD basico con `empresa_id` tomado de `X-Company-ID`.
- Auditoria tiene listado con filtros, `skip`, `limit` y header `X-Total-Count`.
- Produccion tiene prototipos para OEE, BOM, calidad, MPS y TPM.
- SCM tiene prototipos para demanda, analisis, compras, presupuesto, inventario ciclico, layout y WMS.
- BI tiene modelos fact/dim iniciales y algunos endpoints consultando tablas `bi.*`.

## Que sigue incompleto o bloqueante

- El middleware exige `X-Company-ID` para casi todo, pero el frontend solo agrega `Authorization`; no agrega `X-Company-ID`.
- `/auth/me` puede fallar por `get_company_context()` no importado en `auth.py`.
- El router `seguridad.py` no esta montado en `main.py`; roles/perfiles usados por frontend no estan expuestos.
- Hay dos modelos/tablas de membresias: `UsuarioEmpresaConfig` y `UsuarioEmpresaRol`; usuarios administra una y auth consulta otra.
- `Perfil` no tiene columna `permisos`, pero `/auth/me` intenta leer `Perfil.permisos`.
- Productos/inventario llama funciones inexistentes (`obtener_producto_por_id`, `actualizar_producto`) y usa schemas con campos ausentes en el modelo.
- No existe dominio backend `/api/v1/inventory-core` para saldos, lotes, reservas, kardex, ajustes, calidad, transferencias o consumo TPM.
- No existe dominio backend `/api/v1/costs-core` para costos, movimientos de costo, costo por SKU, costo de orden o margen.
- SCM frontend usa `/scm/demand-forecasts`, `/scm/demand-analysis`, `/scm/product-development`, `/scm/purchase-analysis`, `/scm/budget-management`, `/scm/inventory-cycle`, `/scm/storage-layout`; backend expone rutas distintas.
- HU-030/HU-031/HU-032 tienen prototipos dummy y no integran Inventory Core.
- Produccion HU-020 a HU-024 carece de dashboards/listados/historicos completos y no integra Inventory Core.
- BI HU-033 a HU-038 no esta DW-ready; no hay ETL/staging/datamarts/Grafana real y hay errores de runtime en endpoints.

## Integrabilidad por bloque

- Integrable parcialmente: login, configuracion, auditoria, clientes, vendedores.
- Hibrido con riesgo: productos, BOM, OEE, MPS, TPM, calidad, BI parcial.
- No cerrable contra frontend actual: seguridad roles/perfiles, Inventory Core, Costs Core, SCM HU-025 a HU-032, Picking/Packing real, BI HU-033/HU-038 completo.

## Orden de lectura recomendado

1. `auth-security-contract.md`
2. `masters-contract.md`
3. `inventory-core-contract.md`
4. `costs-core-contract.md`
5. `scm-contract.md`
6. `production-contract.md`
7. `bi-backend-contract.md`

## Veredicto general

El backend actual `HU-Developing` no esta listo para integracion fullstack real del alcance completo del frontend `devJ`. Sirve como base inicial de modelos y prototipos, pero antes de cerrar HUs debe estabilizar multiempresa, unificar membresias, montar seguridad, crear Inventory Core y Costs Core, alinear rutas SCM/produccion con contratos frontend, reemplazar dummies por persistencia real y separar BI transaccional de DW/datamarts.
