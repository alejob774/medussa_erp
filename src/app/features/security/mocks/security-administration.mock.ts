import {
  ModulePermissionVm,
  PermissionActionSet,
  ProfileDetailVm,
  RoleRowVm,
  SecurityAdministrationStore,
  UserCompanyAssignmentVm,
  UserDetailVm,
} from '../models/security-administration.model';

export interface SecurityPermissionModuleCatalogItem {
  key: string;
  name: string;
}

export const SECURITY_PERMISSION_MODULES: readonly SecurityPermissionModuleCatalogItem[] = [
  { key: 'usuarios', name: 'Usuarios' },
  { key: 'roles', name: 'Roles' },
  { key: 'perfiles', name: 'Perfiles' },
  { key: 'configuracion', name: 'Configuracion' },
  { key: 'presupuestos', name: 'Presupuestos SCM' },
  { key: 'auditoria', name: 'Auditoria' },
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

function buildAssignment(
  companyId: string,
  companyName: string,
  roleId: string,
  roleName: string,
  profileId: string,
  profileName: string,
): UserCompanyAssignmentVm {
  return {
    companyId,
    companyName,
    roleId,
    roleName,
    profileId,
    profileName,
  };
}

function buildUser(user: Omit<UserDetailVm, 'name'>): UserDetailVm {
  return {
    ...user,
    name: `${user.firstName} ${user.lastName}`.trim(),
  };
}

const MOCK_ROLES: RoleRowVm[] = [
  {
    id: 'role-holding-admin',
    companyId: 'medussa-holding',
    name: 'Administrador Empresa',
    description: 'Administra seguridad, parametrizacion y operacion corporativa.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-holding-area-head',
    companyId: 'medussa-holding',
    name: 'Jefe de Area',
    description: 'Coordina aprobaciones y ejecucion de su unidad.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-holding-analyst',
    companyId: 'medussa-holding',
    name: 'Analista de Area',
    description: 'Opera seguimiento administrativo y analitico.',
    status: 'inactive',
    scope: 'company',
  },
  {
    id: 'role-retail-aux',
    companyId: 'medussa-retail',
    name: 'Auxiliar Operativo',
    description: 'Soporta operacion comercial y atencion omnicanal.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-retail-supervisor',
    companyId: 'medussa-retail',
    name: 'Supervisor Comercial',
    description: 'Coordina punto de venta, servicio y escalaciones.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-industrial-head',
    companyId: 'medussa-industrial',
    name: 'Jefe de Planta',
    description: 'Coordina produccion, compras e inventarios.',
    status: 'active',
    scope: 'company',
  },
  {
    id: 'role-services-admin',
    companyId: 'medussa-services',
    name: 'Administrador Empresa',
    description: 'Gestiona seguridad, RRHH y parametrizacion del servicio.',
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

const MOCK_USERS: UserDetailVm[] = [
  buildUser({
    userId: 'user-ana-perez',
    firstName: 'Ana',
    lastName: 'Perez',
    position: 'Coordinadora Administrativa',
    email: 'ana.perez@medussa.com',
    mobilePhone: '3005550101',
    landlinePhone: '6015550101',
    photoUrl: null,
    status: 'active',
    assignedCompanies: [
      buildAssignment(
        'medussa-holding',
        'Industrias Alimenticias El Arbolito',
        'role-holding-admin',
        'Administrador Empresa',
        'profile-holding-001',
        'Coordinacion Corporativa',
      ),
      buildAssignment(
        'medussa-services',
        'Medussa Services',
        'role-services-admin',
        'Administrador Empresa',
        'profile-services-001',
        'Gestion de RRHH',
      ),
    ],
  }),
  buildUser({
    userId: 'user-diego-rios',
    firstName: 'Diego',
    lastName: 'Rios',
    position: 'Lider de Operaciones',
    email: 'diego.rios@medussa.com',
    mobilePhone: '3005550102',
    landlinePhone: '6015550102',
    photoUrl: null,
    status: 'active',
    assignedCompanies: [
      buildAssignment(
        'medussa-holding',
        'Industrias Alimenticias El Arbolito',
        'role-holding-area-head',
        'Jefe de Area',
        'profile-holding-001',
        'Coordinacion Corporativa',
      ),
      buildAssignment(
        'medussa-retail',
        'Medussa Holding',
        'role-retail-supervisor',
        'Supervisor Comercial',
        'profile-retail-001',
        'Atencion Omnicanal',
      ),
    ],
  }),
  buildUser({
    userId: 'user-laura-quintero',
    firstName: 'Laura',
    lastName: 'Quintero',
    position: 'Analista Financiera',
    email: 'laura.quintero@medussa.com',
    mobilePhone: '3005550103',
    landlinePhone: '',
    photoUrl: null,
    status: 'inactive',
    assignedCompanies: [
      buildAssignment(
        'medussa-holding',
        'Industrias Alimenticias El Arbolito',
        'role-holding-analyst',
        'Analista de Area',
        'profile-holding-002',
        'Analitica Financiera',
      ),
    ],
  }),
  buildUser({
    userId: 'user-camila-ruiz',
    firstName: 'Camila',
    lastName: 'Ruiz',
    position: 'Supervisora de Servicio',
    email: 'camila.ruiz@medussa.com',
    mobilePhone: '3005550104',
    landlinePhone: '6045550104',
    photoUrl: null,
    status: 'active',
    assignedCompanies: [
      buildAssignment(
        'medussa-retail',
        'Medussa Holding',
        'role-retail-aux',
        'Auxiliar Operativo',
        'profile-retail-001',
        'Atencion Omnicanal',
      ),
      buildAssignment(
        'medussa-services',
        'Medussa Services',
        'role-services-auditor',
        'Invitado / Auditor',
        'profile-services-002',
        'Auditoria de Servicio',
      ),
    ],
  }),
  buildUser({
    userId: 'user-jorge-leon',
    firstName: 'Jorge',
    lastName: 'Leon',
    position: 'Coordinador de Planta',
    email: 'jorge.leon@medussa.com',
    mobilePhone: '3005550105',
    landlinePhone: '6045550105',
    photoUrl: null,
    status: 'active',
    assignedCompanies: [
      buildAssignment(
        'medussa-industrial',
        'Medussa Industrial',
        'role-industrial-head',
        'Jefe de Planta',
        'profile-industrial-001',
        'Operacion de Planta',
      ),
    ],
  }),
  buildUser({
    userId: 'user-mateo-silva',
    firstName: 'Mateo',
    lastName: 'Silva',
    position: 'Administrador de Servicio',
    email: 'mateo.silva@medussa.com',
    mobilePhone: '3005550106',
    landlinePhone: '6015550106',
    photoUrl: null,
    status: 'active',
    assignedCompanies: [
      buildAssignment(
        'medussa-services',
        'Medussa Services',
        'role-services-admin',
        'Administrador Empresa',
        'profile-services-001',
        'Gestion de RRHH',
      ),
      buildAssignment(
        'medussa-holding',
        'Industrias Alimenticias El Arbolito',
        'role-holding-admin',
        'Administrador Empresa',
        'profile-holding-001',
        'Coordinacion Corporativa',
      ),
    ],
  }),
];

const MOCK_PROFILES: ProfileDetailVm[] = [
  {
    id: 'profile-holding-001',
    companyId: 'medussa-holding',
    name: 'Coordinacion Corporativa',
    description: 'Perfil reusable para direccion administrativa y aprobaciones.',
    status: 'active',
    permissions: buildPermissionMatrix({
      usuarios: { view: true, create: true, edit: true, delete: true },
      roles: { view: true, create: true, edit: true },
      perfiles: { view: true, create: true, edit: true, delete: true },
      configuracion: { view: true, edit: true, approve: true },
      presupuestos: { view: true, create: true, edit: true, approve: true },
      auditoria: { view: true, export: true },
    }),
  },
  {
    id: 'profile-holding-002',
    companyId: 'medussa-holding',
    name: 'Analitica Financiera',
    description: 'Consulta, edicion y analisis para control financiero.',
    status: 'inactive',
    permissions: buildPermissionMatrix({
      usuarios: { view: true },
      perfiles: { view: true },
      configuracion: { view: true },
      presupuestos: { view: true, edit: true, export: true },
      auditoria: { view: true, export: true },
    }),
  },
  {
    id: 'profile-retail-001',
    companyId: 'medussa-retail',
    name: 'Atencion Omnicanal',
    description: 'Resuelve casos, seguimiento de clientes y escalaciones.',
    status: 'active',
    permissions: buildPermissionMatrix({
      usuarios: { view: true, create: true },
      perfiles: { view: true },
      auditoria: { view: true },
    }),
  },
  {
    id: 'profile-industrial-001',
    companyId: 'medussa-industrial',
    name: 'Operacion de Planta',
    description: 'Opera produccion, almacen y soporte de abastecimiento.',
    status: 'active',
    permissions: buildPermissionMatrix({
      usuarios: { view: true, create: true, edit: true },
      roles: { view: true },
      perfiles: { view: true, edit: true },
      configuracion: { view: true },
      presupuestos: { view: true, create: true, edit: true, approve: true },
      auditoria: { view: true, export: true },
    }),
  },
  {
    id: 'profile-services-001',
    companyId: 'medussa-services',
    name: 'Gestion de RRHH',
    description: 'Configura personal, aprobaciones y mantenimiento administrativo.',
    status: 'active',
    permissions: buildPermissionMatrix({
      usuarios: { view: true, create: true, edit: true, delete: true },
      roles: { view: true, create: true, edit: true, delete: true },
      perfiles: { view: true, create: true, edit: true, delete: true },
      configuracion: { view: true, create: true, edit: true, delete: true },
      auditoria: { view: true, export: true },
    }),
  },
  {
    id: 'profile-services-002',
    companyId: 'medussa-services',
    name: 'Auditoria de Servicio',
    description: 'Consulta transversal para control y revision de cumplimiento.',
    status: 'inactive',
    permissions: buildPermissionMatrix({
      usuarios: { view: true },
      roles: { view: true },
      perfiles: { view: true },
      configuracion: { view: true },
      auditoria: { view: true, export: true },
    }),
  },
];

export const INITIAL_SECURITY_ADMINISTRATION_STORE: SecurityAdministrationStore = {
  users: MOCK_USERS,
  roles: MOCK_ROLES,
  profiles: MOCK_PROFILES,
};
