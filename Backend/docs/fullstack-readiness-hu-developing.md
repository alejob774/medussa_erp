# Fullstack Readiness HU-Developing

## 1. Resumen ejecutivo

| Campo | Valor |
| --- | --- |
| Rama de trabajo | `feat/backend-fullstack-readiness-hu-developing` |
| Base declarada | `origin/HU-Developing` |
| Commit base verificado | `8dca09e FullStack pt 3 & HU 018` |
| Fecha de preparacion | 2026-05-15 |
| Objetivo | Preparar el backend real para integracion fullstack controlada con frontend `devJ`. |
| Alcance | Correcciones puntuales de importabilidad, auth multiempresa, aliases de maestros, tenant en maestros, estabilizacion basica de Inventory Core, compatibilidad BI y limpieza de bytecode versionado. |

No se hizo merge con `devJ`, no se modifico frontend, no se conecto Grafana productivo, no se implemento ETL/DW real, no se reconstruyeron Inventory Core ni Costos Core completos.

Nota 2026-05-15: HU-018/HU-019 tienen una rama backend dedicada `feat/backend-hu-018-019-pedidos-entregas`, basada en esta preparacion, con modelos, migracion, routers y documentacion especifica en `Backend/docs/hu-018-019-pedidos-entregas-backend.md`.

## 2. Cambios backend realizados

