const PORTFOLIO_AMBITION_AXES = [
  {
    id: "delivery-value",
    label: "Entrega y valor",
    description:
      "Cómo ejecutamos con precisión, velocidad, impacto y productividad.",
  },
  {
    id: "technology-platform",
    label: "Plataforma y tecnología",
    description:
      "Cómo evolucionamos la plataforma, la arquitectura y la resiliencia.",
  },
  {
    id: "operating-model",
    label: "Nuevo modelo operativo",
    description:
      "Cómo transformamos la forma de construir y extendemos nuestra capacidad de ejecución.",
  },
  {
    id: "leadership-people",
    label: "Liderazgo y personas",
    description:
      "Cómo reforzamos el ownership, el talento, la colaboración y la cultura.",
  },
];

const PORTFOLIO_AMBITIONS = [
  {
    id: "execution",
    order: 1,
    axis: "delivery-value",
    title: "Ejecución de soluciones de negocio",
    ambition:
      "Alcanzar altos niveles de precisión y velocidad en la entrega, hacer overdelivery de manera sistemática y dejar un mejor legado tecnológico con cada proyecto.",
    actions: [
      "Todo proyecto debe tener una visión, un propósito, un roadmap y un plan de ejecución definidos.",
      "Asignar recursos y skills cuando aceleren de forma real la entrega.",
      "Maximizar la reutilización y ejecutar front to back reduciendo la heterogeneidad.",
      "Diseñar desde el origen la equity story y la estrategia de socialización.",
    ],
  },
  {
    id: "technology-transformation",
    order: 2,
    axis: "technology-platform",
    title: "Transformación tecnológica y estrategia de sistemas",
    ambition:
      "Evolucionar la plataforma hacia un ecosistema tecnológico más homogéneo, con las partes habilitadoras del core en next gen y preparado para un entorno agéntico.",
    actions: [
      "Completar el mapa de sistemas actual y diseñar el mapa objetivo del ciclo estratégico.",
      "Socializar proactivamente la visión tecnológica futura con los negocios.",
      "Diseñar una hoja de ruta de transformación conectada con los proyectos en ejecución.",
      "Definir el criterio y la evolución del nuevo ecosistema agéntico.",
    ],
  },
  {
    id: "operating-model-transformation",
    order: 3,
    axis: "operating-model",
    title: "Transformación del modelo operativo",
    ambition:
      "Liderar una nueva forma de componer equipos de personas y agentes para incrementar entrega y calidad, reducir costes y crear soluciones en días mediante IA.",
    actions: [
      "Diseñar el framework agéntico y de contexto para todo el ciclo de creación.",
      "Definir la estrategia de adopción de IA y el modelo de referencia de los scrums del futuro.",
      "Crear una cultura agéntica que permita identificar y escalar agentes creados bottom up.",
      "Incorporar desde el inicio el control de costes y el desarrollo distribuido a escala.",
    ],
  },
  {
    id: "resilience",
    order: 4,
    axis: "technology-platform",
    title: "Resiliencia",
    ambition:
      "Incorporar reliability desde el diseño y durante todo el ciclo de creación, tomando además el control del perímetro tecnológico bajo responsabilidad de RCS.",
    actions: [
      "Definir los aspectos de resiliencia exigibles en cada fase del ciclo de creación.",
      "Inventariar el perímetro y aplicar estándares proporcionales a su naturaleza.",
      "Priorizar la mejora de salud tecnológica según criticidad.",
      "Mejorar obsolescencia, dependencias, incidencias y operación del software de terceros.",
    ],
  },
  {
    id: "productivity",
    order: 5,
    axis: "delivery-value",
    title: "Productividad",
    ambition:
      "Convertir a SRCS en una referencia de productividad para Retail, generando ahorros reales, credibilidad y aprendizajes que trasciendan al equipo.",
    actions: [
      "Gestionar la productividad de forma proactiva y probar las medidas antes de escalarlas.",
      "Explotar reutilización, vendor management, sinergias de roles, optimización de scrums, offshoring e IA.",
      "Rediseñar el gobierno de productividad para involucrar de forma granular a negocio y Engineering.",
    ],
  },
  {
    id: "mexico-extension",
    order: 6,
    axis: "operating-model",
    title: "Extensión a México",
    ambition:
      "Consolidar México como una fábrica completa de Retail reconocida por entrega, calidad, velocidad y eficiencia, con capacidad de liderar áreas y proyectos estratégicos.",
    actions: [
      "Diseñar un plan de integración cultural entre España y México.",
      "Construir y socializar la equity story de la fábrica Retail América.",
      "Extender progresivamente las unidades de Sistemas Retail y su backlog estratégico.",
      "Implantar un gobierno que mida de forma continua el desempeño de la fábrica.",
    ],
  },
  {
    id: "tl-cio",
    order: 7,
    axis: "leadership-people",
    title: "TL como CIO",
    ambition:
      "Conseguir que cada Technical Leader gestione el proyecto como si fuera su empresa, con visión, estrategia, foco en impacto, servicio al cliente y ownership de los recursos.",
    actions: [
      "Definir claramente las expectativas del Technical Leader en cada ámbito estratégico.",
      "Crear el framework de capacidades, seguimiento y enforcement del rol.",
      "Impulsar una revolución cultural con embajadores, reconocimiento, mentoring y participación en decisiones estratégicas.",
    ],
  },
  {
    id: "culture-talent",
    order: 8,
    axis: "leadership-people",
    title: "Cultura y talento",
    ambition:
      "Ser un equipo sin silos, generoso con los países, integrado con negocio e Ingeniería, dueño de BBVA y capaz de desarrollar el talento actual y futuro siendo, además, felices.",
    actions: [
      "Construir esta ambición de forma colectiva con todo el equipo.",
      "Reforzar colaboración, generosidad, criterio, confianza y excelencia en la entrega.",
      "Desarrollar el talento y crear oportunidades de liderazgo transversal y global.",
    ],
  },
];

