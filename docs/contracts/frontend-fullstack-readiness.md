# Frontend Fullstack Readiness

## Fase 2 - Maestros

Estado: API-ready con runtime mock-first. Los facades de Maestros siguen usando repositorios mock porque los flags `use*AdministrationMock` permanecen en `true`.

### Repositorios API-ready

Los siguientes repositorios ya tienen operaciones HTTP reales preparadas con fallback mock:

- `VendorApiRepository`: vendedores.
- `DriverApiRepository`: conductores.
- `RouteApiRepository`: rutas.
- `SupplierApiRepository`: proveedores.
- `EquipmentApiRepository`: equipos.

Operaciones preparadas:

- listar.
- obtener por id.
- crear.
- actualizar.
- eliminar.
- activar/inactivar mediante patch de estado.

Catalogos auxiliares y listas asignables siguen delegando al mock hasta que el backend publique endpoints estables para esas fuentes.

### Endpoints esperados

El frontend espera `environment.apiUrl = /api/v1` y agrega el prefijo de Maestros:

- `GET|POST /api/v1/maestros/vendedores`
- `GET|PATCH|DELETE /api/v1/maestros/vendedores/{id}`
- `GET|POST /api/v1/maestros/conductores`
- `GET|PATCH|DELETE /api/v1/maestros/conductores/{id}`
- `GET|POST /api/v1/maestros/rutas`
- `GET|PATCH|DELETE /api/v1/maestros/rutas/{id}`
- `GET|POST /api/v1/maestros/proveedores`
- `GET|PATCH|DELETE /api/v1/maestros/proveedores/{id}`
- `GET|POST /api/v1/maestros/equipos`
- `GET|PATCH|DELETE /api/v1/maestros/equipos/{id}`

Diferencia con repos existentes: Productos, Clientes y Empresas conservan sus endpoints historicos (`/inventario`, `/clientes`, `/configuracion`) para no romper la integracion ya avanzada. La Fase 2 solo prepara los cinco Maestros pendientes bajo `/maestros/*`.

### Headers y empresa

El interceptor transversal agrega `X-Company-ID` cuando existe empresa activa. Los repositorios tambien envian parametros defensivos `empresa_id` y `companyId` en listados para compatibilidad durante la transicion.

Los DTO mappers aceptan variantes comunes:

- `empresa_id` y `companyId`.
- `estado`, `activo` e `isActive`.
- snake_case y camelCase en campos criticos de cada dominio.

### Fallback mock

Flags default:

- `useVendorsAdministrationMock: true`
- `useDriversAdministrationMock: true`
- `useRoutesAdministrationMock: true`
- `useSuppliersAdministrationMock: true`
- `useEquipmentsAdministrationMock: true`

Fallback habilitado para pruebas graduales:

- `enableVendorsAdministrationFallback: true`
- `enableDriversAdministrationFallback: true`
- `enableRoutesAdministrationFallback: true`
- `enableSuppliersAdministrationFallback: true`
- `enableEquipmentsAdministrationFallback: true`

Si un dominio se cambia a API real y falla por red, endpoint no implementado o error servidor recuperable, el frontend cae a mock. Errores de validacion, permisos y autenticacion se normalizan con `backend-error.mapper.ts` y no se ocultan por fallback.

### Backend pendiente

Para conectar un dominio, el backend debe cumplir:

- Respetar `X-Company-ID` para endpoints privados.
- Aceptar `empresa_id` o derivar empresa desde header.
- Responder listados como array o como `{ items | results | data | rows, total | count }`.
- Devolver IDs persistentes en `id` o en el identificador de dominio.
- Devolver estado como `estado`, `activo` o `isActive`.
- Usar errores HTTP claros: `400/409/422` para validacion, `401/403` para auth/permisos, `5xx` para fallas servidor.

### Dominio recomendado para conectar primero

Vendedores o Proveedores son los candidatos mas contenidos: dependen de catalogos/relaciones auxiliares que todavia pueden permanecer mock mientras se valida CRUD real. Rutas y Conductores dependen mas de asignaciones cruzadas; conviene conectarlos despues de estabilizar vendedores/clientes/rutas asignables.