| Archivo | Problema detectado | Cambio realizado | Motivo | Riesgo restante |
| --- | --- | --- | --- | --- |
| `Backend/app/main.py` | Faltaba router `/api/v1/empresas` y no existian aliases `/api/v1/maestros/*`. | Se monto `empresas.router` y se registraron aliases para proveedores, vendedores, conductores, rutas y equipos reutilizando los routers existentes. | Alinear contrato esperado por frontend sin duplicar logica. | Duplicar routers puede duplicar operaciones en OpenAPI, aunque el comportamiento es consistente. |
| `Backend/app/api/v1/empresas.py` | No existia `GET /api/v1/empresas/mis-empresas`. | Se creo endpoint JWT-only que devuelve empresas activas del usuario. | Permitir selector multiempresa antes de tener `X-Company-ID`. | Depende de datos correctos en `seguridad.usuarios_empresas_roles`. |
| `Backend/app/services/empresa_service.py` | La logica de membresia estaba acoplada a `/auth/me`. | Se centralizo listado/formateo/validacion de empresas del usuario. | Reutilizar en `/mis-empresas` y `/seleccionar-empresa`. | No implementa permisos granulares mas alla de rol/perfil existentes. |
| `Backend/app/api/v1/auth.py` | Faltaba `POST /api/v1/auth/seleccionar-empresa`; login permitia usuario inactivo. | Se agrego seleccion de empresa validando membresia activa y usuario activo; login rechaza usuario inactivo. | Alinear flujo frontend JWT + seleccion empresa. | No genera refresh token ni cambia estado server-side de sesion. |
| `Backend/app/schemas/auth.py` | No habia request flexible para seleccion de empresa. | Se agrego `SeleccionarEmpresaRequest` aceptando `empresaId`, `empresa_id` o `companyId`. | Compatibilidad camelCase/snake_case/frontend. | `activeCompanyId` retorna el `empresa_id` canonico usado por `X-Company-ID`; si frontend usa id numerico debe conservar `backendId` solo como referencia. |
| `Backend/app/api/deps.py` | Usuarios inactivos podian pasar `get_current_user`. | Se agrego bloqueo `403 Usuario inactivo`. | Evitar acceso a privados con usuario desactivado. | No hay revocacion de JWT emitidos antes de desactivar usuario. |
| `Backend/app/core/middleware.py` | `GET /empresas/mis-empresas` quedaba bloqueado por falta de `X-Company-ID`. | Se eximio `/api/v1/empresas/mis-empresas` con y sin slash final. | El selector de empresas debe ejecutarse antes de empresa activa. | Otros endpoints privados siguen exigiendo `X-Company-ID`. |
| `Backend/app/models/clientes.py` | Servicio de clientes inyectaba `empresa_id`, pero el modelo no tenia columna. | Se agrego `empresa_id`. | Evitar error runtime y soportar tenant. | Requiere migracion/backfill para datos existentes. |
| `Backend/app/models/vendedores.py` | Servicio de vendedores filtraba por `empresa_id`, pero el modelo no tenia columna. | Se agrego `empresa_id`. | Evitar error runtime y soportar tenant. | `id_ven` sigue siendo unique global, no unique por empresa. |
| `Backend/app/services/vendedor_service.py` | Asociaba clientes sin validar empresa. | Se filtro clientes por `empresa_id` al crear/actualizar. | Evitar mezcla de datos entre empresas. | Relacion historica vendedor-cliente sin tenant en tabla intermedia. |
| `Backend/app/models/conductores.py` | No tenia `empresa_id`. | Se agrego `empresa_id`. | Tenant para conductores. | `id_con` sigue siendo unique global. |
| `Backend/app/api/v1/conductores.py` | List/detail globales y delete fisico. | Se reescribio router con `get_current_company`, list/detail tenant, paginacion basica y soft delete. | Evitar mezcla de empresas y borrados fisicos. | Respuesta no esta envuelta en `{success,data}` como algunos modulos. |
| `Backend/app/services/conductor_service.py` | Create/update no filtraban rutas por empresa. | Se agrego tenant en create/list/detail/update/delete y validacion de rutas por empresa. | Evitar asociar rutas ajenas. | Tabla intermedia no tiene `empresa_id`; se controla por validacion de servicio. |
| `Backend/app/models/logistica.py` | `Ruta.empresa_id` era usado por servicio pero no existia; schema exponia `origen`, `destino`, `distancia_km` sin modelo. | Se agregaron `empresa_id`, `origen`, `destino`, `distancia_km`. | Evitar fallos runtime y alinear schema/modelo. | `id_rut` sigue unique global. |
| `Backend/app/api/v1/rutas.py` | Faltaban detail/update y habia retorno duplicado. | Se agregaron `GET /{ruta_id}`, `PUT`, `PATCH`, logging y se elimino retorno duplicado. | CRUD maestro mas estable para frontend. | Paginacion mantiene shape propia `RutaPaginatedResponse`. |
| `Backend/app/models/equipos.py` | Router/servicio usaban `Equipo.empresa_id`, pero modelo no tenia columna. | Se agrego `empresa_id`. | Evitar error runtime. | `id_maq` sigue unique global. |
| `Backend/app/services/equipo_service.py` | Firmas no aceptaban `empresa_id` aunque router lo pasaba. | Se alinearon `get_equipos`, `get_equipo_by_id_maq`, `create_equipo`, `update_equipo` con tenant. | Corregir firma router/servicio. | Filtros avanzados no implementados. |
| `Backend/app/services/proveedor_service.py` | Importaba modelo viejo `app.models.compras.Proveedor` incompatible con router actual. | Se cambio a `app.models.proveedores.Proveedor` y se agrego tenant en helpers. | Alinear servicio con API real de proveedores. | Router aun opera directo sobre modelo; servicio queda listo pero parcialmente usado. |
| `Backend/app/api/v1/inventory_core.py` | Usaba `InventarioSaldo` sin importarlo. | Se agrego import del modelo. | Evitar `NameError` runtime. | Inventory Core sigue parcial. |
| `Backend/app/services/inventario_service.py` | Usaba `func.sum` sin importar `func`; recalc no filtraba por empresa ni retornaba saldo. | Se importo `func`, se filtro Kardex por `empresa_id`, se hizo upsert basico de `InventarioSaldo` desde Kardex. | Estabilizar flujo API -> Kardex -> saldo recalculado. | `gestionar_reserva` aun modifica saldo directo; requiere rediseño posterior. |
| `Backend/app/api/v1/bi.py` | Endpoints BI requerian solo `fecha_desde/fecha_hasta`. | Se aceptan tambien `fechaDesde/fechaHasta` con helper central. | Compatibilidad frontend camelCase. | BI sigue consultando `get_bi_db`; no hay DW/ETL real validado. |
| `Backend/app/db/session.py` | El grep de conflictos marcaba separadores `=======`; habia `[cite]` residual. | Se cambiaron separadores y se limpio cita residual. | Dejar auditoria limpia. | Config de DB sigue hardcodeada, no lista para produccion. |
| `Backend/app/models/bi.py`, `schemas/*`, `api/v1/seguridad.py`, `api/v1/proveedores.py` | Comentarios con `[cite: ...]`. | Se removieron referencias `[cite]`. | Evitar residuos de auditoria/generacion. | Sin cambio funcional. |
| `Backend/alembic/versions/3f4a8b9c1d2e_fullstack_readiness_tenant_maestros.py` | Modelos de maestros requerian columnas nuevas. | Se creo migracion para `empresa_id` en clientes/vendedores/conductores/equipos/rutas y campos logisticos de rutas. | Alinear DB con modelos. | Columnas quedan nullable para no romper datos legacy; se requiere backfill. |
| `Backend/app/**/__pycache__/*.pyc` | Bytecode Python estaba versionado. | Se retiro del control de versiones con `git rm`. | Limpieza repo backend. | `compileall` regenera archivos locales ignorados. |

## 3. Endpoints disponibles despues de cambios

