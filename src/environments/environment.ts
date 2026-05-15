export const environment = {
  apiUrl: 'http://127.0.0.1:8000/api/v1',

  // Auth
  useAuthMock: true,
  enableAuthFallback: true,
  allowMockLoginFallback: true,
  useUserCompaniesMock: true,
  enableUserCompaniesFallback: true,

  // Settings and company context
  useCompanySettingsMock: true,
  useCompaniesAdministrationMock: true,
  enableCompaniesAdministrationFallback: true,

  // Commercial masters
  useClientsAdministrationMock: true,
  enableClientsAdministrationFallback: true,
  useVendorsAdministrationMock: true,
  enableVendorsAdministrationFallback: true,
  useOrdersMock: true,
  enableOrdersFallback: true,
  useDriversAdministrationMock: true,
  enableDriversAdministrationFallback: true,
  useRoutesAdministrationMock: true,
  enableRoutesAdministrationFallback: true,

  // Supply, inventory, and operations masters
  useProductsAdministrationMock: true,
  enableProductsAdministrationFallback: true,
  useFlatMasterEndpointsFallback: true,
  useSuppliersAdministrationMock: true,
  enableSuppliersAdministrationFallback: true,
  useEquipmentsAdministrationMock: true,
  enableEquipmentsAdministrationFallback: true,

  // SCM and planning domains
  useDemandForecastMock: true,
  useDemandAnalysisMock: true,
  useMpsMock: true,
  usePurchaseAnalysisMock: true,
  useBudgetManagementMock: true,
  useStorageLayoutMock: true,
  useInventoryCycleMock: true,
  usePickingPackingMock: true,
  useDeliveriesMock: true,
  enableDeliveriesFallback: true,

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
