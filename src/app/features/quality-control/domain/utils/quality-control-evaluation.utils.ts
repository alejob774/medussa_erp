import { QualityInspectionDetail } from '../models/quality-inspection-detail.model';
import { QualityInspectionEvaluation } from '../models/quality-inspection.model';
import { QualityControlType } from '../models/quality-status.model';

const AUTHORIZED_RELEASERS = ['Jefe de Calidad', 'Director Técnico'];

export function evaluateInspectionParameters(
  tipoControl: QualityControlType,
  parameters: QualityInspectionDetail[],
): QualityInspectionEvaluation {
  const totalParametros = parameters.length;
  const noConformes = parameters.filter((item) => !item.conforme).length;
  const criticosFueraDeRango = parameters.filter((item) => !item.conforme && !!item.esCritico).length;
  const conformes = totalParametros - noConformes;
  const containsCriticalMicrobiology = parameters.some(
    (item) =>
      !item.conforme &&
      !!item.esCritico &&
      normalize(item.parametro).includes('microbiologia'),
  );

  if (!totalParametros) {
    return {
      totalParametros,
      conformes,
      noConformes,
      criticosFueraDeRango,
      sugerenciaEstado: 'PENDIENTE',
      accionSugerida: 'REINSPECCION',
      inspeccionConforme: false,
    };
  }

  if (criticosFueraDeRango > 0) {
    const suggestedStatus =
      tipoControl === 'PRODUCTO_TERMINADO' || containsCriticalMicrobiology
        ? 'RECHAZADO'
        : 'CUARENTENA';

    return {
      totalParametros,
      conformes,
      noConformes,
      criticosFueraDeRango,
      sugerenciaEstado: suggestedStatus,
      accionSugerida: suggestedStatus === 'RECHAZADO' ? 'RECHAZAR' : 'CUARENTENA',
      inspeccionConforme: false,
    };
  }

  if (noConformes > 0) {
    return {
      totalParametros,
      conformes,
      noConformes,
      criticosFueraDeRango,
      sugerenciaEstado: 'CUARENTENA',
      accionSugerida: 'CUARENTENA',
      inspeccionConforme: false,
    };
  }

  return {
    totalParametros,
    conformes,
    noConformes,
    criticosFueraDeRango,
    sugerenciaEstado: 'APROBADO',
    accionSugerida: 'APROBAR',
    inspeccionConforme: true,
  };
}

export function resolveParameterConformity(
  result: number,
  min: number,
  max: number,
): boolean {
  return Number(result) >= Number(min) && Number(result) <= Number(max);
}

export function isAuthorizedQualityReleaser(user: string | null | undefined): boolean {
  return AUTHORIZED_RELEASERS.includes((user ?? '').trim());
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
