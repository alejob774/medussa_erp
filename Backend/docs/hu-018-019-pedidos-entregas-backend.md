# HU-018/HU-019 Pedidos y Entregas Backend

## Alcance implementado

Rama backend dedicada: `feat/backend-hu-018-019-pedidos-entregas`.

Se implemento soporte API-ready minimo para:

- HU-018 Toma Orden de Pedido.
- HU-019 Entrega Orden de Pedido.

No se modifico frontend, no se reescribio Inventory Core, no se toco Costos Core, no se conecto BI/Grafana y no se aplico migracion automaticamente.

## Endpoints

Todos los endpoints requieren:

- `Authorization: Bearer <token>`
- `X-Company-ID: <empresa_id>`

### HU-018 Pedidos

- `GET /api/v1/pedidos`
- `POST /api/v1/pedidos`
- `POST /api/v1/pedidos/consolidado`
- `POST /api/v1/pedidos/sync` compatibilidad movil previa

Tambien queda disponible el prefijo historico:

- `/api/v1/comercial/pedidos/*`

### HU-018 Inventarios bridge

- `GET /api/v1/inventarios/disponibilidad`
- `POST /api/v1/inventarios/reservas`

Estos endpoints delegan en saldos/Kardex existentes. No modifican saldos directamente.

### HU-018 Cliente estado

- `GET /api/v1/clientes/estado?cliente_id=<id>`
- `GET /api/v1/clientes/estado?id_cli=<nit_o_codigo>`

### HU-019 Logistica entregas

- `GET /api/v1/logistica/ordenes/en-ruta`
- `GET /api/v1/logistica/ordenes/{id}`
- `POST /api/v1/logistica/ordenes/entregar`
- `GET /api/v1/logistica/ordenes/{id}/trazabilidad`

## Payloads principales

### Crear pedido

```json
{
  "localUuid": "uuid-local-offline-001",
  "clienteId": 1,
  "vendedorId": 2,
  "rutaId": 3,
  "canalVenta": "APP",
  "fechaEntregaSolicitada": "2026-05-16T10:00:00Z",
  "detalles": [
    {
      "productoId": 10,
      "bodegaId": 1,
      "cantidad": 5,
      "precioUnitario": 12000
    }
  ]
}
```

Acepta variantes `snake_case` y `camelCase` para campos clave como `localUuid/local_uuid`, `clienteId/cliente_id`, `fechaEntrega/fecha_entrega` y `productosEntregados/productos_entregados`.

### Respuesta pedido

Incluye `id`, `local_uuid`, `numero_pedido`, `estado`, totales, bandera `reserva_inventario`, detalle de cantidades reservadas/entregadas y `rechazo_motivo` cuando aplica.

### Entregar orden

```json
{
  "pedidoId": "uuid-pedido",
  "firmaCliente": "data:image/png;base64,...",
  "fotoEntrega": "data:image/jpeg;base64,...",
  "gpsLatitud": 4.711,
  "gpsLongitud": -74.072,
  "comentarios": "Recibido por porteria",
  "productosEntregados": [
    {
      "pedidoDetalleId": "uuid-detalle",
      "productoId": 10,
      "cantidadEntregada": 5,
      "unidad": "UND"
    }
  ]
}
```

## Modelos y tablas

Migracion creada: `Backend/alembic/versions/7b1d9e8a4c32_hu_018_019_pedidos_entregas.py`.

Tablas nuevas en schema `comercial`:

- `pedidos`
- `pedido_detalle`
- `pedidos_consolidado`
- `pedidos_consolidado_detalle`
- `entregas_pedido`
- `entregas_pedido_detalle`
- `trazabilidad_pedidos`

El backend ya tenia un modelo inicial `Pedido`; se extendio y se reutilizo el dominio en vez de crear otro paralelo.

## Estados

Estados soportados por contrato:

- `CREADA`
- `RECHAZADA`
- `ENVIADA`
- `RECIBIDA`
- `EN_ALISTAMIENTO`
- `PARCIALMENTE_SURTIDA`
- `EN_PRODUCCION_COMPRA`
- `LISTA_PARA_DESPACHO`
- `EN_RUTA`
- `ENTREGADA`

