window.APP_CONFIG = {
  //runtime: "local-json", // "google-sheets-api" | "apps-script" | "local-json" | "sample"
  runtime: "drive-json",
  driveJsonUrl:
    "https://script.google.com/a/macros/bbva.com/s/AKfycbyMx9rMzsa1nIKGA4jmbPgplrXx1wiK5wfb33LSOIsEwKk_ZWfrdB1nppCZ8wsYepTy/exec",
  localDataUrl:
    "https://drive.google.com/uc?export=download&id=1LuAoIq9K6ryPEZi8xh0-to1RlF6dCDgE",

  // runtime: "google-sheets-api",
  useGoogleSheets: false,

  googleSheetsApi: {
    // apiKey: "AIzaSyAuQ7vbefn_W_JTFMwj4jnBTaJNgIOthNA",
    spreadsheetId: "1xQv47GEZ_qTy_ovwudLAxUjZX7mfWCkEvRvlfghfxhU",
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
