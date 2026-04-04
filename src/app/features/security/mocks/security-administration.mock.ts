import {
  ModulePermissionVm,
  PermissionActionSet,
  ProfileDetailVm,
  RoleRowVm,
  SecurityAdministrationStore,
  UserRowVm,
} from '../models/security-administration.model';

export interface SecurityPermissionModuleCatalogItem {
  key: string;
  name: string;
}

export const SECURITY_PERMISSION_MODULES: readonly SecurityPermissionModuleCatalogItem[] = [
  { key: 'general', name: 'General' },
  { key: 'customer-service', name: 'Atención al cliente' },
  { key: 'production', name: 'Producción' },
  { key: 'supply-chain', name: 'Supply Chain Management' },
  { key: 'inventory', name: 'Inventarios' },
  { key: 'warehouse', name: 'Almacén' },
  { key: 'purchases', name: 'Compras' },
  { key: 'finance', name: 'Finanzas' },
  { key: 'hr', name: 'RRHH' },
  { key: 'bi', name: 'Business Intelligence' },
  { key: 'settings', name: 'Configuración' },
];

export function createEmptyPermissionActionSet(): PermissionActionSet {
  return {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false,
    manage: false,
  };
}

export function buildPermissionMatrix(
  overrides: Partial<Record<string, Partial<PermissionActionSet>>> = {},
): ModulePermissionVm[] {
  return SECURITY_PERMISSION_MODULES.map((module) => ({
    moduleKey: module.key,
    moduleName: module.name,
    actions: {
      ...createEmptyPermissionActionSet(),
      ...(overrides[module.key] ?? {}),
    },
  }));
}

const MOCK_ROLES: RoleRowVm[] = [
  {
    id: 'role-global-admin',
    companyId: null,
    name: 'Administrador Global',
    description: 'Supervisa la operación transversal y gobierno corporativo.',
    status: 'active',
    scope: 'global',
  },
  {
    id: 'role-holding-admin',
    companyId: 'medussa-holding',
    name: 'Administrador Empresa',
    description: 'Administra usuarios, roles y configuración corporativa.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-holding-area-head',
    companyId: 'medussa-holding',
    name: 'Jefe de Área',
    description: 'Coordina operación y aprobaciones de su unidad.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-holding-analyst',
    companyId: 'medussa-holding',
    name: 'Analista de Área',
    description: 'Ejecuta operación diaria y seguimiento analítico.',
    status: 'inactive',
    scope: 'company',
  },
  {
    id: 'role-retail-aux',
    companyId: 'medussa-retail',
    name: 'Auxiliar Operativo',
    description: 'Opera tareas de soporte comercial y servicio.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-industrial-head',
    companyId: 'medussa-industrial',
    name: 'Jefe de Área',
    description: 'Coordina producción, inventarios y compras.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-services-admin',
    companyId: 'medussa-services',
    name: 'Administrador Empresa',
    description: 'Gestiona seguridad, RRHH y parametrización del servicio.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-services-auditor',
    companyId: 'medussa-services',
    name: 'Invitado / Auditor',
    description: 'Consulta trazas, reportes y validaciones puntuales.',
    status: 'active',
    scope: 'company',
  },
];

