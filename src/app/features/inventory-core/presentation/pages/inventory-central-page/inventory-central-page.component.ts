import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { CompanyContextService } from '../../../../../core/company/services/company-context.service';
import { CostsCoreFacadeService } from '../../../../costs-core/application/facade/costs-core.facade';
import { CostMovement } from '../../../../costs-core/domain/models/cost-movement.model';
import { InventoryCoreFacadeService } from '../../../application/facade/inventory-core.facade';
import { InventoryBalance } from '../../../domain/models/inventory-balance.model';
import { InventoryLot, InventoryLotStatus } from '../../../domain/models/inventory-lot.model';
import { InventoryMovement, InventoryMovementType } from '../../../domain/models/inventory-movement.model';
import { InventoryReservation, InventoryReservationStatus } from '../../../domain/models/inventory-reservation.model';
import {
  InventoryLotFilters,
  InventoryMovementFilters,
  InventoryReservationFilters,
  InventoryStockFilters,
} from '../../../domain/repositories/inventory-core.repository';

type InventoryCentralTab = 'saldos' | 'kardex' | 'lotes' | 'reservas' | 'costos';

interface InventoryCentralFilters {
  search: string;
  bodegaId: string;
  ubicacionId: string;
  loteId: string;
  tipoMovimiento: InventoryMovementType | 'TODOS';
  moduloOrigen: string;
  fechaDesde: string;
  fechaHasta: string;
  estadoLote: InventoryLotStatus | 'TODOS';
  estadoReserva: InventoryReservationStatus | 'TODOS';
}

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  tone: 'slate' | 'emerald' | 'amber' | 'blue' | 'rose';
}

const MOVEMENT_TYPES: Array<InventoryMovementType | 'TODOS'> = [
  'TODOS',
  'COMPRA_RECEPCION',
  'AJUSTE_POS',
  'AJUSTE_NEG',
  'DESPACHO_VENTA',
  'CONSUMO_MP',
  'INGRESO_PT',
  'BLOQUEO_CALIDAD',
  'LIBERACION_CALIDAD',
  'RECHAZO_CALIDAD',
  'MERMA_CALIDAD',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'RESERVA_STOCK',
  'LIBERACION_RESERVA',
  'CONSUMO_REPUESTO_TPM',
  'DEVOLUCION',
];

