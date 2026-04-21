export type PackingType = 'Caja' | 'Canastilla' | 'Bolsa' | 'Mixto';
export type PackingState = 'PENDIENTE' | 'EMPACANDO' | 'CERRADO' | 'LISTO_PARA_DESPACHO';

export interface Packing {
  id: string;
  empresaId: string;
  pedidoId: string;
  tipoEmpaque: PackingType;
  pesoTotal: number;
  volumenTotal: number;
  fechaCierre: string | null;
  usuarioCierre: string | null;
  estado: PackingState;
  packingListCodigo: string | null;
  packingListResumen: string[];
}
