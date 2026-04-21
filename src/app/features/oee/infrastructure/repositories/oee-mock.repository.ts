import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Equipment } from '../../../equipments/domain/models/equipment.model';
import { EquipmentStore } from '../../../equipments/domain/models/equipment-response.model';
import { INITIAL_EQUIPMENTS_STORE } from '../../../equipments/infrastructure/data/equipments.mock';
import { MpsStore } from '../../../mps/domain/models/mps-response.model';
import { DowntimeCause } from '../../domain/models/downtime-cause.model';
import { OeeAlert, OeeAlertSeverity, OeeAlertType } from '../../domain/models/oee-alert.model';
import { DEFAULT_OEE_FILTERS, OeeFilters } from '../../domain/models/oee-filters.model';
import { OeeHistory } from '../../domain/models/oee-history.model';
import { OeeRecord } from '../../domain/models/oee-record.model';
import {
  EMPTY_OEE_DASHBOARD,
  OeeAuditDraft,
  OeeCatalogs,
  OeeDashboard,
  OeeMutationResult,
  OeeRecordAggregate,
  OeeStore,
} from '../../domain/models/oee-response.model';
import { OeeKpis } from '../../domain/models/oee-kpi.model';
import { OeeRepository, RegisterOeeDowntimePayload, SaveOeeRecordPayload } from '../../domain/repositories/oee.repository';
import {
  DEFAULT_DOWNTIME_CAUSES,
  DEFAULT_LINES,
  DEFAULT_OPERATORS,
  DEFAULT_PLANTS,
  DEFAULT_SHIFTS,
  DEFAULT_SUPERVISORS,
  OEE_TARGET,
} from '../data/oee-catalogs.mock';

const STORAGE_KEY = 'medussa.erp.mock.oee';
const EQUIPMENTS_STORAGE_KEY = 'medussa.erp.mock.equipments';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const MPS_STORAGE_KEY = 'medussa.erp.mock.mps';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

type MachineCatalogEntry = {
  id: string;
  code: string;
  name: string;
  planta: string;
  lineaProduccion: string;
};

@Injectable({
  providedIn: 'root',
})
export class OeeMockRepository implements OeeRepository {
  getDashboard(companyId: string, filters: OeeFilters): Observable<OeeDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureBaseline(this.readStore(), companyId);
    const catalogs = this.buildCatalogs(companyId);
    const visibleAlerts = store.alerts
      .filter((item) => this.belongsToCompany(store.records, companyId, item.registroId))
      .filter((item) => normalizedFilters.severidadAlerta === 'TODAS' || item.severidad === normalizedFilters.severidadAlerta)
      .map((item) => ({ ...item }));
    const visibleAlertIds = new Set(visibleAlerts.map((item) => item.registroId));
    const records = store.records
      .filter((item) => item.empresaId === companyId)
      .filter((item) => this.matchesFilters(item, normalizedFilters))
      .filter((item) => normalizedFilters.severidadAlerta === 'TODAS' || visibleAlertIds.has(item.id))
      .sort((left, right) => {
        const rightKey = `${right.fechaOperacion}T${right.horaInicio}`;
        const leftKey = `${left.fechaOperacion}T${left.horaInicio}`;
        return new Date(rightKey).getTime() - new Date(leftKey).getTime();
      })
      .map((item) => this.buildAggregate(item, store));

    const recordIds = new Set(records.map((item) => item.record.id));
    const alerts = visibleAlerts
      .filter((item) => recordIds.has(item.registroId))
      .sort((left, right) => compareSeverity(left.severidad, right.severidad));
    const histories = store.histories
      .filter((item) => recordIds.has(item.registroId))
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
      .map((item) => ({ ...item }));
    const selectedRecord =
      records.find((item) => item.alerts.some((alert) => alert.severidad === 'ALTA')) ?? records[0] ?? null;