| Metodo | Endpoint | Estado | Auth | X-Company-ID | Comentario |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Existente ajustado | No | No | Form OAuth2; devuelve JWT bearer; rechaza usuario inactivo. |
| `GET` | `/api/v1/auth/me` | Existente ajustado | Si | Opcional | Devuelve empresas disponibles y permisos de empresa activa si hay header/contexto. |
| `POST` | `/api/v1/auth/logout` | Existente | No efectivo | No | No revoca JWT server-side. |
| `POST` | `/api/v1/auth/seleccionar-empresa` | Nuevo | Si | No | Acepta `empresaId`, `empresa_id`, `companyId`; valida membresia activa. |
| `GET` | `/api/v1/empresas/mis-empresas` | Nuevo | Si | No | Devuelve selector multiempresa. |
| `GET/POST/PUT` | `/api/v1/proveedores` | Existente | Si | Si | Tenant por `empresa_id`; delete no implementado. |
| `GET/POST/PATCH/DELETE` | `/api/v1/vendedores` | Existente ajustado | Si | Si | Tenant y clientes validados por empresa. |
| `GET/POST/PATCH/DELETE` | `/api/v1/conductores` | Ajustado | Si | Si | Tenant, soft delete, rutas validadas por empresa. |
| `GET/POST/PUT/PATCH/DELETE` | `/api/v1/rutas` | Ajustado | Si | Si | Tenant, detail/update y soft delete. |
| `GET/POST/PUT/DELETE` | `/api/v1/equipos` | Ajustado | Si | Si | Firmas servicio/router alineadas. |
| `GET/POST/PUT` | `/api/v1/maestros/proveedores` | Nuevo alias | Si | Si | Reusa router plano. |
| `GET/POST/PATCH/DELETE` | `/api/v1/maestros/vendedores` | Nuevo alias | Si | Si | Reusa router plano. |
| `GET/POST/PATCH/DELETE` | `/api/v1/maestros/conductores` | Nuevo alias | Si | Si | Reusa router plano. |
| `GET/POST/PUT/PATCH/DELETE` | `/api/v1/maestros/rutas` | Nuevo alias | Si | Si | Reusa router plano. |
| `GET/POST/PUT/DELETE` | `/api/v1/maestros/equipos` | Nuevo alias | Si | Si | Reusa router plano. |
| `GET` | `/api/v1/inventory/core/saldos` | Ajustado | Si | Si | Import corregido; consulta saldos por empresa. |
| `POST` | `/api/v1/inventory/core/movimientos` | Parcial ajustado | Si | Si | Registra Kardex y recalcula saldo basico. |
| `POST` | `/api/v1/inventory/core/transferencias` | Parcial | Si | Si | Usa dos movimientos de Kardex. |
| `GET` | `/api/v1/costs-core/product-cost/{sku}` | Parcial existente | Si | Si | Consulta costo actual por SKU. |
| `GET` | `/api/v1/costs-core/movements` | Parcial existente | Si | Si | Lista movimientos de costo. |
| `POST` | `/api/v1/costs-core/recalculate` | Stub existente | Si | Si | Solo responde proceso encolado. |
| `GET` | `/api/v1/bi/grafana/dashboards` | Existente | Si | Si | Demo/local; no productivo. |
| `GET` | `/api/v1/bi/*` con fechas | Ajustado | Si | Si | Acepta `fecha_desde/fecha_hasta` y `fechaDesde/fechaHasta`. |

## 4. Dominios listos para prueba

### Listo para smoke test

- Auth basico: `login`, `me`, `logout`.
- Selector multiempresa: `mis-empresas`, `seleccionar-empresa`.
- Maestros aliases: `/api/v1/maestros/proveedores`, `/vendedores`, `/conductores`, `/rutas`, `/equipos`.
- Rutas: list/create/detail/update/soft delete con `X-Company-ID`.
- Conductores: list/create/detail/update/soft delete con rutas de la misma empresa.
- Equipos: CRUD basico con firmas corregidas.
- BI dashboards demo: `/api/v1/bi/grafana/dashboards`.

### Parcial

- Proveedores: CRUD parcial; no hay delete.
- Vendedores: tenant corregido, pero uniqueness sigue global y la tabla intermedia no tiene tenant.
- Clientes: modelo tenant corregido porque lo usan vendedores/clientes, pero no se amplio router en esta tarea.
- Inventory Core: import y recalc basico corregidos; reservas siguen con mutacion directa de saldo.
- Costos Core: endpoints existen, pero idempotencia real depende de integracion Kardex/costo no probada con DB.
- BI nativo: compatibilidad de filtros corregida; depende de base BI disponible.

### No listo

- Grafana productivo.
- ETL/DW real.
- SCM completo.
- Produccion completa.
- Inventory Core completo con regla estricta para reservas/bloqueos.
- Costos Core completo con idempotencia transaccional probada.
- Seguridad/permisos granulares en todos los routers.

