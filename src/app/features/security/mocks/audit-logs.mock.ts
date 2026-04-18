import { AuditLogDetail } from '../models/audit-log.model';

const CHROME_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36';
const EDGE_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0';
const FIREFOX_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0';

function buildLog(log: AuditLogDetail): AuditLogDetail {
  return log;
}

export const AUDIT_LOG_MOCK_DETAILS: AuditLogDetail[] = [
  buildLog({
    id: 'AUD-20260403-0001',
    user: 'admin.medussa',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'usuarios',
    action: 'edit',
    description: 'Actualización del rol asignado al usuario carolina.soto.',
    ipAddress: '10.20.4.19',
    eventDateTime: '2026-04-03T09:12:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      usuario_id: 'USR-2104',
      rol_id: 'ROL-OPERADOR',
      perfil_id: 'PERF-CONSULTA',
    },
    afterPayload: {
      usuario_id: 'USR-2104',
      rol_id: 'ROL-SUPERVISOR',
      perfil_id: 'PERF-CONSULTA',
    },
  }),
  buildLog({
    id: 'AUD-20260403-0002',
    user: 'admin.medussa',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'perfiles',
    action: 'create',
    description: 'Creación del perfil de acceso Auditor Senior.',
    ipAddress: '10.20.4.19',
    eventDateTime: '2026-04-03T08:44:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: null,
    afterPayload: {
      perfil_id: 'PERF-AUD-SR',
      permisos: ['auditoria_view', 'auditoria_export', 'usuarios_view'],
    },
  }),
  buildLog({
    id: 'AUD-20260402-0003',
    user: 'soporte.ti',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'auditoria',
    action: 'export',
    description: 'Exportación CSV de logs con filtros por usuario e IP.',
    ipAddress: '10.20.8.33',
    eventDateTime: '2026-04-02T17:05:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      filtros: {
        usuario: 'admin.medussa',
        accion: 'edit',
      },
    },
    afterPayload: {
      formato: 'csv',
      registros: 84,
    },
  }),
  buildLog({
    id: 'AUD-20260402-0004',
    user: 'juliana.arias',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'roles',
    action: 'approve',
    description: 'Aprobación del rol Analista Financiero Corporativo.',
    ipAddress: '10.20.11.57',
    eventDateTime: '2026-04-02T15:21:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      estado: 'pending',
      rol_id: 'ROL-FIN-ANA',
    },
    afterPayload: {
      estado: 'active',
      rol_id: 'ROL-FIN-ANA',
    },
  }),
  buildLog({
    id: 'AUD-20260401-0005',
    user: 'carolina.soto',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'configuracion',
    action: 'edit',
    description: 'Cambio en la política de expiración de contraseñas.',
    ipAddress: '10.44.5.21',
    eventDateTime: '2026-04-01T16:12:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      password_expiration_days: 60,
    },
    afterPayload: {
      password_expiration_days: 45,
    },
  }),
  buildLog({
    id: 'AUD-20260401-0006',
    user: 'carolina.soto',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'usuarios',
    action: 'view',
    description: 'Consulta del listado de usuarios con filtros por estado.',
    ipAddress: '10.44.5.21',
    eventDateTime: '2026-04-01T14:31:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      filtros: {
        estado: 'active',
      },
    },
    afterPayload: {
      total: 34,
    },
  }),
  buildLog({
    id: 'AUD-20260331-0007',
    user: 'mesa.ayuda',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'roles',
    action: 'delete',
    description: 'Desactivación del rol temporal Mesa de Ayuda Nivel 1.',
    ipAddress: '10.44.2.87',
    eventDateTime: '2026-03-31T18:03:00-05:00',
    browserAgent: FIREFOX_AGENT,
    beforePayload: {
      rol_id: 'ROL-MESA-1',
      estado: 'active',
    },
    afterPayload: {
      rol_id: 'ROL-MESA-1',
      estado: 'inactive',
    },
  }),
  buildLog({
    id: 'AUD-20260331-0008',
    user: 'admin.medussa',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'auditoria',
    action: 'export',
    description: 'Exportación Excel de eventos de configuración.',
    ipAddress: '10.44.9.13',
    eventDateTime: '2026-03-31T10:40:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      filtros: {
        modulo: 'configuracion',
        fecha_desde: '2026-03-01',
      },
    },
    afterPayload: {
      formato: 'excel',
      registros: 16,
    },
  }),
  buildLog({
    id: 'AUD-20260330-0009',
    user: 'admin.medussa',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'usuarios',
    action: 'create',
    description: 'Alta de usuario para coordinador de tienda Bogotá Norte.',
    ipAddress: '10.61.18.42',
    eventDateTime: '2026-03-30T13:18:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: null,
    afterPayload: {
      usuario_id: 'USR-RTL-087',
      email: 'coord.bogota@medussa.com',
    },
  }),
  buildLog({
    id: 'AUD-20260330-0010',
    user: 'ventas',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'auditoria',
    action: 'view',
    description: 'Consulta de bitácora operativa para tienda Medellín Centro.',
    ipAddress: '10.61.9.74',
    eventDateTime: '2026-03-30T09:52:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      filtros: {
        empresa: 'medussa-holding',
      },
    },
    afterPayload: {
      total: 12,
    },
  }),
  buildLog({
    id: 'AUD-20260329-0011',
    user: 'produccion',
    companyId: 'medussa-industrial',
    companyName: 'Medussa Industrial',
    module: 'configuracion',
    action: 'view',
    description: 'Consulta de parámetros del flujo de aprobación de órdenes.',
    ipAddress: '10.82.14.9',
    eventDateTime: '2026-03-29T11:06:00-05:00',
    browserAgent: FIREFOX_AGENT,
    beforePayload: {
      filtros: {
        categoria: 'ordenes-produccion',
      },
    },
    afterPayload: {
      total: 5,
    },
  }),
  buildLog({
    id: 'AUD-20260329-0012',
    user: 'produccion',
    companyId: 'medussa-industrial',
    companyName: 'Medussa Industrial',
    module: 'roles',
    action: 'edit',
    description: 'Ajuste de privilegios del rol Supervisor de Planta.',
    ipAddress: '10.82.14.9',
    eventDateTime: '2026-03-29T10:48:00-05:00',
    browserAgent: FIREFOX_AGENT,
    beforePayload: {
      rol_id: 'ROL-PLANTA-SUP',
      permisos: ['production.view', 'warehouse.view'],
    },
    afterPayload: {
      rol_id: 'ROL-PLANTA-SUP',
      permisos: ['production.view', 'warehouse.view', 'inventory.view'],
    },
  }),
  buildLog({
    id: 'AUD-20260328-0013',
    user: 'admin.medussa',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'auditoria',
    action: 'view',
    description: 'Consulta de eventos del módulo de perfiles para revisión interna.',
    ipAddress: '10.20.4.19',
    eventDateTime: '2026-03-28T16:45:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      filtros: {
        modulo: 'perfiles',
      },
    },
    afterPayload: {
      total: 22,
    },
  }),
  buildLog({
    id: 'AUD-20260328-0014',
    user: 'juliana.arias',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'usuarios',
    action: 'delete',
    description: 'Desactivación del acceso del usuario externo auditor.temp.',
    ipAddress: '10.20.11.57',
    eventDateTime: '2026-03-28T12:14:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      usuario_id: 'USR-EXT-019',
      estado: 'active',
    },
    afterPayload: {
      usuario_id: 'USR-EXT-019',
      estado: 'inactive',
    },
  }),
  buildLog({
    id: 'AUD-20260327-0015',
    user: 'mesa.ayuda',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'perfiles',
    action: 'edit',
    description: 'Actualización de permisos del perfil Analista de Soporte.',
    ipAddress: '10.44.2.87',
    eventDateTime: '2026-03-27T15:09:00-05:00',
    browserAgent: FIREFOX_AGENT,
    beforePayload: {
      perfil_id: 'PERF-SOP-ANA',
      permisos: ['support.view', 'usuarios_view'],
    },
    afterPayload: {
      perfil_id: 'PERF-SOP-ANA',
      permisos: ['support.view', 'usuarios_view', 'auditoria_view'],
    },
  }),
  buildLog({
    id: 'AUD-20260327-0016',
    user: 'admin.medussa',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'auditoria',
    action: 'approve',
    description: 'Validación de consistencia de bitácora antes de cierre mensual.',
    ipAddress: '10.44.9.13',
    eventDateTime: '2026-03-27T08:37:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      lote: 'LOT-2026-03',
      estado: 'pending',
    },
    afterPayload: {
      lote: 'LOT-2026-03',
      estado: 'approved',
    },
  }),
  buildLog({
    id: 'AUD-20260326-0017',
    user: 'carolina.soto',
    companyId: 'medussa-services',
    companyName: 'Medussa Services',
    module: 'usuarios',
    action: 'edit',
    description: 'Actualización del teléfono de contacto del usuario soporte.n2.',
    ipAddress: '10.44.5.21',
    eventDateTime: '2026-03-26T17:22:00-05:00',
    browserAgent: EDGE_AGENT,
    beforePayload: {
      usuario_id: 'USR-SRV-102',
      celular: '3001112233',
    },
    afterPayload: {
      usuario_id: 'USR-SRV-102',
      celular: '3001112244',
    },
  }),
  buildLog({
    id: 'AUD-20260325-0018',
    user: 'admin.medussa',
    companyId: 'medussa-holding',
    companyName: 'Medussa Holding',
    module: 'configuracion',
    action: 'approve',
    description: 'Aprobación del ajuste de parámetros de sesión corporativa.',
    ipAddress: '10.20.4.19',
    eventDateTime: '2026-03-25T09:41:00-05:00',
    browserAgent: CHROME_AGENT,
    beforePayload: {
      sesion_maxima_minutos: 30,
    },
    afterPayload: {
      sesion_maxima_minutos: 20,
    },
  }),
];