@Component({
  selector: 'app-inventory-central-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <header class="erp-page-header">
        <div>
          <p class="erp-page-eyebrow">Inventory Core / consola interna</p>
          <h1 class="erp-page-title">Inventario Central</h1>
          <p class="erp-page-description">
            Visor tecnico solo lectura para validar saldos, kardex, lotes, reservas y costos asociados del inventario central.
          </p>
        </div>
        <div class="flex flex-col items-start gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:items-end">
          <span class="font-semibold text-slate-950">{{ activeCompanyName() }}</span>
          <span class="text-xs text-slate-500">Modo mock-first / localStorage</span>
          <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Solo lectura
          </span>
        </div>
      </header>

      <section class="erp-card">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtros tecnicos</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Consulta de trazabilidad</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="erp-btn erp-btn-secondary" (click)="resetFilters()">
              Limpiar
            </button>
            <button type="button" class="erp-btn erp-btn-primary" (click)="loadData()">
              Actualizar
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="erp-field">
            <span class="erp-label">SKU / producto</span>
            <input class="erp-input" [(ngModel)]="filters.search" (keyup.enter)="loadData()" placeholder="ARB-UHT, yogurt, lote" />
          </label>
          <label class="erp-field">
            <span class="erp-label">Bodega</span>
            <select class="erp-input" [(ngModel)]="filters.bodegaId">
              <option value="">Todas</option>
              <option *ngFor="let option of warehouseOptions()" [value]="option">{{ option }}</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Ubicacion</span>
            <select class="erp-input" [(ngModel)]="filters.ubicacionId">
              <option value="">Todas</option>
              <option *ngFor="let option of locationOptions()" [value]="option">{{ option }}</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Lote</span>
            <select class="erp-input" [(ngModel)]="filters.loteId">
              <option value="">Todos</option>
              <option *ngFor="let option of lotOptions()" [value]="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Tipo movimiento</span>
            <select class="erp-input" [(ngModel)]="filters.tipoMovimiento">
              <option *ngFor="let type of movementTypes" [value]="type">{{ label(type) }}</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Modulo origen</span>
            <select class="erp-input" [(ngModel)]="filters.moduloOrigen">
              <option value="">Todos</option>
              <option *ngFor="let option of moduleOptions()" [value]="option">{{ label(option) }}</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Fecha desde</span>
            <input class="erp-input" type="date" [(ngModel)]="filters.fechaDesde" />
          </label>
          <label class="erp-field">
            <span class="erp-label">Fecha hasta</span>
            <input class="erp-input" type="date" [(ngModel)]="filters.fechaHasta" />
          </label>
          <label class="erp-field">
            <span class="erp-label">Estado lote</span>
            <select class="erp-input" [(ngModel)]="filters.estadoLote">
              <option value="TODOS">Todos</option>
              <option value="LIBERADO">Liberado</option>
              <option value="RETENIDO">Retenido</option>
              <option value="BLOQUEADO">Bloqueado</option>
              <option value="CUARENTENA">Cuarentena</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </label>
          <label class="erp-field">
            <span class="erp-label">Estado reserva</span>
            <select class="erp-input" [(ngModel)]="filters.estadoReserva">
              <option value="TODOS">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="LIBERADA">Liberada</option>
              <option value="CONSUMIDA">Consumida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </label>
        </div>
      </section>

      <div *ngIf="loading()" class="erp-card">
        <p class="text-sm font-semibold text-slate-700">Cargando Inventario Central...</p>
        <p class="mt-1 text-sm text-slate-500">Consultando facades de Inventory Core y Costos Core en modo mock.</p>
      </div>

      <div *ngIf="errorMessage()" class="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ errorMessage() }}
      </div>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article *ngFor="let card of summaryCards()" class="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-semibold" [ngClass]="cardToneClass(card.tone)">{{ card.value }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ card.hint }}</p>
        </article>
      </section>

      <section class="erp-card">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Consulta read-only</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Trazabilidad central</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let tab of tabs"
              type="button"
              class="rounded-md border px-3 py-2 text-sm font-semibold transition"
              [ngClass]="activeTab() === tab.id ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <ng-container [ngSwitch]="activeTab()">
          <div *ngSwitchCase="'saldos'" class="erp-table-shell mt-5 overflow-x-auto">
            <table class="erp-data-table min-w-[78rem]">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Bodega</th>
                  <th>Ubicacion</th>
                  <th>Lote</th>
                  <th>Disponible</th>
                  <th>Reservado</th>
                  <th>Transito</th>
                  <th>Costo unitario</th>
                  <th>Ultimo movimiento</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let balance of filteredBalances()">
                  <td class="font-semibold text-slate-950">{{ balance.sku }}</td>
                  <td>{{ productName(balance.sku, balance.productoId) }}</td>
                  <td>{{ balance.bodegaId }}</td>
                  <td>{{ balance.ubicacionId }}</td>
                  <td>{{ balance.lote ?? 'SIN_LOTE' }}</td>
                  <td>{{ formatNumber(balance.cantidadDisponible) }}</td>
                  <td>{{ formatNumber(reservedForBalance(balance)) }}</td>
                  <td>{{ formatNumber(balance.cantidadTransito) }}</td>
                  <td>{{ formatCurrency(resolveUnitCost(balance)) }}</td>
                  <td>{{ formatDateTime(balance.fechaUltimoMovimiento) }}</td>
                </tr>
              </tbody>
            </table>
            <p *ngIf="!filteredBalances().length" class="p-6 text-sm text-slate-500">Sin saldos centrales para los filtros seleccionados.</p>
          </div>

          <div *ngSwitchCase="'kardex'" class="erp-table-shell mt-5 overflow-x-auto">
            <table class="erp-data-table min-w-[92rem]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo movimiento</th>
                  <th>Modulo origen</th>
                  <th>Documento origen</th>
                  <th>SKU</th>
                  <th>Lote</th>
                  <th>Cantidad</th>
                  <th>Signo</th>
                  <th>Costo unitario</th>
                  <th>Costo total</th>
                  <th>Saldo resultante</th>
                  <th>Observacion</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let movement of filteredMovements()">
                  <td>{{ formatDateTime(movement.fechaMovimiento) }}</td>
                  <td><span class="status-pill bg-slate-100 text-slate-700">{{ label(movement.tipoMovimiento) }}</span></td>
                  <td>{{ label(movement.moduloOrigen) }}</td>
                  <td>{{ movement.documentoOrigen ?? 'N/A' }}</td>
                  <td class="font-semibold text-slate-950">{{ movement.sku }}</td>
                  <td>{{ movement.lote ?? 'SIN_LOTE' }}</td>
                  <td>{{ formatNumber(movement.cantidad) }}</td>
                  <td>{{ movement.signo }}</td>
                  <td>{{ formatCurrency(movement.costoUnitario) }}</td>
                  <td>{{ formatCurrency(movement.costoTotal) }}</td>
                  <td>{{ formatNumber(movement.saldoResultante) }}</td>
                  <td class="max-w-xs whitespace-normal text-slate-500">{{ movement.observacion ?? 'Sin observacion' }}</td>
                </tr>
              </tbody>
            </table>
            <p *ngIf="!filteredMovements().length" class="p-6 text-sm text-slate-500">Sin movimientos de kardex para los filtros seleccionados.</p>
          </div>

          <div *ngSwitchCase="'lotes'" class="erp-table-shell mt-5 overflow-x-auto">
            <table class="erp-data-table min-w-[78rem]">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Fabricacion</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                  <th>Orden produccion</th>
                  <th>Disponible asociado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let lot of filteredLots()" [ngClass]="lot.estado !== 'LIBERADO' ? 'bg-amber-50/50' : ''">
                  <td class="font-semibold text-slate-950">{{ lot.numeroLote }}</td>
                  <td>{{ lot.sku }}</td>
                  <td>{{ productName(lot.sku, lot.productoId) }}</td>
                  <td>{{ formatDate(lot.fechaFabricacion) }}</td>
                  <td>{{ formatDate(lot.fechaVencimiento) }}</td>
                  <td><span class="status-pill" [ngClass]="lotStatusClass(lot.estado)">{{ label(lot.estado) }}</span></td>
                  <td>{{ lot.proveedorId ?? 'N/A' }}</td>
                  <td>{{ lot.ordenProduccionId ?? 'N/A' }}</td>
                  <td>{{ formatNumber(availableForLot(lot)) }}</td>
                </tr>
              </tbody>
            </table>
            <p *ngIf="!filteredLots().length" class="p-6 text-sm text-slate-500">Sin lotes para los filtros seleccionados.</p>
          </div>

          <div *ngSwitchCase="'reservas'" class="erp-table-shell mt-5 overflow-x-auto">
            <table class="erp-data-table min-w-[78rem]">
              <thead>
                <tr>
                  <th>Reservation ID</th>
                  <th>SKU</th>
                  <th>Lote</th>
                  <th>Bodega</th>
                  <th>Cantidad</th>
                  <th>Origen tipo</th>
                  <th>Origen ID</th>
                  <th>Estado</th>
                  <th>Fecha creacion</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let reservation of filteredReservations()">
                  <td class="font-semibold text-slate-950">{{ reservation.id }}</td>
                  <td>{{ reservation.sku }}</td>
                  <td>{{ reservation.lote }}</td>
                  <td>{{ reservation.bodegaId }}</td>
                  <td>{{ formatNumber(reservation.cantidad) }}</td>
                  <td>{{ label(reservation.origenTipo) }}</td>
                  <td>{{ reservation.origenId }}</td>
                  <td><span class="status-pill" [ngClass]="reservationStatusClass(reservation.estado)">{{ label(reservation.estado) }}</span></td>
                  <td>{{ formatDateTime(reservation.fechaCrea) }}</td>
                </tr>
              </tbody>
            </table>
            <p *ngIf="!filteredReservations().length" class="p-6 text-sm text-slate-500">Sin reservas para los filtros seleccionados.</p>
          </div>

          <div *ngSwitchCase="'costos'" class="erp-table-shell mt-5 overflow-x-auto">
            <table class="erp-data-table min-w-[72rem]" *ngIf="filteredCostMovements().length; else emptyCosts">
              <thead>
                <tr>
                  <th>Inventory movement ID</th>
                  <th>SKU</th>
                  <th>Tipo origen</th>
                  <th>Cantidad</th>
                  <th>Costo unitario</th>
                  <th>Costo total</th>
                  <th>Metodo costo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cost of filteredCostMovements()">
                  <td class="font-semibold text-slate-950">{{ cost.inventoryMovementId }}</td>
                  <td>{{ cost.sku }}</td>
                  <td>{{ label(cost.tipoOrigen) }}</td>
                  <td>{{ formatNumber(cost.cantidad) }}</td>
                  <td>{{ formatCurrency(cost.costoUnitario) }}</td>
                  <td>{{ formatCurrency(cost.costoTotal) }}</td>
                  <td>{{ label(cost.metodoCosto) }}</td>
                  <td>{{ formatDateTime(cost.fecha) }}</td>
                </tr>
              </tbody>
            </table>
            <ng-template #emptyCosts>
              <p class="p-6 text-sm text-slate-500">Sin movimientos de costo para los filtros seleccionados.</p>
            </ng-template>
          </div>
        </ng-container>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .erp-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .erp-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
      }

      .erp-input {
        min-height: 2.5rem;
        border-radius: 0.375rem;
        border: 1px solid #cbd5e1;
        background: white;
        padding: 0.5rem 0.75rem;
        color: #0f172a;
        outline: none;
      }

      .erp-input:focus {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgb(15 118 110 / 12%);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
      }
    `,
  ],
})
export class InventoryCentralPageComponent implements OnInit {
  private readonly inventoryCoreFacade = inject(InventoryCoreFacadeService);
  private readonly costsCoreFacade = inject(CostsCoreFacadeService);
  private readonly companyContextService = inject(CompanyContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeCompanyName = signal('Empresa activa');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<InventoryCentralTab>('saldos');
  readonly balances = signal<InventoryBalance[]>([]);
  readonly movements = signal<InventoryMovement[]>([]);
  readonly lots = signal<InventoryLot[]>([]);
  readonly reservations = signal<InventoryReservation[]>([]);
  readonly costMovements = signal<CostMovement[]>([]);

  readonly movementTypes = MOVEMENT_TYPES;
  readonly tabs: Array<{ id: InventoryCentralTab; label: string }> = [
    { id: 'saldos', label: 'Saldos' },
    { id: 'kardex', label: 'Kardex' },
    { id: 'lotes', label: 'Lotes' },
    { id: 'reservas', label: 'Reservas' },
    { id: 'costos', label: 'Costos' },
  ];

  filters: InventoryCentralFilters = this.createDefaultFilters();

  readonly productNames = computed(() => {
    const names = new Map<string, string>();

    this.movements().forEach((movement) => {
      names.set(movement.sku, movement.productoNombre);
      names.set(movement.productoId, movement.productoNombre);
    });
    this.costMovements().forEach((movement) => {
      names.set(movement.sku, movement.productoNombre);
      names.set(movement.productoId, movement.productoNombre);
    });

    return names;
  });

  readonly filteredBalances = computed(() =>
    this.balances().filter((balance) => this.matchesSearch(balance.sku, this.productName(balance.sku, balance.productoId), balance.lote)),
  );

  readonly filteredMovements = computed(() =>
    this.movements().filter((movement) =>
      this.matchesSearch(movement.sku, movement.productoNombre, movement.lote) &&
      (!this.filters.moduloOrigen || movement.moduloOrigen === this.filters.moduloOrigen),
    ),
  );

  readonly filteredLots = computed(() =>
    this.lots().filter((lot) => this.matchesSearch(lot.sku, this.productName(lot.sku, lot.productoId), lot.numeroLote)),
  );

  readonly filteredReservations = computed(() =>
    this.reservations().filter((reservation) =>
      this.matchesSearch(reservation.sku, this.productName(reservation.sku, reservation.productoId), reservation.lote),
    ),
  );

  readonly filteredCostMovements = computed(() =>
    this.costMovements().filter((movement) =>
      this.matchesSearch(movement.sku, movement.productoNombre, movement.inventoryMovementId),
    ),
  );

  readonly warehouseOptions = computed(() =>
    Array.from(new Set(this.balances().map((item) => item.bodegaId).filter(Boolean))).sort(),
  );

  readonly locationOptions = computed(() =>
    Array.from(new Set(this.balances().map((item) => item.ubicacionId).filter(Boolean))).sort(),
  );

  readonly lotOptions = computed(() =>
    this.lots()
      .map((lot) => ({ value: lot.id, label: `${lot.numeroLote} / ${lot.sku}` }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
  );

  readonly moduleOptions = computed(() =>
    Array.from(new Set(this.movements().map((item) => item.moduloOrigen).filter(Boolean))).sort(),
  );

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const balances = this.filteredBalances();
    const reservations = this.filteredReservations();
    const lots = this.filteredLots();
    const movements = this.filteredMovements();
    const availableTotal = balances.reduce((sum, item) => sum + item.cantidadDisponible, 0);
    const reservedTotal = reservations
      .filter((item) => item.estado === 'ACTIVA')
      .reduce((sum, item) => sum + item.cantidad, 0);
    const inventoryValue = balances.reduce((sum, item) => {
      const quantity = item.cantidadDisponible + this.reservedForBalance(item) + item.cantidadTransito;
      return sum + quantity * this.resolveUnitCost(item);
    }, 0);

    return [
      {
        label: 'SKUs con saldo',
        value: this.formatNumber(new Set(balances.filter((item) => item.cantidadDisponible > 0).map((item) => item.sku)).size),
        hint: 'Unicos con stock disponible',
        tone: 'slate',
      },
      {
        label: 'Stock disponible',
        value: this.formatNumber(availableTotal),
        hint: 'Suma central por filtros',
        tone: 'emerald',
      },
      {
        label: 'Stock reservado',
        value: this.formatNumber(reservedTotal),
        hint: 'Reservas activas',
        tone: reservedTotal > 0 ? 'amber' : 'slate',
      },
      {
        label: 'Lotes activos',
        value: this.formatNumber(lots.filter((item) => item.estado === 'LIBERADO').length),
        hint: 'Lotes liberados',
        tone: 'blue',
      },
      {
        label: 'Movimientos periodo',
        value: this.formatNumber(movements.length),
        hint: 'Kardex consultado',
        tone: 'slate',
      },
      {
        label: 'Reservas activas',
        value: this.formatNumber(reservations.filter((item) => item.estado === 'ACTIVA').length),
        hint: 'Solo trazabilidad',
        tone: 'amber',
      },
      {
        label: 'Valor estimado',
        value: this.formatCurrency(inventoryValue),
        hint: 'Inventory Core + costos mock',
        tone: 'emerald',
      },
    ];
  });

  ngOnInit(): void {
    this.companyContextService.activeCompany$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((company) => {
        this.activeCompanyName.set(company?.name ?? 'Empresa activa');
        this.loadData();
      });
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      balances: this.inventoryCoreFacade.getStock(this.stockFilters()),
      movements: this.inventoryCoreFacade.getMovements(this.movementFilters()),
      lots: this.inventoryCoreFacade.getLots(this.lotFilters()),
      reservations: this.inventoryCoreFacade.getReservations(this.reservationFilters()),
      costMovements: this.costsCoreFacade.getCostMovements({
        sku: this.exactSkuFilter(),
        tipoOrigen: this.filters.tipoMovimiento,
        moduloOrigen: this.filters.moduloOrigen || null,
        fechaDesde: this.filters.fechaDesde || null,
        fechaHasta: this.filters.fechaHasta || null,
      }),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.balances.set(result.balances);
          this.movements.set(result.movements);
          this.lots.set(result.lots);
          this.reservations.set(result.reservations);
          this.costMovements.set(result.costMovements);
        },
        error: (error: unknown) => {
          this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar Inventario Central.');
        },
      });
  }

  resetFilters(): void {
    this.filters = this.createDefaultFilters();
    this.loadData();
  }

  productName(sku: string, productId?: string | null): string {
    return this.productNames().get(sku) ?? (productId ? this.productNames().get(productId) : null) ?? sku;
  }

  reservedForBalance(balance: InventoryBalance): number {
    const reservationQuantity = this.reservations()
      .filter((item) => item.estado === 'ACTIVA')
      .filter((item) => item.productoId === balance.productoId && item.bodegaId === balance.bodegaId)
      .filter((item) => item.loteId === (balance.loteId ?? 'SIN_LOTE'))
      .reduce((sum, item) => sum + item.cantidad, 0);

    return Math.max(balance.cantidadReservada, reservationQuantity);
  }

  availableForLot(lot: InventoryLot): number {
    return this.balances()
      .filter((item) => item.loteId === lot.id)
      .reduce((sum, item) => sum + item.cantidadDisponible, 0);
  }

  resolveUnitCost(balance: InventoryBalance): number {
    if (balance.costoUnitario > 0) {
      return balance.costoUnitario;
    }

    const costMovement = this.costMovements().find((item) => item.sku === balance.sku);
    if (costMovement?.costoUnitario) {
      return costMovement.costoUnitario;
    }

    if (balance.sku.includes('UHT')) {
      return 1800;
    }

    if (balance.sku.includes('YOG')) {
      return 920;
    }

    if (balance.sku.includes('QUE')) {
      return 4800;
    }

    if (balance.sku.includes('EMP')) {
      return 110;
    }

    return 1500;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'N/A';
    }

    const normalizedValue = value.length === 10 ? `${value}T12:00:00` : value;

    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(normalizedValue));
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  label(value: string): string {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  cardToneClass(tone: SummaryCard['tone']): string {
    const tones: Record<SummaryCard['tone'], string> = {
      slate: 'text-slate-950',
      emerald: 'text-emerald-700',
      amber: 'text-amber-700',
      blue: 'text-blue-700',
      rose: 'text-rose-700',
    };

    return tones[tone];
  }

  lotStatusClass(status: InventoryLotStatus): string {
    const classes: Record<InventoryLotStatus, string> = {
      LIBERADO: 'bg-emerald-50 text-emerald-700',
      RETENIDO: 'bg-amber-50 text-amber-700',
      BLOQUEADO: 'bg-rose-50 text-rose-700',
      CUARENTENA: 'bg-blue-50 text-blue-700',
      RECHAZADO: 'bg-rose-100 text-rose-800',
    };

    return classes[status];
  }

  reservationStatusClass(status: InventoryReservationStatus): string {
    const classes: Record<InventoryReservationStatus, string> = {
      ACTIVA: 'bg-amber-50 text-amber-700',
      LIBERADA: 'bg-emerald-50 text-emerald-700',
      CONSUMIDA: 'bg-blue-50 text-blue-700',
      CANCELADA: 'bg-slate-100 text-slate-600',
    };

    return classes[status];
  }

  private createDefaultFilters(): InventoryCentralFilters {
    return {
      search: '',
      bodegaId: '',
      ubicacionId: '',
      loteId: '',
      tipoMovimiento: 'TODOS',
      moduloOrigen: '',
      fechaDesde: '2026-05-01',
      fechaHasta: '2026-05-31',
      estadoLote: 'TODOS',
      estadoReserva: 'TODOS',
    };
  }

  private stockFilters(): InventoryStockFilters {
    return {
      sku: this.exactSkuFilter(),
      bodegaId: this.filters.bodegaId || null,
      ubicacionId: this.filters.ubicacionId || null,
      loteId: this.filters.loteId || null,
    };
  }

  private movementFilters(): InventoryMovementFilters {
    return {
      ...this.stockFilters(),
      tipoMovimiento: this.filters.tipoMovimiento,
      fechaDesde: this.filters.fechaDesde || null,
      fechaHasta: this.filters.fechaHasta || null,
    };
  }

  private lotFilters(): InventoryLotFilters {
    return {
      ...this.stockFilters(),
      estado: this.filters.estadoLote,
    };
  }

  private reservationFilters(): InventoryReservationFilters {
    return {
      ...this.stockFilters(),
      estado: this.filters.estadoReserva,
    };
  }

  private exactSkuFilter(): string | null {
    const search = this.filters.search.trim().toUpperCase();
    const knownSkus = new Set([
      ...this.balances().map((item) => item.sku),
      ...this.lots().map((item) => item.sku),
      ...this.movements().map((item) => item.sku),
    ]);

    return knownSkus.has(search) ? search : null;
  }

  private matchesSearch(sku: string, productName: string, lot?: string | null): boolean {
    const search = this.filters.search.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return [sku, productName, lot ?? ''].some((value) => value.toLowerCase().includes(search));
  }
}