## 5. Bloqueadores restantes

### Criticos

- El entorno local usado para validacion no tiene `fastapi`; `import app.main` falla con `ModuleNotFoundError: No module named 'fastapi'`.
- No se pudo ejecutar pytest porque `pytest` no esta instalado.
- La DB real necesita aplicar migracion y backfill de `empresa_id` para datos legacy de maestros.

### Altos

- `id_cli`, `id_ven`, `id_con`, `id_rut`, `id_maq` siguen con unicidad global; idealmente deben ser unicos por empresa.
- `UsuarioEmpresaRol` y `UsuarioEmpresaConfig` siguen coexistiendo; login lee config inicial y auth/me/mis-empresas leen roles activos.
- `gestionar_reserva` en Inventory Core modifica saldo directo y no pasa por Kardex.
- Proveedores tiene dos modelos historicos (`app.models.proveedores` y `app.models.compras.Proveedor`); API actual usa `app.models.proveedores`.

### Medios

- OpenAPI mostrara rutas planas y aliases `/maestros/*` para los mismos routers.
- Costos Core devuelve algunos endpoints stub o vacios.
- BI nativo depende de `SessionBI` y no se valido con DW.

### Bajos

- Comentarios y textos historicos mantienen algunos caracteres mal codificados heredados.
- No se normalizo respuesta `{success,data}` en todos los maestros para evitar refactor masivo.

## 6. Cambios que requieren migracion DB

| Tabla | Columna | Motivo | Migracion |
| --- | --- | --- | --- |
| `configuracion.clientes` | `empresa_id` | Servicio inyecta y filtra tenant. | Creada: `3f4a8b9c1d2e_fullstack_readiness_tenant_maestros.py` |
| `configuracion.vendedores` | `empresa_id` | Servicio filtra tenant. | Creada |
| `configuracion.conductores` | `empresa_id` | Nuevo tenant en conductores. | Creada |
| `configuracion.equipos` | `empresa_id` | Router/servicio usan tenant. | Creada |
| `logistica.rutas` | `empresa_id` | Servicio usaba columna inexistente. | Creada |
| `logistica.rutas` | `origen`, `destino`, `distancia_km` | Schema de rutas exponia campos sin respaldo en modelo. | Creada |

Nota: las columnas se crean `nullable=True` en migracion para no romper bases con datos legacy. Para cierre real se debe hacer backfill por empresa y luego endurecer restricciones `NOT NULL` y unicidad compuesta por empresa.

## 7. Como probar

### Levantar backend

```powershell
cd Backend
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En este entorno, antes de levantarlo hay que instalar dependencias porque `import app.main` falla por falta de `fastapi`.

### Validar sintaxis/importabilidad liviana

```powershell
cd Backend
py -m compileall app
```

Resultado verificado: pasa correctamente.

### Auth

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=<usuario>&password=<password>
```

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
X-Company-ID: <empresa_id opcional>
```

```http
GET /api/v1/empresas/mis-empresas
Authorization: Bearer <token>
```

```http
POST /api/v1/auth/seleccionar-empresa
Authorization: Bearer <token>
Content-Type: application/json

{"empresaId": "<empresa_id o id numerico de configuracion>"}
```

### Maestros

Usar siempre:

```http
Authorization: Bearer <token>
X-Company-ID: <empresa_id canonico>
```

Ejemplos:

```http
GET /api/v1/maestros/proveedores
GET /api/v1/maestros/vendedores
GET /api/v1/maestros/conductores
GET /api/v1/maestros/rutas
GET /api/v1/maestros/equipos
```

Las rutas planas equivalentes siguen disponibles:

```http
GET /api/v1/proveedores
GET /api/v1/vendedores
GET /api/v1/conductores
GET /api/v1/rutas
GET /api/v1/equipos
```

### BI

```http
GET /api/v1/bi/grafana/dashboards
Authorization: Bearer <token>
X-Company-ID: <empresa_id canonico>
```

Los endpoints con fecha aceptan ambos formatos:

```http
GET /api/v1/bi/dashboard-ejecutivo?fecha_desde=2026-01-01&fecha_hasta=2026-01-31
GET /api/v1/bi/dashboard-ejecutivo?fechaDesde=2026-01-01&fechaHasta=2026-01-31
```

## 8. Que NO se resolvio

- Inventory Core completo: sigue parcial; `gestionar_reserva` aun actualiza saldo directo.
- Costos Core completo: endpoints basicos existen, pero no hay idempotencia real probada end-to-end.
- Produccion completa.
- SCM completo.
- BI/Grafana productivo.
- ETL/DW real.
- Seguridad granular por permisos en cada router.
- Normalizacion completa de contratos y respuestas para todos los modulos.
