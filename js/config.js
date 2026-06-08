window.APP_CONFIG = {
  runtime: "google-sheets-api", // "google-sheets-api" | "apps-script" | "local-json" | "sample"
  localDataUrl: "./data/app-data.json",

  // runtime: "google-sheets-api",
  useGoogleSheets: false,

  googleSheetsApi: {
    apiKey: "AIzaSyAuQ7vbefn_W_JTFMwj4jnBTaJNgIOthNA",
    spreadsheetId: "1VMEU6hUGWLlBtCzniE74pPp7fhuzaCdgYoDQsR7msrA",
  },

  sheets: {
    programs: "programs",
    portfolioKpis: "portfolio_kpis",
    modules: "modules",
    roles: "roles",
    priorities: "priorities",
    functional: "functional_map",
    functionalSystemLinks: "functional_system_links",
    systems: "systems_inventory",
    architectureFeaturesGaps: "architecture_features_gaps",
    systemRelationships: "system_relationships",
    impediments: "impediments",
    decisionsPending: "decisions_pending",
    decisionsDone: "decisions_done",
    systemsToBe: "systems_inventory_tobe",
    systemRelationshipsToBe: "system_relationships_tobe",
    projects: "projects",
    projectPhases: "project_phases",
    msas: "msas",
    msaPhases: "msa_phases",
  },
};
