# Frontend Fullstack Readiness

## Fase 1 - Base transversal

Estado: implementada como base segura para integracion gradual, manteniendo runtime mock-first.

### Interceptores HTTP

El frontend registra interceptores funcionales en este orden:

- `authTokenInterceptor`: agrega `Authorization: Bearer <token>` a requests privados cuando existe token de sesion. No modifica login.
- `companyContextInterceptor`: agrega `X-Company-ID` cuando existe empresa activa. No modifica login ni requests sin empresa activa.

Resolucion de empresa para `X-Company-ID`:

- usa `backendId` de la empresa activa si existe;
- si no existe, usa `activeBackendCompanyId`;
- como ultimo fallback usa `activeCompanyId`.

### Errores backend

`src/app/core/http/backend-error.mapper.ts` centraliza el shape UI de errores:

- `status`
- `code`
- `message`
- `details`
- flags `isAuthError`, `isPermissionError`, `isNetworkError`, `isValidationError`, `isServerError`

Los repositorios pueden usar `mapBackendError` o `getBackendErrorMessage` sin crear un manejo global nuevo.

### Environment mock-first

`environment.ts` queda organizado por dominios y todos los dominios con flags mock mantienen runtime local seguro. Las fases posteriores pueden apagar mocks dominio por dominio sin cambiar pantallas ni flujos visibles.

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

Compatibilidad temporal:

- la ruta contratada `/api/v1/maestros/{dominio}` sigue siendo la preferida;
- si el backend responde `404` o `405` y `useFlatMasterEndpointsFallback` esta activo, los repositorios API prueban la ruta plana actual `/api/v1/{dominio}`;
- si la ruta plana tambien falla y el fallback mock del dominio esta activo, el flujo cae al repositorio mock;
- esta compatibilidad solo aplica cuando se apaga el mock de un maestro para pruebas controladas.

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
- `useFlatMasterEndpointsFallback: true`
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

## Fase 3 - Auth, sesion y multiempresa

Estado: API-ready con runtime mock-first. El login visible, logout, guards y selector de empresa mantienen el mismo flujo local.

### Endpoints preparados

