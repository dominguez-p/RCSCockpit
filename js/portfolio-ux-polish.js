const PORTFOLIO_UX_AMBITION_FIELDS = [
  "primaryAmbition",
  "primaryAmbitionId",
  "primary_ambition",
  "primary_ambition_id",
  "ambition",
  "ambitionId",
  "ambition_id",
  "rcsAmbition",
  "rcsAmbitionId",
  "secondaryAmbitions",
  "secondaryAmbitionIds",
  "secondary_ambitions",
  "secondary_ambition_ids",
  "ambitions",
  "ambitionIds",
  "ambition_ids",
  "rcsAmbitions",
  "rcsAmbitionIds",
];

let portfolioUxContributionGeneration = 0;
let portfolioUxForceContributionRefresh = false;

function portfolioUxEscape(value) {
  if (typeof portfolioEscape === "function") {
    return portfolioEscape(value);
  }

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function portfolioUxProgramEnabled(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return !["false", "0", "no", "off", "disabled", "inactivo"].includes(
    String(value).trim().toLowerCase(),
  );
}

function portfolioUxSplit(value) {
  if (Array.isArray(value)) {
    return value.flatMap(portfolioUxSplit);
  }

  return String(value || "")
    .split(/[|,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function portfolioUxNormalizeAmbition(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+[.)\-:\s]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function portfolioUxResolveAmbitionId(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const ambitions = Array.isArray(PORTFOLIO_AMBITIONS)
    ? PORTFOLIO_AMBITIONS
    : [];
  const exactMatch = ambitions.find((ambition) => ambition.id === rawValue);

  if (exactMatch) {
    return exactMatch.id;
  }

  const normalized = portfolioUxNormalizeAmbition(rawValue);
  const aliases = {
    ejecucion: "execution",
    delivery: "execution",
    "transformacion tecnologica": "technology-transformation",
    tecnologia: "technology-transformation",
    arquitectura: "technology-transformation",
    "modelo operativo": "operating-model-transformation",
    "transformacion modelo operativo": "operating-model-transformation",
    resiliencia: "resilience",
    reliability: "resilience",
    productividad: "productivity",
    mexico: "mexico-extension",
    "extension mexico": "mexico-extension",
    "tl cio": "tl-cio",
    cultura: "culture-talent",
    talento: "culture-talent",
    "cultura talento": "culture-talent",
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const catalogMatch = ambitions.find((ambition) => {
    const values = [
      ambition.id,
      ambition.title,
      ambition.order,
      String(ambition.order).padStart(2, "0"),
    ];

    return values.some(
      (candidate) => portfolioUxNormalizeAmbition(candidate) === normalized,
    );
  });

  return catalogMatch?.id || "";
}

function portfolioUxAmbitionIds(item) {
  if (typeof roadmapAmbitionAllIds === "function") {
    return roadmapAmbitionAllIds(item);
  }

  const source = item?.source || item || {};
  const ids = PORTFOLIO_UX_AMBITION_FIELDS.flatMap((field) =>
    portfolioUxSplit(item?.[field] ?? source?.[field]),
  )
    .map(portfolioUxResolveAmbitionId)
    .filter(Boolean);

  return [...new Set(ids)];
}

function portfolioUxRoadmapItems(programData) {
  const unified = Array.isArray(programData?.roadmapItems)
    ? programData.roadmapItems
    : [];

  if (unified.length) {
    return unified;
  }

  return [
    ...(Array.isArray(programData?.projects) ? programData.projects : []),
    ...(Array.isArray(programData?.msas) ? programData.msas : []),
  ];
}

function portfolioUxContributionSummary(programData) {
  const items = portfolioUxRoadmapItems(programData);
  const byAmbition = new Map(
    (Array.isArray(PORTFOLIO_AMBITIONS) ? PORTFOLIO_AMBITIONS : []).map(
      (ambition) => [ambition.id, 0],
    ),
  );
  let linked = 0;

  items.forEach((item) => {
    const ambitionIds = portfolioUxAmbitionIds(item);

    if (ambitionIds.length) {
      linked += 1;
    }

    ambitionIds.forEach((ambitionId) => {
      byAmbition.set(ambitionId, (byAmbition.get(ambitionId) || 0) + 1);
    });
  });

  const topAmbitions = [...byAmbition.entries()]
    .filter(([, count]) => count > 0)
    .map(([ambitionId, count]) => {
      const ambition = PORTFOLIO_AMBITIONS.find(
        (candidate) => candidate.id === ambitionId,
      );

      return {
        id: ambitionId,
        count,
        order: ambition?.order || 999,
        title: ambition?.title || ambitionId,
      };
    })
    .sort((left, right) => {
      const countDifference = right.count - left.count;
      return countDifference || left.order - right.order;
    })
    .slice(0, 3);

  return {
    total: items.length,
    linked,
    unassigned: items.length - linked,
    percentage: items.length ? Math.round((linked / items.length) * 100) : 0,
    topAmbitions,
  };
}

function portfolioUxRenderContribution(summary) {
  if (!summary.total) {
    return `
      <div class="portfolio-program-contribution-empty">
        <strong>Sin elementos de roadmap</strong>
        <span>No hay contribuciones estratégicas que agregar todavía.</span>
      </div>
    `;
  }

  return `
    <div class="portfolio-program-contribution-metric">
      <strong>${summary.percentage}%</strong>
      <span>del roadmap conectado con ambiciones RCS</span>
    </div>

    <div class="portfolio-program-contribution-stats">
      <span>${summary.linked} de ${summary.total} elementos vinculados</span>
      <span>${summary.unassigned} sin ambición</span>
    </div>

    <div class="portfolio-program-contribution-list">
      ${
        summary.topAmbitions.length
          ? summary.topAmbitions
              .map(
                (ambition) => `
                  <span title="${portfolioUxEscape(ambition.title)}">
                    <b>${String(ambition.order).padStart(2, "0")}</b>
                    ${portfolioUxEscape(ambition.title)}
                    <strong>${ambition.count}</strong>
                  </span>
                `,
              )
              .join("")
          : `
              <span class="is-unassigned">
                Ningún elemento tiene una ambición informada.
              </span>
            `
      }
    </div>
  `;
}

function portfolioUxContributionContainer(programId) {
  return [...document.querySelectorAll("[data-portfolio-program-contribution]")].find(
    (element) => element.dataset.portfolioProgramContribution === programId,
  );
}

function portfolioUxUpdateContribution(programId, content, state = "ready") {
  const container = portfolioUxContributionContainer(programId);

  if (!container) {
    return;
  }

  container.dataset.state = state;
  container.innerHTML = content;
}

async function portfolioUxLoadProgramContribution(
  program,
  generation,
  forceRefresh,
) {
  const programId = String(program.id || "").trim();

  if (!programId || !portfolioUxProgramEnabled(program.enabled)) {
    return;
  }

  try {
    const programData = await loadProgramData(programId, forceRefresh);

    if (generation !== portfolioUxContributionGeneration) {
      return;
    }

    const summary = portfolioUxContributionSummary(programData);
    portfolioUxUpdateContribution(
      programId,
      portfolioUxRenderContribution(summary),
    );
  } catch (error) {
    console.error(`No se pudo calcular la contribución de ${programId}`, error);

    if (generation !== portfolioUxContributionGeneration) {
      return;
    }

    portfolioUxUpdateContribution(
      programId,
      `
        <div class="portfolio-program-contribution-empty is-error">
          <strong>Contribución no disponible</strong>
          <span>No se pudo leer el origen de datos de este programa.</span>
        </div>
      `,
      "error",
    );
  }
}

function portfolioUxRefreshContributions(programs, forceRefresh = false) {
  const generation = ++portfolioUxContributionGeneration;

  (Array.isArray(programs) ? programs : []).forEach((program) => {
    portfolioUxLoadProgramContribution(program, generation, forceRefresh);
  });
}

renderPortfolioProgramCard = function renderProgramCardWithContribution(program) {
  const enabled = portfolioUxProgramEnabled(program.enabled);
  const status = program.status || "Sin estado";
  const programId = String(program.id || "").trim();

  return `
    <article class="portfolio-program-card ${enabled ? "" : "disabled"}">
      <header class="portfolio-program-heading">
        <span class="portfolio-program-icon" aria-hidden="true">
          ${portfolioUxEscape(program.icon || "●")}
        </span>

        <div>
          <h3>${portfolioUxEscape(program.name || "Programa")}</h3>
          <p>${portfolioUxEscape(program.description || "")}</p>
        </div>
      </header>

      <span class="pill ${portfolioStatusClass(status)}">
        ${portfolioUxEscape(status)}
      </span>

      <section
        class="portfolio-program-contribution"
        data-portfolio-program-contribution="${portfolioUxEscape(programId)}"
        data-state="${enabled ? "loading" : "disabled"}"
        aria-label="Contribución real a las ambiciones RCS"
      >
        ${
          enabled
            ? `
                <div class="portfolio-program-contribution-loading">
                  <span></span>
                  <span></span>
                  <small>Calculando contribución real…</small>
                </div>
              `
            : `
                <div class="portfolio-program-contribution-empty">
                  <strong>Sin datos disponibles</strong>
                  <span>El programa todavía no está habilitado.</span>
                </div>
              `
        }
      </section>

      <button
        class="portfolio-program-action"
        type="button"
        ${enabled ? `data-route="program/${portfolioUxEscape(programId)}"` : "disabled"}
      >
        ${enabled ? "Entrar en el programa →" : "Programa próximamente disponible"}
      </button>
    </article>
  `;
};

const portfolioUxBaseRenderLanding = renderLanding;

renderLanding = function renderLandingWithProgramContributions(...args) {
  const result = portfolioUxBaseRenderLanding(...args);
  const programs = Array.isArray(DATA?.programs) ? DATA.programs : [];
  const forceRefresh = portfolioUxForceContributionRefresh;
  portfolioUxForceContributionRefresh = false;

  const programsSection = [...document.querySelectorAll(".portfolio-home-section")].find(
    (section) =>
      section.querySelector(".portfolio-home-section-header h2")?.textContent?.trim() ===
      "Programas RCS",
  );
  const description = programsSection?.querySelector(
    ".portfolio-home-section-header > p",
  );

  if (description) {
    description.textContent =
      "Cada tarjeta agrega la contribución real de su roadmap a las ambiciones RCS.";
  }

  const ambitionsSection = [...document.querySelectorAll(".portfolio-home-section")].find(
    (section) =>
      section.querySelector(".portfolio-home-section-header h2")?.textContent?.trim() ===
      "Ambiciones RCS",
  );
  const ambitionsDescription = ambitionsSection?.querySelector(
    ".portfolio-home-section-header > p",
  );

  if (ambitionsDescription) {
    ambitionsDescription.textContent =
      "Las ocho ambiciones forman el marco común y las tarjetas de programa muestran su contribución agregada.";
  }

  portfolioUxRefreshContributions(programs, forceRefresh);

  return result;
};

function programUxFindSection(home, eyebrow) {
  return [...home.querySelectorAll(":scope > .program-home-section")].find(
    (section) =>
      section
        .querySelector(":scope > .program-home-section-header span")
        ?.textContent?.trim() === eyebrow,
  );
}

function programUxBuildMetricsSection(home) {
  const existing = home.querySelector(":scope > .program-home-metrics-section");

  if (existing) {
    return existing;
  }

  const snapshot = home.querySelector(":scope > .program-home-snapshot");

  if (!snapshot) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "program-home-section program-home-metrics-section";
  section.innerHTML = `
    <header class="program-home-section-header">
      <div>
        <span>Resumen</span>
        <h2>Métricas principales</h2>
      </div>

      <p>Indicadores básicos de alcance, riesgo, productos y equipos.</p>
    </header>
  `;

  snapshot.before(section);
  section.append(snapshot);

  return section;
}

function programUxReorderLanding(programId) {
  const home = view.querySelector(".program-home");

  if (!home) {
    return;
  }

  const hero = home.querySelector(":scope > .program-home-hero");

  if (!hero) {
    return;
  }

  const adaptive = home.querySelector(
    `:scope > [data-program-adaptive-cards="${CSS.escape(programId)}"]`,
  );
  const programView = programUxFindSection(home, "Vista del programa");
  const products = programUxFindSection(home, "Productos");
  const governance = programUxFindSection(home, "Gobierno");
  const configuredModules = programUxFindSection(home, "Configuración del programa");
  const ambitions = programUxFindSection(home, "Ambiciones RCS");
  const metrics = programUxBuildMetricsSection(home);
  const orderedSections = [
    adaptive,
    programView,
    products,
    governance,
    configuredModules,
    ambitions,
    metrics,
  ].filter(Boolean);
  let cursor = hero;

  orderedSections.forEach((section) => {
    cursor.insertAdjacentElement("afterend", section);
    cursor = section;
  });
}

const programUxBaseRenderProgram = renderProgram;

renderProgram = function renderProgramWithRequestedOrder(programId) {
  const result = programUxBaseRenderProgram(programId);
  programUxReorderLanding(String(programId || "").trim());
  return result;
};

document.addEventListener("click", (event) => {
  if (!event.target.closest("#refreshDataBtn")) {
    return;
  }

  const routeContext =
    typeof getCurrentRoute === "function" ? getCurrentRoute() : {};

  if (!routeContext.programId || routeContext.routeName === "landing") {
    portfolioUxForceContributionRefresh = true;
  }
});
