import { RouteCatalogItem } from '../../domain/models/route-catalog.model';

const BASE_ROUTES = [
  { suffix: '001', nombreRuta: 'Zona norte 1', zona: 'Zona norte 1' },
  { suffix: '002', nombreRuta: 'Zona norte 2', zona: 'Zona norte 2' },
  { suffix: '003', nombreRuta: 'Zona sur 1', zona: 'Zona sur 1' },
  { suffix: '004', nombreRuta: 'Zona sur 2', zona: 'Zona sur 2' },
  { suffix: '005', nombreRuta: 'Zona sur 3', zona: 'Zona sur 3' },
];

export const INITIAL_ROUTE_CATALOG: RouteCatalogItem[] = [
  ...buildCompanyRoutes('medussa-holding', 'Medussa Holding', 'RTH'),
  ...buildCompanyRoutes('medussa-retail', 'Industrias Alimenticias El Arbolito', 'RTA'),
  ...buildCompanyRoutes('medussa-industrial', 'Medussa Industrial', 'RTI'),
  ...buildCompanyRoutes('medussa-services', 'Medussa Services', 'RTS'),
];

function buildCompanyRoutes(
  empresaId: string,
  empresaNombre: string,
  prefix: string,
): RouteCatalogItem[] {
  return BASE_ROUTES.map((route) => ({
    routeId: `route-${empresaId}-${route.suffix}`,
    idRuta: `${prefix}-${route.suffix}`,
    nombreRuta: route.nombreRuta,
    zona: route.zona,
    estado: 'ACTIVO',
    empresaId,
    empresaNombre,
  }));
}
