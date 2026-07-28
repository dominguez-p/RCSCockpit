const PROGRAM_HOME_STRATEGIC_LENSES = [
  {
    id: "delivery-value",
    title: "Entrega y valor",
    description:
      "Ejecución, foco en impacto, reutilización, overdelivery y productividad.",
  },
  {
    id: "technology-platform",
    title: "Plataforma y tecnología",
    description:
      "Mapa actual, arquitectura objetivo, transformación tecnológica y resiliencia.",
  },
  {
    id: "operating-model",
    title: "Nuevo modelo operativo",
    description:
      "Adopción de IA, equipos de personas y agentes y nuevas formas de construir.",
  },
  {
    id: "leadership-people",
    title: "Liderazgo y personas",
    description:
      "Ownership, talento, colaboración entre geografías y cultura de equipo.",
  },
];

const PROGRAM_HOME_CORE_MODULES = [
  {
    id: "functional",
    icon: "◫",
    title: "Mapa funcional",
    description:
      "Dominios, capacidades y funcionalidades que explican qué hace el programa.",
    route(programId) {
      return `functional/${programId}`;
    },
    getCount(context) {
      return context.functional.length;
    },
    countLabel: "capacidades",
  },
  {
    id: "systems",
    icon: "⌘",
    title: "Mapa de sistemas",
    description:
      "Componentes, capas, relaciones y dependencias que soportan el programa.",
    route(programId) {
      return `systems/${programId}`;
    },
    getCount(context) {
      return context.systems.length;
    },
    countLabel: "elementos de sistema",
  },
  {
    id: "architecture",
    icon: "△",
    title: "Arquitectura de referencia",
    description:
      "Visión As-Is y To-Be, gaps, decisiones y evolución tecnológica objetivo.",
    route(programId) {
      return `architecture/${programId}`;
    },
    getCount(context) {
      return context.systemsToBe.length + context.architectureGaps.length;
    },
    countLabel: "elementos target y gaps",
  },
  {
    id: "roadmap",
    icon: "↗",
    title: "Roadmap",
    description:
      "Iniciativas, proyectos, MSAs, actividades, tareas, hitos y planificación.",
    route(programId, context) {
      if (programId === "aixbanker" && context.products.length) {
        return `roadmap/${programId}/${context.products[0].id}/${getCurrentQuarter()}`;
      }

      return `projects/${programId}`;
    },
    getCount(context) {
      return context.roadmapItems.length;
    },
    countLabel: "elementos de roadmap",
  },
];

const PROGRAM_HOME_GOVERNANCE_MODULES = [
  {
    id: "teams",
    title: "Teams",
    description: "Scrums, staffing, FTEs y distribución por país y producto.",
    route(programId) {
      return `teams/${programId}`;
    },
    getCount(context) {
      return context.teams.length;
    },
    countLabel: "personas",
  },
  {
    id: "impediments",
    title: "Impedimentos",
    description: "Bloqueos, riesgos, impacto, mitigación y responsables.",
    route(programId) {
      return `impediments/${programId}`;
    },
    getCount(context) {
      return context.impediments.length;
    },
    countLabel: "impedimentos",
  },
  {
    id: "decisions",
    title: "Decisiones",
    description: "Decisiones pendientes y tomadas que condicionan la ejecución.",
    route(programId) {
      return `decisions/${programId}`;
    },
    getCount(context) {
      return context.decisionsPending.length + context.decisionsDone.length;
    },
    countLabel: "decisiones",
  },
];

