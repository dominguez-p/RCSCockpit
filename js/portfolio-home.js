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
      "Convertir a RCSE en una referencia de productividad para Retail, generando ahorros reales, credibilidad y aprendizajes que trasciendan al equipo.",
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
  const isProductivity = ambition.id === "productivity";

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

      ${
        isProductivity
          ? `
            <button
              type="button"
              data-rcse-productivity-open
              aria-controls="rcse-productivity-report"
              aria-expanded="false"
              style="
                display:flex;
                align-items:center;
                gap:8px;
                margin-top:14px;
                padding:10px 14px;
                width:100%;
                border:1px solid #b9cced;
                border-radius:10px;
                background:#eef3ff;
                color:#001391;
                font-family:inherit;
                font-size:13px;
                font-weight:700;
                text-align:left;
                cursor:pointer;
              "
            >
              <span aria-hidden="true">▤</span>
              Ver dashboard de Uso de IA
              <span aria-hidden="true">→</span>
            </button>
          `
          : ""
      }
    </article>
  `;
}

function renderPortfolioAmbitions() {
  // =====================================================
  // LOOKER STUDIO · PRODUCTIVIDAD
  // =====================================================

  // URL de inserción del informe.
  // La inserción debe estar habilitada en Looker Studio.

  const reportEmbedUrl =
    "https://datastudio.google.com/embed/reporting/1e920e66-2c96-463d-8bc0-1582c9d2315d/page/p_zsr7vk0w4d";
  /* "https://datastudio.google.com/embed/reporting/" +
    "94d0a9f5-2cdd-4eb4-b4c1-066601e8a1b7/" +
    "page/p_13onfdvx7d";
 */
  // =====================================================
  // EVENTOS DE APERTURA Y CIERRE
  // =====================================================

  // Registrar los eventos una única vez.
  // La navegación del cockpit reconstruye las vistas,
  // pero el listener se mantiene activo.

  if (!window.__rcseProductivityEmbedEventsRegistered) {
    window.__rcseProductivityEmbedEventsRegistered = true;

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const openButton = event.target.closest("[data-rcse-productivity-open]");

      const closeButton = event.target.closest(
        "[data-rcse-productivity-close]",
      );

      if (!openButton && !closeButton) {
        return;
      }

      const panel = document.getElementById("rcse-productivity-report");

      if (!panel) {
        return;
      }

      const trigger = document.querySelector("[data-rcse-productivity-open]");

      const isOpen = !panel.hidden;

      // Pulsar el botón abre el informe.
      // Pulsar de nuevo o cerrar lo oculta.

      if (openButton && !isOpen) {
        panel.hidden = false;
        panel.style.display = "block";

        if (trigger) {
          trigger.setAttribute("aria-expanded", "true");
        }

        const iframe = panel.querySelector("#rcseProductivityIframe");

        // Cargar el informe únicamente la primera vez.
        if (iframe && !iframe.getAttribute("src")) {
          iframe.setAttribute("src", iframe.dataset.embedSrc);
        }

        panel.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        return;
      }

      // Cerrar el informe sin abandonar el cockpit.

      panel.hidden = true;
      panel.style.display = "none";

      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");

        trigger.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }

  // =====================================================
  // RENDERIZAR LAS OCHO AMBICIONES
  // =====================================================

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

    <!-- =================================================
         DASHBOARD DE PRODUCTIVIDAD
         ================================================= -->

    <section
      id="rcse-productivity-report"
      hidden
      aria-label="Dashboard de productividad y uso de IA"
      style="
        display:none;
        width:100%;
        margin-top:22px;
        padding:18px;
        background:#ffffff;
        border:1px solid #d7e2f2;
        border-radius:18px;
        box-sizing:border-box;
        scroll-margin-top:20px;
      "
    >

      <!-- CABECERA DEL INFORME -->

      <header style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:12px;
        margin-bottom:16px;
      ">

        <div>
          <span style="
            display:block;
            margin-bottom:5px;
            font-size:11px;
            font-weight:800;
            color:#001391;
            letter-spacing:1px;
            text-transform:uppercase;
          ">
            Ambición 05 · Productividad
          </span>

          <h2 style="
            margin:0;
            color:#001391;
            font-size:25px;
          ">
            Consumo de IA
          </h2>

          <p style="
            margin:6px 0 0;
            color:#53688c;
            font-size:13px;
          ">
            Transformación Systems Retail ·
            Dashboard interactivo de uso de IA
          </p>
        </div>

        <button
          type="button"
          data-rcse-productivity-close
          class="toolbar-btn"
          style="
            padding:10px 15px;
            border:1px solid #d7e2f2;
            border-radius:10px;
            background:#eef3ff;
            color:#001391;
            font-family:inherit;
            font-size:13px;
            font-weight:700;
            cursor:pointer;
          "
        >
          ← Volver a las ambiciones
        </button>

      </header>

      <!-- INFORME INCRUSTADO -->

      <div style="
        width:100%;
        overflow:hidden;
        border:1px solid #e0e7f2;
        border-radius:12px;
        background:#f8faff;
      ">

        <iframe
          id="rcseProductivityIframe"
          title="Consumo de IA - Transformación Systems Retail"
          data-embed-src="${reportEmbedUrl}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
          style="
            display:block;
            width:100%;
            height:clamp(600px,80vh,1050px);
            border:0;
            background:#ffffff;
          "
        ></iframe>

      </div>

      <p style="
        margin:12px 0 0;
        color:#60708f;
        font-size:12px;
      ">
        Fuente: Google Looker Studio.
        La información y sus filtros se gestionan
        directamente desde el informe original.
      </p>

    </section>
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

  if (
    window.RCS_PORTFOLIO_LANDING_MODES &&
    typeof window.RCS_PORTFOLIO_LANDING_MODES.renderProgramsStage === "function"
  ) {
    return window.RCS_PORTFOLIO_LANDING_MODES.renderProgramsStage(programs);
  }

  /*
   * Fallback.
   *
   * Si el módulo visual no estuviera disponible,
   * se conserva la landing actual.
   */
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
    "RCSE Portfolio Cockpit",
    "Programas y ambiciones estratégicas de Retail Client Solutions",
  );

  const portfolioKpis = Array.isArray(DATA?.portfolioKpis)
    ? DATA.portfolioKpis
    : [];

  const programs = Array.isArray(DATA?.programs) ? DATA.programs : [];

  view.innerHTML = `
    <section class="portfolio-home">

      <section
        class="
          portfolio-home-section
          portfolio-programs-section
        "
      >
        <header
          class="portfolio-home-section-header"
        >
          <div>
            <span
              class="portfolio-section-eyebrow"
            >
              Ejecución
            </span>

            <h2>
              Programas RCS
            </h2>
          </div>

          <p>
            Los programas que materializan la estrategia de
            Retail Client Solutions.
          </p>
        </header>

        ${renderPortfolioPrograms(programs)}

        ${renderPortfolioKpis(portfolioKpis)}

      </section>

    </section>
  `;
};

window.setTimeout(() => {
  const currentRoute = String(window.location.hash || "")
    .replace(/^#\/?/, "")
    .trim();

  if (
    !currentRoute ||
    currentRoute === "landing" ||
    currentRoute.startsWith("landing?")
  ) {
    renderLanding();
  }
}, 0);
