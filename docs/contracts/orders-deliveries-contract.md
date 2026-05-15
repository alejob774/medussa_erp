# HU-018 / HU-019 Orders And Deliveries Contract

## HU-018 Alcance Frontend

La toma de pedidos queda implementada como feature mock-first/API-ready en `src/app/features/orders`.

Ruta frontend:

- `/ventas/pedidos`

Modulo de navegacion:

- Comercial > Toma de Pedidos

El flujo soportado en frontend incluye:

- Sincronizacion mock de disponibilidad de inventario.
- Seleccion de cliente y visualizacion de estado comercial.
- Rechazo automatico si el cliente esta restringido.
- Seleccion de productos con stock visible.
- Alertas por bajo stock o sin stock.
- Marcacion de entrega posterior cuando la cantidad supera disponibilidad.
- Totalizacion automatica con IVA mock 19%.
- Guardado local como `CREADA`.
- Envio individual de pedido.
- Envio consolidado de pedidos pendientes.
- Persistencia en `localStorage`.
- Trazabilidad local de estados.

## HU-019 Alcance Frontend

La entrega de pedidos queda implementada como feature mock-first/API-ready en `src/app/features/deliveries`.

Ruta frontend:

- `/logistica/entrega-pedidos`

Modulo de navegacion:

- Logistica > Entrega de Pedidos

El flujo soportado en frontend incluye:

- Consulta de ordenes en ruta.
- Filtros por ruta, conductor, estado y fecha.
- Detalle de productos pendientes.
- Registro de cantidades entregadas.
- Entrega total.
- Entrega parcial.
- Firma digital simple en base64 textual.
- Evidencia fotografica mock/base64 opcional.
- GPS mock opcional.
- Comentarios de entrega.
- Trazabilidad de orden.
- Cambio de estado local a `ENTREGADA` o `PARCIALMENTE_SURTIDA`.

## Flags De Entorno

El comportamiento por defecto sigue siendo mock-first:

```ts
useOrdersMock: true
enableOrdersFallback: true
useDeliveriesMock: true
enableDeliveriesFallback: true
```

Para smoke API futuro:

```ts
useOrdersMock: false
useDeliveriesMock: false
```

Los fallback flags pueden dejarse activos durante integracion temprana. Los errores de permisos o validacion no deben ocultarse en backend real; los repositorios usan el mapper/fallback comun del frontend.

## Endpoints Backend Esperados

HU-018:

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/v1/pedidos` | Listar pedidos |
| POST | `/api/v1/pedidos` | Crear pedido |
| POST | `/api/v1/pedidos/consolidado` | Envio batch/consolidado |
| GET | `/api/v1/inventarios/disponibilidad` | Consultar stock disponible |
| POST | `/api/v1/inventarios/reservas` | Reservar inventario para pedido |
| GET | `/api/v1/clientes/estado` | Validar estado comercial del cliente |

HU-019:

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/v1/logistica/ordenes/en-ruta` | Listar ordenes en ruta |
| GET | `/api/v1/logistica/ordenes/{id}` | Consultar detalle |
| POST | `/api/v1/logistica/ordenes/entregar` | Registrar entrega total o parcial |
| GET | `/api/v1/logistica/ordenes/{id}/trazabilidad` | Consultar trazabilidad |

## Estados

Estados de pedido HU-018:

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

Estados de entrega HU-019:

- `EN_RUTA`
- `ENTREGADA`
- `PARCIALMENTE_SURTIDA`
- `NO_ENTREGADA`

## Payloads Sugeridos

Crear pedido:

```json
{
  "empresa_id": "medussa-holding",
  "cliente_id": "cli-ret-004",
  "vendedor_id": "seller-arb-001",
  "fecha_pedido": "2026-05-15",
  "fecha_entrega_solicitada": "2026-05-16",
  "tipo_pedido": "NORMAL",
  "canal_venta": "CAMPO",
  "prioridad": "NORMAL",
  "condicion_pago": "CREDITO_15_DIAS",
  "reservar_inventario": true,
  "localUuid": "uuid-local-idempotente",
  "detalles": [
    {
      "producto_id": "prod-arb-001",
      "sku": "ARB-YOG-200-FR",
      "cantidad": 24,
      "precio_unitario": 2350,
      "prometido_posterior": false
    }
  ]
}
```

Confirmar entrega:

```json
{
  "empresa_id": "medussa-holding",
  "orderId": "order-arb-005",
  "pedido_id": "order-arb-005",
  "entregado_por_usuario_id": "mock-logistica",
  "comentarios": "Entrega recibida sin novedad",
  "firma_base64": "data:text/plain;base64,...",
  "foto_base64": "data:text/plain;base64,...",
  "gps_latitude": 6.2442,
  "gps_longitude": -75.5812,
  "movimiento_inventario_tipo": "DESPACHO_CLIENTE",
  "detalles": [
    {
      "producto_id": "prod-arb-003",
      "cantidad_entregada": 20
    }
  ]
}
```

## Reglas De Validacion

HU-018:

- Cliente obligatorio.
- Fecha de entrega solicitada debe ser mayor o igual a fecha de pedido.
- Debe existir al menos un producto.
- Cantidad debe ser mayor que cero.
- Cliente restringido genera pedido `RECHAZADA` y no permite envio.
- Producto sin stock o con stock insuficiente muestra alerta y marca entrega posterior.
- `localUuid` se usa para evitar duplicar envio local.

HU-019:

- Firma obligatoria para cerrar entrega.
- Cantidad entregada no puede superar cantidad pendiente.
- Orden cerrada no puede entregarse otra vez.
- La orden debe estar en `EN_RUTA` o `LISTA_PARA_DESPACHO`.
- Si todas las cantidades entregadas igualan pendientes, queda `ENTREGADA`.
- Si alguna cantidad queda menor al pendiente, queda `PARCIALMENTE_SURTIDA`.

## Integracion Inventario

HU-018 no descuenta stock directo. En mock, la reserva queda simulada en la trazabilidad del pedido al enviarlo. El backend real debe ejecutar reserva mediante API Central de Inventarios.

HU-019 no descuenta stock directo desde frontend. El repositorio API envia `movimiento_inventario_tipo: "DESPACHO_CLIENTE"` como contrato sugerido. El backend debe consumir la API Central de Inventarios para registrar el despacho real.

## Offline Y Mock-First

Los pedidos y entregas mock se persisten en:

- `medussa.erp.mock.orders.hu018`
- `medussa.erp.mock.deliveries.hu019`

Los datos iniciales estan orientados a Industrias Alimenticias El Arbolito e incluyen:

- Clientes activos y restringidos.
- Yogures, leche UHT y queso.
- Stock suficiente, bajo y sin stock.
- Pedidos creados, enviados, en alistamiento, listos para despacho, en ruta y parcialmente surtidos.
- Entregas en ruta, parcial y con evidencia mock.

## Pendiente Para Backend

- Contrato final de DTOs de pedido y entrega.
- Idempotencia real por `localUuid`.
- Reserva real de inventario por pedido.
- Movimiento real `DESPACHO_CLIENTE` al confirmar entrega.
- Trazabilidad persistida en backend.
- Reglas reales de cupo/cartera para cliente restringido.
- Sincronizacion offline real y reintentos.