    return of({
      filters: normalizedFilters,
      catalogs,
      kpis: this.buildKpis(records, catalogs.oeeTarget),
      records,
      alerts,
      histories,
      selectedRecord,
    }).pipe(delay(180));
  }

  saveRecord(
    companyId: string,
    payload: SaveOeeRecordPayload,
    recordId?: string,
  ): Observable<OeeMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = recordId ? this.findRecord(store, companyId, recordId) : null;
    const catalogs = this.buildCatalogs(companyId);
    const validationError = this.validateRecordPayload(companyId, payload, catalogs, current?.id);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const machine = catalogs.machines.find((item) => item.value === payload.maquinaId)!;
    const now = new Date().toISOString();
    const nextRecord = this.buildRecord(companyId, payload, machine, current, now);
    const nextAlerts = this.buildAlerts(nextRecord, catalogs.oeeTarget);
    const historyEntry = this.buildHistory(
      nextRecord.id,
      current ? 'ACTUALIZACION_OEE' : 'REGISTRO_OEE',
      payload.usuarioCrea,
      now,
      current
        ? `Registro operativo ajustado para ${nextRecord.maquinaNombre} en ${nextRecord.turno}.`
        : `Registro operativo creado para ${nextRecord.maquinaNombre} en ${nextRecord.turno}.`,
    );
    const calculationEntry = this.buildHistory(
      nextRecord.id,
      'CALCULO_OEE',
      payload.usuarioCrea,
      now,
      `Disponibilidad ${formatPercent(nextRecord.disponibilidad)}, rendimiento ${formatPercent(nextRecord.rendimiento)}, calidad ${formatPercent(nextRecord.calidad)} y OEE ${formatPercent(nextRecord.oee)}.`,
    );
    const nextStore: OeeStore = {
      ...store,
      records: current
        ? store.records.map((item) => (item.id === current.id ? nextRecord : { ...item }))
        : [nextRecord, ...store.records.map((item) => ({ ...item }))],
      alerts: [
        ...nextAlerts,
        ...store.alerts.filter((item) => item.registroId !== nextRecord.id).map((item) => ({ ...item })),
      ],
      histories: [historyEntry, calculationEntry, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'record-edit' : 'record-create',
      companyId,
      nextRecord.id,
      `${nextRecord.fechaOperacion} - ${nextRecord.maquinaNombre}`,
      current ? 'Registro OEE actualizado.' : 'Registro OEE creado.',
      current ? this.sanitizeRecord(current) : null,
      this.sanitizeRecord(nextRecord),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    const action: OeeMutationResult['action'] = current ? 'record-updated' : 'record-created';

    return of<OeeMutationResult>({
      action,
      record: {
        record: { ...nextRecord },
        alerts: nextAlerts.map((item) => ({ ...item })),
        history: [historyEntry, calculationEntry, ...this.readHistoryByRecord(store.histories, nextRecord.id)],
      },
      message: action === 'record-updated' ? 'Registro OEE actualizado correctamente.' : 'Registro OEE creado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  registerDowntime(
    companyId: string,
    recordId: string,
    payload: RegisterOeeDowntimePayload,
  ): Observable<OeeMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = this.findRecord(store, companyId, recordId);

    if (!current) {
      return throwError(() => new Error('No se encontro el registro OEE seleccionado.'));
    }

    if (!payload.causaParo.trim()) {
      return throwError(() => new Error('Debes seleccionar la causa de la parada.'));
    }

    if (!Number.isFinite(payload.tiempoParadoAdicional) || payload.tiempoParadoAdicional <= 0) {
      return throwError(() => new Error('El tiempo adicional de parada debe ser mayor a cero.'));
    }

    const nextStopTime = round(Math.min(current.tiempoProgramado, current.tiempoParado + payload.tiempoParadoAdicional));
    if (nextStopTime > current.tiempoProgramado) {
      return throwError(() => new Error('El tiempo parado no puede exceder el tiempo programado.'));
    }

    const mergedCause = mergeCause(current.causaParo, payload.causaParo);
    const nextRecord = this.recalculate({
      ...current,
      tiempoParado: nextStopTime,
      causaParo: mergedCause,
    });
    const nextAlerts = this.buildAlerts(nextRecord, OEE_TARGET);
    const now = new Date().toISOString();
    const historyEntry = this.buildHistory(
      nextRecord.id,
      'REGISTRO_PARADA',
      payload.usuario,
      now,
      payload.observacion?.trim() ||
        `${payload.causaParo} por ${payload.tiempoParadoAdicional} min. Total parada ${nextRecord.tiempoParado} min.`,
    );
    const calculationEntry = this.buildHistory(
      nextRecord.id,
      'RECALCULO_OEE',
      payload.usuario,
      now,
      `OEE recalculado a ${formatPercent(nextRecord.oee)} despues de registrar paro.`,
    );
    const nextStore: OeeStore = {
      ...store,
      records: store.records.map((item) => (item.id === recordId ? nextRecord : { ...item })),
      alerts: [...nextAlerts, ...store.alerts.filter((item) => item.registroId !== recordId).map((item) => ({ ...item }))],
      histories: [historyEntry, calculationEntry, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'downtime-register',
      companyId,
      nextRecord.id,
      `${nextRecord.fechaOperacion} - ${nextRecord.maquinaNombre}`,
      'Parada no programada registrada y OEE recalculado.',
      this.sanitizeRecord(current),
      this.sanitizeRecord(nextRecord),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<OeeMutationResult>({
      action: 'downtime-registered',
      record: {
        record: { ...nextRecord },
        alerts: nextAlerts.map((item) => ({ ...item })),
        history: [historyEntry, calculationEntry, ...this.readHistoryByRecord(store.histories, nextRecord.id)],
      },
      message: 'Parada registrada y OEE recalculado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): OeeStore {
    if (typeof window === 'undefined') {
      return createEmptyStore();
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createEmptyStore();
    }

    try {
      const parsed = JSON.parse(raw) as OeeStore;
      return {
        records: parsed.records ?? [],
        alerts: parsed.alerts ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return createEmptyStore();
    }
  }

  private writeStore(store: OeeStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(store: OeeStore, companyId: string): OeeStore {
    const companyRecords = store.records.filter((item) => item.empresaId === companyId);
    if (companyRecords.length) {
      return store;
    }

    const catalogs = this.buildCatalogs(companyId);
    const seedRecords = this.buildSeedRecords(companyId, catalogs);
    const seedAlerts = seedRecords.flatMap((item) => this.buildAlerts(item, catalogs.oeeTarget));
    const seedHistories = seedRecords.flatMap((item) => [
      this.buildHistory(
        item.id,
        'REGISTRO_OEE',
        'demo.jefe-planta',
        item.fechaCreacion,
        `Seed inicial de OEE para ${item.lineaProduccion}.`,
      ),
      this.buildHistory(
        item.id,
        'CALCULO_OEE',
        'demo.jefe-planta',
        item.fechaCreacion,
        `Seed con OEE ${formatPercent(item.oee)} para ${item.maquinaNombre}.`,
      ),
    ]);
    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      `seed-${companyId}`,
      `Seed OEE ${companyId}`,
      'Carga inicial del modulo OEE en runtime local.',
      null,
      {
        records: seedRecords.length,
        alerts: seedAlerts.length,
      },
    );
    const nextStore: OeeStore = {
      records: [...seedRecords, ...store.records.map((item) => ({ ...item }))],
      alerts: [...seedAlerts, ...store.alerts.map((item) => ({ ...item }))],
      histories: [...seedHistories, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    };

    this.writeStore(nextStore);
    return nextStore;
  }

  private buildCatalogs(companyId: string): OeeCatalogs {
    const machines = this.resolveMachines(companyId);
    const productionOrders = this.resolveProductionOrders(companyId, machines);

    return {
      plants: DEFAULT_PLANTS.map((item) => ({ value: item, label: item })),
      lines: DEFAULT_LINES.map((item) => ({
        value: item.nombre,
        label: item.nombre,
        planta: item.planta,
      })),
      machines: machines.map((item) => ({
        value: item.id,
        label: `${item.code} - ${item.name}`,
        machineCode: item.code,
        machineName: item.name,
        planta: item.planta,
        lineaProduccion: item.lineaProduccion,
      })),
      shifts: DEFAULT_SHIFTS.map((item) => ({ ...item })),
      downtimeCauses: DEFAULT_DOWNTIME_CAUSES.map((item) => ({ ...item })),
      operators: DEFAULT_OPERATORS.map((item) => ({ value: item, label: item })),
      supervisors: DEFAULT_SUPERVISORS.map((item) => ({ value: item, label: item })),
      productionOrders,
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
      oeeTarget: OEE_TARGET,
    };
  }

  private resolveMachines(companyId: string): MachineCatalogEntry[] {
    const equipments = this.readEquipments(companyId);
    const byId = new Map(equipments.map((item) => [item.id, item]));
    const preferred = [
      createMachineEntry(byId.get('equipment-ret-002'), 'Planta lacteos frios', 'Linea Yogurt'),
      createMachineEntry(byId.get('equipment-ret-006'), 'Planta UHT', 'Linea UHT'),
      createMachineEntry(byId.get('equipment-ret-003'), 'Planta lacteos frios', 'Linea Quesos'),
      createMachineEntry(byId.get('equipment-ret-004'), 'Planta principal El Arbolito', 'Linea Empaque'),
    ].filter((item): item is MachineCatalogEntry => !!item);

    if (preferred.length) {
      return preferred;
    }

    return [
      {
        id: `${companyId}-mock-yogurt`,
        code: 'OEE-YOG-01',
        name: 'Pasteurizador linea Yogurt',
        planta: 'Planta lacteos frios',
        lineaProduccion: 'Linea Yogurt',
      },
      {
        id: `${companyId}-mock-uht`,
        code: 'OEE-UHT-01',
        name: 'Modulo esterilizacion UHT',
        planta: 'Planta UHT',
        lineaProduccion: 'Linea UHT',
      },
      {
        id: `${companyId}-mock-cheese`,
        code: 'OEE-QUE-01',
        name: 'Mesa de moldeo quesos',
        planta: 'Planta lacteos frios',
        lineaProduccion: 'Linea Quesos',
      },
      {
        id: `${companyId}-mock-pack`,
        code: 'OEE-PACK-01',
        name: 'Celda empaque principal',
        planta: 'Planta principal El Arbolito',
        lineaProduccion: 'Linea Empaque',
      },
    ];
  }

  private resolveProductionOrders(companyId: string, machines: MachineCatalogEntry[]) {
    const mpsStore = this.readMpsStore();
    const lineByName = new Map(machines.map((item) => [item.lineaProduccion, item]));
    const dynamicOrders = mpsStore.plans
      .filter((item) => item.plan.empresaId === companyId)
      .flatMap((item) =>
        item.details.map((detail) => ({
          value: `OP-${slugify(detail.sku).toUpperCase()}-${detail.fechaProduccion.replace(/-/g, '')}`,
          label: `${detail.fechaProduccion} - ${detail.sku} - ${detail.lineaProduccion}`,
          planta: lineByName.get(detail.lineaProduccion)?.planta ?? item.plan.planta,
          lineaProduccion: detail.lineaProduccion,
          machineId: lineByName.get(detail.lineaProduccion)?.id ?? null,
        })),
      );

    if (dynamicOrders.length) {
      return dedupeOrders(dynamicOrders);
    }

    const products = this.readProducts(companyId).filter((item) => item.estado === 'ACTIVO');
    return products.slice(0, 4).map((item, index) => {
      const machine = machines[index % machines.length];
      return {
        value: `OP-${slugify(item.sku).toUpperCase()}-2026042${index + 1}`,
        label: `${item.sku} - ${item.nombre}`,
        planta: machine.planta,
        lineaProduccion: machine.lineaProduccion,
        machineId: machine.id,
      };
    });
  }

  private buildSeedRecords(companyId: string, catalogs: OeeCatalogs): OeeRecord[] {
    const machines = catalogs.machines;
    const operators = catalogs.operators.map((item) => item.value);
    const supervisors = catalogs.supervisors.map((item) => item.value);
    const orders = catalogs.productionOrders;

    const seedInputs = [
      {
        maquinaId: machines.find((item) => item.lineaProduccion === 'Linea Yogurt')?.value ?? machines[0]?.value ?? '',
        turno: 'MANANA' as const,
        fechaOperacion: '2026-04-21',
        horaInicio: '06:00',
        horaFin: '14:00',
        tiempoProgramado: 480,
        tiempoParado: 36,
        causaParo: 'Cambio formato',
        unidadesProducidas: 920,
        unidadesObjetivo: 960,
        unidadesRechazadas: 18,
        operario: operators[0] ?? 'Maria Alejandra Ruiz',
        supervisor: supervisors[0] ?? 'Jefe Planta Lacteos',
      },
      {
        maquinaId: machines.find((item) => item.lineaProduccion === 'Linea UHT')?.value ?? machines[0]?.value ?? '',
        turno: 'NOCHE' as const,
        fechaOperacion: '2026-04-20',
        horaInicio: '22:00',
        horaFin: '06:00',
        tiempoProgramado: 480,
        tiempoParado: 90,
        causaParo: 'Falla mecanica',
        unidadesProducidas: 780,
        unidadesObjetivo: 960,
        unidadesRechazadas: 22,
        operario: operators[1] ?? 'Carlos Benitez',
        supervisor: supervisors[1] ?? 'Supervisor UHT',
      },
      {
        maquinaId: machines.find((item) => item.lineaProduccion === 'Linea Quesos')?.value ?? machines[0]?.value ?? '',
        turno: 'TARDE' as const,
        fechaOperacion: '2026-04-20',
        horaInicio: '14:00',
        horaFin: '21:00',
        tiempoProgramado: 420,
        tiempoParado: 24,
        causaParo: 'Limpieza',
        unidadesProducidas: 540,
        unidadesObjetivo: 560,
        unidadesRechazadas: 12,
        operario: operators[2] ?? 'Diana Contreras',
        supervisor: supervisors[0] ?? 'Jefe Planta Lacteos',
      },
      {
        maquinaId: machines.find((item) => item.lineaProduccion === 'Linea Empaque')?.value ?? machines[0]?.value ?? '',
        turno: 'MANANA' as const,
        fechaOperacion: '2026-04-19',
        horaInicio: '06:00',
        horaFin: '12:00',
        tiempoProgramado: 360,
        tiempoParado: 72,
        causaParo: 'Falta material',
        unidadesProducidas: 600,
        unidadesObjetivo: 840,
        unidadesRechazadas: 30,
        operario: operators[3] ?? 'Jose Salgado',
        supervisor: supervisors[2] ?? 'Supervisor Empaque',
      },
    ];

    return seedInputs.map((input, index) => {
      const machine = catalogs.machines.find((item) => item.value === input.maquinaId) ?? catalogs.machines[0];
      const payload: SaveOeeRecordPayload = {
        planta: machine?.planta ?? 'Planta principal El Arbolito',
        lineaProduccion: machine?.lineaProduccion ?? 'Linea Empaque',
        maquinaId: input.maquinaId,
        turno: input.turno,
        fechaOperacion: input.fechaOperacion,
        horaInicio: input.horaInicio,
        horaFin: input.horaFin,
        tiempoProgramado: input.tiempoProgramado,
        tiempoParado: input.tiempoParado,
        causaParo: input.causaParo,
        unidadesProducidas: input.unidadesProducidas,
        unidadesObjetivo: input.unidadesObjetivo,
        unidadesRechazadas: input.unidadesRechazadas,
        operario: input.operario,
        supervisor: input.supervisor,
        ordenProduccion: orders[index % Math.max(1, orders.length)]?.value ?? null,
        usuarioCrea: 'demo.jefe-planta',
      };

      return this.buildRecord(companyId, payload, machine, null, `2026-04-2${index}T08:00:00-05:00`);
    });
  }

  private buildRecord(
    companyId: string,
    payload: SaveOeeRecordPayload,
    machine: OeeCatalogs['machines'][number],
    current: OeeRecord | null,
    timestamp: string,
  ): OeeRecord {
    const baseRecord: OeeRecord = {
      id:
        current?.id ??
        `oee-${companyId}-${slugify(machine.machineCode)}-${payload.fechaOperacion.replace(/-/g, '')}-${timestamp.replace(/\D/g, '').slice(-9)}`,
      empresaId: companyId,
      empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      planta: payload.planta,
      lineaProduccion: payload.lineaProduccion,
      maquinaId: machine.value,
      maquinaCodigo: machine.machineCode,
      maquinaNombre: machine.machineName,
      turno: payload.turno,
      fechaOperacion: payload.fechaOperacion,
      horaInicio: payload.horaInicio,
      horaFin: payload.horaFin,
      tiempoProgramado: round(payload.tiempoProgramado),
      tiempoParado: round(payload.tiempoParado),
      causaParo: payload.causaParo?.trim() || null,
      unidadesProducidas: round(payload.unidadesProducidas),
      unidadesObjetivo: round(payload.unidadesObjetivo),
      unidadesRechazadas: round(payload.unidadesRechazadas),
      operario: payload.operario.trim(),
      supervisor: payload.supervisor.trim(),
      ordenProduccion: payload.ordenProduccion?.trim() || null,
      disponibilidad: 0,
      rendimiento: 0,
      calidad: 0,
      oee: 0,
      tiempoNetoOperativo: 0,
      tiempoPerdido: 0,
      usuarioCrea: current?.usuarioCrea ?? payload.usuarioCrea.trim(),
      fechaCreacion: current?.fechaCreacion ?? timestamp,
    };

    return this.recalculate(baseRecord);
  }

  private recalculate(record: OeeRecord): OeeRecord {
    const tiempoProgramado = Math.max(0, round(record.tiempoProgramado));
    const tiempoParado = Math.max(0, round(record.tiempoParado));
    const netTime = round(Math.max(0, tiempoProgramado - tiempoParado));
    const disponibilidad = tiempoProgramado === 0 ? 0 : round(netTime / tiempoProgramado);
    const rendimiento = record.unidadesObjetivo === 0 ? 0 : round(record.unidadesProducidas / record.unidadesObjetivo);
    const calidad =
      record.unidadesProducidas === 0 ? 0 : round((record.unidadesProducidas - record.unidadesRechazadas) / record.unidadesProducidas);
    const oee = round(disponibilidad * rendimiento * calidad);

    return {
      ...record,
      tiempoParado,
      tiempoProgramado,
      disponibilidad,
      rendimiento,
      calidad,
      oee,
      tiempoNetoOperativo: netTime,
      tiempoPerdido: tiempoParado,
    };
  }

  private buildAlerts(record: OeeRecord, oeeTarget: number): OeeAlert[] {
    const causes = DEFAULT_DOWNTIME_CAUSES;
    const alerts: OeeAlert[] = [];
    const pushAlert = (type: OeeAlertType, severity: OeeAlertSeverity, description: string) => {
      alerts.push({
        id: `${record.id}-${type}`,
        registroId: record.id,
        tipo: type,
        severidad: severity,
        descripcion: description,
      });
    };

    if (record.oee < oeeTarget) {
      pushAlert('OEE_BAJO', resolveSeverity(record.oee, 0.65, 0.75, oeeTarget), `OEE de ${formatPercent(record.oee)} por debajo de la meta ${formatPercent(oeeTarget)}.`);
    }

    if (record.disponibilidad < 0.9) {
      pushAlert(
        'DISPONIBILIDAD_BAJA',
        resolveSeverity(record.disponibilidad, 0.7, 0.82, 0.9),
        `Disponibilidad de ${formatPercent(record.disponibilidad)} afectada por ${record.tiempoParado} min de paro.`,
      );
    }

    if (record.rendimiento < 0.95) {
      pushAlert(
        'RENDIMIENTO_BAJO',
        resolveSeverity(record.rendimiento, 0.75, 0.85, 0.95),
        `Rendimiento de ${formatPercent(record.rendimiento)} frente a ${record.unidadesObjetivo} uds objetivo.`,
      );
    }

    if (record.calidad < 0.98) {
      pushAlert(
        'CALIDAD_BAJA',
        resolveSeverity(record.calidad, 0.92, 0.96, 0.98),
        `Calidad de ${formatPercent(record.calidad)} con ${record.unidadesRechazadas} unidades rechazadas.`,
      );
    }

    const cause = causes.find((item) => normalize(item.label) === normalize(record.causaParo ?? '')) ?? null;
    const stopRatio = record.tiempoProgramado === 0 ? 0 : record.tiempoParado / record.tiempoProgramado;
    if (record.tiempoParado >= 60 || stopRatio >= 0.2 || cause?.critical) {
      pushAlert(
        'PARO_CRITICO',
        cause?.suggestedSeverity ?? resolveSeverity(1 - stopRatio, 0.5, 0.7, 0.8),
        `${record.causaParo || 'Parada registrada'} acumula ${record.tiempoParado} min dentro del turno.`,
      );
    }

    return alerts.sort((left, right) => compareSeverity(left.severidad, right.severidad));
  }

  private buildAggregate(record: OeeRecord, store: OeeStore): OeeRecordAggregate {
    return {
      record: { ...record },
      alerts: store.alerts
        .filter((item) => item.registroId === record.id)
        .sort((left, right) => compareSeverity(left.severidad, right.severidad))
        .map((item) => ({ ...item })),
      history: this.readHistoryByRecord(store.histories, record.id),
    };
  }

  private buildKpis(records: OeeRecordAggregate[], target: number): OeeKpis {
    const items = records.map((item) => item.record);
    return {
      registrosPeriodo: items.length,
      oeePromedio: average(items.map((item) => item.oee)),
      disponibilidadPromedio: average(items.map((item) => item.disponibilidad)),
      rendimientoPromedio: average(items.map((item) => item.rendimiento)),
      calidadPromedio: average(items.map((item) => item.calidad)),
      maquinasBajoMeta: items.filter((item) => item.oee < target).length,
    };
  }

  private buildHistory(
    registroId: string,
    evento: string,
    usuario: string,
    fecha: string,
    observacion: string,
  ): OeeHistory {
    return {
      id: `${registroId}-${evento}-${Date.parse(fecha)}`,
      registroId,
      evento,
      usuario,
      fecha,
      observacion,
    };
  }

  private buildAuditDraft(
    action: OeeAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): OeeAuditDraft {
    return {
      module: 'oee',
      action,
      companyId,
      companyName: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      entityId,
      entityName,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeRecord(record: OeeRecord): Record<string, unknown> {
    return {
      fechaOperacion: record.fechaOperacion,
      planta: record.planta,
      lineaProduccion: record.lineaProduccion,
      maquinaNombre: record.maquinaNombre,
      turno: record.turno,
      tiempoProgramado: record.tiempoProgramado,
      tiempoParado: record.tiempoParado,
      causaParo: record.causaParo,
      unidadesProducidas: record.unidadesProducidas,
      unidadesObjetivo: record.unidadesObjetivo,
      unidadesRechazadas: record.unidadesRechazadas,
      disponibilidad: record.disponibilidad,
      rendimiento: record.rendimiento,
      calidad: record.calidad,
      oee: record.oee,
      operario: record.operario,
      supervisor: record.supervisor,
      ordenProduccion: record.ordenProduccion,
    };
  }

  private validateRecordPayload(
    companyId: string,
    payload: SaveOeeRecordPayload,
    catalogs: OeeCatalogs,
    currentRecordId?: string,
  ): string | null {
    void currentRecordId;
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!payload.planta) {
      return 'Debes seleccionar la planta.';
    }

    if (!payload.lineaProduccion) {
      return 'Debes seleccionar la linea de produccion.';
    }

    const machine = catalogs.machines.find((item) => item.value === payload.maquinaId) ?? null;
    if (!machine) {
      return 'Debes seleccionar una maquina valida.';
    }

    if (machine.planta !== payload.planta || machine.lineaProduccion !== payload.lineaProduccion) {
      return 'La maquina seleccionada no pertenece a la planta o linea elegida.';
    }

    if (!payload.turno) {
      return 'Debes seleccionar el turno.';
    }

    if (!payload.fechaOperacion) {
      return 'Debes registrar la fecha de operacion.';
    }

    if (!payload.horaInicio || !payload.horaFin) {
      return 'Debes registrar hora de inicio y fin.';
    }

    if (minutesFromTime(payload.horaFin) < minutesFromTime(payload.horaInicio) && payload.turno !== 'NOCHE') {
      return 'La hora fin no puede ser menor que la hora inicio.';
    }

    if (payload.turno === 'NOCHE' && payload.horaFin === payload.horaInicio) {
      return 'El turno noche requiere una hora fin valida.';
    }

    if (!isNonNegative(payload.tiempoProgramado) || !isNonNegative(payload.tiempoParado)) {
      return 'Los tiempos no pueden ser negativos.';
    }

    if (payload.tiempoParado > payload.tiempoProgramado) {
      return 'El tiempo parado no puede ser mayor que el tiempo programado.';
    }

    if (!isNonNegative(payload.unidadesProducidas) || !isNonNegative(payload.unidadesObjetivo) || !isNonNegative(payload.unidadesRechazadas)) {
      return 'Las cantidades no pueden ser negativas.';
    }

    if (payload.unidadesRechazadas > payload.unidadesProducidas) {
      return 'Las unidades rechazadas no pueden ser mayores que las producidas.';
    }

    if (!payload.operario.trim()) {
      return 'Debes registrar el operario.';
    }

    if (!payload.supervisor.trim()) {
      return 'Debes registrar el supervisor.';
    }

    return null;
  }

  private normalizeFilters(filters: OeeFilters): OeeFilters {
    return {
      ...DEFAULT_OEE_FILTERS,
      ...filters,
      fechaOperacion: filters.fechaOperacion || null,
      planta: filters.planta || null,
      lineaProduccion: filters.lineaProduccion || null,
      maquinaId: filters.maquinaId || null,
      turno: filters.turno || null,
      operario: filters.operario || null,
      severidadAlerta: filters.severidadAlerta ?? 'TODAS',
    };
  }

  private matchesFilters(record: OeeRecord, filters: OeeFilters): boolean {
    return (
      (!filters.fechaOperacion || record.fechaOperacion === filters.fechaOperacion) &&
      (!filters.planta || record.planta === filters.planta) &&
      (!filters.lineaProduccion || record.lineaProduccion === filters.lineaProduccion) &&
      (!filters.maquinaId || record.maquinaId === filters.maquinaId) &&
      (!filters.turno || record.turno === filters.turno) &&
      (!filters.operario || record.operario === filters.operario)
    );
  }

  private findRecord(store: OeeStore, companyId: string, recordId: string): OeeRecord | null {
    const record = store.records.find((item) => item.empresaId === companyId && item.id === recordId) ?? null;
    return record ? { ...record } : null;
  }

  private belongsToCompany(records: OeeRecord[], companyId: string, recordId: string): boolean {
    return records.some((item) => item.empresaId === companyId && item.id === recordId);
  }

  private readHistoryByRecord(histories: OeeHistory[], recordId: string): OeeHistory[] {
    return histories
      .filter((item) => item.registroId === recordId)
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
      .map((item) => ({ ...item }));
  }

  private readEquipments(companyId: string): Equipment[] {
    if (typeof window === 'undefined') {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    const raw = localStorage.getItem(EQUIPMENTS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    try {
      const parsed = JSON.parse(raw) as EquipmentStore;
      return (parsed.equipments ?? [])
        .filter((item) => item.empresaId === companyId)
        .map((item) => ({ ...item }));
    } catch {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }
  }

  private readProducts(companyId: string): Product[] {
    if (typeof window === 'undefined') {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    try {
      const parsed = JSON.parse(raw) as ProductStore;
      return (parsed.products ?? [])
        .filter((item) => item.empresaId === companyId)
        .map((item) => ({ ...item }));
    } catch {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }
  }

  private readMpsStore(): MpsStore {
    if (typeof window === 'undefined') {
      return {
        plans: [],
        productionLines: [],
        auditTrail: [],
      };
    }

    const raw = localStorage.getItem(MPS_STORAGE_KEY);
    if (!raw) {
      return {
        plans: [],
        productionLines: [],
        auditTrail: [],
      };
    }

    try {
      const parsed = JSON.parse(raw) as MpsStore;
      return {
        plans: parsed.plans ?? [],
        productionLines: parsed.productionLines ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return {
        plans: [],
        productionLines: [],
        auditTrail: [],
      };
    }
  }
}

function createEmptyStore(): OeeStore {
  return {
    records: [],
    alerts: [],
    histories: [],
    auditTrail: [],
  };
}

function createMachineEntry(
  equipment: Equipment | undefined,
  planta: string,
  lineaProduccion: string,
): MachineCatalogEntry | null {
  if (!equipment) {
    return null;
  }

  return {
    id: equipment.id,
    code: equipment.idEquipo,
    name: equipment.nombreEquipo,
    planta,
    lineaProduccion,
  };
}

function resolveSeverity(value: number, highLimit: number, mediumLimit: number, lowLimit: number): OeeAlertSeverity {
  if (value < highLimit) {
    return 'ALTA';
  }

  if (value < mediumLimit) {
    return 'MEDIA';
  }

  if (value < lowLimit) {
    return 'BAJA';
  }

  return 'BAJA';
}

function compareSeverity(left: OeeAlertSeverity, right: OeeAlertSeverity): number {
  const weight: Record<OeeAlertSeverity, number> = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return weight[right] - weight[left];
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function round(value: number): number {
  return Number(Number(value).toFixed(4));
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return (hours * 60) + minutes;
}

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function mergeCause(currentCause: string | null, nextCause: string): string {
  const items = [currentCause, nextCause]
    .map((item) => item?.trim())
    .filter((item): item is string => !!item);

  return Array.from(new Set(items)).join(' | ');
}

function dedupeOrders<T extends { value: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (!map.has(item.value)) {
      map.set(item.value, item);
    }
  });
  return Array.from(map.values());
}
