/*
 * =========================================================
 * RCS COCKPIT · DATASET SINTÉTICO DE CONTINGENCIA
 * =========================================================
 *
 * Este fichero contiene exclusivamente información ficticia.
 *
 * Objetivos:
 *
 * - mantener navegable el cockpit cuando un origen real
 *   no está disponible;
 * - permitir demos funcionales;
 * - evitar snapshots de producción;
 * - evitar nombres, documentos, IDs o métricas reales;
 * - conservar coherencia entre roadmap, funcional,
 *   sistemas, arquitectura, equipos y gobierno.
 *
 * IMPORTANTE:
 *
 * Nada de lo definido aquí representa situación real de
 * ningún programa, país, producto o equipo.
 * =========================================================
 */

const DEMO_COUNTRIES = ["HL", "ES", "MX", "PE", "CO"];

const DEMO_EXECUTION_COUNTRIES = ["ES", "MX", "PE", "CO"];

const DEMO_PROGRAM_LABELS = {
  aixbanker: "AIxBanker",
  openmarket: "Open Market",
  interaction: "Interaction Orchestration",
  "interaction-orchestration": "Interaction Orchestration",
  blue: "Blue",
  "smart-comms": "Smart Comms",
  smartcomms: "Smart Comms",
  aixrcp: "AIxRCP",
};

function cloneDemoData(value) {
  return JSON.parse(JSON.stringify(value));
}

