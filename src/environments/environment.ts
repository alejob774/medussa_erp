export const environment = {
  apiUrl: 'http://127.0.0.1:8000/api/v1',

  // Auth
  allowMockLoginFallback: true,

  // Settings and company context
  useCompanySettingsMock: true,
  useCompaniesAdministrationMock: true,
  enableCompaniesAdministrationFallback: true,

  // Commercial masters
  useClientsAdministrationMock: true,
  enableClientsAdministrationFallback: true,
  useVendorsAdministrationMock: true,
  enableVendorsAdministrationFallback: false,
  useDriversAdministrationMock: true,
  enableDriversAdministrationFallback: false,
  useRoutesAdministrationMock: true,
  enableRoutesAdministrationFallback: false,

  // Supply, inventory, and operations masters
  useProductsAdministrationMock: true,
  enableProductsAdministrationFallback: true,
  useSuppliersAdministrationMock: true,
  enableSuppliersAdministrationFallback: false,
  useEquipmentsAdministrationMock: true,
  enableEquipmentsAdministrationFallback: false,

  // SCM and planning domains
  useDemandForecastMock: true,
  useDemandAnalysisMock: true,
  useMpsMock: true,
  usePurchaseAnalysisMock: true,
  useBudgetManagementMock: true,
  useStorageLayoutMock: true,
  useInventoryCycleMock: true,
  usePickingPackingMock: true,

  // Production, quality, and cost domains
  useInventoryCoreMock: true,
  useCostsCoreMock: true,
  useProductDevelopmentMock: true,
  useBomFormulaMock: true,
  useOeeMock: true,
  useTpmMock: true,
  useQualityControlMock: true,

  // BI
  useBusinessIntelligenceMock: true,

  // Security and audit
  useSecurityAdministrationMock: true,
  enableSecurityAdministrationFallback: true,
  useAuditLogsMock: true,
  enableAuditLogsFallback: true,
};
