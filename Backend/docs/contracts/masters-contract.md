# Masters Contract

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Productos / Inventario maestro

Endpoint backend real:

- `GET /api/v1/inventario/`
- `GET /api/v1/inventario/{producto_id}`
- `POST /api/v1/inventario/`
- `PATCH /api/v1/inventario/{producto_id}`
- `DELETE /api/v1/inventario/{producto_id}`

Estado real:

- List filtra por `empresa_id` desde contexto.
- Create intenta inyectar `empresa_id`.
- Detail/update/delete estan rotos porque `inventario_service.py` no define `obtener_producto_por_id` ni `actualizar_producto`.
- `ProductoCreate` incluye `maneja_lote`, `maneja_venc`, `vida_util`; el modelo `Producto` no tiene esas columnas.

Multiempresa: parcial. Existe `empresa_id`, pero depende de `X-Company-ID` y no hay validacion completa de membresia dentro del servicio.

Impacto frontend: el modulo productos usa `/inventario`, pero con fallback. No se puede cerrar CRUD real hasta alinear schema/modelo/servicio.

## Clientes

Endpoints:

- `POST /api/v1/clientes/`
- `GET /api/v1/clientes/`
- `PATCH /api/v1/clientes/{id}`
- `DELETE /api/v1/clientes/{id}`

Estado real:

- CRUD basico con create/list/update/soft delete.
- Servicio filtra por `empresa_id` desde `get_company_context`.
- No hay detail endpoint aunque el servicio tiene `obtener_cliente_por_id`.

Multiempresa: si, para operaciones del servicio. Bloqueado si frontend no envia `X-Company-ID`.

Gaps:

- Sin filtros/paginacion expuestos en router.
- Sin `GET /{id}`.
- Sin validacion avanzada de duplicados por empresa.

Impacto frontend: integrable parcialmente.

## Vendedores

Endpoints:

- `POST /api/v1/vendedores/`
- `GET /api/v1/vendedores/`
- `GET /api/v1/vendedores/{id}`
- `PATCH /api/v1/vendedores/{id}`
- `DELETE /api/v1/vendedores/{id}`

Estado real:

- CRUD basico con detail y soft delete.
- Filtra por empresa.
- Maneja relacion con clientes por IDs.

Multiempresa: si, pero al asociar clientes no valida que los clientes pertenezcan a la misma empresa.

Impacto frontend: integrable parcialmente si se agrega `X-Company-ID`.

## Conductores

Endpoints:

- `POST /api/v1/conductores/`
- `PATCH /api/v1/conductores/{id}`
- `GET /api/v1/conductores/`
- `GET /api/v1/conductores/{id}`
- `DELETE /api/v1/conductores/{id}`

Estado real:

- Create/update existen.
- List/detail devuelven datos globales.
- Delete hace borrado fisico.

Multiempresa: no. El modelo `Conductor` no tiene `empresa_id`.

Gaps:

- No soft delete.
- No tenant.
- No filtros/paginacion.
- Relacion rutas no valida empresa.

Impacto frontend: no cerrable como maestro multiempresa.

## Rutas

Endpoints:

- `POST /api/v1/rutas/`
- `GET /api/v1/rutas/`
- `PUT /api/v1/rutas/{ruta_id}`
- `DELETE /api/v1/rutas/{ruta_id}`

Estado real:

- Create/list/update/soft delete.
- No detail.

Multiempresa: no. El modelo `Ruta` no tiene `empresa_id`.

Impacto frontend: no cerrable como maestro multiempresa.

## Proveedores

Endpoints:

- `POST /api/v1/proveedores/`
- `GET /api/v1/proveedores/`
- `PUT /api/v1/proveedores/{proveedor_id}`

Estado real:

- CRUD parcial.
- No detail.
- No delete.

Multiempresa: no en el router real. El servicio usa `app.models.compras.Proveedor`, que no tiene `empresa_id`. Existe otro modelo `app.models.proveedores.Proveedor` con `empresa_id`, pero no es el que usa la API.

Impacto frontend: no cerrable para compras/SCM multiempresa.

## Equipos

Endpoints:

- `POST /api/v1/equipos/`
- `GET /api/v1/equipos/`
- `GET /api/v1/equipos/{equipo_id}`
- `PUT /api/v1/equipos/{equipo_id}`
- `DELETE /api/v1/equipos/{equipo_id}`

Estado real:

- Router expone CRUD.
- Modelo `Equipo` no tiene `empresa_id`.
- Router intenta auditar `nuevo_equipo.empresa_id`, atributo inexistente.
- DELETE llama `crud.delete_equipo`, funcion inexistente en `equipo_service.py`.

Multiempresa: no.

Impacto frontend: no cerrable; create/delete tienen riesgo de error runtime.

## Veredicto maestros

Clientes y vendedores son los unicos maestros razonablemente cercanos. Productos requiere arreglo de servicio/schema. Conductores, rutas, proveedores y equipos no cumplen multiempresa; equipos ademas tiene errores directos. Para fullstack real, backend debe normalizar `empresa_id` en todos los maestros, exponer detail donde aplica, evitar borrados fisicos y alinear filtros/paginacion con el frontend.