const MOCK_USERS: UserRowVm[] = [
  {
    assignmentId: 'assignment-holding-001',
    userId: 'user-ana-perez',
    companyId: 'medussa-holding',
    name: 'Ana Perez',
    email: 'ana.perez@medussa.com',
    roleId: 'role-holding-admin',
    roleName: 'Administrador Empresa',
    profileId: 'profile-holding-001',
    profileName: 'Coordinación Corporativa',
    status: 'active',
  },
  {
    assignmentId: 'assignment-holding-002',
    userId: 'user-diego-rios',
    companyId: 'medussa-holding',
    name: 'Diego Rios',
    email: 'diego.rios@medussa.com',
    roleId: 'role-holding-area-head',
    roleName: 'Jefe de Área',
    profileId: 'profile-holding-001',
    profileName: 'Coordinación Corporativa',
    status: 'active',
  },
  {
    assignmentId: 'assignment-holding-003',
    userId: 'user-laura-quintero',
    companyId: 'medussa-holding',
    name: 'Laura Quintero',
    email: 'laura.quintero@medussa.com',
    roleId: 'role-holding-analyst',
    roleName: 'Analista de Área',
    profileId: 'profile-holding-002',
    profileName: 'Analítica Financiera',
    status: 'inactive',
  },
  {
    assignmentId: 'assignment-retail-001',
    userId: 'user-camila-ruiz',
    companyId: 'medussa-retail',
    name: 'Camila Ruiz',
    email: 'camila.ruiz@medussa.com',
    roleId: 'role-retail-aux',
    roleName: 'Auxiliar Operativo',
    profileId: 'profile-retail-001',
    profileName: 'Atención Omnicanal',
    status: 'active',
  },
  {
    assignmentId: 'assignment-industrial-001',
    userId: 'user-jorge-leon',
    companyId: 'medussa-industrial',
    name: 'Jorge Leon',
    email: 'jorge.leon@medussa.com',
    roleId: 'role-industrial-head',
    roleName: 'Jefe de Área',
    profileId: 'profile-industrial-001',
    profileName: 'Operación de Planta',
    status: 'active',
  },
  {
    assignmentId: 'assignment-services-001',
    userId: 'user-mateo-silva',
    companyId: 'medussa-services',
    name: 'Mateo Silva',
    email: 'mateo.silva@medussa.com',
    roleId: 'role-services-admin',
    roleName: 'Administrador Empresa',
    profileId: 'profile-services-001',
    profileName: 'Gestión de RRHH',
    status: 'active',
  },
  {
    assignmentId: 'assignment-services-002',
    userId: 'user-paula-navas',
    companyId: 'medussa-services',
    name: 'Paula Navas',
    email: 'paula.navas@medussa.com',
    roleId: 'role-services-auditor',
    roleName: 'Invitado / Auditor',
    profileId: 'profile-services-002',
    profileName: 'Auditoría de Servicio',
    status: 'inactive',
  },
  {
    assignmentId: 'assignment-services-003',
    userId: 'user-sara-cardenas',
    companyId: 'medussa-services',
    name: 'Sara Cardenas',
    email: 'sara.cardenas@medussa.com',
    roleId: 'role-global-admin',
    roleName: 'Administrador Global',
    profileId: 'profile-services-001',
    profileName: 'Gestión de RRHH',
    status: 'active',
  },
];

const MOCK_PROFILES: ProfileDetailVm[] = [
  {
    id: 'profile-holding-001',
    companyId: 'medussa-holding',
    name: 'Coordinación Corporativa',
    description: 'Perfil reusable para dirección administrativa y aprobaciones.',
    status: 'active',
    permissions: buildPermissionMatrix({
      general: { view: true, manage: true },
      finance: { view: true, edit: true, approve: true },
      purchases: { view: true, create: true, edit: true, approve: true },
      settings: { view: true, manage: true },
      bi: { view: true },
    }),
  },
  {
    id: 'profile-holding-002',
    companyId: 'medussa-holding',
    name: 'Analítica Financiera',
    description: 'Consulta, edición y análisis para control financiero.',
    status: 'inactive',
    permissions: buildPermissionMatrix({
      finance: { view: true, edit: true },
      bi: { view: true, create: true },
      general: { view: true },
    }),
  },
  {
    id: 'profile-retail-001',
    companyId: 'medussa-retail',
    name: 'Atención Omnicanal',
    description: 'Resuelve casos, seguimiento de clientes y escalaciones.',
    status: 'active',
    permissions: buildPermissionMatrix({
      'customer-service': { view: true, create: true, edit: true, approve: true },
      general: { view: true },
      bi: { view: true },
    }),
  },
  {
    id: 'profile-industrial-001',
    companyId: 'medussa-industrial',
    name: 'Operación de Planta',
    description: 'Opera producción, almacén y soporte de abastecimiento.',
    status: 'active',
    permissions: buildPermissionMatrix({
      production: { view: true, create: true, edit: true, approve: true },
      warehouse: { view: true, create: true, edit: true, manage: true },
      inventory: { view: true, create: true, edit: true },
      'supply-chain': { view: true, approve: true },
      purchases: { view: true, create: true },
    }),
  },
  {
    id: 'profile-services-001',
    companyId: 'medussa-services',
    name: 'Gestión de RRHH',
    description: 'Configura personal, aprobaciones y mantenimiento administrativo.',
    status: 'active',
    permissions: buildPermissionMatrix({
      hr: { view: true, create: true, edit: true, approve: true, manage: true },
      general: { view: true },
      settings: { view: true, manage: true },
      finance: { view: true },
    }),
  },
  {
    id: 'profile-services-002',
    companyId: 'medussa-services',
    name: 'Auditoría de Servicio',
    description: 'Consulta transversal para control y revisión de cumplimiento.',
    status: 'inactive',
    permissions: buildPermissionMatrix({
      general: { view: true },
      finance: { view: true },
      hr: { view: true },
      settings: { view: true },
      bi: { view: true },
    }),
  },
];

export const INITIAL_SECURITY_ADMINISTRATION_STORE: SecurityAdministrationStore = {
  users: MOCK_USERS,
  roles: MOCK_ROLES,
  profiles: MOCK_PROFILES,
};