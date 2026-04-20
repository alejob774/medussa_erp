import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { normalizeCities, normalizeText } from '../../../clients/application/mappers/client.mapper';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { DEFAULT_SUPPLIER_FILTERS, SupplierFilters } from '../../domain/models/supplier-filters.model';
import { SaveSupplierPayload } from '../../domain/models/supplier-form.model';
import { Supplier, SupplierCatalogs, SupplierStatus } from '../../domain/models/supplier.model';
import {
  SupplierAuditDraft,
  SupplierListResponse,
  SupplierMutationAction,
  SupplierMutationResult,
  SupplierStore,
} from '../../domain/models/supplier-response.model';
import { SuppliersRepository } from '../../domain/repositories/supplier.repository';
import {
  INITIAL_SUPPLIERS_STORE,
  PAYMENT_TERM_OPTIONS,
  SUPPLIER_PRODUCT_OPTIONS,
  SUPPLY_TYPE_OPTIONS,
} from '../data/suppliers.mock';

@Injectable({
  providedIn: 'root',
})
export class SupplierMockRepository implements SuppliersRepository {
  private readonly storageKey = 'medussa.erp.mock.suppliers';
  private readonly clientsStorageKey = 'medussa.erp.mock.clients';

  getCatalogs(companyId: string): Observable<SupplierCatalogs> {
    void companyId;
    const clientsStore = this.readClientsStore();

    return of({
      cities: normalizeCities(clientsStore.catalogs.cities),
      supplyTypes: SUPPLY_TYPE_OPTIONS.map((item) => ({ ...item })),
      paymentTerms: PAYMENT_TERM_OPTIONS.map((item) => ({ ...item })),
      productOptions: SUPPLIER_PRODUCT_OPTIONS.map((item) => ({ ...item })),
    }).pipe(delay(120));
  }

