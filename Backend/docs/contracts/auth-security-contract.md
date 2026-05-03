# Auth, Sesion, Multiempresa y Seguridad

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Login

Endpoint real:

- `POST /api/v1/auth/login`

Implementacion observada:

- Usa `OAuth2PasswordRequestForm`.
- Busca usuario por `email` o `username` en `seguridad.usuarios`.
- Valida `password_hash` con `verify_password`.
- Registra auditoria de login exitoso/fallido.
- Devuelve `access_token` y `token_type`.

El token es JWT bearer, no token opaco. El payload observado solo incluye `sub` con `usuario.username`; no incluye empresa activa, permisos, rol, perfil, membresias, `jti`, refresh token ni tenant.

Impacto frontend: login puede funcionar si credenciales y CORS estan correctos. El fallback local del frontend seguira ocultando fallas mientras `allowMockLoginFallback` este activo.

## `GET /api/v1/auth/me`

Endpoint real:

- `GET /api/v1/auth/me`

Implementacion observada:

- Usa `get_current_user` para validar JWT.
- Consulta `UsuarioEmpresaRol`, `Configuracion`, `Rol` y `Perfil`.
- Devuelve `active_company_id` y lista de empresas.

Bloqueos:

- `auth.py` llama `get_company_context()` pero no lo importa. Puede fallar con `NameError`.
- Consulta `Perfil.permisos`, pero el modelo `Perfil` no define columna `permisos`.
- Lee membresias desde `UsuarioEmpresaRol` (`seguridad.usuarios_empresas_roles`), mientras el CRUD de usuarios escribe `UsuarioEmpresaConfig` (`seguridad.usuario_empresa_config`).
- La empresa activa no sale del JWT; se intenta resolver por contexto o primera membresia.

Impacto frontend: la carga de sesion multiempresa no es confiable. Si `/auth/me` falla, el frontend puede caer a mock/local state, pero la integracion backend queda bloqueada.

## Logout

Endpoint real:

- `POST /api/v1/auth/logout`

Estado:

- Valida JWT.
- Registra auditoria.
- Devuelve `{"message": "Logout exitoso"}`.
- No invalida server-side el token; no hay blacklist/redis/revocacion por `jti`.

## `X-Company-ID` y middleware tenant

`MultiCompanyMiddleware` esta montado globalmente en `main.py`.

Rutas exentas:

- `/`
- `/docs`
- `/redoc`
- `/openapi.json`
- prefijo `/api/v1/auth`

Para el resto exige header `X-Company-ID`; si falta, retorna `401`.

`get_current_company`:

- exige header `X-Company-ID`;
- toma empresa desde `ContextVar`;
- valida acceso contra `current_user.membresias_rel`;
- permite bypass por `is_superuser`, atributo que el modelo `Usuario` no define.

Bloqueo de integracion: el frontend `authTokenInterceptor` solo agrega `Authorization`. No agrega `X-Company-ID`. Por tanto, cualquier modulo real fuera de auth puede ser rechazado por middleware antes de llegar al router.

## Usuarios

Endpoint real montado:

- `/api/v1/usuarios`

Operaciones:

- `GET /`: lista usuarios activos.
- `GET /{id}`: detalle.
- `POST /`: crea usuario y membresias.
- `PUT /{id}`: actualiza usuario y reemplaza/agrega membresias.
- `DELETE /{id}`: soft delete `estado=False`.

Gaps:

- No hay reactivacion.
- No filtra por empresa activa.
- Valida empresa existente y rol existente, pero no valida que el rol pertenezca a la empresa.
- No valida perfil existente ni pertenencia del perfil a la empresa.
- Escribe membresias en una tabla distinta a la usada por `/auth/me`.

## Roles y perfiles

`Backend/app/api/v1/seguridad.py` define endpoints para roles y perfiles, pero `main.py` no monta ese router. Esto bloquea el frontend de seguridad, que apunta a `/api/v1/seguridad/roles` y `/api/v1/seguridad/empresas/.../perfiles`.

Endpoints definidos pero no expuestos:

- `POST /roles/`
- `GET /roles/empresa/{empresa_id}`
- `PUT /roles/{rol_id}`
- `DELETE /roles/{rol_id}`
- `POST /empresas/{empresa_id}/perfiles`
- `GET /empresas/{empresa_id}/perfiles`
- `PUT /empresas/{empresa_id}/perfiles/{perfil_id}`
- `DELETE /empresas/{empresa_id}/perfiles/{perfil_id}`

Gaps:

- `Perfil.estado` es `String`, pero `desactivar_perfil` asigna `False`.
- No existe modelo/tabla real de permisos de perfil compatible con el frontend.
- No hay enforcement de permisos en routers de negocio.
- `roles_guard.py` existe, pero no se observa aplicado de forma sistematica.

## Auditoria

Endpoint real:

- `GET /api/v1/auditoria/`

Capacidades:

- Query param obligatorio `empresa_id`.
- Filtros por usuario, modulo, accion y fechas.
- `skip`, `limit`.
- Header `X-Total-Count`.

Gaps:

- No usa `get_current_company`; recibe empresa por query.
- No valida permisos de auditoria.
- El middleware aun exige `X-Company-ID`, lo que duplica contexto y puede permitir inconsistencias entre header y query.
- Varias llamadas a `registrar_log` usan firmas inconsistentes (`antes/despues`, `payload_antes/payload_despues`, `objeto_id`), riesgo de error runtime.

## Veredicto

Auth basico existe, pero la seguridad empresarial no esta cerrada. Para fullstack real hay que corregir `/auth/me`, unificar membresias, montar router de seguridad, agregar permisos reales, resolver `X-Company-ID` con el frontend y estabilizar auditoria.