El frontend queda preparado para consumir:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/empresas/mis-empresas`
- `POST /api/v1/auth/seleccionar-empresa`

### Flags de Auth

Default mock-first:

- `useAuthMock: true`
- `allowMockLoginFallback: true`
- `enableAuthFallback: true`
- `useUserCompaniesMock: true`
- `enableUserCompaniesFallback: true`

Con estos valores, el runtime local no intenta obligatoriamente backend real. Para pruebas graduales se puede apagar `useAuthMock` o `useUserCompaniesMock` por separado y conservar fallback recuperable.

### Sesion y storage

La sesion sigue centralizada en `AuthSessionService` bajo:

- `medussa.erp.auth.session`

Logout limpia la sesion de Auth, cambios pendientes y artefactos conocidos como:

- `medussa.erp.security.user-shadow`

No se agregaron nuevas keys persistentes para empresa activa, permisos o usuario. Empresa activa, `activeBackendCompanyId`, roles, perfil y permisos siguen viviendo dentro del snapshot de sesion.

### Multiempresa real

Al cambiar empresa, el frontend:

- actualiza la empresa activa localmente para mantener el flujo actual;
- prepara `POST /auth/seleccionar-empresa` con `empresaId`, `empresa_id` y `companyId`;
- mantiene `X-Company-ID` desde el interceptor transversal;
- sincroniza `/auth/me` para refrescar empresa activa, perfil, rol y permisos cuando backend este activo;
- revierte al contexto anterior solo si el backend devuelve un error critico no recuperable.

### Mapeo defensivo

Los mappers de Auth aceptan variantes comunes del backend:

- tokens `access_token/accessToken`, `refresh_token/refreshToken`, `token_type/tokenType`;
- empresa activa `empresa_activa`, `empresa_id`, `active_company_id`, `activeCompanyId`;
- empresas en `empresas`, `companies`, arrays directos o payloads con `items/results/data`;
- company ids `empresa_id`, `empresaId`, `companyId`, `backend_id`, `backendId`;
- nombres `nombre_empresa`, `nombre`, `name`;
- rol/perfil `rol/role`, `perfil/profile`;
- permisos en `permisos`, `permissions`, strings, arrays u objetos `{ modulo, accion }`, `{ module, action }`, `{ code }`, `{ key }`.

### Backend pendiente

Para activar Auth real, backend debe:

- devolver tokens bearer en login;
- devolver usuario y empresas autorizadas;
- respetar `X-Company-ID` en endpoints privados;
- responder `/auth/me` con permisos efectivos para la empresa activa;
- aceptar seleccion de empresa por `empresa_id` y devolver 2xx si el cambio fue aplicado;
- usar `401` para sesion invalida, `403` para empresa/permiso no autorizado y `422/409` para errores de validacion;
- permitir logout idempotente.

### Primer paso recomendado

Conectar primero `GET /empresas/mis-empresas` manteniendo `useAuthMock: true`. Esto valida catalogo multiempresa real sin cambiar el login visible ni permisos. Despues conectar `/auth/me`, luego `seleccionar-empresa`, y finalmente `login/logout` reales.

## Smoke test contra backend feat/backend-fullstack-readiness-hu-developing

Estado: preparado para prueba controlada de Auth + Multiempresa + Maestros contra backend real, manteniendo runtime default mock-first.

### Rama backend usada

- Backend de referencia: `feat/backend-fullstack-readiness-hu-developing`.
- Frontend de prueba: `feat/fullstack-smoke-auth-maestros` o `feat/fullstack-integration-hu-developing`.
- Base URL esperada: `environment.apiUrl = 'http://127.0.0.1:8000/api/v1'`.

### Flags a cambiar para Auth real

Default actual, mock-first:

- `useAuthMock: true`
- `useUserCompaniesMock: true`
- `enableAuthFallback: true`
- `allowMockLoginFallback: true`
- `enableUserCompaniesFallback: true`

Smoke Auth real estricto:

- `useAuthMock: false`
- `useUserCompaniesMock: false`
- `enableAuthFallback: false`
- `allowMockLoginFallback: false`
- `enableUserCompaniesFallback: false`

Smoke Auth real tolerante, solo para validar disponibilidad sin romper demo local:

- `useAuthMock: false`
- `useUserCompaniesMock: false`
- `enableAuthFallback: true`
- `allowMockLoginFallback: true`
- `enableUserCompaniesFallback: true`

### Flags a cambiar para Maestros reales

Default actual, mock-first:

- `useSuppliersAdministrationMock: true`
- `useVendorsAdministrationMock: true`
- `useDriversAdministrationMock: true`
- `useRoutesAdministrationMock: true`
- `useEquipmentsAdministrationMock: true`
- `useFlatMasterEndpointsFallback: true`

Smoke Maestros reales:

- `useSuppliersAdministrationMock: false`
- `useVendorsAdministrationMock: false`
- `useDriversAdministrationMock: false`
- `useRoutesAdministrationMock: false`
- `useEquipmentsAdministrationMock: false`
- mantener `useFlatMasterEndpointsFallback: true` para compatibilidad temporal con rutas planas.

Fallback mock recuperable:

- `enableSuppliersAdministrationFallback: true`
- `enableVendorsAdministrationFallback: true`
- `enableDriversAdministrationFallback: true`
- `enableRoutesAdministrationFallback: true`
- `enableEquipmentsAdministrationFallback: true`

El fallback mock solo cubre errores recuperables como red, 404, 405 o 5xx. No oculta 401, 403, 400, 409 ni 422.

### Endpoints a probar

Auth y multiempresa:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/empresas/mis-empresas`
- `POST /api/v1/auth/seleccionar-empresa`
- `POST /api/v1/auth/logout`

Maestros, ruta preferida:

