export interface ProductionLine {
  id: string;
  empresaId: string;
  planta: string;
  nombre: string;
  capacidadHorasSemana: number;
  setupHoras: number;
  skusCompatibles: string[];
}

export interface MpsCapacitySummary {
  lineaId: string;
  lineaProduccion: string;
  planta: string;
  horasPlanificadas: number;
  capacidadHorasDisponibles: number;
  saturacionPct: number;
  saturada: boolean;
}