function portfolioEscape(value) {
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

function portfolioNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function portfolioProgramEnabled(value) {
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

function portfolioStatusClass(status) {
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

function renderPortfolioKpis(kpis) {
  if (!Array.isArray(kpis) || !kpis.length) {
    return "";
  }

  return `
    <section class="portfolio-summary" aria-label="Indicadores del portfolio">
      ${kpis
        .map((kpi) => {
          const label = kpi.label || kpi.title || kpi.name || kpi[0] || "";
          const value = kpi.value || kpi.metric || kpi[1] || "";
          const description = kpi.subtitle || kpi.description || kpi[2] || "";
          const icon = kpi.icon || kpi[3] || "◎";

          return `
            <article class="portfolio-summary-card">
              <span class="portfolio-summary-icon" aria-hidden="true">
                ${portfolioEscape(icon)}
              </span>

              <div>
                <span>${portfolioEscape(label)}</span>
                <strong>${portfolioEscape(value)}</strong>
                <small>${portfolioEscape(description)}</small>
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderPortfolioAmbitionCard(ambition) {
  return `
    <article
      class="portfolio-ambition-card"
      id="ambition-${portfolioEscape(ambition.id)}"
    >
      <div class="portfolio-ambition-heading">
        <span class="portfolio-ambition-number">
          ${String(ambition.order).padStart(2, "0")}
        </span>
      </div>

      <h3>${portfolioEscape(ambition.title)}</h3>
      <p>${portfolioEscape(ambition.ambition)}</p>

      <details class="portfolio-ambition-detail">
        <summary>Ver líneas de actuación</summary>

        <ul>
          ${ambition.actions
            .map((action) => `<li>${portfolioEscape(action)}</li>`)
            .join("")}
        </ul>
      </details>
    </article>
  `;
}

function renderPortfolioAmbitions() {
  return `
    <div class="portfolio-ambition-axes-grid">
      ${PORTFOLIO_AMBITION_AXES.map((axis) => {
        const ambitions = PORTFOLIO_AMBITIONS.filter(
          (ambition) => ambition.axis === axis.id,
        ).sort((left, right) => left.order - right.order);

        return `
          <section class="portfolio-ambition-axis">
            <header class="portfolio-section-header">
              <div>
                <span class="portfolio-section-eyebrow">
                  Eje estratégico
                </span>

                <h3>${portfolioEscape(axis.label)}</h3>
              </div>

              <p>${portfolioEscape(axis.description)}</p>
            </header>

            <div class="portfolio-ambition-grid">
              ${ambitions.map(renderPortfolioAmbitionCard).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderPortfolioProgramCard(program) {
  const enabled = portfolioProgramEnabled(program.enabled);
  const functional = portfolioNumber(program.functional);
  const systems = portfolioNumber(program.systems);
  const architecture = portfolioNumber(program.architecture);
  const status = program.status || "Sin estado";

  return `
    <article class="portfolio-program-card ${enabled ? "" : "disabled"}">
      <header class="portfolio-program-heading">
        <span class="portfolio-program-icon" aria-hidden="true">
          ${portfolioEscape(program.icon || "●")}
        </span>

        <div>
          <h3>${portfolioEscape(program.name || "Programa")}</h3>
          <p>${portfolioEscape(program.description || "")}</p>
        </div>
      </header>

      <span class="pill ${portfolioStatusClass(status)}">
        ${portfolioEscape(status)}
      </span>

      <div class="portfolio-program-progress">
        <div>
          <span>Funcional</span>
          <strong>${functional}%</strong>

          <progress max="100" value="${functional}">
            ${functional}%
          </progress>
        </div>

        <div>
          <span>Sistemas</span>
          <strong>${systems}%</strong>

          <progress max="100" value="${systems}">
            ${systems}%
          </progress>
        </div>

        <div>
          <span>Arquitectura</span>
          <strong>${architecture}%</strong>

          <progress max="100" value="${architecture}">
            ${architecture}%
          </progress>
        </div>
      </div>

      <p class="portfolio-program-traceability-note">
        La contribución del programa a las ambiciones se incorporará en la cuarta iteración.
      </p>

      <button
        class="portfolio-program-action"
        type="button"
        ${
          enabled
            ? `data-route="program/${portfolioEscape(program.id)}"`
            : "disabled"
        }
      >
        ${
          enabled
            ? "Entrar en el programa →"
            : "Programa próximamente disponible"
        }
      </button>
    </article>
  `;
}

function renderPortfolioPrograms(programs) {
  if (!Array.isArray(programs) || !programs.length) {
    return `
      <section class="panel">
        <p class="empty-state">
          No hay programas configurados en el portfolio.
        </p>
      </section>
    `;
  }

  return `
    <section
      class="portfolio-program-grid"
      aria-label="Programas RCS"
    >
      ${programs.map(renderPortfolioProgramCard).join("")}
    </section>
  `;
}

function renderPortfolioAmbitionAxisTags() {
  return PORTFOLIO_AMBITION_AXES.map(
    (axis) => `
      <span class="portfolio-ambitions-axis-tag">
        ${portfolioEscape(axis.label)}
      </span>
    `,
  ).join("");
}

renderLanding = function renderPortfolioLanding() {
  setHead(
    "RCS Portfolio Cockpit",
    "Programas y ambiciones estratégicas de Retail Client Solutions",
  );

  const portfolioKpis = Array.isArray(DATA?.portfolioKpis)
    ? DATA.portfolioKpis
    : [];

  const programs = Array.isArray(DATA?.programs) ? DATA.programs : [];

  view.innerHTML = `
    <section class="portfolio-home">

      <section class="portfolio-home-section portfolio-programs-section">
        <header class="portfolio-home-section-header">
          <div>
            <span class="portfolio-section-eyebrow">
              Ejecución
            </span>

            <h2>Programas RCS</h2>
          </div>

          <p>
            Los programas que materializan la estrategia de Retail Client Solutions.
          </p>
        </header>

        ${renderPortfolioPrograms(programs)}

        ${renderPortfolioKpis(portfolioKpis)}
      </section>

      <section class="portfolio-home-section portfolio-ambitions-section">
        <details class="portfolio-ambitions-disclosure">

          <summary class="portfolio-ambitions-summary">

            <span class="portfolio-ambitions-summary-copy">
              <span class="portfolio-section-eyebrow">
                Marco estratégico
              </span>

              <span class="portfolio-ambitions-summary-title">
                Ambición RCS 2026
              </span>

              <span class="portfolio-ambitions-summary-description">
                El marco estratégico que orienta la ejecución de los programas.
              </span>
            </span>

            <span
              class="portfolio-ambitions-axis-list"
              aria-label="Ejes estratégicos"
            >
              ${renderPortfolioAmbitionAxisTags()}
            </span>

            <span class="portfolio-ambitions-summary-action">

              <span class="portfolio-ambitions-count">
                <strong>${PORTFOLIO_AMBITIONS.length}</strong>
                <span>ambiciones estratégicas</span>
              </span>

              <span class="portfolio-ambitions-toggle">

                <span class="portfolio-ambitions-toggle-closed">
                  Ver marco estratégico
                </span>

                <span class="portfolio-ambitions-toggle-open">
                  Ocultar marco estratégico
                </span>

                <span
                  class="portfolio-ambitions-chevron"
                  aria-hidden="true"
                >
                  ⌄
                </span>

              </span>
            </span>

          </summary>

          <div class="portfolio-ambitions-content">

            <header
              class="portfolio-home-section-header portfolio-ambitions-expanded-header"
            >
              <div>
                <span class="portfolio-section-eyebrow">
                  Visión estratégica
                </span>

                <h2>Ambiciones RCS</h2>
              </div>

              <p>
                Las ocho ambiciones forman el marco común del portfolio y
                permiten entender cómo se conecta la ejecución de los programas
                con la estrategia.
              </p>
            </header>

            ${renderPortfolioAmbitions()}

          </div>

        </details>
      </section>

    </section>
  `;
};

window.setTimeout(() => {
  const currentRoute = String(window.location.hash || "")
    .replace(/^#\/?/, "")
    .trim();

  if (!currentRoute || currentRoute === "landing") {
    renderLanding();
  }
}, 0);