function demoProgramLabel(programId) {
  const id = String(programId || "").trim();

  if (DEMO_PROGRAM_LABELS[id]) {
    return DEMO_PROGRAM_LABELS[id];
  }

  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function demoCountryLabel(country) {
  return (
    {
      HL: "Holding",
      ES: "España",
      MX: "México",
      PE: "Perú",
      CO: "Colombia",
    }[country] || country
  );
}

function demoProductDefinitions(programId) {
  if (programId === "aixbanker") {
    return [
      {
        id: "blue-buddy",
        name: "Blue Buddy",
      },
      {
        id: "panorama",
        name: "Panorama",
      },
    ];
  }

  return [
    {
      id: "demo-product",
      name: "Demo Product",
    },
  ];
}

function buildDemoFunctional() {
  const rows = [
    [
      "Experiencia",
      "Preparación de interacción",
      "Resumen de contexto|" + "Sugerencias de siguiente acción",
    ],
    [
      "Productividad",
      "Automatización de tareas",
      "Generación de borradores|" + "Seguimiento de compromisos",
    ],
    [
      "Seguimiento",
      "Visión ejecutiva",
      "Resumen de actividad|" + "Detección de desviaciones",
    ],
  ];

  return DEMO_COUNTRIES.flatMap((country) =>
    rows.map(([domain, capability, features]) => ({
      country,
      domain,
      capability,
      features,
    })),
  );
}

function demoSystemsForProduct(productId, target = false) {
  if (productId === "panorama") {
    return target
      ? [
          ["Canal", "Experiencia", "Demo Unified Insights UI"],
          [
            "Servicios",
            "Analítica",
            "Demo Analytics API|" + "Demo Metric Engine",
          ],
          ["Datos", "Métricas", "Demo Governed Metrics Store"],
        ]
      : [
          ["Canal", "Experiencia", "Demo Insights UI"],
          [
            "Servicios",
            "Analítica",
            "Demo Analytics API|" + "Demo Aggregation Service",
          ],
          ["Datos", "Métricas", "Demo Metrics Store"],
        ];
  }

  return target
    ? [
        ["Canal", "Experiencia", "Demo Workplace"],
        [
          "Servicios",
          "Orquestación",
          "Demo Agent Gateway|" + "Demo Context API|" + "Demo Policy Engine",
        ],
        [
          "Datos",
          "Contexto",
          "Demo Customer Data|" + "Demo Governed Knowledge Base",
        ],
      ]
    : [
        ["Canal", "Experiencia", "Demo Workplace"],
        [
          "Servicios",
          "Orquestación",
          "Demo Orchestrator|" + "Demo Context API",
        ],
        ["Datos", "Contexto", "Demo Customer Data|" + "Demo Knowledge Base"],
      ];
}

function buildDemoSystems(programId, target = false) {
  const products = demoProductDefinitions(programId);

  return DEMO_COUNTRIES.flatMap((country) =>
    products.flatMap((product) =>
      demoSystemsForProduct(product.id, target).map(
        ([layer, groupName, component]) => ({
          country,
          product: product.id,
          layer,
          groupName,
          level: "1",
          component,
        }),
      ),
    ),
  );
}

function demoRelationshipsForProduct(productId, target = false) {
  if (productId === "panorama") {
    return target
      ? [
          ["Demo Unified Insights UI", "Demo Analytics API", "consulta"],
          ["Demo Analytics API", "Demo Metric Engine", "cálculo"],
          ["Demo Metric Engine", "Demo Governed Metrics Store", "métricas"],
        ]
      : [
          ["Demo Insights UI", "Demo Analytics API", "consulta"],
          ["Demo Analytics API", "Demo Aggregation Service", "agrega"],
          ["Demo Aggregation Service", "Demo Metrics Store", "métricas"],
        ];
  }

  return target
    ? [
        ["Demo Workplace", "Demo Agent Gateway", "solicitud"],
        ["Demo Agent Gateway", "Demo Policy Engine", "política"],
        ["Demo Agent Gateway", "Demo Context API", "contexto"],
      ]
    : [
        ["Demo Workplace", "Demo Orchestrator", "solicitud"],
        ["Demo Orchestrator", "Demo Context API", "contexto"],
        ["Demo Context API", "Demo Customer Data", "consulta"],
      ];
}

function buildDemoRelationships(programId, target = false) {
  const products = demoProductDefinitions(programId);

  return DEMO_COUNTRIES.flatMap((country) =>
    products.flatMap((product) =>
      demoRelationshipsForProduct(product.id, target).map(
        ([fromComponent, toComponent, label]) => ({
          country,
          product: product.id,
          fromComponent,
          toComponent,
          label,
        }),
      ),
    ),
  );
}

function buildDemoFunctionalSystemLinks(programId) {
  const products = demoProductDefinitions(programId);

  return DEMO_COUNTRIES.flatMap((country) =>
    products.flatMap((product) => [
      {
        country,
        product: product.id,
        functionalKey:
          "Experiencia::" +
          "Preparación de interacción::" +
          "Resumen de contexto",
        systemComponent:
          product.id === "panorama" ? "Demo Analytics API" : "Demo Context API",
      },
      {
        country,
        product: product.id,
        functionalKey:
          "Productividad::" +
          "Automatización de tareas::" +
          "Generación de borradores",
        systemComponent:
          product.id === "panorama"
            ? "Demo Aggregation Service"
            : "Demo Orchestrator",
      },
    ]),
  );
}

function buildDemoArchitectureGaps(programId) {
  const products = demoProductDefinitions(programId);

  return DEMO_COUNTRIES.flatMap((country) =>
    products.map((product, index) => ({
      "RtC Anchor Country": country,

      product: product.id,

      Demanda: "Evolución técnica de " + "demostración",

      "GAP Asignado": `DEMO-GAP-${index + 1}`,

      "GAP asignado": `DEMO-GAP-${index + 1}`,

      Prioridad: index === 0 ? "Alta" : "Media",

      "Estatus revisión PA": "En análisis",

      Dependencias: "Componente sintético",

      affectedSystemComponents:
        product.id === "panorama"
          ? "Demo Analytics API|" + "Demo Metrics Store"
          : "Demo Orchestrator|" + "Demo Context API",
    })),
  );
}

function demoRoadmapItem(config) {
  return {
    type: "project",

    roadmapOrder: config.priority || 1,

    owner: "Equipo Demo",

    lastUpdate: "2026-08-18",

    track: "functional",

    primaryAmbition: "execution",

    secondaryAmbitions: "productivity",

    expectedContribution:
      "Contribución ficticia " +
      "utilizada para mostrar " +
      "la trazabilidad estratégica.",

    strategicOutcome: "Resultado sintético " + "de demostración.",

    evidence: "Evidencia ficticia " + "sin relación con ejecución real.",

    strategicGoal: "Objetivo de demostración.",

    businessValue: "Valor ficticio utilizado " + "para validar la experiencia.",

    mainRisks: "Riesgo sintético.",

    dependencies: "Dependencia sintética.",

    ...config,
  };
}

function buildDemoRoadmapItems(programId) {
  const products = demoProductDefinitions(programId);

  const progressByCountry = {
    ES: 72,
    MX: 56,
    PE: 43,
    CO: 31,
  };

  const holding = products.flatMap((product, index) => [
    demoRoadmapItem({
      id: `DEMO-${programId}-` + `${product.id}-HL-01`,

      product: product.id,

      country: "HL",

      initiative: "Experiencia de demostración",

      name: `${product.name} · ` + "capacidad principal",

      description:
        "Elemento completamente " + "ficticio para demostrar " + "el roadmap.",

      status: index === 0 ? "on-track" : "pending",

      progress: index === 0 ? 68 : 42,

      priority: index + 1,

      startDate: "2026-07-06",

      endDate: "2026-09-25",

      targetDate: "2026-09-25",

      secondaryAmbitions: "productivity|" + "technology-transformation",
    }),

    demoRoadmapItem({
      id: `DEMO-${programId}-` + `${product.id}-HL-02`,

      type: "msa",

      product: product.id,

      country: "HL",

      initiative: "Plataforma de demostración",

      name: `${product.name} · ` + "evolución técnica",

      description:
        "Elemento técnico ficticio " +
        "para demostrar arquitectura " +
        "y planificación.",

      status: index === 0 ? "at-risk" : "on-track",

      progress: index === 0 ? 44 : 61,

      priority: index + 3,

      startDate: "2026-07-20",

      endDate: "2026-10-16",

      targetDate: "2026-10-16",

      track: "technical",

      primaryAmbition: "resilience",

      secondaryAmbitions: "technology-transformation",
    }),
  ]);

  const local = DEMO_EXECUTION_COUNTRIES.flatMap((country, countryIndex) =>
    products.map((product, productIndex) =>
      demoRoadmapItem({
        id: `DEMO-${programId}-` + `${product.id}-` + `${country}-01`,

        product: product.id,

        country,

        initiative: "Despliegue de demostración",

        name: `${product.name} · ` + `${demoCountryLabel(country)}`,

        description:
          "Implantación sintética " +
          "para demostrar el " +
          "seguimiento por país.",

        status: country === "MX" && productIndex === 0 ? "at-risk" : "on-track",

        progress: Math.max(10, progressByCountry[country] - productIndex * 8),

        priority: countryIndex + 1,

        startDate: "2026-07-01",

        endDate: "2026-09-30",

        targetDate: "2026-09-30",

        secondaryAmbitions:
          country === "MX"
            ? "mexico-extension|" + "productivity"
            : "productivity",
      }),
    ),
  );

  return [...holding, ...local];
}

function buildDemoRoadmapActivities(items) {
  return items.flatMap((item) => [
    {
      itemId: item.id,

      activityId: "01 · Análisis y alcance",

      activityName: "Análisis y alcance",

      order: 1,

      progress: 100,

      status: "done",

      startDate: item.startDate,

      endDate: "2026-07-31",

      targetDate: "2026-07-31",

      comments: "Actividad ficticia completada.",
    },

    {
      itemId: item.id,

      activityId: "02 · Construcción y validación",

      activityName: "Construcción y validación",

      order: 2,

      progress: Math.max(20, Number(item.progress || 0)),

      status: item.status === "at-risk" ? "blocked" : "on-track",

      startDate: "2026-08-01",

      endDate: "2026-09-15",

      targetDate: "2026-09-15",

      comments: "Actividad ficticia en curso.",
    },

    {
      itemId: item.id,

      activityId: "03 · Despliegue y seguimiento",

      activityName: "Despliegue y seguimiento",

      order: 3,

      progress: Math.max(0, Number(item.progress || 0) - 35),

      status: "pending",

      startDate: "2026-09-16",

      endDate: item.endDate,

      targetDate: item.targetDate,

      comments: "Actividad ficticia planificada.",
    },
  ]);
}

function buildDemoTeams(programId) {
  const products = demoProductDefinitions(programId);

  const profiles = [
    ["Frontend", "engineering", 1],
    ["Backend", "engineering", 1],
    ["Data", "data", 1],
    ["UX", "design", 0.5],
  ];

  return DEMO_COUNTRIES.flatMap((country) =>
    products.flatMap((product, productIndex) =>
      profiles.map(([profile, role, fte]) => ({
        country,

        quarter: "Q3",

        active: true,

        product: product.name,

        scrum: `Demo Squad ` + `${productIndex + 1}`,

        profile,

        role,

        fte,

        cost: fte * 1000,

        po: "PO Demo",

        tl: "TL Demo",
      })),
    ),
  );
}

function buildDemoGovernance(kind) {
  return DEMO_COUNTRIES.map((country) => {
    if (kind === "impediment") {
      return {
        country,

        title: "Dependencia sintética " + "de demostración",

        impact: "Puede desplazar una fecha " + "ficticia del ejemplo.",

        owner: "Equipo Demo Plataforma",

        severity: country === "MX" ? "high" : "medium",

        targetResolutionDate: "2026-09-04",

        mitigation: "Utilizar una alternativa " + "desacoplada en la demo.",
      };
    }

    if (kind === "pending") {
      return {
        country,

        title: "Seleccionar patrón técnico " + "de demostración",

        owner: "Comité Demo",

        status: "pending",

        dueDate: "2026-09-01",

        impact: "Define el patrón target " + "representado en la demo.",
      };
    }

    return {
      country,

      title: "Utilizar datos sintéticos " + "para continuidad",

      owner: "Comité Demo",

      status: "done",

      dueDate: "2026-08-15",

      impact:
        "Mantiene disponible el cockpit " + "sin exponer datos operativos.",
    };
  });
}

function buildDemoProductCatalog(programId) {
  if (programId !== "aixbanker") {
    return [];
  }

  return [
    {
      productId: "blue-buddy",

      programId: "aixbanker",

      productName: "Blue Buddy",

      tagline:
        "Asistencia contextual " + "para tareas comerciales " + "y operativas.",

      overview:
        "Definición sintética " +
        "utilizada únicamente " +
        "para demostración.",

      valueProposition:
        "Reducir tareas manuales " + "y facilitar acceso a contexto.",

      targetUsers: "Gestores y equipos de soporte",

      icon: "◇",

      sortOrder: 1,

      enabled: true,
    },

    {
      productId: "panorama",

      programId: "aixbanker",

      productName: "Panorama",

      tagline:
        "Visión agregada " + "para seguimiento " + "y gestión por excepción.",

      overview:
        "Definición sintética " +
        "utilizada únicamente " +
        "para demostración.",

      valueProposition: "Concentrar indicadores " + "y señales relevantes.",

      targetUsers: "Responsables de producto " + "y equipos de seguimiento",

      icon: "◈",

      sortOrder: 2,

      enabled: true,
    },
  ];
}

function buildDemoProductFeatures(programId) {
  if (programId !== "aixbanker") {
    return [];
  }

  return [
    {
      productId: "blue-buddy",

      productName: "Blue Buddy",

      capabilityId: "meeting-prep",

      capabilityType: "capability",

      capabilityName: "Preparación de interacción",

      capabilityOverview:
        "Capacidad ficticia para " + "demostrar la experiencia.",

      deliverableName: "Resumen previo de contexto",

      overview: "Genera un resumen sintético " + "y siguientes acciones.",

      functionalBullets: [
        "Consolidar información ficticia.",
        "Reducir el tiempo de preparación.",
        "Proponer siguientes acciones.",
      ],

      experienceBullets: [
        "Acceso desde un único punto.",
        "Visualización orientada a acción.",
      ],

      functionalRequirements: [
        "Permitir regenerar el resumen.",
        "Identificar claramente el modo demo.",
      ],

      nonFunctionalRequirements: [
        "No persistir datos personales.",
        "No utilizar sistemas reales.",
      ],

      documentUrl: "",

      figmaUrl: "",
    },

    {
      productId: "panorama",

      productName: "Panorama",

      capabilityId: "executive-view",

      capabilityType: "capability",

      capabilityName: "Visión ejecutiva",

      capabilityOverview:
        "Capacidad ficticia para " + "demostrar indicadores y filtros.",

      deliverableName: "Panel consolidado",

      overview: "Muestra indicadores sintéticos " + "de avance y riesgo.",

      functionalBullets: [
        "Consolidar métricas ficticias.",
        "Reducir elaboración manual.",
        "Filtrar por producto y geografía.",
      ],

      experienceBullets: [
        "Lectura visual compacta.",
        "Navegación Holding-país.",
      ],

      functionalRequirements: [
        "Seleccionar país y periodo.",
        "Mostrar avance y riesgos.",
      ],

      nonFunctionalRequirements: [
        "No incluir métricas reales.",
        "Mantener coherencia funcional.",
      ],

      documentUrl: "",

      figmaUrl: "",
    },
  ];
}

function buildDemoProgramData(programId) {
  const roadmapItems = buildDemoRoadmapItems(programId);

  return {
    modules: [],

    roles: DEMO_COUNTRIES.flatMap((country) => [
      {
        country,

        role: "Technical Leader",

        description: "Rol ficticio de " + "coordinación técnica.",
      },

      {
        country,

        role: "Product Owner",

        description: "Rol ficticio de " + "priorización funcional.",
      },
    ]),

    priorities: DEMO_COUNTRIES.map((country) => ({
      country,

      priority: "Entregar valor demostrable " + "utilizando datos sintéticos",
    })),

    functional: buildDemoFunctional(),

    functionalSystemLinks: buildDemoFunctionalSystemLinks(programId),

    systems: buildDemoSystems(programId, false),

    systemsToBe: buildDemoSystems(programId, true),

    architectureFeaturesGaps: buildDemoArchitectureGaps(programId),

    systemRelationships: buildDemoRelationships(programId, false),

    systemRelationshipsToBe: buildDemoRelationships(programId, true),

    impediments: buildDemoGovernance("impediment"),

    decisionsPending: buildDemoGovernance("pending"),

    decisionsDone: buildDemoGovernance("done"),

    roadmapItems,

    roadmapItemActivities: buildDemoRoadmapActivities(roadmapItems),

    projects: [],

    projectPhases: [],

    msas: [],

    msaPhases: [],

    teams: buildDemoTeams(programId),

    productCatalog: buildDemoProductCatalog(programId),

    productFeatures: buildDemoProductFeatures(programId),
  };
}

const DEMO_PORTFOLIO_DATA = {
  portfolioKpis: [
    {
      label: "Modo",
      value: "DEMO",
      subtitle: "Datos 100% sintéticos",
      icon: "◎",
    },

    {
      label: "Programas",
      value: "3",
      subtitle: "Programas navegables",
      icon: "▦",
    },

    {
      label: "Privacidad",
      value: "100%",
      subtitle: "Sin datos operativos",
      icon: "◇",
    },
  ],

  programs: [
    {
      id: "aixbanker",

      name: "AIxBanker",

      description: "Asistencia inteligente " + "con datos sintéticos.",

      status: "Demo segura",

      functional: 72,

      systems: 64,

      architecture: 58,

      enabled: true,

      icon: "AI",

      sourceLabel: "AIxBanker · demo",

      spreadsheetId: "",

      driveJsonUrl: "",
    },

    {
      id: "interaction-orchestration",

      name: "Interaction Orchestration",

      description:
        "Orquestación de interacciones " + "con información ficticia.",

      status: "Demo segura",

      functional: 68,

      systems: 61,

      architecture: 55,

      enabled: true,

      icon: "IO",

      sourceLabel: "Interaction Orchestration · demo",

      spreadsheetId: "",

      driveJsonUrl: "",
    },

    {
      id: "openmarket",

      name: "Open Market",

      description: "Experiencia de onboarding " + "con información sintética.",

      status: "Demo segura",

      functional: 75,

      systems: 67,

      architecture: 62,

      enabled: true,

      icon: "OM",

      sourceLabel: "Open Market · demo",

      spreadsheetId: "",

      driveJsonUrl: "",
    },
  ],
};

window.SAMPLE_DATA = cloneDemoData(DEMO_PORTFOLIO_DATA);

window.getSamplePortfolioData = function getSamplePortfolioData() {
  return cloneDemoData(DEMO_PORTFOLIO_DATA);
};

window.getSampleProgramData = function getSampleProgramData(programId) {
  const id = String(programId || "").trim();

  if (!id) {
    return null;
  }

  return cloneDemoData(buildDemoProgramData(id));
};

async function loadSampleData() {
  return window.getSamplePortfolioData();
}

window.loadSampleData = loadSampleData;