- `GET|POST /api/v1/maestros/proveedores`
- `GET|PUT|DELETE /api/v1/maestros/proveedores/{id}`
- `GET|POST /api/v1/maestros/vendedores`
- `GET|PATCH|DELETE /api/v1/maestros/vendedores/{id}`
- `GET|POST /api/v1/maestros/conductores`
- `GET|PATCH|DELETE /api/v1/maestros/conductores/{id}`
- `GET|POST /api/v1/maestros/rutas`
- `GET|PUT|DELETE /api/v1/maestros/rutas/{id}`
- `GET|POST /api/v1/maestros/equipos`
- `GET|PUT|DELETE /api/v1/maestros/equipos/{id}`

Si la ruta `/maestros/*` responde 404/405, los repositorios mantienen fallback temporal a:

- `/api/v1/proveedores`
- `/api/v1/vendedores`
- `/api/v1/conductores`
- `/api/v1/rutas`
- `/api/v1/equipos`

### Headers esperados

- `POST /api/v1/auth/login` no debe enviar `X-Company-ID`.
- Requests privados despues de seleccionar empresa deben enviar:
  - `Authorization: Bearer <token>`
  - `X-Company-ID: <activeBackendCompanyId || backendId || activeCompanyId>`

`CompanyContextService` y `companyContextInterceptor` priorizan `company.backendId`, luego `session.activeBackendCompanyId`, y finalmente `activeCompanyId`.

### Mappers defensivos validados

Auth soporta:

- `active_company_id`
- `activeCompanyId`
- `empresaActiva` como id o como objeto
- `empresas`
- `companies`
- `permisos`
- `permissions`
- `roles`
- `perfiles`
- `rol/perfil` por empresa activa

Maestros soporta DTOs del backend corregido:

- Proveedores: `nombre_razon_social`, `contacto_nombre`, `categoria`.
- Vendedores: `id_ven`, `nombre_ven`, `clientes`.
- Conductores: `id_con`, `nombre_con`, `rutas`.
- Rutas: `id_rut`, `nombre_rut`, `origen`, `destino`, `distancia_km`.
- Equipos: `id_maq`, `nombre_maq`, `marca`, `modelo`, `serie`, `especificaciones_tecnicas`, `contacto_fabricante`.

### Dominios que siguen en mock

No conectar en este smoke:

- SCM y planeacion.
- Produccion.
- Inventory Core.
- Costos Core.
- BI.
- Grafana.
- Seguridad/administracion avanzada.
- Auditoria.
- Productos y clientes, salvo pruebas manuales separadas.

### Pasos manuales de prueba

1. Levantar backend en `feat/backend-fullstack-readiness-hu-developing` y aplicar migraciones/backfill requerido.
2. Confirmar `environment.apiUrl = 'http://127.0.0.1:8000/api/v1'`.
3. Cambiar flags Auth a modo real estricto o tolerante.
4. Ejecutar login con credenciales reales.
5. Verificar en Network que `/auth/login` no lleve `X-Company-ID`.
6. Verificar `GET /empresas/mis-empresas` y selector de empresa.
7. Seleccionar empresa y confirmar `POST /auth/seleccionar-empresa`.
8. Entrar a proveedores, vendedores, conductores, rutas y equipos.
9. Verificar en Network que cada request privado lleve `Authorization` y `X-Company-ID`.
10. Probar listados primero; luego crear/editar un registro por dominio si la DB tiene catalogos relacionados suficientes.
11. Confirmar que 401/403/422 se muestran como error y no caen silenciosamente a mock.

### Como volver a mock-first

Restaurar en `environment.ts`:

- `useAuthMock: true`
- `useUserCompaniesMock: true`
- `allowMockLoginFallback: true`
- `enableAuthFallback: true`
- `enableUserCompaniesFallback: true`
- `useSuppliersAdministrationMock: true`
- `useVendorsAdministrationMock: true`
- `useDriversAdministrationMock: true`
- `useRoutesAdministrationMock: true`
- `useEquipmentsAdministrationMock: true`

No hace falta borrar mocks ni limpiar storage para volver a la demo local, aunque puede cerrarse sesion para forzar un snapshot limpio.
