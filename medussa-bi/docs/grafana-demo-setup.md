# Grafana Demo Foundation - Medussa ERP

## Objetivo

Esta foundation local permite mostrar una base tecnica de Grafana para el bloque BI de Medussa ERP sin depender del backend, ETL ni Data Warehouse reales.

No es una HU nueva y no cambia el alcance funcional de HU-033 a HU-044. Las pantallas Angular siguen mock-first y conservan sus placeholders actuales de Grafana.

## Estructura

```text
medussa-bi/
  grafana/
    docker-compose.yml
    dashboards/
    provisioning/
      dashboards/
      datasources/
  docs/
    grafana-demo-setup.md
```

Los dashboards JSON estan en:

```text
medussa-bi/grafana/dashboards/
```

## Levantar Grafana Local

Desde la raiz del repositorio:

```bash
cd medussa-bi/grafana
docker compose up -d
```

URL local:

```text
http://localhost:3000
```

Credenciales demo/local:

```text
usuario: admin
password: admin
```

Estas credenciales son solo para demo local. No deben reutilizarse en ambientes productivos.

Para detener el servicio:

```bash
docker compose down
```

## Datasource Demo

El provisioning crea un datasource local de Grafana TestData:

```text
uid: medussa-demo-testdata
type: testdata
```

No se conecta a PostgreSQL real, backend ERP ni Data Warehouse.

## Dashboards Disponibles

Los dashboardUid disponibles son los mismos usados por Angular:

- `medussa-executive`
- `medussa-profitability`
- `medussa-alerts`
- `medussa-commercial`
- `medussa-clients`
- `medussa-forecast`
- `medussa-production-rt`
- `medussa-oee-plant`
- `medussa-quality-nc`
- `medussa-inventory-strategic`
- `medussa-purchases-strategic`
- `medussa-logistics-kpi`

Cada dashboard incluye paneles demo basicos con datos generados por Grafana TestData. Sirven como base visual y de provisioning para reemplazar luego con consultas reales del DW/datamarts.

## Que Esta En Modo Demo

- Dashboards JSON provisionados localmente.
- Datasource TestData.
- Paneles stat, time series y texto con datos generados.
- UID alineados con los placeholders BI de Angular.

## Que No Esta Conectado Todavia

- Backend BI real.
- ETL o procesos de carga.
- Data Warehouse o datamarts reales.
- PostgreSQL real.
- Embedding real en Angular.
- Tokens, signed URLs o seguridad productiva de Grafana.
- Permisos por empresa dentro de Grafana.

## Faltante Para Produccion

- Definir ETL/staging desde el ERP transaccional.
- Crear Data Warehouse o datamarts BI.
- Configurar datasource real de Grafana contra DW/datamarts.
- Exponer backend BI para metadata, filtros y autorizacion.
- Implementar seguridad de embedding.
- Validar permisos por empresa y usuario.
- Emitir signed URLs o tokens de corta vida si aplica.

Regla importante: en produccion Grafana debe consultar DW/datamarts autorizados, no la base transaccional ERP directamente.