  listSuppliers(companyId: string, filters: SupplierFilters): Observable<SupplierListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const suppliers = this.readStore().suppliers
      .map((supplier) => this.cloneSupplier(supplier))
      .filter((supplier) => supplier.empresaId === normalizedFilters.empresaId)
      .filter((supplier) => this.matchesFilters(supplier, normalizedFilters))
      .sort((left, right) => left.nombreProveedor.localeCompare(right.nombreProveedor, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: suppliers.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: suppliers.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  getSupplier(companyId: string, supplierId: string): Observable<Supplier> {
    const supplier = this.readStore().suppliers.find(
      (item) => item.empresaId === companyId && item.id === supplierId,
    );

    if (!supplier) {
      return throwError(() => new Error('No se encontró el proveedor solicitado.'));
    }

    return of(this.cloneSupplier(supplier)).pipe(delay(150));
  }

  saveSupplier(
    companyId: string,
    payload: SaveSupplierPayload,
    supplierId?: string,
  ): Observable<SupplierMutationResult> {
    const store = this.readStore();
    const currentSupplier = supplierId
      ? store.suppliers.find((supplier) => supplier.empresaId === companyId && supplier.id === supplierId)
      : undefined;
    const validationError = this.validatePayload(store, companyId, payload, supplierId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const nextSupplier: Supplier = {
      id:
        currentSupplier?.id ??
        this.buildSupplierId(normalizedPayload.nit, normalizedPayload.nombreProveedor),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      nit: normalizedPayload.nit,
      nombreProveedor: normalizedPayload.nombreProveedor,
      ciudadId: normalizedPayload.ciudadId,
      ciudadNombre: normalizedPayload.ciudadNombre,
      direccion: normalizedPayload.direccion,
      telefono: normalizedPayload.telefono,
      email: normalizedPayload.email,
      tipoAbastecimiento: normalizedPayload.tipoAbastecimiento,
      productoPrincipal: normalizedPayload.productoPrincipal,
      leadTimeDias: normalizedPayload.leadTimeDias,
      moq: normalizedPayload.moq,
      condicionPago: normalizedPayload.condicionPago,
      estado: normalizedPayload.estado,
      createdAt: currentSupplier?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tieneDependenciasActivas: currentSupplier?.tieneDependenciasActivas ?? false,
    };
    const nextSuppliers = currentSupplier
      ? store.suppliers.map((supplier) =>
          supplier.empresaId === companyId && supplier.id === currentSupplier.id ? nextSupplier : supplier,
        )
      : [nextSupplier, ...store.suppliers];
    const action: SupplierMutationAction = currentSupplier ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextSupplier,
      action === 'created'
        ? `Creación del proveedor ${nextSupplier.nombreProveedor}.`
        : `Actualización del proveedor ${nextSupplier.nombreProveedor}.`,
      currentSupplier ? sanitizeAuditPayload(currentSupplier) : null,
      sanitizeAuditPayload(nextSupplier),
    );

    this.writeStore({
      ...store,
      suppliers: nextSuppliers,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<SupplierMutationResult>({
      action,
      supplier: this.cloneSupplier(nextSupplier),
      message:
        action === 'created'
          ? `El proveedor ${nextSupplier.nombreProveedor} fue creado correctamente.`
          : `El proveedor ${nextSupplier.nombreProveedor} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteSupplier(companyId: string, supplierId: string): Observable<SupplierMutationResult> {
    const store = this.readStore();
    const currentSupplier = store.suppliers.find(
      (supplier) => supplier.empresaId === companyId && supplier.id === supplierId,
    );

    if (!currentSupplier) {
      return throwError(() => new Error('No se encontró el proveedor solicitado.'));
    }

    if (currentSupplier.tieneDependenciasActivas) {
      const nextSupplier: Supplier = {
        ...this.cloneSupplier(currentSupplier),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextSupplier,
        `Inactivación preventiva del proveedor ${nextSupplier.nombreProveedor} por dependencias activas.`,
        sanitizeAuditPayload(currentSupplier),
        sanitizeAuditPayload(nextSupplier),
      );

      this.writeStore({
        ...store,
        suppliers: store.suppliers.map((supplier) =>
          supplier.empresaId === companyId && supplier.id === supplierId ? nextSupplier : supplier,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<SupplierMutationResult>({
        action: 'inactivated',
        supplier: this.cloneSupplier(nextSupplier),
        message: 'El proveedor tiene dependencias activas y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentSupplier,
      `Eliminación del proveedor ${currentSupplier.nombreProveedor}.`,
      sanitizeAuditPayload(currentSupplier),
      null,
    );

    this.writeStore({
      ...store,
      suppliers: store.suppliers.filter(
        (supplier) => !(supplier.empresaId === companyId && supplier.id === supplierId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<SupplierMutationResult>({
      action: 'deleted',
      supplier: null,
      message: `El proveedor ${currentSupplier.nombreProveedor} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateSupplierStatus(
    companyId: string,
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult> {
    const store = this.readStore();
    const currentSupplier = store.suppliers.find(
      (supplier) => supplier.empresaId === companyId && supplier.id === supplierId,
    );

    if (!currentSupplier) {
      return throwError(() => new Error('No se encontró el proveedor solicitado.'));
    }

    const nextSupplier: Supplier = {
      ...this.cloneSupplier(currentSupplier),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: SupplierMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextSupplier,
      status === 'ACTIVO'
        ? `Activación del proveedor ${nextSupplier.nombreProveedor}.`
        : `Inactivación del proveedor ${nextSupplier.nombreProveedor}.`,
      sanitizeAuditPayload(currentSupplier),
      sanitizeAuditPayload(nextSupplier),
    );

    this.writeStore({
      ...store,
      suppliers: store.suppliers.map((supplier) =>
        supplier.empresaId === companyId && supplier.id === supplierId ? nextSupplier : supplier,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<SupplierMutationResult>({
      action,
      supplier: this.cloneSupplier(nextSupplier),
      message:
        status === 'ACTIVO'
          ? `El proveedor ${nextSupplier.nombreProveedor} fue activado.`
          : `El proveedor ${nextSupplier.nombreProveedor} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): SupplierStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_SUPPLIERS_STORE);
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeStore(structuredClone(INITIAL_SUPPLIERS_STORE));
      return structuredClone(INITIAL_SUPPLIERS_STORE);
    }

    try {
      const normalizedStore = normalizeSupplierStore(JSON.parse(raw) as SupplierStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      this.writeStore(structuredClone(INITIAL_SUPPLIERS_STORE));
      return structuredClone(INITIAL_SUPPLIERS_STORE);
    }
  }

  private readClientsStore(): ClientStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    const raw = localStorage.getItem(this.clientsStorageKey);

    if (!raw) {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    try {
      return JSON.parse(raw) as ClientStore;
    } catch {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }
  }

  private writeStore(store: SupplierStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: SupplierStore,
    companyId: string,
    payload: SaveSupplierPayload,
    supplierId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) return 'La empresa activa es obligatoria.';
    if (!normalizedPayload.empresaNombre) return 'No fue posible resolver el nombre de la empresa activa.';
    if (!normalizedPayload.nit) return 'El NIT es obligatorio.';
    if (!normalizedPayload.nombreProveedor) return 'El nombre del proveedor es obligatorio.';
    if (!normalizedPayload.ciudadId) return 'La ciudad es obligatoria.';
    if (!normalizedPayload.direccion) return 'La dirección es obligatoria.';
    if (!normalizedPayload.telefono) return 'El teléfono es obligatorio.';
    if (!normalizedPayload.tipoAbastecimiento) return 'El tipo de abastecimiento es obligatorio.';
    if (!normalizedPayload.productoPrincipal) return 'El producto o categoría principal es obligatorio.';
    if (!normalizedPayload.estado) return 'El estado es obligatorio.';

    if (normalizedPayload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.email)) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (normalizedPayload.leadTimeDias !== null && normalizedPayload.leadTimeDias !== undefined && normalizedPayload.leadTimeDias < 0) {
      return 'El lead time no puede ser negativo.';
    }

    if (normalizedPayload.moq !== null && normalizedPayload.moq !== undefined && normalizedPayload.moq < 0) {
      return 'El MOQ no puede ser negativo.';
    }

    const duplicatedNit = store.suppliers.some(
      (supplier) =>
        supplier.empresaId === companyId &&
        supplier.id !== supplierId &&
        normalizeText(supplier.nit) === normalizeText(normalizedPayload.nit),
    );

    if (duplicatedNit) {
      return 'Ya existe un proveedor con ese NIT en la empresa activa.';
    }

    return null;
  }

  private matchesFilters(supplier: Supplier, filters: Required<SupplierFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [supplier.nit, supplier.nombreProveedor, supplier.ciudadNombre ?? '', supplier.productoPrincipal, supplier.tipoAbastecimiento]
        .some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || supplier.estado === filters.estado;
    const matchesCity = !filters.ciudadId || supplier.ciudadId === filters.ciudadId;
    const matchesSupplyType =
      !filters.tipoAbastecimiento || supplier.tipoAbastecimiento === filters.tipoAbastecimiento;
    const matchesProduct =
      !filters.productoPrincipal || supplier.productoPrincipal === filters.productoPrincipal;

    return matchesSearch && matchesStatus && matchesCity && matchesSupplyType && matchesProduct;
  }

  private cloneSupplier(supplier: Supplier): Supplier {
    return {
      ...supplier,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt ?? null,
    };
  }

  private buildSupplierId(nit: string, nombreProveedor: string): string {
    const source = nit || nombreProveedor;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `supplier-${slug}` : `supplier-${Date.now()}`;
  }
}

function normalizeFilters(filters: SupplierFilters, companyId: string): Required<SupplierFilters> {
  return {
    ...DEFAULT_SUPPLIER_FILTERS,
    ...filters,
    empresaId: filters.empresaId ?? companyId,
    estado: filters.estado ?? 'TODOS',
    search: filters.search?.trim() ?? '',
    ciudadId: filters.ciudadId ?? null,
    tipoAbastecimiento: filters.tipoAbastecimiento ?? null,
    productoPrincipal: filters.productoPrincipal ?? null,
    page: filters.page ?? DEFAULT_SUPPLIER_FILTERS.page,
    pageSize: filters.pageSize ?? DEFAULT_SUPPLIER_FILTERS.pageSize,
  };
}

function normalizePayload(payload: SaveSupplierPayload, companyId: string): SaveSupplierPayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    nit: payload.nit.trim().toUpperCase(),
    nombreProveedor: payload.nombreProveedor.trim(),
    ciudadId: payload.ciudadId?.trim() || null,
    ciudadNombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion.trim(),
    telefono: payload.telefono.trim(),
    email: payload.email?.trim().toLowerCase() || null,
    tipoAbastecimiento: payload.tipoAbastecimiento,
    productoPrincipal: payload.productoPrincipal.trim(),
    leadTimeDias: payload.leadTimeDias ?? null,
    moq: payload.moq ?? null,
    condicionPago: payload.condicionPago?.trim() || null,
    estado: payload.estado,
  };
}

function buildAuditDraft(
  action: SupplierAuditDraft['action'],
  supplier: Supplier,
  summary: string,
  beforePayload: Record<string, unknown> | null,
  afterPayload: Record<string, unknown> | null,
): SupplierAuditDraft {
  return {
    module: 'proveedores',
    action,
    companyId: supplier.empresaId,
    companyName: supplier.empresaNombre ?? 'Empresa activa',
    entityId: supplier.id,
    entityName: supplier.nombreProveedor,
    summary,
    occurredAt: new Date().toISOString(),
    beforePayload,
    afterPayload,
  };
}

function sanitizeAuditPayload(supplier: Supplier): Record<string, unknown> {
  return {
    id: supplier.id,
    empresaId: supplier.empresaId,
    nit: supplier.nit,
    nombreProveedor: supplier.nombreProveedor,
    ciudadId: supplier.ciudadId ?? null,
    ciudadNombre: supplier.ciudadNombre ?? null,
    direccion: supplier.direccion,
    telefono: supplier.telefono,
    email: supplier.email ?? null,
    tipoAbastecimiento: supplier.tipoAbastecimiento,
    productoPrincipal: supplier.productoPrincipal,
    leadTimeDias: supplier.leadTimeDias ?? null,
    moq: supplier.moq ?? null,
    condicionPago: supplier.condicionPago ?? null,
    estado: supplier.estado,
    dependenciasActivas: supplier.tieneDependenciasActivas,
  };
}

function normalizeSupplierStore(store: SupplierStore): SupplierStore {
  return {
    suppliers: (store.suppliers ?? []).map((supplier) => ({
      ...supplier,
      ciudadId: supplier.ciudadId?.trim() || null,
      ciudadNombre: supplier.ciudadNombre?.trim() || null,
      email: supplier.email?.trim().toLowerCase() || null,
      leadTimeDias: supplier.leadTimeDias ?? null,
      moq: supplier.moq ?? null,
      condicionPago: supplier.condicionPago?.trim() || null,
      empresaNombre: resolveCompanyDisplayName(supplier.empresaId, supplier.empresaNombre),
      estado: supplier.estado ?? 'ACTIVO',
      tieneDependenciasActivas: supplier.tieneDependenciasActivas ?? false,
      updatedAt: supplier.updatedAt ?? null,
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function resolveCompanyDisplayName(companyId: string, currentName?: string | null): string {
  if (companyId === 'medussa-holding') {
    return 'Medussa Holding';
  }

  if (companyId === 'medussa-retail') {
    return 'Industrias Alimenticias El Arbolito';
  }

  return currentName?.trim() || 'Empresa activa';
}