`POST /api/v1/pedidos` crea pedidos aceptados como `RECIBIDA`. Si el cliente esta restringido se crea como `RECHAZADA`. La entrega solo opera sobre `EN_RUTA` o `LISTA_PARA_DESPACHO`.

## Reglas de negocio y validaciones

- Idempotencia por `empresa_id + local_uuid`.
- El `empresa_id` del payload, si viene, debe coincidir con `X-Company-ID`.
- Cliente y producto se buscan filtrando por empresa activa.
- Cliente inactivo o bloqueado se trata como restringido.
- Pedido restringido queda `RECHAZADA` y no reserva inventario.
- Cantidades de pedido y entrega deben ser mayores a cero.
- Cantidad entregada no puede superar pendiente.
- Firma de cliente obligatoria para registrar entrega.
- Cada cambio relevante crea trazabilidad.

## Multiempresa y JWT

La proteccion usa las dependencias existentes:

- `get_current_user`
- `get_current_company`
- middleware `MultiCompanyMiddleware`

Los endpoints filtran por `empresa_id` y validan pertenencia al tenant activo. No se mezclan pedidos entre empresas.

## Idempotencia localUuid

`POST /api/v1/pedidos` consulta primero `comercial.pedidos` por:

- `empresa_id = X-Company-ID`
- `local_uuid = payload.localUuid/local_uuid/uuid_movil`

Si existe, devuelve el pedido ya creado y no vuelve a crear detalles ni a reservar inventario. La migracion agrega `uq_pedidos_empresa_local_uuid`.

## Integracion Inventory Core

### Reserva HU-018

La reserva consulta `inventario_saldos` y registra movimiento `RESERVA` mediante `inventario_service.registrar_movimiento`, que escribe Kardex y recalcula saldo. Si no hay stock o no hay bodega disponible, la linea queda con `entrega_posterior = true` y no se toca saldo directo.

### Despacho HU-019

La entrega registra:

- `LIBERACION` negativa de reserva cuando habia cantidad reservada.
- `DESPACHO_CLIENTE` negativo por Kardex mediante `inventario_service.registrar_movimiento`.

Se agrego `DESPACHO_CLIENTE` al recuento fisico del recalculo de saldo. No hay actualizacion directa de inventario fuera de Inventory Core.

## Pendiente

- Aplicar migracion en ambiente controlado.
- Validar contra DB real con datos de productos, saldos, clientes y membresias.
- Endurecer correlativo de pedidos para alta concurrencia.
- Ampliar permisos granulares por rol si el modelo de seguridad lo requiere.
- Completar Inventory Core formal con reservas/despachos idempotentes propios.
- Backfill o estrategia para datos legacy si existieran tablas `comercial.pedidos` creadas manualmente.

## Como probar

```powershell
cd Backend
py -m compileall app
```

Prueba funcional sugerida:

1. Login y obtener JWT.
2. Enviar `X-Company-ID` valido.
3. Consultar `GET /api/v1/clientes/estado?cliente_id=1`.
4. Consultar `GET /api/v1/inventarios/disponibilidad?producto_id=10`.
5. Crear pedido con `POST /api/v1/pedidos`.
6. Repetir el mismo `localUuid` y verificar que no duplica.
7. Pasar el pedido a `LISTA_PARA_DESPACHO` o `EN_RUTA` desde DB/flujo operativo.
8. Registrar entrega con `POST /api/v1/logistica/ordenes/entregar`.
9. Revisar trazabilidad con `GET /api/v1/logistica/ordenes/{id}/trazabilidad`.

## Relacion con frontend

El frontend HU-018/HU-019 mock-first/API-ready puede apuntar a los endpoints contractuales preparados:

- `/api/v1/pedidos`
- `/api/v1/inventarios/disponibilidad`
- `/api/v1/inventarios/reservas`
- `/api/v1/clientes/estado`
- `/api/v1/logistica/ordenes/*`

El backend mantiene tambien el endpoint historico `/api/v1/comercial/pedidos/sync` para no romper integraciones previas.