function programHomeEscape(value) {
  if (typeof rcsEsc === "function") {
    return rcsEsc(value);
  }

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function programHomeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function programHomeNormalizeProduct(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}

function programHomeProductLabel(productId) {
  if (typeof getAIxBankerProduct === "function") {
    const product = getAIxBankerProduct(productId);

    if (product?.label) {
      return product.label;
    }
  }

  return String(productId || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function programHomeRows(collectionName) {
  return Array.isArray(DATA?.[collectionName]) ? DATA[collectionName] : [];
}

function programHomeRowsForProgram(collectionName, programId) {
  return programHomeRows(collectionName).filter((row) => {
    const rowProgramId = String(row.programId || programId).trim();

    if (rowProgramId !== String(programId || "").trim()) {
      return false;
    }

    const country = String(
      row.country || row["RtC Anchor Country"] || "",
    ).trim();

    return !country || country === selectedCountry;
  });
}

function programHomeGetRoadmapItems(programId) {
  if (typeof adaptUnifiedRoadmapCollection === "function") {
    return adaptUnifiedRoadmapCollection().filter((item) => {
      const sameProgram =
        String(item.programId || "").trim() === String(programId || "").trim();
      const sameCountry = !item.country || item.country === selectedCountry;

      return sameProgram && sameCountry;
    });
  }

  return programHomeRowsForProgram("roadmapItems", programId);
}

function programHomeGetProducts(programId, roadmapItems, systems) {
  const products = new Map();

  [...roadmapItems, ...systems].forEach((item) => {
    const id = programHomeNormalizeProduct(item.product);

    if (!id) {
      return;
    }

    if (!products.has(id)) {
      products.set(id, {
        id,
        label: programHomeProductLabel(id),
      });
    }
  });

  if (programId === "aixbanker") {
    ["blue-buddy", "panorama"].forEach((id) => {
      if (!products.has(id)) {
        products.set(id, {
          id,
          label: programHomeProductLabel(id),
        });
      }
    });
  }

  return [...products.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "es"),
  );
}

function programHomeBuildContext(programId) {
  const functional = programHomeRowsForProgram("functional", programId);
  const systems = programHomeRowsForProgram("systems", programId);
  const systemsToBe = programHomeRowsForProgram("systemsToBe", programId);
  const architectureGaps = programHomeRowsForProgram(
    "architectureFeaturesGaps",
    programId,
  );
  const roadmapItems = programHomeGetRoadmapItems(programId);
  const teams = programHomeRowsForProgram("teams", programId);
  const impediments = programHomeRowsForProgram("impediments", programId);
  const decisionsPending = programHomeRowsForProgram(
    "decisionsPending",
    programId,
  );
  const decisionsDone = programHomeRowsForProgram("decisionsDone", programId);
  const products = programHomeGetProducts(programId, roadmapItems, systems);

  return {
    functional,
    systems,
    systemsToBe,
    architectureGaps,
    roadmapItems,
    teams,
    impediments,
    decisionsPending,
    decisionsDone,
    products,
  };
}

function programHomeStatusClass(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (
    normalized.includes("atención") ||
    normalized.includes("riesgo") ||
    normalized.includes("blocked")
  ) {
    return "red";
  }

  if (
    normalized.includes("piloto") ||
    normalized.includes("plan") ||
    normalized.includes("próxim")
  ) {
    return "yellow";
  }

  return "";
}

function programHomeStatusLabel(status) {
  return String(status || "Sin estado").trim() || "Sin estado";
}

function programHomeRiskCount(items) {
  return items.filter((item) => {
    if (typeof rcsNormalizeStatus === "function") {
      return ["at-risk", "blocked"].includes(rcsNormalizeStatus(item.status));
    }

    const status = String(item.status || "")
      .trim()
      .toLowerCase();

    return status.includes("risk") || status.includes("riesgo");
  }).length;
}

function programHomeAverageProgress(program) {
  const values = [
    programHomeNumber(program.functional),
    programHomeNumber(program.systems),
    programHomeNumber(program.architecture),
  ];

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function programHomeRenderProgress(program) {
  const metrics = [
    {
      key: "functional",
      label: "Funcional",
    },
    {
      key: "systems",
      label: "Sistemas",
    },
    {
      key: "architecture",
      label: "Arquitectura",
    },
  ];

  return `
    <section class="program-home-progress" aria-label="Avance del programa">
      ${metrics
        .map((metric) => {
          const value = programHomeNumber(program[metric.key]);

          return `
            <article>
              <span>${programHomeEscape(metric.label)}</span>
              <strong>${value}%</strong>
              <progress max="100" value="${value}">${value}%</progress>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function programHomeRenderSnapshot(program, context) {
  const riskCount = programHomeRiskCount(context.roadmapItems);
  const metrics = [
    {
      label: "Avance medio",
      value: `${programHomeAverageProgress(program)}%`,
    },
    {
      label: "Elementos de roadmap",
      value: context.roadmapItems.length,
    },
    {
      label: "Productos",
      value: context.products.length,
    },
    {
      label: "En riesgo",
      value: riskCount,
    },
    {
      label: "Equipos / personas",
      value: context.teams.length,
    },
  ];

  return `
    <section class="program-home-snapshot" aria-label="Resumen del programa">
      ${metrics
        .map(
          (metric) => `
            <article>
              <span>${programHomeEscape(metric.label)}</span>
              <strong>${programHomeEscape(metric.value)}</strong>
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

function programHomeRenderModuleCard(module, programId, context, cardClass) {
  const count = module.getCount(context);
  const routeValue = module.route(programId, context);

  return `
    <article class="${cardClass}" data-route="${programHomeEscape(routeValue)}">
      ${
        module.icon
          ? `
            <span class="program-home-module-icon" aria-hidden="true">
              ${programHomeEscape(module.icon)}
            </span>
          `
          : ""
      }

      <div class="program-home-module-copy">
        <span class="pill">Activo</span>
        <h3>${programHomeEscape(module.title)}</h3>
        <p>${programHomeEscape(module.description)}</p>
      </div>

      <footer>
        <span>
          ${programHomeEscape(count)}
          ${programHomeEscape(module.countLabel)}
        </span>
        <strong>Abrir →</strong>
      </footer>
    </article>
  `;
}

function programHomeRenderCoreModules(programId, context) {
  return `
    <section class="program-home-core-grid" aria-label="Módulos principales">
      ${PROGRAM_HOME_CORE_MODULES.map((module) =>
        programHomeRenderModuleCard(
          module,
          programId,
          context,
          "program-home-core-card",
        ),
      ).join("")}
    </section>
  `;
}

function programHomeRenderGovernanceModules(programId, context) {
  return `
    <section class="program-home-governance-grid" aria-label="Gobierno del programa">
      ${PROGRAM_HOME_GOVERNANCE_MODULES.map((module) =>
        programHomeRenderModuleCard(
          module,
          programId,
          context,
          "program-home-governance-card",
        ),
      ).join("")}
    </section>
  `;
}

function programHomeRenderStrategicLenses() {
  return `
    <section class="program-home-strategic-grid" aria-label="Marco estratégico RCS">
      ${PROGRAM_HOME_STRATEGIC_LENSES.map(
        (lens) => `
          <article>
            <span>Marco RCS</span>
            <h3>${programHomeEscape(lens.title)}</h3>
            <p>${programHomeEscape(lens.description)}</p>
          </article>
        `,
      ).join("")}
    </section>
  `;
}

function programHomeRenderProducts(programId, context) {
  if (programId !== "aixbanker" || !context.products.length) {
    return "";
  }

  return `
    <section class="program-home-section">
      <header class="program-home-section-header">
        <div>
          <span>Productos</span>
          <h2>Selecciona el ámbito del roadmap</h2>
        </div>

        <p>
          AIxBanker mantiene el roadmap por producto. El resto de módulos se
          consultan desde la landing común del programa.
        </p>
      </header>

      <div class="program-home-product-grid">
        ${context.products
          .map((product) => {
            const roadmapCount = context.roadmapItems.filter(
              (item) => programHomeNormalizeProduct(item.product) === product.id,
            ).length;
            const systemsCount = context.systems.filter(
              (item) => programHomeNormalizeProduct(item.product) === product.id,
            ).length;

            return `
              <article
                class="program-home-product-card"
                data-route="roadmap/${programHomeEscape(
                  programId,
                )}/${programHomeEscape(product.id)}/${getCurrentQuarter()}"
              >
                <span>Producto</span>
                <h3>${programHomeEscape(product.label)}</h3>
                <p>
                  ${roadmapCount} elementos de roadmap ·
                  ${systemsCount} elementos de sistema
                </p>
                <strong>Abrir roadmap →</strong>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function programHomeRenderConfiguredModules(programId) {
  const reservedRoutes = new Set([
    "functional",
    "systems",
    "architecture",
    "backlog",
    "projects",
    "teams",
    "impediments",
    "decisions",
  ]);

  const modules = programHomeRowsForProgram("modules", programId).filter(
    (module) => {
      const routeName = String(module.route || "").trim();
      return routeName && !reservedRoutes.has(routeName);
    },
  );

  if (!modules.length) {
    return "";
  }

  return `
    <section class="program-home-section">
      <header class="program-home-section-header">
        <div>
          <span>Configuración del programa</span>
          <h2>Otros módulos</h2>
        </div>

        <p>Módulos adicionales definidos en el origen de datos del programa.</p>
      </header>

      <section class="program-home-governance-grid">
        ${modules
          .map(
            (module) => `
              <article
                class="program-home-governance-card"
                data-route="${programHomeEscape(module.route)}/${programHomeEscape(
                  programId,
                )}"
              >
                <div class="program-home-module-copy">
                  <span class="pill">${programHomeEscape(
                    module.status || "Activo",
                  )}</span>
                  <h3>${programHomeEscape(module.title || "Módulo")}</h3>
                  <p>${programHomeEscape(module.description || "")}</p>
                </div>

                <footer>
                  <span>Configurado en origen</span>
                  <strong>Abrir →</strong>
                </footer>
              </article>
            `,
          )
          .join("")}
      </section>
    </section>
  `;
}

renderProgram = function renderStandardProgramLanding(programId) {
  const program = programHomeRows("programs").find(
    (item) => String(item.id || "").trim() === String(programId || "").trim(),
  );

  if (!program) {
    renderLanding();
    return;
  }

  const context = programHomeBuildContext(programId);
  const status = programHomeStatusLabel(program.status);

  setHead(
    program.name || "Programa",
    program.description || "Visión, arquitectura y ejecución del programa",
    `Retail Client Solutions > ${program.name || programId}`,
  );

  view.innerHTML = `
    <section class="program-home">
      <button class="ghost-button" type="button" data-route="landing">
        ← Volver al portfolio
      </button>

      <header class="program-home-hero">
        <div class="program-home-identity">
          <span class="program-home-program-icon" aria-hidden="true">
            ${programHomeEscape(program.icon || "●")}
          </span>

          <div>
            <div class="program-home-hero-topline">
              <span class="pill ${programHomeStatusClass(status)}">
                ${programHomeEscape(status)}
              </span>
              <span>${programHomeEscape(selectedCountry)}</span>
            </div>

            <h2>${programHomeEscape(program.name || "Programa")}</h2>
            <p>${programHomeEscape(program.description || "")}</p>
          </div>
        </div>

        ${programHomeRenderProgress(program)}
      </header>

      <section class="program-home-country-filter">
        <div>
          <span>País seleccionado</span>
          <p>
            La información de la landing se recalcula con el país activo cuando
            el origen dispone de ese dato.
          </p>
        </div>

        ${renderCountrySelector()}
      </section>

      ${programHomeRenderSnapshot(program, context)}

      <section class="program-home-section">
        <header class="program-home-section-header">
          <div>
            <span>Vista del programa</span>
            <h2>Mapas, arquitectura y ejecución</h2>
          </div>

          <p>
            Cuatro accesos comunes para todos los programas. Roadmap se
            reorganizará en Resumen, Cronograma y Backlog en la siguiente rama.
          </p>
        </header>

        ${programHomeRenderCoreModules(programId, context)}
      </section>

      ${programHomeRenderProducts(programId, context)}

      <section class="program-home-section">
        <header class="program-home-section-header">
          <div>
            <span>Ambiciones RCS</span>
            <h2>Marco común de lectura</h2>
          </div>

          <p>
            Esta vista prepara la estructura estratégica. La contribución real
            de cada roadmap item se conectará en la cuarta rama.
          </p>
        </header>

        ${programHomeRenderStrategicLenses()}
      </section>

      <section class="program-home-section">
        <header class="program-home-section-header">
          <div>
            <span>Gobierno</span>
            <h2>Seguimiento operativo</h2>
          </div>

          <p>
            Equipos, impedimentos y decisiones se mantienen accesibles sin
            mezclar todavía la lógica de tarjetas adaptativas.
          </p>
        </header>

        ${programHomeRenderGovernanceModules(programId, context)}
      </section>

      ${programHomeRenderConfiguredModules(programId)}
    </section>
  `;
};
