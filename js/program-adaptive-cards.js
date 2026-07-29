const PROGRAM_ADAPTIVE_MAX_CARDS = 6;
const PROGRAM_ADAPTIVE_LOOKAHEAD_DAYS = 45;

function programAdaptiveRows(collectionName) {
  if (typeof programHomeRows === "function") {
    return programHomeRows(collectionName);
  }

  return Array.isArray(DATA?.[collectionName]) ? DATA[collectionName] : [];
}

function programAdaptiveRowsForProgram(
  collectionName,
  programId,
  options = {},
) {
  const { applyCountry = true } = options;
  const selectedProgramId = String(programId || "").trim();

  return programAdaptiveRows(collectionName).filter((row) => {
    const rowProgramId = String(row.programId || selectedProgramId).trim();

    if (rowProgramId !== selectedProgramId) {
      return false;
    }

    if (!applyCountry) {
      return true;
    }

    const country = String(
      row.country ||
        row.anchorCountry ||
        row["RtC Anchor Country"] ||
        "",
    ).trim();

    return !country || country === selectedCountry;
  });
}

function programAdaptiveBoolean(value, fallback = true) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return !["false", "0", "no", "off", "disabled", "inactivo"].includes(
    String(value).trim().toLowerCase(),
  );
}

function programAdaptiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function programAdaptiveSplit(value) {
  if (Array.isArray(value)) {
    return value.flatMap(programAdaptiveSplit);
  }

  return String(value || "")
    .split(/[|;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function programAdaptiveStatus(item) {
  if (typeof rcsNormalizeStatus === "function") {
    return rcsNormalizeStatus(item?.status);
  }

  return String(item?.status || "pending")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
}

function programAdaptiveIsDone(item) {
  return ["done", "completed", "closed", "resolved"].includes(
    programAdaptiveStatus(item),
  );
}

function programAdaptiveIsRisk(item) {
  if (typeof roadmapWorkspaceIsRisk === "function") {
    return roadmapWorkspaceIsRisk(item);
  }

  return ["at-risk", "blocked"].includes(programAdaptiveStatus(item));
}

function programAdaptiveHasPlanning(item) {
  if (typeof roadmapWorkspaceHasPlanning === "function") {
    return roadmapWorkspaceHasPlanning(item);
  }

  return [item?.startDate, item?.endDate, item?.targetDate].some(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
}

function programAdaptiveParseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof parseValidDate === "function") {
    const parsed = parseValidDate(value);

    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function programAdaptiveTargetDate(item) {
  return programAdaptiveParseDate(
    item?.targetDate ||
      item?.endDate ||
      item?.nextMilestoneDate ||
      item?.source?.targetDate ||
      item?.source?.endDate ||
      item?.source?.nextMilestoneDate,
  );
}

function programAdaptiveDaysUntil(date) {
  if (!date) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return Math.ceil((target - today) / 86400000);
}

function programAdaptiveAverageProgress(items) {
  if (!items.length) {
    return 0;
  }

  return Math.round(
    items.reduce(
      (total, item) =>
        total +
        Math.max(0, Math.min(100, programAdaptiveNumber(item.progress, 0))),
      0,
    ) / items.length,
  );
}

function programAdaptiveRoadmapItems(programId) {
  if (typeof roadmapWorkspaceItemsForProgram === "function") {
    return roadmapWorkspaceItemsForProgram(programId);
  }

  if (typeof programHomeGetRoadmapItems === "function") {
    return programHomeGetRoadmapItems(programId);
  }

  return programAdaptiveRowsForProgram("roadmapItems", programId);
}

function programAdaptiveSeverity(item) {
  return String(
    item?.severity || item?.priority || item?.impactLevel || item?.status || "",
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function programAdaptiveIsCriticalImpediment(item) {
  const severity = programAdaptiveSeverity(item);

  return (
    ["critical", "critica", "high", "alta", "blocked", "bloqueado"].some(
      (token) => severity.includes(token),
    ) || programAdaptiveStatus(item) === "blocked"
  );
}

function programAdaptiveIsOpenGap(item) {
  const status = programAdaptiveStatus(item);
  return !["done", "completed", "closed", "resolved"].includes(status);
}

function programAdaptiveCountryIds(programId) {
  const countryIds = new Set();
  const collectionNames = [
    "functional",
    "systems",
    "systemsToBe",
    "architectureFeaturesGaps",
    "teams",
    "roles",
    "priorities",
    "impediments",
    "decisionsPending",
    "decisionsDone",
    "roadmapItems",
  ];

  collectionNames.forEach((collectionName) => {
    programAdaptiveRowsForProgram(collectionName, programId, {
      applyCountry: false,
    }).forEach((row) => {
      const country = String(
        row.country || row.anchorCountry || row["RtC Anchor Country"] || "",
      ).trim();

      if (country) {
        countryIds.add(country);
      }
    });
  });

  if (typeof roadmapWorkspaceAllItems === "function") {
    roadmapWorkspaceAllItems()
      .filter(
        (item) =>
          String(item.programId || "").trim() === String(programId || "").trim(),
      )
      .forEach((item) => {
        const country = String(item.country || "").trim();

        if (country) {
          countryIds.add(country);
        }
      });
  }

  return [...countryIds];
}

function programAdaptiveRoadmapRoute(programId, ambitionId = "ALL") {
  if (typeof roadmapWorkspaceRoute === "function") {
    return roadmapWorkspaceRoute(
      programId,
      "summary",
      "ALL",
      "ALL",
      ambitionId,
    );
  }

  return `roadmap/${programId}/summary/ALL/ALL/${ambitionId}`;
}

function programAdaptiveTopAmbition(coverage) {
  if (!coverage?.byAmbition || typeof coverage.byAmbition.entries !== "function") {
    return null;
  }

  const entries = [...coverage.byAmbition.entries()].sort(
    (left, right) => right[1] - left[1],
  );
  const [ambitionId, count] = entries[0] || [];

  if (!ambitionId || !count) {
    return null;
  }

  const ambition =
    typeof roadmapAmbitionGet === "function"
      ? roadmapAmbitionGet(ambitionId)
      : null;

  return {
    id: ambitionId,
    title: ambition?.title || ambitionId,
    count,
  };
}

function programAdaptiveBuildSignals(programId, baseContext) {
  const roadmapItems = programAdaptiveRoadmapItems(programId);
  const plannedItems = roadmapItems.filter(programAdaptiveHasPlanning);
  const backlogItems = roadmapItems.filter(
    (item) => !programAdaptiveHasPlanning(item),
  );
  const riskItems = roadmapItems.filter(programAdaptiveIsRisk);
  const blockedItems = roadmapItems.filter(
    (item) => programAdaptiveStatus(item) === "blocked",
  );
  const overdueItems = roadmapItems.filter((item) => {
    const date = programAdaptiveTargetDate(item);
    const days = programAdaptiveDaysUntil(date);

    return days !== null && days < 0 && !programAdaptiveIsDone(item);
  });
  const upcomingItems = roadmapItems.filter((item) => {
    const date = programAdaptiveTargetDate(item);
    const days = programAdaptiveDaysUntil(date);

    return (
      days !== null &&
      days >= 0 &&
      days <= PROGRAM_ADAPTIVE_LOOKAHEAD_DAYS &&
      !programAdaptiveIsDone(item)
    );
  });
  const impediments = baseContext.impediments || [];
  const criticalImpediments = impediments.filter(
    programAdaptiveIsCriticalImpediment,
  );
  const openGaps = (baseContext.architectureGaps || []).filter(
    programAdaptiveIsOpenGap,
  );
  const decisionsPending = baseContext.decisionsPending || [];
  const decisionsDone = baseContext.decisionsDone || [];
  const roles = programAdaptiveRowsForProgram("roles", programId);
  const priorities = programAdaptiveRowsForProgram("priorities", programId);
  const coverage =
    typeof roadmapAmbitionCoverage === "function"
      ? roadmapAmbitionCoverage(roadmapItems)
      : {
          total: roadmapItems.length,
          linked: 0,
          unassigned: roadmapItems.length,
          percentage: 0,
          byAmbition: new Map(),
        };
  const resilienceItems =
    typeof roadmapAmbitionHas === "function"
      ? roadmapItems.filter((item) => roadmapAmbitionHas(item, "resilience"))
      : [];
  const attentionCount =
    blockedItems.length +
    overdueItems.length +
    criticalImpediments.length;
  const decisionTotal = decisionsPending.length + decisionsDone.length;
  const decisionClosure = decisionTotal
    ? Math.round((decisionsDone.length / decisionTotal) * 100)
    : 0;

  return {
    ...baseContext,
    roadmapItems,
    plannedItems,
    backlogItems,
    riskItems,
    blockedItems,
    overdueItems,
    upcomingItems,
    impediments,
    criticalImpediments,
    openGaps,
    decisionsPending,
    decisionsDone,
    roles,
    priorities,
    coverage,
    topAmbition: programAdaptiveTopAmbition(coverage),
    resilienceItems,
    attentionCount,
    decisionTotal,
    decisionClosure,
    averageProgress: programAdaptiveAverageProgress(roadmapItems),
    countries: programAdaptiveCountryIds(programId),
  };
}

function programAdaptiveTone(value) {
  const tone = String(value || "neutral")
    .trim()
    .toLowerCase();

  return ["critical", "warning", "positive", "neutral", "info"].includes(
    tone,
  )
    ? tone
    : "neutral";
}

function programAdaptiveAutomaticCards(programId, signals) {
  const cards = [];

  if (signals.attentionCount > 0) {
    cards.push({
      id: "executive-attention",
      eyebrow: "Atención ejecutiva",
      title: "Riesgos, vencimientos y bloqueos",
      metric: signals.attentionCount,
      metricLabel: "señales activas",
      description:
        "Concentra los asuntos que requieren intervención para proteger la entrega.",
      details: [
        `${signals.blockedItems.length} elementos bloqueados`,
        `${signals.overdueItems.length} entregas vencidas`,
        `${signals.criticalImpediments.length} impedimentos críticos`,
      ],
      tone:
        signals.blockedItems.length || signals.criticalImpediments.length
          ? "critical"
          : "warning",
      priority: 120 + signals.attentionCount,
      route: signals.criticalImpediments.length
        ? `impediments/${programId}`
        : programAdaptiveRoadmapRoute(programId),
      actionLabel: "Revisar atención",
      reason: "Se activa cuando existen bloqueos, vencimientos o impedimentos críticos.",
    });
  }

  if (signals.roadmapItems.length) {
    cards.push({
      id: "strategic-alignment",
      eyebrow: "Estrategia",
      title: "Cobertura de ambiciones RCS",
      metric: `${signals.coverage.percentage}%`,
      metricLabel: "roadmap clasificado",
      description:
        "Mide cuánto del roadmap tiene una contribución estratégica explícita.",
      details: [
        `${signals.coverage.linked} elementos vinculados`,
        `${signals.coverage.unassigned} sin ambición`,
        signals.topAmbition
          ? `Mayor contribución: ${signals.topAmbition.title}`
          : "Sin ambición dominante",
      ],
      tone: signals.coverage.unassigned ? "warning" : "positive",
      priority: signals.coverage.unassigned ? 100 : 68,
      route: programAdaptiveRoadmapRoute(programId),
      actionLabel: "Abrir trazabilidad",
      reason: "Se calcula con las ambiciones informadas en los elementos del roadmap.",
    });

    cards.push({
      id: "delivery-health",
      eyebrow: "Entrega",
      title: "Salud de ejecución",
      metric: `${signals.averageProgress}%`,
      metricLabel: "avance medio",
      description:
        "Resume el ritmo de entrega, la planificación y los próximos compromisos.",
      details: [
        `${signals.plannedItems.length} elementos planificados`,
        `${signals.backlogItems.length} elementos sin fechas`,
        `${signals.upcomingItems.length} entregas en los próximos ${PROGRAM_ADAPTIVE_LOOKAHEAD_DAYS} días`,
      ],
      tone:
        signals.riskItems.length || signals.averageProgress < 40
          ? "warning"
          : signals.averageProgress >= 75
            ? "positive"
            : "info",
      priority: 82 + Math.min(signals.riskItems.length, 10),
      route: programAdaptiveRoadmapRoute(programId),
      actionLabel: "Abrir roadmap",
      reason: "Se adapta al avance, fechas y estados del roadmap del país activo.",
    });
  }

  if (
    signals.systems.length ||
    signals.systemsToBe.length ||
    signals.architectureGaps.length
  ) {
    cards.push({
      id: "technology-evolution",
      eyebrow: "Tecnología",
      title: "Evolución de arquitectura",
      metric: signals.openGaps.length,
      metricLabel: "gaps abiertos",
      description:
        "Relaciona el mapa actual con la arquitectura objetivo y los gaps pendientes.",
      details: [
        `${signals.systems.length} elementos As-Is`,
        `${signals.systemsToBe.length} elementos To-Be`,
        `${signals.openGaps.length} gaps pendientes`,
      ],
      tone: signals.openGaps.length ? "warning" : "positive",
      priority: signals.openGaps.length ? 94 : 58,
      route: `architecture/${programId}`,
      actionLabel: "Abrir arquitectura",
      reason: "Aparece cuando el programa dispone de sistemas, target o gaps.",
    });
  }

  if (signals.resilienceItems.length) {
    cards.push({
      id: "resilience",
      eyebrow: "Reliability",
      title: "Contribución a resiliencia",
      metric: signals.resilienceItems.length,
      metricLabel: "elementos vinculados",
      description:
        "Visibiliza el trabajo del roadmap que refuerza reliability y salud tecnológica.",
      details: [
        `${signals.resilienceItems.filter(programAdaptiveIsRisk).length} en riesgo`,
        `${signals.resilienceItems.filter(programAdaptiveIsDone).length} completados`,
        `${signals.criticalImpediments.length} impedimentos críticos`,
      ],
      tone: signals.resilienceItems.some(programAdaptiveIsRisk)
        ? "warning"
        : "info",
      priority: 76,
      route: programAdaptiveRoadmapRoute(programId, "resilience"),
      actionLabel: "Ver roadmap de resiliencia",
      reason: "Se activa cuando existen elementos asociados a la ambición Resiliencia.",
    });
  }

  if (signals.decisionTotal) {
    cards.push({
      id: "decisions",
      eyebrow: "Gobierno",
      title: "Decisiones del programa",
      metric: signals.decisionsPending.length,
      metricLabel: "pendientes",
      description:
        "Muestra las decisiones que condicionan la ejecución y el nivel de cierre.",
      details: [
        `${signals.decisionsDone.length} decisiones tomadas`,
        `${signals.decisionClosure}% de cierre`,
        `${signals.decisionsPending.length} pendientes de resolución`,
      ],
      tone: signals.decisionsPending.length ? "warning" : "positive",
      priority: signals.decisionsPending.length ? 88 : 52,
      route: `decisions/${programId}`,
      actionLabel: "Revisar decisiones",
      reason: "Su prioridad aumenta cuando existen decisiones pendientes.",
    });
  }

  if (signals.teams.length || signals.roles.length) {
    cards.push({
      id: "operating-model",
      eyebrow: "Modelo operativo",
      title: "Equipos y liderazgo",
      metric: signals.teams.length || signals.roles.length,
      metricLabel: signals.teams.length ? "registros de equipo" : "roles definidos",
      description:
        "Resume la capacidad organizativa disponible para ejecutar el programa.",
      details: [
        `${signals.roles.length} roles de liderazgo`,
        `${signals.countries.length} países con información`,
        `${signals.products.length} productos identificados`,
      ],
      tone: "info",
      priority: 62,
      route: `teams/${programId}`,
      actionLabel: "Abrir equipos",
      reason: "Se adapta a la información de equipos, roles, productos y geografías.",
    });
  }

  if (signals.priorities.length) {
    const priorityLabels = signals.priorities
      .map((item) => item.priority || item.title || item.name)
      .filter(Boolean)
      .slice(0, 3);

    cards.push({
      id: "program-priorities",
      eyebrow: "Foco",
      title: "Prioridades declaradas",
      metric: signals.priorities.length,
      metricLabel: "prioridades activas",
      description:
        "Recoge el foco explícito del programa para el país seleccionado.",
      details: priorityLabels.length
        ? priorityLabels
        : ["Prioridades informadas sin descripción"],
      tone: "neutral",
      priority: 60,
      route: programAdaptiveRoadmapRoute(programId),
      actionLabel: "Contrastar con roadmap",
      reason: "Se muestra cuando el origen contiene prioridades del programa.",
    });
  }

  if (signals.products.length > 1) {
    cards.push({
      id: "product-portfolio",
      eyebrow: "Productos",
      title: "Portfolio del programa",
      metric: signals.products.length,
      metricLabel: "productos",
      description:
        "Permite comprobar cómo se distribuyen el roadmap y los sistemas por producto.",
      details: signals.products.slice(0, 3).map((product) => {
        const roadmapCount = signals.roadmapItems.filter(
          (item) =>
            programHomeNormalizeProduct(item.product) === String(product.id),
        ).length;

        return `${product.label}: ${roadmapCount} elementos`;
      }),
      tone: "info",
      priority: 54,
      route: programAdaptiveRoadmapRoute(programId),
      actionLabel: "Abrir portfolio",
      reason: "Se activa en programas con más de un producto identificado.",
    });
  }

  return cards;
}

function programAdaptiveConfiguredDefinition(programId) {
  const collectionNames = ["adaptiveCards", "programCards", "adaptive_cards"];
  const rows = collectionNames.flatMap((collectionName) =>
    programAdaptiveRowsForProgram(collectionName, programId),
  );
  const disabledIds = new Set();
  const cards = [];

  rows.forEach((row, index) => {
    const id = String(row.cardId || row.id || `configured-${index + 1}`).trim();
    const enabled = programAdaptiveBoolean(row.enabled, true);

    if (!enabled) {
      disabledIds.add(id);
      return;
    }

    const routeValue = String(row.route || "")
      .trim()
      .replaceAll("{programId}", programId)
      .replaceAll("${programId}", programId)
      .replace(/^#/, "");

    cards.push({
      id,
      eyebrow: row.eyebrow || row.category || "Programa",
      title: row.title || row.name || "Tarjeta configurada",
      metric: row.metric ?? row.value ?? "—",
      metricLabel: row.metricLabel || row.valueLabel || "indicador",
      description: row.description || "",
      details: programAdaptiveSplit(row.details || row.detail || row.items),
      tone: programAdaptiveTone(row.tone || row.status),
      priority: programAdaptiveNumber(row.priority || row.order, 70),
      route: routeValue,
      actionLabel: row.actionLabel || row.action || "Abrir",
      reason: row.reason || "Configurada explícitamente en el origen de datos.",
      configured: true,
    });
  });

  return { cards, disabledIds };
}

function programAdaptiveSelectCards(programId, program, signals) {
  const automatic = programAdaptiveAutomaticCards(programId, signals);
  const configured = programAdaptiveConfiguredDefinition(programId);
  const cardsById = new Map();

  automatic
    .filter((card) => !configured.disabledIds.has(card.id))
    .forEach((card) => cardsById.set(card.id, card));

  configured.cards.forEach((card) => cardsById.set(card.id, card));

  const requestedLimit = programAdaptiveNumber(
    program?.adaptiveCardsLimit || program?.programCardsLimit,
    PROGRAM_ADAPTIVE_MAX_CARDS,
  );
  const limit = Math.max(3, Math.min(9, requestedLimit));

  return [...cardsById.values()]
    .filter((card) => card.title && card.metric !== null)
    .sort((left, right) => {
      const priorityDifference =
        programAdaptiveNumber(right.priority) - programAdaptiveNumber(left.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return String(left.title).localeCompare(String(right.title), "es");
    })
    .slice(0, limit);
}

function programAdaptiveRenderCard(card) {
  const hasRoute = Boolean(card.route);
  const details = Array.isArray(card.details) ? card.details.filter(Boolean) : [];

  return `
    <article
      class="program-adaptive-card tone-${programAdaptiveTone(card.tone)} ${
        hasRoute ? "is-actionable" : ""
      }"
      ${hasRoute ? `data-route="${programHomeEscape(card.route)}"` : ""}
      ${hasRoute ? `data-program-adaptive-route="${programHomeEscape(card.route)}"` : ""}
      ${hasRoute ? 'tabindex="0" role="link"' : ""}
    >
      <header class="program-adaptive-card-header">
        <span>${programHomeEscape(card.eyebrow || "Programa")}</span>
        <i aria-hidden="true"></i>
      </header>

      <div class="program-adaptive-card-metric">
        <strong>${programHomeEscape(card.metric)}</strong>
        <span>${programHomeEscape(card.metricLabel || "")}</span>
      </div>

      <div class="program-adaptive-card-copy">
        <h3>${programHomeEscape(card.title)}</h3>
        <p>${programHomeEscape(card.description || "")}</p>
      </div>

      ${
        details.length
          ? `
              <ul class="program-adaptive-card-details">
                ${details
                  .slice(0, 4)
                  .map((detail) => `<li>${programHomeEscape(detail)}</li>`)
                  .join("")}
              </ul>
            `
          : ""
      }

      <footer>
        <small>${programHomeEscape(card.reason || "")}</small>
        ${
          hasRoute
            ? `<strong>${programHomeEscape(card.actionLabel || "Abrir")} →</strong>`
            : ""
        }
      </footer>
    </article>
  `;
}

function programAdaptiveRenderSection(programId, program, baseContext) {
  const signals = programAdaptiveBuildSignals(programId, baseContext);
  const cards = programAdaptiveSelectCards(programId, program, signals);

  return `
    <section
      class="program-home-section program-adaptive-section"
      data-program-adaptive-cards="${programHomeEscape(programId)}"
    >
      <header class="program-home-section-header program-adaptive-section-header">
        <div>
          <span>Lectura adaptativa</span>
          <h2>Qué requiere atención en este programa</h2>
        </div>

        <p>
          La selección y el orden cambian según los datos disponibles, el país,
          los riesgos y la situación del roadmap.
        </p>
      </header>

      ${
        cards.length
          ? `
              <div class="program-adaptive-grid">
                ${cards.map(programAdaptiveRenderCard).join("")}
              </div>

              <p class="program-adaptive-footnote">
                ${cards.length} tarjetas priorizadas ·
                ${signals.roadmapItems.length} elementos de roadmap ·
                ${signals.countries.length} geografías detectadas
              </p>
            `
          : `
              <section class="panel program-adaptive-empty">
                <strong>Sin señales suficientes</strong>
                <p>
                  El programa todavía no dispone de datos para construir tarjetas
                  adaptativas. Los módulos principales siguen disponibles.
                </p>
              </section>
            `
      }
    </section>
  `;
}

function programAdaptiveRefreshLandingCopy(home) {
  home.querySelectorAll(".program-home-section-header").forEach((header) => {
    const title = header.querySelector("h2")?.textContent?.trim();
    const paragraph = header.querySelector("p");

    if (!paragraph) {
      return;
    }

    if (title === "Mapas, arquitectura y ejecución") {
      paragraph.textContent =
        "Accesos comunes a la visión funcional, tecnológica y de ejecución del programa.";
    }

    if (title === "Marco común de lectura") {
      paragraph.textContent =
        "Las ambiciones proporcionan el marco estratégico y el Roadmap muestra la contribución real de cada elemento.";
    }

    if (title === "Seguimiento operativo") {
      paragraph.textContent =
        "Equipos, impedimentos y decisiones complementan las señales priorizadas de la lectura adaptativa.";
    }
  });
}

const programAdaptiveBaseRenderProgram = renderProgram;

renderProgram = function renderProgramWithAdaptiveCards(programId) {
  programAdaptiveBaseRenderProgram(programId);

  const home = view.querySelector(".program-home");

  if (!home) {
    return;
  }

  const program = programAdaptiveRows("programs").find(
    (item) => String(item.id || "").trim() === String(programId || "").trim(),
  );

  if (!program) {
    return;
  }

  const context = programHomeBuildContext(programId);
  const snapshot = home.querySelector(".program-home-snapshot");
  const markup = programAdaptiveRenderSection(programId, program, context);

  if (snapshot) {
    snapshot.insertAdjacentHTML("afterend", markup);
  } else {
    home.insertAdjacentHTML("afterbegin", markup);
  }

  programAdaptiveRefreshLandingCopy(home);
};

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-program-adaptive-route]");

  if (!card) {
    return;
  }

  event.preventDefault();
  route(card.dataset.programAdaptiveRoute);
});
