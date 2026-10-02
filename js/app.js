let PORTFOLIO_DATA = {
  portfolioKpis: [],
  programs: [],
};
let PORTFOLIO_LAST_LOADED_AT = null;
const PROGRAM_DATA_CACHE = new Map();
const PROGRAM_LAST_LOADED_AT = new Map();
const PROGRAM_SOURCES = new Map();
const PROGRAM_RESTRICTED_DATA_CACHE = new Map();
let DATA = window.SAMPLE_DATA;
let selectedCountry = "HL";
let selectedSystemProduct = "blue-buddy";
let selectedCapability = null;
let selectedSystemComponent = null;
let selectedArchitectureGap = null;
let isSystemMapExpanded = false;
let isToBeMapExpanded = false;
let showProgramLocalisms = false;
let isLoadingData = false;
let executiveQuarter = "ALL";
let selectedExecutiveProduct = "blue-buddy";
let selectedTeamQuarter = "ALL";
let showManagementSpaceVision = false;
const MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID = "blue-global-status";
const MANAGEMENT_GLOBAL_STATUS_YEAR = 2026;
const MANAGEMENT_GLOBAL_STATUS_MANUAL_VALUES = ["N/A", "2027", "100%"];
const MANAGEMENT_GLOBAL_STATUS_CONFIG = Object.freeze({
  title: "Blue Buddy Global Status",
  subtitle: "Executive snapshot",
  countries: [
    {
      id: "ES",
      label: "España",
      flag: "🇪🇸",
      deployedTarget: "Retail remote and branches",
      expectedTarget: "CC (26 July)",
    },
    {
      id: "PE",
      label: "Perú",
      flag: "🇵🇪",
      deployedTarget: "Retail remote, branches and CC",
      expectedTarget: "Remote for SMEs (Q4'26)",
    },
    {
      id: "CO",
      label: "Colombia",
      flag: "🇨🇴",
      deployedTarget: "Retail remote",
      expectedTarget: "Remote for SMEs (Q3'26)",
    },
    {
      id: "MX",
      label: "México",
      flag: "🇲🇽",
      deployedTarget: "n.a.",
      expectedTarget: "Retail remote and branches and SMEs (Q4'26)",
    },
    {
      id: "TR",
      label: "Turquía",
      flag: "🇹🇷",
      deployedTarget: "Retail remote, branches and SMEs",
      expectedTarget: "n.a.",
    },
  ],
  sections: [
    {
      id: "knowledge-increase-info",
      title: "Knowledge: increase info",
      items: [
        {
          id: "static-multiformat-knowledge-bases",
          label: "Static, multi-format knowledge bases",
        },
        {
          id: "connecting-to-other-build-agents",
          label: "Connecting to other Build agents",
        },
      ],
    },
    {
      id: "knowledge-improved-experience",
      title: "Knowledge: Improved experience",
      items: [
        {
          id: "integrated-into-bankers-desktop",
          label: "Integrated into the banker's desktop",
        },
        {
          id: "redirect-to-human-if-fallback",
          label: "Redirect to human if fallback",
        },
      ],
    },
    {
      id: "sales-assistant",
      title: "Sales Assistant",
      badge: "NEW",
      items: [
        {
          id: "customer-overview",
          label: "Customer Overview",
        },
        {
          id: "personalized-sales-pitch",
          label: "Personalized sales pitch",
        },
        {
          id: "comparison-with-competitor-products",
          label: "Comparison with competitor products",
        },
      ],
    },
    {
      id: "technical-enablers",
      title: "Technical Enablers",
      items: [
        {
          id: "supervisor-agent-agent-ecosystem",
          label: "Supervisor Agent (agent ecosystem)",
        },
        {
          id: "drive-governed",
          label: "Drive-Governed",
        },
      ],
    },
  ],
});
const view = document.querySelector("#view");
const title = document.querySelector("#pageTitle");
const subtitle = document.querySelector("#pageSubtitle");
const crumb = document.querySelector("#breadcrumb");
const statusEl = document.querySelector("#dataStatus");
const COUNTRIES = [
  { id: "ES", label: "España", flagSrc: "assets/flags/es.svg" },
  { id: "MX", label: "México", flagSrc: "assets/flags/mx.svg" },
  { id: "PE", label: "Perú", flagSrc: "assets/flags/pe.svg" },
  { id: "CO", label: "Colombia", flagSrc: "assets/flags/co.svg" },
  { id: "TR", label: "Turquía", flagSrc: "assets/flags/tr.svg" },
  { id: "HL", label: "Holding", flagSrc: "assets/flags/world.png" },
];
function getAvailableSystemProducts(programId) {
  const products = new Map();
  (DATA.systems || [])
    .filter(
      (item) =>
        item.programId === programId &&
        item.country === selectedCountry &&
        item.product,
    )
    .forEach((item) => {
      const id = String(item.product).trim();
      products.set(id, {
        id,
        label: id
          .split("-")
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join(" "),
      });
    });
  return [...products.values()];
}

function setHead(t, s, c = "Retail Client Solutions") {
  title.textContent = t;
  subtitle.textContent = s;
  crumb.textContent = c;
}

function tpl(id) {
  return document.querySelector(id).content.cloneNode(true);
}

function pillClass(s) {
  return s.includes("Atención") ? "red" : s.includes("Piloto") ? "yellow" : "";
}

function route(r) {
  location.hash = r;
}

function splitPipeList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderLanding() {
  setHead(
    "Retail Client Solutions Cockpit",
    "Portfolio overview, demanda estratégica y evolución de arquitectura",
  );
  view.innerHTML = "";
  view.append(tpl("#landing-template"));
  document.querySelector("#portfolioKpis").innerHTML = (
    DATA.portfolioKpis || []
  )
    .map((k) => {
      const label = k.label || k.title || k.name || k[0] || "";
      const value = k.value || k.metric || k[1] || "";
      const subtitle = k.subtitle || k.description || k[2] || "";
      const icon = k.icon || k[3] || "◎";
      return `
      <article class="kpi-card">
        <div class="kpi-icon">${icon}</div>
        <div>
          <h3>${label}</h3>
          <strong>${value}</strong>
          <p>${subtitle}</p>
        </div>
      </article>
    `;
    })
    .join("");
  document.querySelector("#programGrid").innerHTML = DATA.programs
    .map(
      (p) => `
        <article class="program-card ${p.enabled ? "" : "disabled"}">
          <div class="program-head">
            <div class="program-icon">${p.icon || "●"}</div>
            <div>
              <h3>${p.name}</h3>
              <p>${p.description}</p>
            </div>
          </div>
          <span class="pill ${pillClass(p.status)}">${p.status}</span>
          <div class="progress-row">
            <div>
              <small>Funcional</small>
              <div class="donut" style="--p:${p.functional}" data-label="${p.functional}%"></div>
            </div>
            <div>
              <small>Sistemas</small>
              <div class="donut" style="--p:${p.systems}" data-label="${p.systems}%"></div>
            </div>
            <div>
              <small>Arquitectura</small>
              <div class="donut" style="--p:${p.architecture}" data-label="${p.architecture}%"></div>
            </div>
          </div>
          <button class="card-link" ${p.enabled ? `data-route="program/${p.id}"` : `onclick=\"alert('Programa próximamente disponible')\"`}>→ Ver programa</button>
        </article>
      `,
    )
    .join("");
}

function getAIxBankerProduct(productId) {
  const normalizedProductId = String(productId || "")
    .trim()
    .toLowerCase();
  const products = {
    "blue-buddy": {
      id: "blue-buddy",
      label: "Blue Buddy",
      description: "Roadmap, iniciativas y evolución del producto Blue Buddy.",
    },
    panorama: {
      id: "panorama",
      label: "Panorama",
      description: "Roadmap, iniciativas y evolución del producto Panorama.",
    },
    blue: {
      id: "blue",
      label: "Blue",
      description: "Solución agentic para cliente.",
    },
    nbc: {
      id: "nbc",
      label: "NBC",
      description: "Orquestación inteligente de interacciones y asistencia.",
    },
  };
  return products[normalizedProductId] || null;
}

function getCurrentQuarter() {
  const month = new Date().getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

function isValidRoadmapQuarter(quarter) {
  return ["ALL", "Q1", "Q2", "Q3", "Q4"].includes(quarter);
}

function getRoadmapQuarterLabel(quarter) {
  if (quarter === "ALL") {
    return "Todo el año";
  }
  return quarter;
}
const ROADMAP_JIRA_STATUS_ORDER = [
  "Pre-Work",
  "Analysis To Do",
  "Analysis In Progress",
  "Analysis In Review",
  "Blocked",
  "Closed",
];
const ROADMAP_JIRA_NON_COUNTING_STATUSES = new Set(["Blocked", "Closed"]);

function normalizeRoadmapJiraStatus(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const aliases = {
    "pre work": "Pre-Work",
    "analysis to do": "Analysis To Do",
    "analysis in progress": "Analysis In Progress",
    "analysis in review": "Analysis In Review",
    blocked: "Blocked",
    closed: "Closed",
  };
  return aliases[normalized] || raw;
}

function adaptRoadmapItemStatusHistory(row) {
  return {
    itemId: String(row.itemId || "").trim(),
    jiraKey: String(row.jiraKey || "").trim(),
    sequence: Number(row.sequence) || 0,
    status: normalizeRoadmapJiraStatus(row.status || row.statusRaw),
    statusRaw: String(row.statusRaw || row.status || "").trim(),
    startAt: row.startAt || "",
    endAt: row.endAt || "",
    sourceFile: String(row.sourceFile || "").trim(),
    sourceUpdatedAt: row.sourceUpdatedAt || "",
    source: row,
  };
}
const MANAGEMENT_ROADMAP_EDITABLE_STATUSES = {
  "on-track": {
    key: "on-track",
    status: "on-track",
    statusLabel: "En curso",
    statusTone: "",
  },
  "at-risk": {
    key: "at-risk",
    status: "at-risk",
    statusLabel: "En riesgo",
    statusTone: "",
  },
  delayed: {
    key: "delayed",
    status: "at-risk",
    statusLabel: "Retrasado",
    statusTone: "delayed",
  },
  replanned: {
    key: "replanned",
    status: "planned",
    statusLabel: "Reprogramado",
    statusTone: "replanned",
  },
  blocked: {
    key: "blocked",
    status: "blocked",
    statusLabel: "Bloqueado",
    statusTone: "",
  },
  done: {
    key: "done",
    status: "done",
    statusLabel: "Finalizado",
    statusTone: "done",
  },
  cancelled: {
    key: "cancelled",
    status: "planned",
    statusLabel: "Cancelado",
    statusTone: "cancelled",
  },
};

function getManagementRoadmapEditableStatusKey(line) {
  const statusTone = String(line?.statusTone || "")
    .trim()
    .toLowerCase();
  if (statusTone && MANAGEMENT_ROADMAP_EDITABLE_STATUSES[statusTone]) {
    return statusTone;
  }
  const status = String(line?.status || "")
    .trim()
    .toLowerCase();
  if (MANAGEMENT_ROADMAP_EDITABLE_STATUSES[status]) {
    return status;
  }
  return "on-track";
}

function roadmapJiraStatusCountsTowardsEffectiveTime(status) {
  const normalizedStatus = normalizeRoadmapJiraStatus(status);
  if (!normalizedStatus) {
    return false;
  }
  return !ROADMAP_JIRA_NON_COUNTING_STATUSES.has(normalizedStatus);
}

function roadmapJiraIntervalDurationMs(interval, now = new Date()) {
  if (!interval) {
    return 0;
  }
  const startDate = parseValidDate(interval.startAt);
  if (!startDate) {
    return 0;
  }
  const status = normalizeRoadmapJiraStatus(interval.status);
  let endDate = parseValidDate(interval.endAt);
  /*
   * Closed y Discarded son estados terminales.
   *
   * Si el histórico representa el estado terminal como
   * último intervalo abierto, su duración es 0 porque el
   * ciclo termina exactamente al entrar en ese estado.
   *
   * El resto de estados abiertos continúa hasta ahora.
   */
  if (!endDate) {
    if (status === "Closed" || status === "Discarded") {
      return 0;
    }
    endDate = now instanceof Date ? now : new Date(now);
  }
  if (Number.isNaN(endDate.getTime())) {
    return 0;
  }
  return Math.max(0, endDate.getTime() - startDate.getTime());
}

function buildRoadmapJiraMetrics(history, now = new Date()) {
  const intervals = (Array.isArray(history) ? history : [])
    .filter((interval) => interval && interval.startAt && interval.status)
    .sort(
      (left, right) => Number(left.sequence || 0) - Number(right.sequence || 0),
    );
  const byStatus = {};
  ROADMAP_JIRA_STATUS_ORDER.forEach((status) => {
    byStatus[status] = 0;
  });
  let effectiveTimeMs = 0;
  let blockedTimeMs = 0;
  let cycleTimeMs = 0;
  intervals.forEach((interval) => {
    const status = normalizeRoadmapJiraStatus(interval.status);
    const durationMs = roadmapJiraIntervalDurationMs(interval, now);
    if (!Object.prototype.hasOwnProperty.call(byStatus, status)) {
      byStatus[status] = 0;
    }
    byStatus[status] += durationMs;
    /*
     * Closed y Discarded son terminales.
     *
     * El ciclo termina exactamente al entrar en cualquiera
     * de esos estados, por lo que el propio intervalo
     * terminal no forma parte de la duración del ciclo.
     */
    if (status !== "Closed" && status !== "Discarded") {
      cycleTimeMs += durationMs;
    }
    if (status === "Blocked") {
      blockedTimeMs += durationMs;
    }
    if (roadmapJiraStatusCountsTowardsEffectiveTime(status)) {
      effectiveTimeMs += durationMs;
    }
  });
  const firstInterval = intervals[0] || null;
  const lastInterval = intervals.at(-1) || null;
  const currentStatus = lastInterval
    ? normalizeRoadmapJiraStatus(lastInterval.status)
    : "";
  const isClosed = currentStatus === "Closed";
  const isDiscarded = currentStatus === "Discarded";
  const isTerminal = isClosed || isDiscarded;
  const isBlocked = currentStatus === "Blocked";
  const completedAt = isTerminal ? lastInterval?.startAt || "" : "";
  return {
    hasData: intervals.length > 0,
    intervalCount: intervals.length,
    currentStatus,
    currentStatusRaw: lastInterval?.statusRaw || currentStatus,
    currentSince: lastInterval?.startAt || "",
    startedAt: firstInterval?.startAt || "",
    completedAt,
    isClosed,
    isDiscarded,
    isTerminal,
    isBlocked,
    effectiveTimeMs,
    blockedTimeMs,
    cycleTimeMs,
    byStatus,
    sourceFile: lastInterval?.sourceFile || "",
    sourceUpdatedAt: lastInterval?.sourceUpdatedAt || "",
  };
}

function roadmapJiraFormatDuration(milliseconds) {
  const totalMilliseconds = Math.max(0, Number(milliseconds || 0));
  const totalMinutes = Math.floor(totalMilliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days} d ${hours} h`;
  }
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  if (totalMilliseconds > 0) {
    return "< 1 min";
  }
  return "0 min";
}

function adaptUnifiedRoadmapItem(
  item,
  activities = [],
  jiraStatusHistory = [],
) {
  const type = String(item.type || "")
    .trim()
    .toLowerCase();
  const typeLabels = {
    project: "Proyecto",
    msa: "MSA",
    poc: "PoC",
    initiative: "Iniciativa",
    epic: "Epic",
  };
  const normalizedJiraHistory = (
    Array.isArray(jiraStatusHistory) ? jiraStatusHistory : []
  )
    .map(adaptRoadmapItemStatusHistory)
    .sort((left, right) => left.sequence - right.sequence);
  const jiraMetrics =
    type === "msa"
      ? buildRoadmapJiraMetrics(normalizedJiraHistory)
      : buildRoadmapJiraMetrics([]);
  const hasJiraLifecycle = type === "msa" && jiraMetrics.hasData;
  const hasJiraIndex = type === "msa" && item.jiraHistoryAvailable === true;
  const jiraIndexStatus = normalizeRoadmapJiraStatus(
    item.jiraCurrentStatus || "",
  );
  const jiraIndexIsTerminal =
    jiraIndexStatus === "Closed" || jiraIndexStatus === "Discarded";
  const jiraStartDate = hasJiraLifecycle
    ? jiraMetrics.startedAt
    : hasJiraIndex
      ? item.startDate || ""
      : "";
  /*
   * Closed y Discarded son terminales.
   *
   * Histórico completo:
   * completedAt es el instante de entrada
   * en el estado terminal.
   *
   * Índice ligero:
   * Apps Script ya proporciona endDate.
   *
   * Sólo los estados realmente abiertos
   * llegan hasta hoy.
   */
  const jiraEndDate = hasJiraLifecycle
    ? jiraMetrics.isTerminal
      ? jiraMetrics.completedAt
      : new Date().toISOString()
    : hasJiraIndex
      ? jiraIndexIsTerminal
        ? item.endDate || item.jiraCurrentSince || ""
        : new Date().toISOString()
      : "";
  let effectiveStatus = rcsNormalizeStatus(item.status);
  const effectiveJiraStatus = hasJiraLifecycle
    ? jiraMetrics.currentStatus
    : hasJiraIndex
      ? jiraIndexStatus
      : "";
  if (effectiveJiraStatus) {
    if (effectiveJiraStatus === "Blocked") {
      effectiveStatus = "blocked";
    } else if (effectiveJiraStatus === "Closed") {
      effectiveStatus = "done";
    } else if (effectiveJiraStatus === "Discarded") {
      /*
       * Discarded es terminal temporalmente,
       * pero no equivale funcionalmente a Hecho.
       */
      effectiveStatus = "planned";
    } else if (
      ["Analysis In Progress", "Analysis In Review"].includes(
        effectiveJiraStatus,
      )
    ) {
      effectiveStatus = "on-track";
    } else {
      effectiveStatus = "planned";
    }
  }
  const effectiveJiraMetrics = hasJiraLifecycle
    ? jiraMetrics
    : hasJiraIndex
      ? {
          ...jiraMetrics,
          hasData: false,
          hasIndexData: true,
          intervalCount: Number(item.jiraHistoryEntries || 0),
          currentStatus: jiraIndexStatus,
          currentStatusRaw:
            item.jiraCurrentStatusRaw ||
            item.jiraCurrentStatus ||
            jiraIndexStatus,
          currentSince: item.jiraCurrentSince || "",
          startedAt: item.startDate || "",
          completedAt: jiraIndexIsTerminal
            ? item.endDate || item.jiraCurrentSince || ""
            : "",
          isClosed: jiraIndexStatus === "Closed",
          isDiscarded: jiraIndexStatus === "Discarded",
          isTerminal: jiraIndexIsTerminal,
          isBlocked: jiraIndexStatus === "Blocked",
          sourceFile: item.jiraSourceFile || "",
          sourceUpdatedAt: item.jiraSourceUpdatedAt || item.lastUpdate || "",
        }
      : jiraMetrics;
  return {
    id: String(item.id || "").trim(),
    type,
    typeLabel: typeLabels[type] || type || "Elemento",
    programId: String(item.programId || "").trim(),
    product: normalizeRoadmapProduct(item.product),
    country: String(item.country || "").trim(),
    capabilityIds: item.capabilityIds || "",
    initiative: String(item.initiative || "").trim(),
    title: item.name || item.title || item.initiative || "Elemento sin nombre",
    summary: item.summary || item.description || "",
    description: item.description || item.summary || "",
    status: effectiveStatus,
    progress: normalizeRoadmapProgress(item.progress),
    priority: normalizeRoadmapPriority(item.priority),
    roadmapOrder: normalizeRoadmapPriority(
      item.roadmapOrder ??
        item.roadmap_order ??
        item.laneOrder ??
        item.lane_order,
    ),
    owner: item.owner || "",
    nextMilestoneTitle: item.nextMilestoneTitle || "",
    nextMilestoneDate: item.nextMilestoneDate || "",
    startDate:
      jiraStartDate ||
      item.startDate ||
      getFirstRoadmapPhaseDate(activities, "startDate"),
    endDate:
      jiraEndDate ||
      item.endDate ||
      getLastRoadmapPhaseDate(activities, "endDate"),
    targetDate:
      item.targetDate ||
      item.nextMilestoneDate ||
      getLastRoadmapPhaseDate(activities, "targetDate") ||
      getLastRoadmapPhaseDate(activities, "endDate"),
    lastUpdate: hasJiraLifecycle
      ? jiraMetrics.sourceUpdatedAt || item.lastUpdate || ""
      : item.jiraSourceUpdatedAt || item.lastUpdate || "",
    strategicGoal: item.strategicGoal || "",
    businessValue: item.businessValue || "",
    mainRisks: item.mainRisks || "",
    dependencies: item.dependencies || "",
    documentUrl: item.documentUrl || "",
    documentLabel: item.documentLabel || "",
    jiraKey: item.jiraKey || "",
    jiraUrl: item.jiraUrl || "",
    jiraStatusHistory: normalizedJiraHistory,
    jiraMetrics: effectiveJiraMetrics,
    jiraHistoryAvailable: hasJiraLifecycle || hasJiraIndex,
    jiraHistoryLoaded: hasJiraLifecycle,
    jiraHistoryEntries: hasJiraLifecycle
      ? normalizedJiraHistory.length
      : Number(item.jiraHistoryEntries || 0),
    jiraCurrentStatus: effectiveJiraStatus,
    jiraCurrentSince: hasJiraLifecycle
      ? jiraMetrics.currentSince
      : item.jiraCurrentSince || "",
    phases: activities,
    activities,
    source: item,
  };
}

function adaptRoadmapItemActivity(activity) {
  return {
    id: String(activity.activityId || activity.id || "").trim(),
    activityId: String(activity.activityId || activity.id || "").trim(),
    itemId: String(activity.itemId || "").trim(),
    phaseId: String(
      activity.activityId || activity.phaseId || activity.id || "",
    ).trim(),
    phaseName:
      activity.activityName || activity.phaseName || "Actividad sin nombre",
    activityName:
      activity.activityName || activity.phaseName || "Actividad sin nombre",
    order: Number(activity.order) || 0,
    progress: normalizeRoadmapProgress(activity.progress),
    status: rcsNormalizeStatus(activity.status),
    startDate: activity.startDate || "",
    endDate: activity.endDate || "",
    targetDate: activity.targetDate || "",
    comments: activity.comments || "",
    source: activity,
  };
}

function getGroupedActivityStatus(tasks) {
  const statuses = (tasks || [])
    .map((task) => rcsNormalizeStatus(task.status))
    .filter(Boolean);
  if (!statuses.length) {
    return "planned";
  }
  const uniqueStatuses = [...new Set(statuses)];
  /*
   * Si todas las tareas están en el mismo estado,
   * la actividad hereda ese estado.
   *
   * Ejemplos:
   * - todas done      -> done
   * - todas blocked   -> blocked
   * - todas pending   -> pending
   * - todas on-track  -> on-track
   */
  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0];
  }
  /*
   * Si hay mezcla de estados:
   * - si alguna está bloqueada -> la actividad queda en riesgo
   * - en cualquier otro caso   -> la actividad queda en progreso
   */
  if (uniqueStatuses.includes("blocked")) {
    return "at-risk";
  }
  return "on-track";
}

function groupRoadmapItemActivities(tasks) {
  const groups = new Map();
  (tasks || []).forEach((task) => {
    const activityId = String(
      task.activityId || task.id || task.phaseId || task.activityName || "",
    ).trim();
    if (!activityId) {
      return;
    }
    if (!groups.has(activityId)) {
      groups.set(activityId, []);
    }
    groups.get(activityId).push(task);
  });
  return [...groups.entries()]
    .map(([activityId, activityTasks]) => {
      const progress =
        activityTasks.length > 0
          ? Math.round(
              activityTasks.reduce(
                (total, task) =>
                  total + normalizeRoadmapProgress(task.progress),
                0,
              ) / activityTasks.length,
            )
          : 0;
      const startDate = getFirstRoadmapPhaseDate(activityTasks, "startDate");
      const endDate = getLastRoadmapPhaseDate(activityTasks, "endDate");
      const targetDate = getLastRoadmapPhaseDate(activityTasks, "targetDate");
      const order = Math.min(
        ...activityTasks.map((task) =>
          Number.isFinite(Number(task.order)) ? Number(task.order) : 999,
        ),
      );
      return {
        id: activityId,
        activityId,
        phaseId: activityId,
        activityName: activityId,
        phaseName: activityId,
        order,
        progress,
        status: getGroupedActivityStatus(activityTasks),
        startDate,
        endDate,
        targetDate,
        taskCount: activityTasks.length,
        tasks: activityTasks,
      };
    })
    .sort((a, b) => a.order - b.order);
}

function normalizeRoadmapProduct(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
  const aliases = {
    franquicia: "franchise",
    franchise: "franchise",
  };
  return aliases[normalized] || normalized;
}

function normalizeRoadmapProgress(value) {
  const progress = Number(value || 0);
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(100, progress));
}

function normalizeRoadmapPriority(value) {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : 999;
}

function getRoadmapPhaseDate(phase, field) {
  if (!phase) {
    return null;
  }
  const aliases = {
    startDate: ["startDate", "start_date", "start", "beginDate"],
    endDate: ["endDate", "end_date", "end"],
    targetDate: ["targetDate", "target_date", "deliveryDate"],
  };
  const fields = aliases[field] || [field];
  for (const candidate of fields) {
    const value = phase[candidate];
    if (value && parseValidDate(value)) {
      return value;
    }
  }
  return null;
}

function getFirstRoadmapPhaseDate(phases, field) {
  const dates = phases
    .map((phase) => getRoadmapPhaseDate(phase, field))
    .filter(Boolean)
    .sort((a, b) => parseValidDate(a) - parseValidDate(b));
  return dates[0] || "";
}

function getLastRoadmapPhaseDate(phases, field) {
  const dates = phases
    .map((phase) => getRoadmapPhaseDate(phase, field))
    .filter(Boolean)
    .sort((a, b) => parseValidDate(a) - parseValidDate(b));
  return dates.at(-1) || "";
}

function adaptUnifiedRoadmapCollection() {
  const items = Array.isArray(DATA?.roadmapItems) ? DATA.roadmapItems : [];
  const activities = Array.isArray(DATA?.roadmapItemActivities)
    ? DATA.roadmapItemActivities
    : [];
  const jiraStatusHistory = Array.isArray(DATA?.roadmapItemStatusHistory)
    ? DATA.roadmapItemStatusHistory
    : [];
  const jiraMsaIndex = getJiraMsaIndexByItemId();
  return items
    .map((rawItem) => {
      /*
       * El índice NO crea elementos.
       *
       * Sólo enriquece los roadmapItems
       * que ya existen.
       */
      const item = enrichRoadmapItemWithJiraMsaIndex(rawItem, jiraMsaIndex);
      const itemId = String(item.id || "").trim();
      const itemActivities = activities
        .filter((activity) => String(activity.itemId || "").trim() === itemId)
        .map(adaptRoadmapItemActivity)
        .sort((left, right) => left.order - right.order);
      /*
       * Sólo tendrá contenido cuando
       * el histórico del MSA haya sido
       * solicitado on-demand.
       */
      const itemJiraStatusHistory = jiraStatusHistory
        .filter((interval) => String(interval.itemId || "").trim() === itemId)
        .sort(
          (left, right) =>
            Number(left.sequence || 0) - Number(right.sequence || 0),
        );
      return adaptUnifiedRoadmapItem(
        item,
        itemActivities,
        itemJiraStatusHistory,
      );
    })
    .filter((item) => Boolean(item.id));
}

function getJiraMsaIndexByItemId() {
  const rows = Array.isArray(DATA?.jiraMsaIndex) ? DATA.jiraMsaIndex : [];
  const result = new Map();
  rows.forEach((row) => {
    const itemId = String(row.itemId || "").trim();
    if (!itemId) {
      return;
    }
    result.set(itemId, row);
  });
  return result;
}

function enrichRoadmapItemWithJiraMsaIndex(item, jiraMsaIndex) {
  if (!item) {
    return item;
  }
  const type = String(item.type || "")
    .trim()
    .toLowerCase();
  if (type !== "msa") {
    return item;
  }
  const itemId = String(item.id || "").trim();
  if (!itemId) {
    return item;
  }
  const jira = jiraMsaIndex.get(itemId);
  if (!jira) {
    return item;
  }
  const currentStatus = String(jira.currentStatus || "").trim();
  const normalizedStatus = normalizeRoadmapJiraStatus(currentStatus);
  let effectiveStatus = item.status;
  if (normalizedStatus === "Blocked") {
    effectiveStatus = "blocked";
  } else if (normalizedStatus === "Closed") {
    effectiveStatus = "done";
  } else if (normalizedStatus === "Discarded") {
    /*
     * Discarded termina temporalmente el MSA,
     * pero no representa una entrega completada.
     */
    effectiveStatus = "planned";
  } else if (
    ["Analysis In Progress", "Analysis In Review"].includes(normalizedStatus)
  ) {
    effectiveStatus = "on-track";
  } else if (normalizedStatus) {
    effectiveStatus = "planned";
  }
  return {
    ...item,
    status: effectiveStatus,
    startDate: jira.startDate || item.startDate || "",
    /*
     * Para Closed y Discarded, jira.endDate debe contener
     * el instante de entrada en el estado terminal.
     *
     * currentSince queda como fallback defensivo para
     * índices anteriores que no informasen endDate.
     */
    endDate:
      normalizedStatus === "Closed" || normalizedStatus === "Discarded"
        ? jira.endDate || jira.currentSince || item.endDate || ""
        : jira.endDate || item.endDate || "",
    lastUpdate: jira.sourceUpdatedAt || item.lastUpdate || "",
    jiraCurrentStatus: currentStatus,
    jiraCurrentStatusRaw: String(jira.currentStatusRaw || currentStatus).trim(),
    jiraCurrentSince: jira.currentSince || "",
    jiraHistoryAvailable: jira.historyAvailable === true,
    jiraHistoryEntries: Number(jira.historyEntries || 0),
    jiraSourceFile: String(jira.sourceFile || "").trim(),
    jiraSourceUpdatedAt: String(jira.sourceUpdatedAt || "").trim(),
  };
}

function getRoadmapItems(programId = null, productId = null, quarter = "ALL") {
  const normalizedProgramId = String(programId || "").trim();
  const normalizedProductId = normalizeRoadmapProduct(productId);
  const normalizedCountry = String(selectedCountry || "")
    .trim()
    .toUpperCase();
  const normalizedQuarter = isValidRoadmapQuarter(quarter) ? quarter : "ALL";
  return adaptUnifiedRoadmapCollection()
    .filter((item) => {
      /*
       * Programa.
       */
      if (
        normalizedProgramId &&
        String(item.programId || "").trim() !== normalizedProgramId
      ) {
        return false;
      }
      /*
       * Producto.
       */
      if (
        normalizedProductId &&
        normalizeRoadmapProduct(item.product) !== normalizedProductId
      ) {
        return false;
      }
      /*
       * País.
       *
       * Si el elemento no informa país,
       * no lo descartamos.
       */
      const itemCountry = String(item.country || "")
        .trim()
        .toUpperCase();
      if (
        normalizedCountry &&
        itemCountry &&
        itemCountry !== normalizedCountry
      ) {
        return false;
      }
      /*
       * Periodo.
       *
       * ALL mantiene también elementos
       * sin planificación temporal.
       */
      if (!roadmapItemMatchesPeriod(item, normalizedQuarter)) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const leftOrder = getRoadmapItemStackOrder(left);
      const rightOrder = getRoadmapItemStackOrder(right);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left.title || "").localeCompare(
        String(right.title || ""),
        "es",
      );
    });
}

function getRoadmapPeriod(quarter, year = new Date().getFullYear()) {
  const normalizedQuarter = String(
    quarter || getCurrentQuarter(),
  ).toUpperCase();
  if (normalizedQuarter === "ALL") {
    return {
      year,
      quarter: "ALL",
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      months: Array.from(
        { length: 12 },
        (_, index) => new Date(year, index, 1),
      ),
    };
  }
  const quarterNumber = Number(normalizedQuarter.replace("Q", ""));
  const safeQuarterNumber =
    quarterNumber >= 1 && quarterNumber <= 4 ? quarterNumber : 1;
  const startMonth = (safeQuarterNumber - 1) * 3;
  return {
    year,
    quarter: `Q${safeQuarterNumber}`,
    startDate: new Date(year, startMonth, 1),
    endDate: new Date(year, startMonth + 3, 0),
    months: Array.from(
      { length: 3 },
      (_, index) => new Date(year, startMonth + index, 1),
    ),
  };
}

function getRoadmapItemDates(item) {
  const startDate = parseValidDate(item.startDate);
  const endDate = parseValidDate(item.endDate);
  const targetDate = parseValidDate(item.targetDate);
  return {
    startDate: startDate || targetDate || endDate || null,
    endDate: endDate || targetDate || startDate || null,
    targetDate,
  };
}

function roadmapItemMatchesPeriod(
  item,
  quarter,
  year = new Date().getFullYear(),
) {
  const period = getRoadmapPeriod(quarter, year);
  const { startDate, endDate } = getRoadmapItemDates(item);
  /*
   * Un elemento sin fechas no puede asignarse
   * a un trimestre concreto.
   *
   * En la vista anual sí lo mantenemos para que
   * aparezca en "Elementos sin planificación temporal".
   */
  if (!startDate || !endDate) {
    return quarter === "ALL";
  }
  return startDate <= period.endDate && endDate >= period.startDate;
}

function clampRoadmapDate(date, minimum, maximum) {
  if (!date) {
    return null;
  }
  if (date < minimum) {
    return new Date(minimum);
  }
  if (date > maximum) {
    return new Date(maximum);
  }
  return new Date(date);
}

function getRoadmapDatePosition(date, period) {
  if (!date) {
    return null;
  }
  const periodStart = period.startDate.getTime();
  const periodEnd = period.endDate.getTime();
  const dateTime = clampRoadmapDate(
    date,
    period.startDate,
    period.endDate,
  ).getTime();
  const duration = periodEnd - periodStart;
  if (duration <= 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(100, ((dateTime - periodStart) / duration) * 100),
  );
}

function getRoadmapItemLayout(item, period) {
  const { startDate, endDate, targetDate } = getRoadmapItemDates(item);
  if (!startDate || !endDate) {
    return {
      hasDates: false,
      isVisible: false,
      startDate,
      endDate,
      targetDate,
      left: 0,
      width: 0,
      targetPosition: null,
    };
  }
  const isVisible = startDate <= period.endDate && endDate >= period.startDate;
  if (!isVisible) {
    return {
      hasDates: true,
      isVisible: false,
      startDate,
      endDate,
      targetDate,
      left: 0,
      width: 0,
      targetPosition: null,
    };
  }
  const visibleStart = clampRoadmapDate(
    startDate,
    period.startDate,
    period.endDate,
  );
  const visibleEnd = clampRoadmapDate(
    endDate,
    period.startDate,
    period.endDate,
  );
  const left = getRoadmapDatePosition(visibleStart, period);
  const right = getRoadmapDatePosition(visibleEnd, period);
  const minimumWidth = period.quarter === "ALL" ? 1.2 : 2.5;
  const width = Math.max(minimumWidth, right - left);
  const targetIsVisible =
    targetDate &&
    targetDate >= period.startDate &&
    targetDate <= period.endDate;
  return {
    hasDates: true,
    isVisible: true,
    startDate,
    endDate,
    targetDate,
    left,
    width: Math.min(width, 100 - left),
    targetPosition: targetIsVisible
      ? getRoadmapDatePosition(targetDate, period)
      : null,
  };
}

function getRoadmapTypeClass(type) {
  return `roadmap-type-${String(type || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-")}`;
}

function normalizeRoadmapInitiativeKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getDefaultRoadmapTypeOrder(type) {
  return (
    {
      initiative: 10,
      epic: 20,
      msa: 30,
      project: 40,
      poc: 50,
    }[type] || 999
  );
}

function getRoadmapItemStackOrder(item) {
  const configuredOrder = Number(item.roadmapOrder);
  if (Number.isFinite(configuredOrder) && configuredOrder !== 999) {
    return configuredOrder;
  }
  return getDefaultRoadmapTypeOrder(item.type);
}

function groupRoadmapItemsByInitiative(items) {
  const groups = new Map();
  items.forEach((item) => {
    const initiative = String(item.initiative || item.title || "").trim();
    const key =
      normalizeRoadmapInitiativeKey(initiative) || `${item.type}-${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: initiative || item.title || "Iniciativa sin nombre",
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        const orderDifference =
          getRoadmapItemStackOrder(a) - getRoadmapItemStackOrder(b);
        if (orderDifference !== 0) {
          return orderDifference;
        }
        return String(a.typeLabel || a.type).localeCompare(
          String(b.typeLabel || b.type),
          "es",
        );
      }),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

function getRoadmapGroupStatus(group) {
  const statuses = group.items.map((item) => rcsNormalizeStatus(item.status));
  if (statuses.includes("blocked")) {
    return "blocked";
  }
  if (statuses.includes("at-risk")) {
    return "at-risk";
  }
  if (statuses.length && statuses.every((status) => status === "done")) {
    return "done";
  }
  if (statuses.includes("on-track")) {
    return "on-track";
  }
  if (statuses.includes("planned")) {
    return "planned";
  }
  return statuses[0] || "pending";
}

function renderRoadmapMonths(period) {
  return period.months
    .map(
      (month) => `
        <div class="aixbanker-roadmap-month">
          <strong>
            ${month.toLocaleDateString("es-ES", {
              month: "long",
            })}
          </strong>
          <span>
            ${month.getFullYear()}
          </span>
        </div>
      `,
    )
    .join("");
}

function roadmapJiraStatusShortLabel(status) {
  return (
    {
      "Pre-Work": "Pre-Work",
      "Analysis To Do": "To Do",
      "Analysis In Progress": "In Progress",
      "Analysis In Review": "In Review",
      Blocked: "Blocked",
      Closed: "Closed",
    }[status] || status
  );
}

function roadmapJiraStatusCssClass(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderRoadmapJiraAggregates(item) {
  const metrics = item?.jiraMetrics;
  if (!metrics?.hasData) {
    return "";
  }
  const statuses = ROADMAP_JIRA_STATUS_ORDER.filter(
    (status) => status !== "Closed",
  )
    .map((status) => ({
      status,
      duration: Number(metrics.byStatus?.[status] || 0),
    }))
    .filter(
      ({ status, duration }) =>
        duration > 0 || (status === "Blocked" && metrics.blockedTimeMs > 0),
    );
  return `
    <div
      class="
        roadmap-jira-summary
      "
    >
      <div
        class="
          roadmap-jira-summary-head
        "
      >
        <span>
          Tiempo efectivo
        </span>
        <strong>
          ${rcsEsc(roadmapJiraFormatDuration(metrics.effectiveTimeMs))}
        </strong>
      </div>
      <div
        class="
          roadmap-jira-status-times
        "
      >
        ${statuses
          .map(
            ({ status, duration }) => `
              <span
                class="
                  roadmap-jira-status-time
                  roadmap-jira-status-${roadmapJiraStatusCssClass(status)}
                "
              >
                <small>
                  ${rcsEsc(roadmapJiraStatusShortLabel(status))}
                </small>
                <strong>
                  ${rcsEsc(roadmapJiraFormatDuration(duration))}
                </strong>
              </span>
            `,
          )
          .join("")}
      </div>
      ${
        metrics.blockedTimeMs > 0
          ? `
              <div
                class="
                  roadmap-jira-blocked-time
                "
              >
                Bloqueado:
                <strong>
                  ${rcsEsc(roadmapJiraFormatDuration(metrics.blockedTimeMs))}
                </strong>
                · no computa
              </div>
            `
          : ""
      }
    </div>
  `;
}

function renderRoadmapJiraBar(item, layout) {
  const metrics = item?.jiraMetrics;
  if (!metrics?.hasData) {
    return "";
  }
  const currentStatus = metrics.currentStatus || "Sin estado";
  return `
    <button
      class="
        aixbanker-roadmap-bar
        aixbanker-roadmap-bar-action
        roadmap-type-msa
        roadmap-jira-lifecycle-bar
      "
      type="button"
      data-roadmap-detail-type="${rcsEsc(item.type)}"
      data-roadmap-detail-id="${rcsEsc(item.id)}"
      style="
        left:${layout.left}%;
        width:${layout.width}%;
      "
      title="${rcsEsc(
        `${item.title} · ${currentStatus} · ` +
          `Tiempo efectivo: ${roadmapJiraFormatDuration(
            metrics.effectiveTimeMs,
          )}. Abrir detalle.`,
      )}"
      aria-label="${rcsEsc(`Abrir detalle del MSA ${item.title}`)}"
    >
      <span
        class="
          aixbanker-roadmap-bar-label
          roadmap-jira-bar-label
        "
      >
        ${rcsEsc(roadmapJiraFormatDuration(metrics.effectiveTimeMs))}
      </span>
    </button>
  `;
}
const ROADMAP_JIRA_DETAIL_STATUSES = [
  {
    id: "Pre-Work",
    label: "Pre-Work",
    cssClass: "pre-work",
  },
  {
    id: "Analysis To Do",
    label: "Analysis To Do",
    cssClass: "analysis-to-do",
  },
  {
    id: "Analysis In Progress",
    label: "Analysis In Progress",
    cssClass: "analysis-in-progress",
  },
  {
    id: "Analysis In Review",
    label: "Analysis In Review",
    cssClass: "analysis-in-review",
  },
  {
    id: "Closed",
    label: "Closed",
    cssClass: "closed",
  },
];

function roadmapJiraDetailSafeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }
    return url.href;
  } catch {
    return "";
  }
}

function renderRoadmapJiraDetailExternalAction(label, url) {
  const safeUrl = roadmapJiraDetailSafeUrl(url);
  if (!safeUrl) {
    return "";
  }
  return `
    <a
      class="
        roadmap-jira-detail-external-action
      "
      href="${rcsEsc(safeUrl)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${rcsEsc(label)}
      ↗
    </a>
  `;
}

function roadmapJiraFormatDetailedDuration(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.floor(Number(milliseconds || 0) / 1000),
  );
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    if (hours > 0) {
      return `${days} d ${hours} h`;
    }
    return `${days} d`;
  }
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${hours} h`;
  }
  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes} min ${seconds} s`;
    }
    return `${minutes} min`;
  }
  if (seconds > 0) {
    return `${seconds} s`;
  }
  return "< 1 s";
}

function roadmapJiraFormatBarDurationLabel(milliseconds) {
  const totalHours = Math.max(
    0,
    Math.round(Number(milliseconds || 0) / 3600000),
  );
  if (totalHours <= 0) {
    return "";
  }
  if (totalHours < 24) {
    return `${totalHours} h`;
  }
  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} d`;
}

function getRoadmapJiraLifecyclePeriod(history) {
  const intervals = (Array.isArray(history) ? history : [])
    .filter((interval) => interval && interval.startAt && interval.status)
    .sort(
      (left, right) => Number(left.sequence || 0) - Number(right.sequence || 0),
    );
  if (!intervals.length) {
    return null;
  }
  const firstStart = parseValidDate(intervals[0].startAt);
  if (!firstStart) {
    return null;
  }
  const now = new Date();
  const finalCandidates = intervals
    .map((interval) => {
      const status = normalizeRoadmapJiraStatus(interval.status);
      const startDate = parseValidDate(interval.startAt);
      const endDate = parseValidDate(interval.endAt);
      /*
       * Los estados terminales terminan exactamente
       * en el momento de entrada en el estado.
       */
      if (status === "Closed" || status === "Discarded") {
        return startDate;
      }
      return endDate || now;
    })
    .filter(Boolean)
    .sort((left, right) => left - right);
  const finalDate = finalCandidates.at(-1) || now;
  const startDate = new Date(
    firstStart.getFullYear(),
    firstStart.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const endDate = new Date(
    finalDate.getFullYear(),
    finalDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const months = [];
  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return {
    startDate,
    endDate,
    months,
  };
}

function roadmapJiraLifecyclePosition(value, period) {
  if (!period) {
    return 0;
  }
  const date = value instanceof Date ? value : parseValidDate(value);
  if (!date) {
    return 0;
  }
  const periodStart = period.startDate.getTime();
  const periodEnd = period.endDate.getTime();
  const duration = periodEnd - periodStart;
  if (duration <= 0) {
    return 0;
  }
  const clampedTime = Math.max(
    periodStart,
    Math.min(periodEnd, date.getTime()),
  );
  return ((clampedTime - periodStart) / duration) * 100;
}

function renderRoadmapJiraLifecycleMonths(period, showLabels = false) {
  if (!period) {
    return "";
  }
  return period.months
    .map((month) => {
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const left = roadmapJiraLifecyclePosition(month, period);
      const right = roadmapJiraLifecyclePosition(nextMonth, period);
      const width = Math.max(0, right - left);
      return `
          <span
            class="
              roadmap-jira-detail-month
              ${showLabels ? "has-label" : ""}
            "
            style="
              left:${left}%;
              width:${width}%;
            "
          >
            ${
              showLabels
                ? `
                    <strong>
                      ${rcsEsc(
                        month.toLocaleDateString("es-ES", {
                          month: "long",
                        }),
                      )}
                    </strong>
                    <small>
                      ${month.getFullYear()}
                    </small>
                  `
                : ""
            }
          </span>
        `;
    })
    .join("");
}

function renderRoadmapJiraLifecycleToday(period) {
  if (!period) {
    return "";
  }
  const today = new Date();
  if (today < period.startDate || today > period.endDate) {
    return "";
  }
  const left = roadmapJiraLifecyclePosition(today, period);
  return `
    <span
      class="
        roadmap-jira-detail-today
      "
      style="
        left:${left}%;
      "
    >
      <span>
        Hoy
      </span>
    </span>
  `;
}

function renderRoadmapJiraLifecycleSegment(interval, period) {
  const status = normalizeRoadmapJiraStatus(interval.status);
  const startDate = parseValidDate(interval.startAt);
  if (!startDate) {
    return "";
  }
  if (status === "Closed") {
    const left = roadmapJiraLifecyclePosition(startDate, period);
    return `
      <span
        class="
          roadmap-jira-detail-closed-marker
        "
        style="
          left:${left}%;
        "
        title="${rcsEsc(`Closed · ${formatDate(startDate)}`)}"
      >
        <i
          aria-hidden="true"
        >
          ◆
        </i>
        <em>
          ${rcsEsc(formatDate(startDate))}
        </em>
      </span>
    `;
  }
  const endDate = parseValidDate(interval.endAt) || new Date();
  if (endDate < period.startDate || startDate > period.endDate) {
    return "";
  }
  const left = roadmapJiraLifecyclePosition(startDate, period);
  const right = roadmapJiraLifecyclePosition(endDate, period);
  const width = Math.max(0.0001, right - left);
  const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const durationLabel = roadmapJiraFormatDetailedDuration(durationMs);
  const barDurationLabel = roadmapJiraFormatBarDurationLabel(durationMs);
  const showDuration = width >= 3.2;
  return `
    <span
      class="
        roadmap-jira-detail-segment
        roadmap-jira-detail-segment-${roadmapJiraStatusCssClass(status)}
      "
      style="
        left:${left}%;
        width:${width}%;
      "
      title="${rcsEsc(
        `${status} · ` +
          `${formatDate(startDate)} → ` +
          `${formatDate(endDate)} · ` +
          `${durationLabel}`,
      )}"
    >
      ${
        showDuration && barDurationLabel
          ? `
              <strong>
                ${rcsEsc(barDurationLabel)}
              </strong>
            `
          : ""
      }
    </span>
  `;
}

function renderRoadmapJiraLifecycleRow(definition, roadmapItem, period) {
  const history = Array.isArray(roadmapItem.jiraStatusHistory)
    ? roadmapItem.jiraStatusHistory
    : [];
  const intervals = history.filter(
    (interval) => normalizeRoadmapJiraStatus(interval.status) === definition.id,
  );
  const totalDuration = Number(
    roadmapItem.jiraMetrics?.byStatus?.[definition.id] || 0,
  );
  const meta =
    definition.id === "Closed"
      ? intervals.length
        ? "Hito de cierre"
        : "Sin cierre"
      : totalDuration > 0
        ? roadmapJiraFormatDuration(totalDuration)
        : "Sin paso por estado";
  return `
    <div
      class="
        roadmap-jira-detail-row
        roadmap-jira-detail-row-${definition.cssClass}
      "
    >
      <div
        class="
          roadmap-jira-detail-row-label
        "
      >
        <strong>
          ${rcsEsc(definition.label)}
        </strong>
        <span>
          ${rcsEsc(meta)}
        </span>
      </div>
      <div
        class="
          roadmap-jira-detail-row-track
        "
      >
        ${renderRoadmapJiraLifecycleMonths(period, false)}
        ${intervals
          .map((interval) =>
            renderRoadmapJiraLifecycleSegment(interval, period),
          )
          .join("")}
        ${renderRoadmapJiraLifecycleToday(period)}
      </div>
    </div>
  `;
}

function renderRoadmapJiraLifecycleDetail(roadmapItem, navigation) {
  const history = Array.isArray(roadmapItem.jiraStatusHistory)
    ? roadmapItem.jiraStatusHistory
    : [];
  const period = getRoadmapJiraLifecyclePeriod(history);
  const backRoute = navigation?.route || "";
  const backLabel = navigation?.label || "Volver al roadmap";
  const currentStatus = roadmapItem.jiraMetrics?.currentStatus || "";
  if (!period) {
    view.innerHTML = `
      <section
        class="
          panel
          roadmap-jira-detail-panel
        "
      >
        <button
          class="
            ghost-button
          "
          type="button"
          data-route="${rcsEsc(backRoute)}"
        >
          ← ${rcsEsc(backLabel)}
        </button>
        <p
          class="
            empty-state
          "
        >
          No hay histórico JIRA
          disponible para este MSA.
        </p>
      </section>
    `;
    return;
  }
  view.innerHTML = `
    <section
      class="
        panel
        roadmap-jira-detail-panel
      "
    >
      <header
        class="
          roadmap-jira-detail-header
        "
      >
        <button
          class="
            ghost-button
          "
          type="button"
          data-route="${rcsEsc(backRoute)}"
        >
          ← ${rcsEsc(backLabel)}
        </button>
        <div
          class="
            roadmap-jira-detail-heading
          "
        >
          <div
            class="
              aixbanker-roadmap-item-top
            "
          >
            <span
              class="
                aixbanker-roadmap-type
              "
            >
              MSA
            </span>
            ${
              roadmapItem.jiraKey
                ? `
                    <span
                      class="
                        aixbanker-roadmap-type
                      "
                    >
                      ${rcsEsc(roadmapItem.jiraKey)}
                    </span>
                  `
                : ""
            }
          </div>
          <h3>
            ${rcsEsc(roadmapItem.title)}
          </h3>
          <p>
            Ciclo real reconstruido
            desde el histórico de
            estados de JIRA.
          </p>
        </div>
        <div
          class="
            roadmap-jira-detail-actions
          "
        >
          ${
            currentStatus
              ? `
                  <span
                    class="
                      roadmap-jira-detail-current-state
                    "
                  >
                    ${rcsEsc(currentStatus)}
                  </span>
                `
              : ""
          }
          ${renderRoadmapJiraDetailExternalAction(
            "Abrir MSA",
            roadmapItem.documentUrl,
          )}
          ${renderRoadmapJiraDetailExternalAction(
            "Abrir JIRA",
            roadmapItem.jiraUrl,
          )}
        </div>
      </header>
      <section
        class="
          roadmap-jira-detail-lifecycle
        "
      >
        <div
          class="
            roadmap-jira-detail-section-heading
          "
        >
          <div>
            <span>
              CICLO E2E
            </span>
            <h3>
              Evolución por estado
            </h3>
          </div>
          <p>
            Tiempo efectivo:
            <strong>
              ${rcsEsc(
                roadmapJiraFormatDuration(
                  roadmapItem.jiraMetrics?.effectiveTimeMs || 0,
                ),
              )}
            </strong>
          </p>
        </div>
        <div
          class="
            roadmap-jira-detail-board
          "
        >
          <div
            class="
              roadmap-jira-detail-axis
            "
          >
            <div
              class="
                roadmap-jira-detail-axis-title
              "
            >
              Estado
            </div>
            <div
              class="
                roadmap-jira-detail-axis-track
              "
            >
              ${renderRoadmapJiraLifecycleMonths(period, true)}
              ${renderRoadmapJiraLifecycleToday(period)}
            </div>
          </div>
          ${ROADMAP_JIRA_DETAIL_STATUSES.map((definition) =>
            renderRoadmapJiraLifecycleRow(definition, roadmapItem, period),
          ).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderRoadmapItemDetailView(roadmapItem, navigation) {
  if (!roadmapItem) {
    return;
  }
  const isJiraMsa =
    String(roadmapItem.type || "")
      .trim()
      .toLowerCase() === "msa" && roadmapItem.jiraMetrics?.hasData === true;
  if (isJiraMsa) {
    renderRoadmapJiraLifecycleDetail(roadmapItem, navigation);
    return;
  }
  const tasks = Array.isArray(roadmapItem.activities)
    ? roadmapItem.activities
    : Array.isArray(roadmapItem.phases)
      ? roadmapItem.phases
      : [];
  const activities = groupRoadmapItemActivities(tasks).map((activity) => ({
    ...activity,
    detailRoute: navigation?.activityRouteBase
      ? `${navigation.activityRouteBase}/${encodeURIComponent(
          activity.activityId,
        )}`
      : "",
  }));
  const status = rcsNormalizeStatus(roadmapItem.status);
  const backRoute = navigation?.route || "";
  const backLabel = navigation?.label || "Volver al roadmap";
  view.innerHTML = `
    <section
      class="
        panel
        project-detail-panel
      "
    >
      <div
        class="
          project-detail-header
        "
      >
        <button
          class="
            ghost-button
          "
          type="button"
          data-route="${rcsEsc(backRoute)}"
        >
          ← ${rcsEsc(backLabel)}
        </button>
        <div>
          <div
            class="
              aixbanker-roadmap-item-top
            "
          >
            <span
              class="
                aixbanker-roadmap-type
              "
            >
              ${rcsEsc(roadmapItem.typeLabel)}
            </span>
            ${
              roadmapItem.initiative
                ? `
                    <span
                      class="
                        aixbanker-roadmap-type
                      "
                    >
                      ${rcsEsc(roadmapItem.initiative)}
                    </span>
                  `
                : ""
            }
          </div>
          <h3>
            ${rcsEsc(roadmapItem.title)}
          </h3>
          <p>
            ${rcsEsc(
              roadmapItem.description ||
                roadmapItem.summary ||
                "Sin descripción.",
            )}
          </p>
        </div>
        <div
          class="
            project-detail-actions
          "
        >
          <span
            class="
              status-pill
              status-${status}
            "
          >
            ${rcsEsc(rcsStatusLabel(status))}
          </span>
          ${rcsExternalLink(roadmapItem)}
        </div>
      </div>
      <div
        class="
          project-detail-grid
          project-detail-grid-dates
        "
      >
        <article
          class="
            detail-card
          "
        >
          <span>
            Inicio
          </span>
          <strong>
            ${rcsEsc(formatDate(roadmapItem.startDate))}
          </strong>
        </article>
        <article
          class="
            detail-card
          "
        >
          <span>
            Fin
          </span>
          <strong>
            ${rcsEsc(formatDate(roadmapItem.endDate))}
          </strong>
        </article>
        <article
          class="
            detail-card
          "
        >
          <span>
            Entrega objetivo
          </span>
          <strong>
            ${rcsEsc(formatDate(roadmapItem.targetDate))}
          </strong>
        </article>
        <article
          class="
            detail-card
          "
        >
          <span>
            Última actualización
          </span>
          <strong>
            ${rcsEsc(formatDate(roadmapItem.lastUpdate))}
          </strong>
        </article>
      </div>
      <section
        class="
          phase-section
        "
      >
        <div
          class="
            section-header
          "
        >
          <div>
            <h3>
              Roadmap de actividades
            </h3>
            ${
              activities.length
                ? `
                    <p
                      class="
                        empty-state
                      "
                    >
                      ${activities.length}
                      ${activities.length === 1 ? "actividad" : "actividades"}
                      ·
                      ${tasks.length}
                      ${tasks.length === 1 ? "tarea" : "tareas"}
                    </p>
                  `
                : ""
            }
          </div>
        </div>
        <section
          class="
            phase-status-legend
          "
          aria-label="
            Leyenda de estados
          "
        >
          <span
            class="
              phase-status-legend-item
            "
          >
            <i
              class="
                phase-status-dot
                phase-status-done
              "
            ></i>
            Hecho
          </span>
          <span
            class="
              phase-status-legend-item
            "
          >
            <i
              class="
                phase-status-dot
                phase-status-on-track
              "
            ></i>
            En progreso
          </span>
          <span
            class="
              phase-status-legend-item
            "
          >
            <i
              class="
                phase-status-dot
                phase-status-pending
              "
            ></i>
            Pendiente
          </span>
          <span
            class="
              phase-status-legend-item
            "
          >
            <i
              class="
                phase-status-dot
                phase-status-risk
              "
            ></i>
            Riesgo
          </span>
          <span
            class="
              phase-status-legend-item
            "
          >
            <i
              class="
                phase-status-dot
                phase-status-blocked
              "
            ></i>
            Bloqueado
          </span>
        </section>
        ${
          activities.length
            ? `
                <div id="roadmapItemTimeline"></div>
              `
            : `
                <p
                  class="
                    empty-state
                  "
                >
                  No hay actividades
                  informadas para este elemento.
                </p>
              `
        }
      </section>
    </section>
  `;
  /*
   * IMPORTANTE:
   *
   * El id debe ser EXACTAMENTE
   * roadmapItemTimeline.
   *
   * No debe contener saltos de línea
   * ni espacios dentro del atributo.
   */
  const timelineContainer = document.getElementById("roadmapItemTimeline");
  if (!timelineContainer || !activities.length) {
    return;
  }
  renderPhaseTimeline(activities, timelineContainer, {
    firstColumnLabel: "Actividad",
    showMissingDates: false,
  });
}

function renderAIxBankerRoadmapDetail(
  programId,
  productId,
  quarter,
  itemType,
  itemId,
) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  const product = getAIxBankerProduct(productId);
  const selectedQuarter = isValidRoadmapQuarter(quarter) ? quarter : "ALL";
  const backRoute = getRoadmapDetailBackRoute(
    programId,
    productId,
    selectedQuarter,
  );
  if (!program || !product || !itemType || !itemId) {
    route(backRoute);
    return;
  }
  selectedExecutiveProduct = product.id;
  executiveQuarter = selectedQuarter;
  /*
   * Buscamos en ALL porque el detalle
   * no depende del periodo visible.
   */
  const roadmapItems = getRoadmapItems(programId, productId, "ALL");
  const roadmapItem = roadmapItems.find(
    (item) =>
      String(item.type || "").trim() === String(itemType || "").trim() &&
      String(item.id || "").trim() === String(itemId || "").trim(),
  );
  if (!roadmapItem) {
    setHead(
      "Elemento no encontrado",
      `${product.label} · ${selectedCountry}`,
      `Retail Client Solutions > ${
        program.name || "AIxBanker"
      } > ${product.label} > Roadmap`,
    );
    view.innerHTML = `
      <section class="panel">
        <button
          class="ghost-button"
          type="button"
          data-route="${rcsEsc(backRoute)}"
        >
          ← Volver
        </button>
        <h3>
          Elemento no encontrado
        </h3>
        <p class="empty-state">
          El elemento solicitado
          no existe para el producto
          y país seleccionados.
        </p>
      </section>
    `;
    return;
  }
  const country = COUNTRIES.find((item) => item.id === selectedCountry);
  const countryLabel = country?.label || selectedCountry;
  setHead(
    roadmapItem.title,
    `${roadmapItem.typeLabel} · ` + `${product.label} · ` + `${countryLabel}`,
    `Retail Client Solutions > ${
      program.name || "AIxBanker"
    } > ${product.label} > ` + `Roadmap > ${roadmapItem.title}`,
  );
  renderRoadmapItemDetailView(roadmapItem, {
    route: backRoute,
    label: `Volver`,
    activityRouteBase: [
      "roadmap-activity",
      programId,
      productId,
      selectedQuarter,
      itemType,
      itemId,
    ].join("/"),
  });
}

function hasRoadmapTaskPlanning(task) {
  return [task?.startDate, task?.endDate, task?.targetDate].some((value) => {
    if (value instanceof Date) {
      return !Number.isNaN(value.getTime());
    }
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

function renderRoadmapActivityTasksView(roadmapItem, activity, navigation) {
  const tasks = Array.isArray(activity.tasks) ? activity.tasks : [];
  const plannedTasks = tasks.filter(hasRoadmapTaskPlanning);
  const unplannedTasks = tasks.filter((task) => !hasRoadmapTaskPlanning(task));
  const status = rcsNormalizeStatus(activity.status);
  view.innerHTML = `
    <section class="panel project-detail-panel">
      <div class="project-detail-header">
        <button
          class="ghost-button"
          type="button"
          data-route="${rcsEsc(navigation.route)}"
        >
          ← ${rcsEsc(navigation.label)}
        </button>
        <div>
          <div class="aixbanker-roadmap-item-top">
            <span class="aixbanker-roadmap-type">
              Actividad
            </span>
            <span class="aixbanker-roadmap-type">
              ${rcsEsc(roadmapItem.title)}
            </span>
          </div>
          <h3>
            ${rcsEsc(activity.activityName)}
          </h3>
          <p>
            ${tasks.length}
            ${tasks.length === 1 ? "tarea" : "tareas"}
          </p>
        </div>
        <div class="project-detail-actions">
          <span
            class="status-pill status-${status}"
          >
            ${rcsEsc(rcsStatusLabel(status))}
          </span>
        </div>
      </div>
      <div class="project-detail-grid">
        <article class="detail-card">
          <span>Estado</span>
          <strong>
            ${rcsEsc(rcsStatusLabel(status))}
          </strong>
        </article>
        <article class="detail-card">
          <span>Avance</span>
          <strong>
            ${rcsEsc(activity.progress || 0)}%
          </strong>
        </article>
        <article class="detail-card">
          <span>Número de tareas</span>
          <strong>
            ${tasks.length}
          </strong>
        </article>
        <article class="detail-card">
          <span>Inicio</span>
          <strong>
            ${rcsEsc(formatDate(activity.startDate))}
          </strong>
        </article>
        <article class="detail-card">
          <span>Fin</span>
          <strong>
            ${rcsEsc(formatDate(activity.endDate))}
          </strong>
        </article>
        <article class="detail-card">
          <span>Entrega objetivo</span>
          <strong>
            ${rcsEsc(formatDate(activity.targetDate))}
          </strong>
        </article>
      </div>
      <section class="phase-section">
  <h3>
    Roadmap de tareas
  </h3>
  <section
    class="phase-status-legend"
    aria-label="Leyenda de estados"
  >
    <span class="phase-status-legend-item">
      <i class="phase-status-dot phase-status-done"></i>
      Hecho
    </span>
    <span class="phase-status-legend-item">
      <i class="phase-status-dot phase-status-on-track"></i>
      En progreso
    </span>
    <span class="phase-status-legend-item">
      <i class="phase-status-dot phase-status-pending"></i>
      Pendiente
    </span>
    <span class="phase-status-legend-item">
      <i class="phase-status-dot phase-status-risk"></i>
      Riesgo
    </span>
    <span class="phase-status-legend-item">
      <i class="phase-status-dot phase-status-blocked"></i>
      Bloqueado
    </span>
  </section>
  ${
    plannedTasks.length
      ? `
          <div id="roadmapTaskTimeline"></div>
        `
      : `
          <p class="empty-state">
            No hay tareas con planificación temporal.
          </p>
        `
  }
</section>
${
  unplannedTasks.length
    ? `
        <section class="phase-section unplanned-tasks-section">
          <div class="unplanned-tasks-heading">
            <h3>
              Tareas sin planificación
            </h3>
            <span class="unplanned-tasks-count">
              ${unplannedTasks.length}
            </span>
          </div>
          <div class="unplanned-task-list">
            ${unplannedTasks
              .map((task) => {
                const taskStatus = rcsNormalizeStatus(task.status);
                const taskName =
                  task.activityName ||
                  task.phaseName ||
                  task.name ||
                  "Tarea sin nombre";
                const progress = Math.max(
                  0,
                  Math.min(100, Number(task.progress || 0)),
                );
                return `
                  <article class="unplanned-task-row">
                    <div class="unplanned-task-content">
                      <strong>
                        ${rcsEsc(taskName)}
                      </strong>
                      ${
                        task.comments
                          ? `
                              <small>
                                ${rcsEsc(task.comments)}
                              </small>
                            `
                          : ""
                      }
                    </div>
                    <div class="unplanned-task-status">
                      <span
                        class="status-pill status-${taskStatus}"
                      >
                        ${rcsEsc(rcsStatusLabel(taskStatus))}
                      </span>
                      <strong>
                        ${progress}%
                      </strong>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `
    : ""
}
  `;
  const timelineContainer = document.querySelector("#roadmapTaskTimeline");
  if (timelineContainer && plannedTasks.length) {
    renderPhaseTimeline(plannedTasks, timelineContainer, {
      firstColumnLabel: "Tarea",
      showMissingDates: false,
    });
  }
}

function renderAIxBankerRoadmapActivityDetail(
  programId,
  productId,
  quarter,
  itemType,
  itemId,
  activityId,
) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  const product = getAIxBankerProduct(productId);
  const selectedQuarter = isValidRoadmapQuarter(quarter)
    ? quarter
    : getCurrentQuarter();
  const backRoute =
    `roadmap-detail/` +
    `${programId}/` +
    `${productId}/` +
    `${selectedQuarter}/` +
    `${itemType}/` +
    `${itemId}`;
  if (!program || !product || !itemType || !itemId || !activityId) {
    route(backRoute);
    return;
  }
  const roadmapItems = getRoadmapItems(programId, productId, "ALL");
  const roadmapItem = roadmapItems.find(
    (item) =>
      String(item.type || "").trim() === String(itemType || "").trim() &&
      String(item.id || "").trim() === String(itemId || "").trim(),
  );
  if (!roadmapItem) {
    route(backRoute);
    return;
  }
  const tasks = Array.isArray(roadmapItem.activities)
    ? roadmapItem.activities
    : [];
  const groupedActivities = groupRoadmapItemActivities(tasks);
  const activity = groupedActivities.find(
    (item) =>
      String(item.activityId || "").trim() === String(activityId || "").trim(),
  );
  if (!activity) {
    route(backRoute);
    return;
  }
  const country = COUNTRIES.find((item) => item.id === selectedCountry);
  const countryLabel = country?.label || selectedCountry;
  setHead(
    activity.activityName,
    `${roadmapItem.title} · ${countryLabel}`,
    `Retail Client Solutions > ${
      program.name || "AIxBanker"
    } > ${product.label} > Roadmap > ${
      roadmapItem.title
    } > ${activity.activityName}`,
  );
  renderRoadmapActivityTasksView(roadmapItem, activity, {
    route: backRoute,
    label: "Volver al roadmap de actividades",
  });
}

function renderRoadmapUndatedItems(items) {
  if (!items.length) {
    return "";
  }
  return `
    <section class="aixbanker-roadmap-undated">
      <div class="section-header">
        <div>
          <h3>
            Elementos sin planificación temporal
          </h3>
          <p class="empty-state">
            Estos elementos no tienen fechas suficientes
            para representarse en la línea temporal.
          </p>
        </div>
        <span class="status-pill status-pending">
          ${items.length}
        </span>
      </div>
      <div class="aixbanker-roadmap-undated-grid">
        ${items
          .map((item) => {
            const status = rcsNormalizeStatus(item.status);
            return `
              <article
                class="project-card"
                data-roadmap-item-type="${rcsEsc(item.type)}"
                data-roadmap-item-id="${rcsEsc(item.id)}"
              >
                <div class="project-card-main">
                  <div>
                    <div class="project-name">
                      ${rcsEsc(item.title)}
                    </div>
                    <div class="project-summary">
                      ${rcsEsc(item.summary || "Sin descripción")}
                    </div>
                  </div>
                  <span
                    class="status-pill status-${status}"
                  >
                    ${rcsEsc(rcsStatusLabel(status))}
                  </span>
                </div>
                <div class="project-meta">
                  <span>
                    ${rcsEsc(item.typeLabel)}
                  </span>
                  <span>
                    ${rcsEsc(item.owner || "Sin owner")}
                  </span>
                  <span>
                    ${rcsEsc(item.progress)}%
                  </span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function groupRoadmapItemsByCapability(items) {
  const groups = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const entries = Array.isArray(item?.capabilityGroupEntries)
      ? item.capabilityGroupEntries
      : [];
    const effectiveEntries = entries.length
      ? entries
      : [
          {
            id: "__unassigned__",
            label: "Sin capacidad asignada",
            order: 9999,
            unassigned: true,
          },
        ];
    effectiveEntries.forEach((entry) => {
      const id = String(entry.id || "").trim() || "__unassigned__";
      if (!groups.has(id)) {
        groups.set(id, {
          id,
          title: entry.label || "Sin capacidad asignada",
          order: Number.isFinite(Number(entry.order))
            ? Number(entry.order)
            : 9999,
          unassigned: entry.unassigned === true || id === "__unassigned__",
          items: [],
        });
      }
      const group = groups.get(id);
      const alreadyIncluded = group.items.some(
        (candidate) =>
          String(candidate.type || "") === String(item.type || "") &&
          String(candidate.id || "") === String(item.id || ""),
      );
      if (!alreadyIncluded) {
        group.items.push(item);
      }
    });
  });
  return [...groups.values()].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return String(left.title).localeCompare(String(right.title), "es");
  });
}

function renderRoadmapInitiativeRow(group, period) {
  const visibleItems = group.items
    .map((item) => ({
      item,
      layout: getRoadmapItemLayout(item, period),
    }))
    .filter(({ layout }) => layout.isVisible);
  if (!visibleItems.length) {
    return "";
  }
  const groupStatus = getRoadmapGroupStatus(group);
  const nonJiraItems = visibleItems.filter(
    ({ item }) => !(item.type === "msa" && item.jiraMetrics?.hasData),
  );
  const averageProgress = nonJiraItems.length
    ? Math.round(
        nonJiraItems.reduce(
          (total, { item }) => total + Number(item.progress || 0),
          0,
        ) / nonJiraItems.length,
      )
    : 0;
  const jiraMsa =
    visibleItems.find(
      ({ item }) => item.type === "msa" && item.jiraMetrics?.hasData,
    )?.item || null;
  return `
    <article
      class="
        aixbanker-roadmap-row
        aixbanker-roadmap-initiative-row
        ${jiraMsa ? "has-jira-msa" : ""}
      "
      style="
        --roadmap-sublane-count:
        ${visibleItems.length};
      "
      data-roadmap-initiative="${rcsEsc(group.key)}"
    >
      <div
        class="
          aixbanker-roadmap-item-info
        "
      >
        <div
          class="
            aixbanker-roadmap-item-top
          "
        >
          <span
            class="
              status-pill
              status-${groupStatus}
            "
          >
            ${rcsEsc(rcsStatusLabel(groupStatus))}
          </span>
          <span
            class="
              aixbanker-roadmap-type
            "
          >
            ${visibleItems.length}
            ${visibleItems.length === 1 ? "elemento" : "elementos"}
          </span>
        </div>
        <strong
          class="
            aixbanker-roadmap-item-title
          "
        >
          ${rcsEsc(group.title)}
        </strong>
        ${
          jiraMsa
            ? renderRoadmapJiraAggregates(jiraMsa)
            : `
                <div
                  class="
                    aixbanker-roadmap-item-meta
                  "
                >
                  <span>
                    Avance medio
                    ${averageProgress}%
                  </span>
                  <span>
                    ${visibleItems
                      .map(({ item }) => item.typeLabel)
                      .filter(
                        (value, index, array) => array.indexOf(value) === index,
                      )
                      .map(rcsEsc)
                      .join(" · ")}
                  </span>
                </div>
              `
        }
      </div>
      <div
        class="
          aixbanker-roadmap-track
          aixbanker-roadmap-group-track
        "
      >
        ${visibleItems
          .map(({ item, layout }, index) => {
            const status = rcsNormalizeStatus(item.status);
            const hasJiraLifecycle =
              item.type === "msa" && item.jiraMetrics?.hasData;
            return `
                <div
                  class="
                    aixbanker-roadmap-sublane
                    ${hasJiraLifecycle ? "has-jira-lifecycle" : ""}
                  "
                  style="
                    --roadmap-sublane-index:
                    ${index};
                  "
                >
                  <span
                    class="
                      aixbanker-roadmap-sublane-label
                    "
                  >
                    ${
                      hasJiraLifecycle
                        ? `MSA · ${rcsEsc(item.jiraKey || item.id)}`
                        : rcsEsc(item.typeLabel)
                    }
                  </span>
                  ${
                    hasJiraLifecycle
                      ? renderRoadmapJiraBar(item, layout)
                      : `
                          <button
                            class="
                              aixbanker-roadmap-bar
                              aixbanker-roadmap-bar-action
                              ${getRoadmapTypeClass(item.type)}
                            "
                            type="button"
                            data-roadmap-detail-type="${rcsEsc(item.type)}"
                            data-roadmap-detail-id="${rcsEsc(item.id)}"
                            style="
                              left:${layout.left}%;
                              width:${layout.width}%;
                            "
                            title="${rcsEsc(
                              `${item.typeLabel} · ${item.title}: ` +
                                `${formatDate(layout.startDate)} → ` +
                                `${formatDate(layout.endDate)}. ` +
                                `Abrir detalle.`,
                            )}"
                            aria-label="${rcsEsc(
                              `Abrir detalle de ` +
                                `${item.typeLabel} ` +
                                `${item.title}`,
                            )}"
                          >
                            <span
                              class="
                                aixbanker-roadmap-bar-label
                              "
                            >
                              ${rcsEsc(item.progress)}%
                            </span>
                          </button>
                        `
                  }
                  ${
                    !hasJiraLifecycle && layout.targetPosition !== null
                      ? `
                          <span
                            class="
                              aixbanker-roadmap-milestone
                              aixbanker-roadmap-sublane-milestone
                            "
                            style="
                              left:
                              ${layout.targetPosition}%;
                            "
                            title="Entrega: ${rcsEsc(
                              formatDate(layout.targetDate),
                            )}"
                          >
                            <span
                              aria-hidden="true"
                            >
                              ◆
                            </span>
                            <em>
                              ${rcsEsc(formatDate(layout.targetDate))}
                            </em>
                          </span>
                        `
                      : ""
                  }
                  <span
                    class="
                      aixbanker-roadmap-sublane-status
                      ${
                        hasJiraLifecycle
                          ? "roadmap-jira-current-status"
                          : `status-${status}`
                      }
                    "
                  >
                    ${
                      hasJiraLifecycle
                        ? rcsEsc(item.jiraMetrics.currentStatus)
                        : rcsEsc(rcsStatusLabel(status))
                    }
                  </span>
                </div>
              `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderRoadmapTimeline(roadmapItems, selectedQuarter, options = {}) {
  const period = getRoadmapPeriod(selectedQuarter);
  const groupByCapability = options?.groupByCapability === true;
  const datedItems = [];
  const undatedItems = [];
  roadmapItems.forEach((item) => {
    const layout = getRoadmapItemLayout(item, period);
    if (!layout.hasDates) {
      undatedItems.push(item);
      return;
    }
    if (layout.isVisible) {
      datedItems.push(item);
    }
  });
  const regularRows = groupRoadmapItemsByInitiative(datedItems)
    .map((group) => renderRoadmapInitiativeRow(group, period))
    .join("");
  const capabilityRows = groupByCapability
    ? groupRoadmapItemsByCapability(datedItems)
        .map((capabilityGroup) => {
          const initiativeGroups = groupRoadmapItemsByInitiative(
            capabilityGroup.items,
          );
          const averageProgress = capabilityGroup.items.length
            ? Math.round(
                capabilityGroup.items.reduce(
                  (total, item) => total + Number(item.progress || 0),
                  0,
                ) / capabilityGroup.items.length,
              )
            : 0;
          return `
                <section
                  class="
                    aixbanker-roadmap-capability-group
                    ${capabilityGroup.unassigned ? "is-unassigned" : ""}
                  "
                >
                  <header
                    class="
                      aixbanker-roadmap-capability-group-header
                    "
                  >
                    <div>
                      <span>
                        ${
                          capabilityGroup.unassigned
                            ? "Fuera de capacidad"
                            : "Capacidad"
                        }
                      </span>
                      <h4>
                        ${rcsEsc(capabilityGroup.title)}
                      </h4>
                    </div>
                    <div
                      class="
                        aixbanker-roadmap-capability-group-metrics
                      "
                    >
                      <strong>
                        ${capabilityGroup.items.length}
                      </strong>
                      <span>
                        ${
                          capabilityGroup.items.length === 1
                            ? "elemento"
                            : "elementos"
                        }
                      </span>
                      <strong>
                        ${averageProgress}%
                      </strong>
                      <span>
                        avance medio
                      </span>
                    </div>
                  </header>
                  <div
                    class="
                      aixbanker-roadmap-capability-group-rows
                    "
                  >
                    ${initiativeGroups
                      .map((group) => renderRoadmapInitiativeRow(group, period))
                      .join("")}
                  </div>
                </section>
              `;
        })
        .join("")
    : regularRows;
  return `
    <section
      class="
        aixbanker-roadmap-board
        ${groupByCapability ? "is-grouped-by-capability" : ""}
      "
    >
      <div
        class="
          aixbanker-roadmap-scale
        "
      >
        <div
          class="
            aixbanker-roadmap-scale-title
          "
        >
          Iniciativa
        </div>
        <div
          class="
            aixbanker-roadmap-month-grid
          "
          style="
            --roadmap-month-count:
            ${period.months.length};
          "
        >
          ${renderRoadmapMonths(period)}
        </div>
      </div>
      <div
        class="
          aixbanker-roadmap-rows
        "
      >
        ${
          datedItems.length
            ? capabilityRows
            : `
                <div
                  class="
                    aixbanker-roadmap-empty
                  "
                >
                  No hay elementos
                  con fechas dentro
                  del periodo
                  seleccionado.
                </div>
              `
        }
      </div>
    </section>
    ${renderRoadmapUndatedItems(undatedItems)}
  `;
}

function renderAIxBankerRoadmap(programId, productId, quarter = null) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  const product = getAIxBankerProduct(productId);
  if (!program || !product) {
    route(`program/${programId}`);
    return;
  }
  const selectedQuarter = isValidRoadmapQuarter(quarter)
    ? quarter
    : getCurrentQuarter();
  if (quarter !== selectedQuarter) {
    route(`roadmap/${programId}/${productId}/${selectedQuarter}`);
    return;
  }
  selectedExecutiveProduct = product.id;
  executiveQuarter = selectedQuarter;
  const country = COUNTRIES.find((item) => item.id === selectedCountry);
  const countryLabel = country?.label || selectedCountry;
  const roadmapItems = getRoadmapItems(programId, productId, selectedQuarter);
  setHead(
    `${program.name || "AIxBanker"} · ${product.label}`,
    `Roadmap · ${countryLabel} · ${getRoadmapQuarterLabel(selectedQuarter)}`,
    `Retail Client Solutions > ${
      program.name || "AIxBanker"
    } > ${product.label} > ${countryLabel} > Roadmap > ${getRoadmapQuarterLabel(
      selectedQuarter,
    )}`,
  );
  const quarters = [
    {
      id: "ALL",
      label: "Todo el año",
    },
    {
      id: "Q1",
      label: "Q1",
    },
    {
      id: "Q2",
      label: "Q2",
    },
    {
      id: "Q3",
      label: "Q3",
    },
    {
      id: "Q4",
      label: "Q4",
    },
  ];
  const projectCount = roadmapItems.filter(
    (item) => item.type === "project",
  ).length;
  const msaCount = roadmapItems.filter((item) => item.type === "msa").length;
  const riskCount = roadmapItems.filter((item) =>
    ["at-risk", "blocked"].includes(rcsNormalizeStatus(item.status)),
  ).length;
  view.innerHTML = `
    <section class="aixbanker-home">
      <button
        class="ghost-button"
        type="button"
        data-route="program/${programId}"
      >
        ← Volver a productos
      </button>
      <header class="aixbanker-home-header">
        <p class="aixbanker-home-eyebrow">
          ${rcsEsc(product.label)}
        </p>
        <h2>
          Roadmap
        </h2>
        <p>
          Iniciativas, proyectos y MSAs de
          ${rcsEsc(countryLabel)}
          planificados para
          ${rcsEsc(getRoadmapQuarterLabel(selectedQuarter))}.
        </p>
      </header>
      <section
        class="aixbanker-roadmap-filters"
        aria-label="Filtros del roadmap"
      >
        <div class="aixbanker-roadmap-filter-group">
          <span class="aixbanker-roadmap-filter-label">
            País
          </span>
          ${renderCountrySelector()}
        </div>
        <div class="aixbanker-roadmap-filter-group">
          <span class="aixbanker-roadmap-filter-label">
            Periodo
          </span>
          <nav
            class="executive-filter-row"
            aria-label="Seleccionar trimestre del roadmap"
          >
            ${quarters
              .map(
                (item) => `
                  <button
                    class="quarter-btn ${
                      selectedQuarter === item.id ? "active" : ""
                    }"
                    type="button"
                    data-route="roadmap/${programId}/${productId}/${item.id}"
                    aria-pressed="${
                      selectedQuarter === item.id ? "true" : "false"
                    }"
                  >
                    ${item.label}
                  </button>
                `,
              )
              .join("")}
          </nav>
        </div>
      </section>
      <section class="aixbanker-roadmap-summary">
        <article>
          <span>
            Elementos
          </span>
          <strong>
            ${roadmapItems.length}
          </strong>
        </article>
        <article>
          <span>
            Proyectos
          </span>
          <strong>
            ${projectCount}
          </strong>
        </article>
        <article>
          <span>
            MSAs
          </span>
          <strong>
            ${msaCount}
          </strong>
        </article>
        <article>
          <span>
            En riesgo
          </span>
          <strong>
            ${riskCount}
          </strong>
        </article>
      </section>
      <section
        class="aixbanker-roadmap-legend"
        aria-label="Leyenda de tipos del roadmap"
      >
        <span class="aixbanker-roadmap-legend-item">
          <i class="roadmap-type-project"></i>
          Proyecto
        </span>
        <span class="aixbanker-roadmap-legend-item">
          <i class="roadmap-type-msa"></i>
          MSA
        </span>
        <span class="aixbanker-roadmap-legend-item">
          <i class="roadmap-type-poc"></i>
          PoC
        </span>
        <span class="aixbanker-roadmap-legend-item">
          <i class="roadmap-type-initiative"></i>
          Iniciativa
        </span>
      </section>
      ${
        roadmapItems.length
          ? renderRoadmapTimeline(roadmapItems, selectedQuarter)
          : `
            <section class="panel aixbanker-roadmap-no-data">
              <h3>
                Sin elementos para esta selección
              </h3>
              <p class="empty-state">
                No hay iniciativas, proyectos ni MSAs de
                ${rcsEsc(product.label)}
                informados para
                ${rcsEsc(countryLabel)}
                y
                ${rcsEsc(getRoadmapQuarterLabel(selectedQuarter))}.
              </p>
            </section>
          `
      }
    </section>
  `;
}

function getFlightDeckProjectFeatureCount(programId, productId) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const features = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  /*
   * Utilizamos el año del Flight SDA.
   *
   * Si no está disponible, usamos el año actual.
   */
  const sdaFlight = (
    Array.isArray(DATA?.sdaFlights) ? DATA.sdaFlights : []
  ).find((item) => {
    const itemProgramId = String(item.programId || "").trim();

    const itemProductId = normalizeRoadmapProduct(
      item.productId || item.product || "",
    );

    return (
      itemProgramId === normalizedProgramId &&
      itemProductId === normalizedProductId
    );
  });

  const year = Number(sdaFlight?.year) || new Date().getFullYear();

  const startOfYear = new Date(year, 0, 1);

  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

  const parseDate = (value) => {
    if (!value) {
      return null;
    }

    if (typeof parseValidDate === "function") {
      const parsed = parseValidDate(value);

      if (parsed) {
        return parsed;
      }
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  return features.filter((item) => {
    const itemProgramId = String(item.programId || normalizedProgramId).trim();

    const itemProductId = normalizeRoadmapProduct(
      item.product || item.productId || item.product_id || "",
    );

    if (
      itemProgramId !== normalizedProgramId ||
      itemProductId !== normalizedProductId
    ) {
      return false;
    }

    /*
     * Mismo perímetro temporal que Product Flight Plan:
     *
     * sólo Features con una ventana de planificación
     * que intersecta el año seleccionado.
     */
    const startDate = parseDate(item.startDate);

    const endDate = parseDate(item.endDate || item.targetDate);

    if (!startDate || !endDate) {
      return false;
    }

    return startDate <= endOfYear && endDate >= startOfYear;
  }).length;
}
function getFlightDeckJiraTrackingMetrics(programId, productId) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const jiraIndexItems = (
    Array.isArray(DATA?.jiraMsaIndex) ? DATA.jiraMsaIndex : []
  ).filter((item) => {
    const itemProgramId = String(item.programId || normalizedProgramId).trim();

    const itemProductId = normalizeRoadmapProduct(
      item.product || item.productId || normalizedProductId,
    );

    return (
      itemProgramId === normalizedProgramId &&
      itemProductId === normalizedProductId
    );
  });

  const trackedItems = jiraIndexItems.filter(
    (item) =>
      item.historyAvailable === true || Number(item.historyEntries || 0) > 0,
  );

  const normalizeStatus = (value) => {
    if (typeof normalizeRoadmapJiraStatus === "function") {
      return normalizeRoadmapJiraStatus(value);
    }

    return String(value || "").trim();
  };

  const riskBlocked = trackedItems.filter((item) => {
    const status = normalizeStatus(item.currentStatus || item.status || "");

    return ["Blocked", "Risk", "At Risk", "At-Risk"].includes(status);
  }).length;

  const done = trackedItems.filter((item) => {
    const status = normalizeStatus(item.currentStatus || item.status || "");

    return status === "Closed";
  }).length;

  return {
    tracked: trackedItems.length,

    riskBlocked,

    done,
  };
}
function updateFlightDeckProjectTrackingMetrics({
  programId,
  productId,
  sdaCount,
  msaCount,
}) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const sdaElement = document.querySelector("#flightDeckProjectSdaCount");

  const msaElement = document.querySelector("#flightDeckProjectMsaCount");

  const featureElement = document.querySelector(
    "#flightDeckProjectFeatureCount",
  );

  if (sdaElement) {
    sdaElement.textContent = String(Math.max(0, Number(sdaCount) || 0));
  }

  if (msaElement) {
    msaElement.textContent = String(Math.max(0, Number(msaCount) || 0));
  }

  /*
   * =====================================================
   * TELEMETRÍA JIRA
   * =====================================================
   *
   * renderAIxBankerHome todavía pinta inicialmente
   * estos indicadores con la lógica legacy.
   *
   * Los actualizamos al final del mismo ciclo de render
   * para que representen el significado correcto:
   *
   * JIRA TRACKED  = MSA con histórico disponible.
   * RISK/BLOCKED  = MSA tracked actualmente bloqueados.
   * DONE          = MSA tracked cerrados.
   */

  const paintJiraTelemetry = () => {
    const currentRoute = String(location.hash || "");

    const expectedRoutePart = `/${normalizedProgramId}/${normalizedProductId}`;

    if (!currentRoute.includes(expectedRoutePart)) {
      return;
    }

    const metrics = getFlightDeckJiraTrackingMetrics(
      normalizedProgramId,
      normalizedProductId,
    );

    const trackedElement = document.querySelector("#flightDeckJiraCount");

    const riskElement = document.querySelector("#flightDeckRiskCount");

    const doneElement = document.querySelector("#flightDeckDoneCount");

    if (trackedElement) {
      trackedElement.textContent = String(metrics.tracked);
    }

    if (riskElement) {
      riskElement.textContent = String(metrics.riskBlocked);
    }

    if (doneElement) {
      doneElement.textContent = String(metrics.done);
    }
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(paintJiraTelemetry);
  } else {
    Promise.resolve().then(paintJiraTelemetry);
  }

  /*
   * =====================================================
   * FEATURES
   * =====================================================
   */

  if (!featureElement) {
    return;
  }

  const paintFeatureCount = () => {
    const currentFeatureElement = document.querySelector(
      "#flightDeckProjectFeatureCount",
    );

    if (!currentFeatureElement) {
      return;
    }

    const currentRoute = String(location.hash || "");

    const expectedRoutePart = `/${normalizedProgramId}/${normalizedProductId}`;

    if (!currentRoute.includes(expectedRoutePart)) {
      return;
    }

    currentFeatureElement.textContent = String(
      getFlightDeckProjectFeatureCount(
        normalizedProgramId,
        normalizedProductId,
      ),
    );

    currentFeatureElement.classList.remove("is-loading");

    currentFeatureElement.classList.remove("is-unavailable");
  };

  const alreadyLoadedFeatures =
    Array.isArray(DATA?.jiraWorkspaceFeatures) &&
    DATA.jiraWorkspaceFeatures.some((item) => {
      const itemProgramId = String(
        item.programId || normalizedProgramId,
      ).trim();

      return itemProgramId === normalizedProgramId;
    });

  if (alreadyLoadedFeatures) {
    paintFeatureCount();

    return;
  }

  featureElement.textContent = "…";

  featureElement.classList.add("is-loading");

  if (typeof loadJiraFeaturesData !== "function") {
    featureElement.textContent = "—";

    featureElement.classList.remove("is-loading");

    featureElement.classList.add("is-unavailable");

    return;
  }

  loadJiraFeaturesData(normalizedProgramId)
    .then((jiraData) => {
      if (typeof installJiraFeaturesData === "function") {
        installJiraFeaturesData(normalizedProgramId, jiraData);
      }

      paintFeatureCount();
    })
    .catch((error) => {
      console.error("[Flight Deck] Error cargando Features JIRA", error);

      const currentFeatureElement = document.querySelector(
        "#flightDeckProjectFeatureCount",
      );

      if (!currentFeatureElement) {
        return;
      }

      currentFeatureElement.textContent = "—";

      currentFeatureElement.classList.remove("is-loading");

      currentFeatureElement.classList.add("is-unavailable");
    });
}

function getFlightDeckKeyIssueMetrics(programId) {
  const normalizedProgramId = String(programId || "").trim();
  /*
   * =====================================================
   * KEY ISSUES · VISIÓN GLOBAL
   * =====================================================
   *
   * La tarjeta representa siempre todos los países.
   *
   * El ámbito geográfico sólo se aplica después,
   * dentro de la pantalla de Key Issues.
   */
  const issues = Array.isArray(DATA?.impediments)
    ? DATA.impediments.filter((item) => {
        const itemProgramId = String(
          item.programId || normalizedProgramId,
        ).trim();
        return itemProgramId === normalizedProgramId;
      })
    : [];
  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replace(/\s+/g, "-");
  const issueStatus = (item) =>
    normalizeText(item?.status || item?.statusKey || item?.state || "");
  const issueSeverity = (item) => {
    const severity = normalizeText(item?.severity || item?.priority || "");
    if (
      ["critical", "critica", "critico", "high", "alta", "alto"].includes(
        severity,
      )
    ) {
      return "high";
    }
    if (
      ["medium", "media", "medio", "moderate", "moderada", "moderado"].includes(
        severity,
      )
    ) {
      return "medium";
    }
    if (["low", "baja", "bajo"].includes(severity)) {
      return "low";
    }
    return "";
  };
  const isSolved = (item) => {
    const status = issueStatus(item);
    return [
      "solved",
      "resolved",
      "closed",
      "done",
      "completed",
      "complete",
      "finalizado",
      "finalizada",
      "resuelto",
      "resuelta",
      "solucionado",
      "solucionada",
    ].includes(status);
  };
  /*
   * El radar sólo representa issues activos.
   *
   * Los solved permanecen en DATA.impediments
   * y, por tanto, siguen apareciendo en el
   * detalle de Key Issues.
   */
  const activeIssues = issues.filter((item) => !isSolved(item));
  return {
    high: activeIssues.filter((item) => issueSeverity(item) === "high").length,
    medium: activeIssues.filter((item) => issueSeverity(item) === "medium")
      .length,
    low: activeIssues.filter((item) => issueSeverity(item) === "low").length,
  };
}

function updateFlightDeckKeyIssueMetrics(programId) {
  const metrics = getFlightDeckKeyIssueMetrics(programId);
  const highElement = document.querySelector("#flightDeckHighIssuesCount");
  const mediumElement = document.querySelector("#flightDeckMediumIssuesCount");
  const lowElement = document.querySelector("#flightDeckLowIssuesCount");
  if (highElement) {
    highElement.textContent = String(metrics.high);
  }
  if (mediumElement) {
    mediumElement.textContent = String(metrics.medium);
  }
  if (lowElement) {
    lowElement.textContent = String(metrics.low);
  }
  const radar = document.querySelector("#flightDeckTrendingTopicsSummary");
  if (!radar) {
    return;
  }
  /*
   * Reutilizamos los estados visuales
   * existentes del instrumento:
   *
   * has-blocked -> alerta roja
   * has-risk    -> alerta ámbar
   *
   * Sin añadir más CSS.
   */
  radar.classList.toggle("has-blocked", metrics.high > 0);
  radar.classList.toggle("has-risk", metrics.high === 0 && metrics.medium > 0);
}

function applyFlightDeckLandscape(programId) {
  const flightDeck = document.querySelector(".flight-deck");
  if (!flightDeck) {
    return;
  }
  flightDeck.dataset.landscapeProgram = String(programId || "")
    .trim()
    .toLowerCase();
}

function applyFlightDeckProgramIdentity(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const identities = {
    rosetta: {
      top: "RCS",
      bottom: "ORCH",
    },
  };
  const identity = identities[normalizedProgramId];
  if (!identity) {
    return;
  }
  const centerPost = document.querySelector(".flight-deck-center-post");
  if (!centerPost) {
    return;
  }
  const centerTop = centerPost.querySelector("span");
  const centerBottom = centerPost.querySelector("strong");
  if (centerTop) {
    centerTop.textContent = identity.top;
  }
  if (centerBottom) {
    centerBottom.textContent = identity.bottom;
  }
}

function renderAIxBankerHome(programId, productId = null) {
  const normalizedProgramId = String(programId || "").trim();
  const requestedProductId = String(productId || "").trim();
  const normalizedProductId =
    requestedProductId || (normalizedProgramId === "blue" ? "blue" : "");
  const product = normalizedProductId
    ? getAIxBankerProduct(normalizedProductId)
    : null;
  const program = Array.isArray(DATA?.programs)
    ? DATA.programs.find(
        (item) => String(item.id || "").trim() === normalizedProgramId,
      )
    : null;
  /*
   * =====================================================
   * LANDING DE PRODUCTOS
   * =====================================================
   */
  if (!product) {
    setHead(
      "AIxBanker",
      "Selecciona un producto para acceder a su espacio de planificación, ejecución y gestión.",
      "Retail Client Solutions > AIxBanker",
    );
    view.innerHTML = "";
    view.append(tpl("#aixbanker-home-template"));
    const board = document.querySelector("#flightGateBoardGrid");
    if (!board) {
      return;
    }
    const catalogProducts = (
      Array.isArray(DATA?.productCatalog) ? DATA.productCatalog : []
    )
      .filter((item) => {
        const itemProgramId = String(
          item.programId || item.program_id || normalizedProgramId,
        ).trim();
        const enabled =
          item.enabled === true ||
          !["false", "0", "no", "disabled", "inactive", "inactivo"].includes(
            String(item.enabled ?? "true")
              .trim()
              .toLowerCase(),
          );
        return itemProgramId === normalizedProgramId && enabled;
      })
      .sort(
        (left, right) =>
          Number(left.sortOrder ?? left.sort_order ?? 999) -
          Number(right.sortOrder ?? right.sort_order ?? 999),
      );
    const products = catalogProducts.length
      ? catalogProducts
      : [
          {
            id: "blue-buddy",
            productId: "blue-buddy",
            product_id: "blue-buddy",
            label: "Blue Buddy",
            productName: "Blue Buddy",
            product_name: "Blue Buddy",
            tagline: "AI Banker para interacción conversacional con clientes.",
            enabled: true,
            sortOrder: 1,
          },
          {
            id: "panorama",
            productId: "panorama",
            product_id: "panorama",
            label: "Panorama",
            productName: "Panorama",
            product_name: "Panorama",
            tagline:
              "Capacidades de conocimiento y visión integral para AIxBanker.",
            enabled: true,
            sortOrder: 2,
          },
        ];
    const features = Array.isArray(DATA?.productFeatures)
      ? DATA.productFeatures
      : [];
    const getProductStats = (productId) => {
      const normalizedProductId = String(productId || "")
        .trim()
        .toLowerCase();
      const productFeatures = features.filter(
        (feature) =>
          String(feature.productId || feature.product_id || "")
            .trim()
            .toLowerCase() === normalizedProductId,
      );
      const capabilities = new Set(
        productFeatures
          .map((feature) =>
            String(feature.capabilityId || feature.capability_id || "").trim(),
          )
          .filter(Boolean),
      );
      const countries = new Set();
      productFeatures.forEach((feature) => {
        String(feature.country || feature.countries || "")
          .split(/[|,;\n]+/)
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean)
          .forEach((countryId) => countries.add(countryId));
      });
      return {
        capabilityCount: capabilities.size,
        featureCount: productFeatures.length,
        countries: [...countries]
          .map((countryId) =>
            COUNTRIES.find((country) => country.id === countryId),
          )
          .filter(Boolean)
          .slice(0, 4),
      };
    };
    board.innerHTML = products
      .map((item, index) => {
        const productId = String(
          item.productId || item.product_id || item.id || "",
        ).trim();
        if (!productId) {
          return "";
        }
        const productDefinition = getAIxBankerProduct(productId);
        const productName = String(
          item.productName ||
            item.product_name ||
            item.label ||
            productDefinition?.label ||
            productId,
        ).trim();
        const description = String(
          item.tagline ||
            item.overview ||
            productDefinition?.description ||
            "Producto AIxBanker.",
        ).trim();
        const stats = getProductStats(productId);
        const normalizedProductId = productId.toLowerCase();
        const isPanorama = normalizedProductId === "panorama";
        const gateCode = isPanorama ? "PNM" : "BBY";
        const productShortName = isPanorama ? "PANORAMA" : "BLUE BUDDY";
        const availability = stats.countries.length
          ? stats.countries
              .map(
                (country) =>
                  `<span title="${rcsEsc(country.label)}">${rcsEsc(
                    country.id,
                  )}</span>`,
              )
              .join(" ")
          : "—";
        return `
          <article
            class="flight-gate-board ${isPanorama ? "is-panorama" : ""}"
          >
            <div class="flight-gate-sign">
              ${gateCode}
            </div>
            <div class="flight-gate-monitor-frame">
              <div class="flight-gate-monitor">
                <div class="flight-gate-monitor-top">
                  <div class="flight-gate-airline">
                    AIxBanker
                  </div>
                  <div class="flight-gate-flight-meta">
                    <strong>
                      ${rcsEsc(productName)}
                    </strong>
                    <small>
                      PRODUCTO GLOBAL
                    </small>
                  </div>
                </div>
                <div class="flight-gate-destination">
                  ${rcsEsc(productShortName)}
                </div>
                <div class="flight-gate-info">
                  <div>
                    <span>
                      Capacidades
                    </span>
                    <strong>
                      ${stats.capabilityCount}
                    </strong>
                  </div>
                  <div>
                    <span>
                      Casos funcionales
                    </span>
                    <strong>
                      ${stats.featureCount}
                    </strong>
                  </div>
                  <div>
                    <span>
                      Disponible en
                    </span>
                    <strong>
                      ${availability}
                    </strong>
                  </div>
                </div>
                <div class="flight-gate-status">
                  ${rcsEsc(description)}
                </div>
                <button
                  class="flight-gate-open"
                  type="button"
                  data-route="program/${normalizedProgramId}/${productId}"
                  aria-label="Abrir ${rcsEsc(productName)}"
                >
                  <span aria-hidden="true">
                    →
                  </span>
                  Abrir producto
                </button>
                <small class="flight-gate-monitor-brand">
                  RCS · AIxBANKER · GATE ${index + 1}
                </small>
              </div>
            </div>
          </article>
        `;
      })
      .filter(Boolean)
      .join("");
    return;
  }
  /*
   * =====================================================
   * DATOS SDA
   * =====================================================
   */
  const activeProductId = product.id;
  const sdaFlights = Array.isArray(DATA?.sdaFlights)
    ? DATA.sdaFlights.filter((item) => {
        const itemProgramId = String(item.programId || "").trim();
        const itemProductId = String(
          item.productId || item.product || "",
        ).trim();
        return (
          itemProgramId === normalizedProgramId &&
          itemProductId === activeProductId
        );
      })
    : [];
  const sdaFlight = sdaFlights[0] || null;
  const sdaDeliverables = Array.isArray(DATA?.sdaDeliverables)
    ? DATA.sdaDeliverables.filter((item) => {
        const itemProgramId = String(item.programId || "").trim();
        const itemProductId = String(
          item.productId || item.product || "",
        ).trim();
        return (
          itemProgramId === normalizedProgramId &&
          itemProductId === activeProductId
        );
      })
    : [];
  /*
   * =====================================================
   * ROADMAP
   * =====================================================
   */
  const roadmapItems = Array.isArray(DATA?.roadmapItems)
    ? DATA.roadmapItems.filter(
        (item) =>
          String(item.programId || "").trim() === normalizedProgramId &&
          normalizeRoadmapProduct(item.product) === activeProductId,
      )
    : [];
  const productProjects = roadmapItems.filter(
    (item) =>
      String(item.type || "")
        .trim()
        .toLowerCase() === "project",
  );
  const productMsas = roadmapItems.filter(
    (item) =>
      String(item.type || "")
        .trim()
        .toLowerCase() === "msa",
  );
  const statusItems = roadmapItems.length ? roadmapItems : sdaDeliverables;
  const riskItems = statusItems.filter((item) => {
    const status =
      typeof rcsNormalizeStatus === "function"
        ? rcsNormalizeStatus(item.status || item.statusKey)
        : String(item.status || item.statusKey || "")
            .trim()
            .toLowerCase();
    return ["risk", "at-risk", "blocked"].includes(status);
  });
  const doneItems = statusItems.filter((item) => {
    const status =
      typeof rcsNormalizeStatus === "function"
        ? rcsNormalizeStatus(item.status || item.statusKey)
        : String(item.status || item.statusKey || "")
            .trim()
            .toLowerCase();
    return status === "done";
  });
  const jiraIndexItems = Array.isArray(DATA?.jiraMsaIndex)
    ? DATA.jiraMsaIndex.filter((item) => {
        const itemProgramId = String(
          item.programId || normalizedProgramId,
        ).trim();
        const itemProductId = normalizeRoadmapProduct(
          item.product || item.productId || activeProductId,
        );
        return (
          itemProgramId === normalizedProgramId &&
          itemProductId === activeProductId
        );
      })
    : [];
  const restrictedAvailable = DATA?.restricted?.available === true;
  const programLabel =
    program?.name ||
    sdaFlight?.programName ||
    (normalizedProgramId === "aixbanker" ? "AIxBanker" : product.label);
  const mission =
    sdaFlight?.description ||
    product.description ||
    "Roadmap y ejecución del producto.";
  /*
   * =====================================================
   * CABECERA
   * =====================================================
   */
  setHead(
    `${product.label} · ${programLabel}`,
    mission,
    `Retail Client Solutions > ${programLabel} > ${product.label}`,
  );
  view.innerHTML = "";
  view.append(tpl("#aixbanker-flight-deck-template"));
  applyFlightDeckLandscape(normalizedProgramId);
  /*
   * =====================================================
   * NAVEGACION SUPERIOR
   * =====================================================
   */
  const backButton = document.querySelector(".flight-deck-back");
  if (backButton) {
    if (normalizedProgramId === "aixbanker") {
      backButton.dataset.route = "program/aixbanker";
      backButton.textContent = "← Volver a productos";
    } else {
      backButton.dataset.route = "landing";
      backButton.textContent = "← Volver al portfolio";
    }
  }
  const functionalButton = document.querySelector(
    '.flight-deck-overhead-controls [data-route^="functional/"]',
  );
  const systemsButton = document.querySelector(
    '.flight-deck-overhead-controls [data-route^="systems/"]',
  );
  const architectureButton = document.querySelector(
    '.flight-deck-overhead-controls [data-route^="architecture/"]',
  );
  if (functionalButton) {
    functionalButton.dataset.route = `functional/${normalizedProgramId}`;
  }
  if (systemsButton) {
    systemsButton.dataset.route = `systems/${normalizedProgramId}`;
  }
  if (architectureButton) {
    architectureButton.dataset.route = `architecture/${normalizedProgramId}`;
  }
  /*
   * =====================================================
   * IDENTIDAD
   * =====================================================
   */
  const centerPost = document.querySelector(".flight-deck-center-post");
  if (centerPost) {
    const centerTop = centerPost.querySelector("span");
    const centerBottom = centerPost.querySelector("strong");
    if (normalizedProgramId === "blue") {
      if (centerTop) {
        centerTop.textContent = "RCS";
      }
      if (centerBottom) {
        centerBottom.textContent = "BLUE";
      }
    } else {
      if (centerTop) {
        centerTop.textContent = "AIx";
      }
      if (centerBottom) {
        centerBottom.textContent = "BANKER";
      }
    }
  }
  const setInstrumentCopy = (selector, code, label, instrumentTitle) => {
    const instrument = document.querySelector(selector);
    if (!instrument) {
      return;
    }
    const codeElement = instrument.querySelector(
      ".flight-deck-instrument-code",
    );
    const labelElement = instrument.querySelector(
      ".flight-deck-instrument-label",
    );
    const titleElement = instrument.querySelector("strong");
    if (codeElement) {
      codeElement.textContent = code;
    }
    if (labelElement) {
      labelElement.textContent = label;
    }
    if (titleElement) {
      titleElement.textContent = instrumentTitle;
    }
  };
  setInstrumentCopy(
    "#flightDeckProjectTracking",
    "PFD",
    "FLIGHT PLAN",
    "Project Tracking",
  );
  setInstrumentCopy("#flightDeckTrendingTopics", "ND", "RADAR", "Key Issues");
  setInstrumentCopy("#flightDeckTeamPlanning", "TEAM", "CREW", "Staffing");
  setInstrumentCopy(
    "#flightDeckManagementReports",
    "EICAS",
    "INSTRUMENTS",
    "Management Reports",
  );
  /*
   * =====================================================
   * FLIGHT DECK
   * =====================================================
   */
  const productNameElement = document.querySelector("#flightDeckProductName");
  if (productNameElement) {
    productNameElement.textContent = sdaFlight?.productName || product.label;
  }
  const programNameElement = document.querySelector("#flightDeckProgramName");
  if (programNameElement) {
    programNameElement.textContent = programLabel;
  }
  const gateCodeElement = document.querySelector("#flightDeckGateCode");
  if (gateCodeElement) {
    gateCodeElement.textContent = `GATE ${activeProductId.toUpperCase()}`;
  }
  const activeFlightLabel = document.querySelector(
    "#flightDeckActiveFlightLabel",
  );
  if (activeFlightLabel) {
    activeFlightLabel.textContent = product.label;
  }
  const yearElement = document.querySelector("#flightDeckYear");
  if (yearElement) {
    yearElement.textContent = String(
      sdaFlight?.year || new Date().getFullYear(),
    );
  }
  const windowElement = document.querySelector("#flightDeckWindow");
  if (windowElement) {
    windowElement.textContent = getCurrentQuarter();
  }
  const destinationElement = document.querySelector("#flightDeckDestination");
  if (destinationElement) {
    destinationElement.textContent = "Execution";
  }
  const sdaCodeElement = document.querySelector("#flightDeckSdaCode");
  if (sdaCodeElement) {
    const legacySdaProject = productProjects.find(
      (item) => item.sdaCode || item.deliverableId || item.id,
    );
    sdaCodeElement.textContent =
      sdaFlight?.sdaCode ||
      legacySdaProject?.sdaCode ||
      legacySdaProject?.deliverableId ||
      legacySdaProject?.id ||
      "—";
  }
  const missionElement = document.querySelector("#flightDeckMission");
  if (missionElement) {
    missionElement.textContent = mission;
  }
  const countryElement = document.querySelector("#flightDeckCountry");
  if (countryElement) {
    const country =
      COUNTRIES.find((item) => item.id === selectedCountry) || null;
    countryElement.textContent =
      country?.label || sdaFlight?.country || selectedCountry || "Holding";
  }
  /*
   * =====================================================
   * RESPONSABLES SDA
   * =====================================================
   */
  const sponsorElement = document.querySelector("#flightDeckSponsor");
  if (sponsorElement) {
    sponsorElement.textContent = sdaFlight?.sponsor || "—";
  }
  const productOwnerElement = document.querySelector("#flightDeckProductOwner");
  if (productOwnerElement) {
    productOwnerElement.textContent = sdaFlight?.productOwner || "—";
  }
  const programManagerElement = document.querySelector(
    "#flightDeckProgramManager",
  );
  if (programManagerElement) {
    programManagerElement.textContent = sdaFlight?.programManager || "—";
  }
  const engineeringElement = document.querySelector("#flightDeckEngineering");
  if (engineeringElement) {
    engineeringElement.textContent = sdaFlight?.engineeringResponsible || "—";
  }
  /*
   * =====================================================
   * TELEMETRIA
   * =====================================================
   */
  const deliverablesCountElement = document.querySelector(
    "#flightDeckDeliverablesCount",
  );
  if (deliverablesCountElement) {
    deliverablesCountElement.textContent = String(
      sdaDeliverables.length || productProjects.length,
    );
  }
  const jiraCountElement = document.querySelector("#flightDeckJiraCount");
  if (jiraCountElement) {
    jiraCountElement.textContent = String(
      productMsas.length || jiraIndexItems.length,
    );
  }
  updateFlightDeckProjectTrackingMetrics({
    programId: normalizedProgramId,
    productId: activeProductId,
    sdaCount: sdaDeliverables.length,
    msaCount: productMsas.length || jiraIndexItems.length,
  });
  const riskCountElement = document.querySelector("#flightDeckRiskCount");
  if (riskCountElement) {
    riskCountElement.textContent = String(riskItems.length);
  }
  const doneCountElement = document.querySelector("#flightDeckDoneCount");
  if (doneCountElement) {
    doneCountElement.textContent = String(doneItems.length);
  }
  updateFlightDeckKeyIssueMetrics(normalizedProgramId);
  updateFlightDeckStaffingSummary(normalizedProgramId, activeProductId);
  const restrictedLamp = document.querySelector("#flightDeckRestrictedLamp");
  if (restrictedLamp) {
    restrictedLamp.classList.toggle("is-on", restrictedAvailable);
    restrictedLamp.classList.toggle("is-off", !restrictedAvailable);
    restrictedLamp.title = restrictedAvailable
      ? "Origen restringido disponible"
      : "Origen restringido no disponible";
  }
  /*
   * =====================================================
   * INSTRUMENTOS
   * =====================================================
   */
  const projectTrackingButton = document.querySelector(
    "#flightDeckProjectTracking",
  );
  const teamPlanningButton = document.querySelector("#flightDeckTeamPlanning");
  const trendingTopicsButton = document.querySelector(
    "#flightDeckTrendingTopics",
  );
  const managementReportsButton = document.querySelector(
    "#flightDeckManagementReports",
  );
  /*
   * -----------------------------------------------------
   * PROJECT TRACKING
   * -----------------------------------------------------
   */
  if (projectTrackingButton) {
    const roadmapRoute =
      typeof roadmapWorkspaceRoute === "function"
        ? roadmapWorkspaceRoute(
            normalizedProgramId,
            "timeline",
            activeProductId,
            getCurrentQuarter(),
          )
        : `roadmap/${normalizedProgramId}/${activeProductId}/${getCurrentQuarter()}`;
    projectTrackingButton.dataset.route = roadmapRoute;
    projectTrackingButton.addEventListener("click", () => {
      const returnRoute = `program/${normalizedProgramId}/${activeProductId}`;
      sessionStorage.setItem("flightDeckReturnRoute", returnRoute);
      sessionStorage.setItem("productExperienceReturnRoute", returnRoute);
    });
  }
  /*
   * -----------------------------------------------------
   * KEY ISSUES
   * -----------------------------------------------------
   */
  if (trendingTopicsButton) {
    trendingTopicsButton.dataset.route = `impediments/${normalizedProgramId}/${activeProductId}`;
    trendingTopicsButton.addEventListener("click", () => {
      const returnRoute = `program/${normalizedProgramId}/${activeProductId}`;
      sessionStorage.setItem("flightDeckReturnRoute", returnRoute);
      sessionStorage.setItem("programGovernanceReturnRoute", returnRoute);
    });
  }
  /*
   * -----------------------------------------------------
   * STAFFING
   * -----------------------------------------------------
   */
  if (teamPlanningButton) {
    teamPlanningButton.dataset.route = `teams/${normalizedProgramId}`;
    teamPlanningButton.addEventListener("click", () => {
      sessionStorage.setItem(
        "flightDeckReturnRoute",
        `program/${normalizedProgramId}/${activeProductId}`,
      );
    });
  }
  /*
   * -----------------------------------------------------
   * MANAGEMENT REPORTS
   * -----------------------------------------------------
   */
  if (managementReportsButton) {
    managementReportsButton.dataset.route = `projects/${normalizedProgramId}`;
    managementReportsButton.addEventListener("click", () => {
      sessionStorage.setItem(
        "flightDeckReturnRoute",
        `program/${normalizedProgramId}/${activeProductId}`,
      );
    });
  }
}

function renderProgram(programId) {
  if (programId === "aixbanker") {
    renderAIxBankerHome(programId);
    return;
  }
  const data = DATA;
  if (!data || !Array.isArray(data.programs)) {
    console.error("No hay datos válidos para renderProgram:", data);
    return "";
  }
  const p = data.programs.find((p) => p.id === programId);
  if (!p) {
    renderLanding();
    return;
  }
  const modules = DATA.modules.filter(
    (m) => m.programId === programId && m.route !== "backlog",
  );
  const roles = DATA.roles.filter(
    (r) => r.programId === programId && r.country === selectedCountry,
  );
  const priorities = DATA.priorities.filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );
  const impediments = (DATA.impediments || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );
  const decisionsPending = (DATA.decisionsPending || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );
  const decisionsDone = (DATA.decisionsDone || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );
  setHead(p.name, p.description, `Retail Client Solutions > ${p.name}`);
  view.innerHTML = "";
  view.append(tpl("#program-template"));
  document.querySelector("#rolesList")?.closest(".two-column")?.remove();
  programName.textContent = p.name;
  programDescription.textContent = p.description;
  programMetrics.innerHTML = ["functional", "systems", "architecture"]
    .map(
      (k) => `
        <div class="metric-tile">
          <strong>${p[k]}%</strong><br/>
          <span>${k}</span>
        </div>
      `,
    )
    .join("");
  moduleGrid.innerHTML = modules
    .map(
      (m) => `
        <article
          class="module-card ${m.route ? "active" : ""}"
          ${m.route ? `data-route="${m.route}/${programId}"` : `onclick="alert('Módulo próximamente disponible')"`}>
          <span class="pill ${m.route ? "" : "yellow"}">${m.status}</span>
          <h3>${m.title}</h3>
          <p>${m.description}</p>
        </article>
      `,
    )
    .join("");
  moduleGrid.insertAdjacentHTML(
    "beforeend",
    `
    <article
      class="module-card active"
      data-route="projects/${programId}"
    >
      <span class="pill green">Activo</span>
      <h3>Executive Summary</h3>
      <p>Proyectos, MSAs, avance por país, producto y trimestre.</p>
    </article>
  `,
  );
  moduleGrid.insertAdjacentHTML(
    "beforeend",
    `
  <article
    class="module-card disabled"
    onclick="alert('Budget próximamente disponible')"
  >
    <span class="pill yellow">Proximamente</span>
    <h3>Budget</h3>
    <p>Control presupuestario por producto y trimestre.</p>
  </article>
`,
  );
  moduleGrid.insertAdjacentHTML(
    "beforeend",
    `
  <article
    class="module-card active"
    data-route="teams/${programId}"
  >
    <span class="pill green">Activo</span>
    <h3>Teams</h3>
    <p>Scrums, staffing, demanda de FTEs, etc</p>
  </article>
`,
  );
  renderExecutiveQuarterView(programId);
  view.insertAdjacentHTML(
    "beforeend",
    `
    <section class="localisms-toggle-section">
      <button class="localisms-toggle-btn" type="button" id="localismsToggleBtn">
        ${showProgramLocalisms ? "Contraer" : "Localismos del programa"}
      </button>
    </section>
    <section class="program-localisms ${showProgramLocalisms ? "is-open" : ""}">
      <section class="two-column management-section">
        <article class="panel">
          <h3>Impedimentos</h3>
          <div class="management-list">
            ${
              impediments.length
                ? impediments
                    .map(
                      (item) => `
                        <div class="management-card">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill ${item.severity === "high" ? "red" : item.severity === "medium" ? "yellow" : ""}">
                              ${item.severity || "low"}
                            </span>
                          </div>
                          <p>${item.impact || ""}</p>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Objetivo:</b> ${item.targetResolutionDate || "-"}</small>
                          <small><b>Mitigación:</b> ${item.mitigation || "-"}</small>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay impedimentos registrados.</p>`
            }
          </div>
        </article>
        <article class="panel">
          <h3>Decisiones</h3>
          <h4 class="management-subtitle">Pendientes</h4>
          <div class="management-list">
            ${
              decisionsPending.length
                ? decisionsPending
                    .map(
                      (item) => `
                        <div class="management-card">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill yellow">${item.status || "pending"}</span>
                          </div>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Fecha:</b> ${item.dueDate || "-"}</small>
                          <p>${item.impact || ""}</p>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay decisiones pendientes.</p>`
            }
          </div>
          <h4 class="management-subtitle">Tomadas</h4>
          <div class="management-list">
            ${
              decisionsDone.length
                ? decisionsDone
                    .map(
                      (item) => `
                        <div class="management-card done">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill">${item.status || "done"}</span>
                          </div>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Fecha:</b> ${item.dueDate || "-"}</small>
                          <p>${item.impact || ""}</p>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay decisiones tomadas.</p>`
            }
          </div>
        </article>
      </section>
    <section class="module-grid secondary-module-grid">
       <article class="module-card" data-route="projects/${programId}">
        <span class="pill green">Activo</span>
        <h3>Seguimiento de los proyectos</h3>
        <p>Iniciativas, desarrollos, MSAs, etc</p>
      </article>
      <article class="module-card" onclick="alert('Roadmap próximamente disponible')">
        <span class="pill yellow">Próximamente</span>
        <h3>Roadmap</h3>
        <p>Hitos, entregas y planificación temporal.</p>
      </article>
      <article class="module-card" onclick="alert('Hitos próximamente disponible')">
        <span class="pill yellow">Próximamente</span>
        <h3>Hitos</h3>
        <p>Hitos, entregas y planificación temporal.</p>
      </article>
    </section>
     <section class="two-column final-info-section">
    <article class="panel">
      <h3>Roles clave</h3>
      <div class="tag-list">
        ${roles
          .map((r) => `<span class="tag">${r.role} · ${r.description}</span>`)
          .join("")}
      </div>
    </article>
    <article class="panel">
      <h3>Prioridades</h3>
      <div class="stack-list">
        ${priorities
          .map((x) => `<div class="stack-item">${x.priority}</div>`)
          .join("")}
      </div>
    </article>
  </section>
    `,
  );
}

function renderFunctional(programId) {
  const p = DATA.programs.find((x) => x.id === programId);
  const functionalItems = DATA.functional.filter(
    (item) => item.programId === programId && item.country === selectedCountry,
  );
  const country = COUNTRIES.find((c) => c.id === selectedCountry);
  setHead(
    `${p?.name || "Programa"} · Mapa de capacidades funcionales`,
    `Dominios, capacidades y funcionalidades · ${country?.label || selectedCountry}`,
    `Retail Client Solutions > ${p?.name || programId} > ${country?.label || selectedCountry} > Mapa de capacidades funcionales`,
  );
  view.innerHTML = "";
  view.append(tpl("#functional-template"));
  const backButton = document.querySelector(".back-to-program-btn");
  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }
  document
    .querySelector('[data-route="program/"]')
    ?.setAttribute("data-route", `program/${programId}`);
  const groupedDomains = {};
  functionalItems.forEach((item) => {
    if (!groupedDomains[item.domain]) {
      groupedDomains[item.domain] = [];
    }
    groupedDomains[item.domain].push(item);
  });
  functionalMap.innerHTML = Object.entries(groupedDomains)
    .map(
      ([domainName, capabilities]) => `
    <article class="domain">
      <h3>${domainName}</h3>
      ${capabilities
        .map(
          (capability) => `
            <div class="capability">
              <strong>${capability.capability}</strong>
              ${splitPipeList(capability.features)
                .map(
                  (feature) => `
                    <div class="feature">
                      • ${feature}
                    </div>
                  `,
                )
                .join("")}
            </div>
          `,
        )
        .join("")}
    </article>
  `,
    )
    .join("");
}

function renderSystems(programId, mode = "systems") {
  const p = DATA.programs.find((x) => x.id === programId);
  const systemItems = DATA.systems.filter(
    (item) =>
      item.programId === programId &&
      item.country === selectedCountry &&
      item.product === selectedSystemProduct,
  );
  const architectureGapItems = (DATA.architectureFeaturesGaps || []).filter(
    (item) =>
      item.programId === programId &&
      item["RtC Anchor Country"] === selectedCountry &&
      item.product === selectedSystemProduct,
  );
  const relationshipItems = (DATA.systemRelationships || []).filter((item) => {
    const itemCountry = item.country || item["RtC Anchor Country"];
    return (
      String(item.programId || "").trim() === String(programId || "").trim() &&
      String(itemCountry || "").trim() ===
        String(selectedCountry || "").trim() &&
      String(item.product || "").trim() ===
        String(selectedSystemProduct || "").trim()
    );
  });
  const functionalItems = DATA.functional.filter(
    (item) => item.programId === programId && item.country === selectedCountry,
  );
  const affectedSystems = new Set(
    (DATA.functionalSystemLinks || [])
      .filter(
        (link) =>
          String(link.programId || "").trim() ===
            String(programId || "").trim() &&
          String(link.country || "").trim() ===
            String(selectedCountry || "").trim() &&
          String(link.product || "").trim() ===
            String(selectedSystemProduct || "").trim() &&
          String(link.functionalKey || "").trim() ===
            String(selectedCapability || "").trim(),
      )
      .map((link) => String(link.systemComponent || "").trim()),
  );
  if (selectedArchitectureGap) {
    const selectedGap = architectureGapItems.find(
      (item, index) =>
        [
          item.programId,
          item["RtC Anchor Country"],
          item["GAP Asignado"],
          item.Demanda,
          index,
        ].join("::") === selectedArchitectureGap,
    );
    String(selectedGap?.affectedSystemComponents || "")
      .split("|")
      .map((component) => component.trim())
      .filter(Boolean)
      .forEach((component) => affectedSystems.add(component));
  }
  const country = COUNTRIES.find((c) => c.id === selectedCountry);
  const groupedDomains = {};
  functionalItems.forEach((item) => {
    if (!groupedDomains[item.domain]) {
      groupedDomains[item.domain] = [];
    }
    groupedDomains[item.domain].push(item);
  });
  setHead(
    `${p?.name || "Programa"} · Mapa de sistemas`,
    `Arquitectura y capacidades · ${country?.label || selectedCountry}`,
    `Retail Client Solutions > ${
      p?.name || programId
    } > ${country?.label || selectedCountry}`,
  );
  view.innerHTML = "";
  const templateId =
    mode === "architecture" ? "#architecture-template" : "#systems-template";
  view.append(tpl(templateId));
  const systemsDashboardGrid = document.querySelector("#systemsDashboardGrid");
  const expandSystemMapBtn = document.querySelector("#expandSystemMapBtn");
  const expandToBeMapBtn = document.querySelector("#expandToBeMapBtn");
  const toBePanel = document.querySelector(".systems-tobe-panel");
  if (toBePanel) {
    toBePanel.classList.toggle("tobe-map-expanded", isToBeMapExpanded);
  }
  if (expandToBeMapBtn) {
    expandToBeMapBtn.textContent = isToBeMapExpanded
      ? "Contraer mapa"
      : "Expandir mapa";
  }
  if (systemsDashboardGrid) {
    systemsDashboardGrid.classList.toggle(
      "system-map-expanded",
      isSystemMapExpanded,
    );
  }
  if (expandSystemMapBtn) {
    expandSystemMapBtn.textContent = isSystemMapExpanded
      ? "Contraer mapa"
      : "Expandir mapa";
  }
  view.insertAdjacentHTML(
    "afterbegin",
    renderSystemsProductSelector(programId),
  );
  const backButton = document.querySelector(".back-to-program-btn");
  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }
  const groupedSystems = {};
  systemItems.forEach((item) => {
    const layerName = item.layer || "General";
    if (!groupedSystems[layerName]) {
      groupedSystems[layerName] = {};
    }
    const groupName = item.groupName || "Sin agrupación";
    if (!groupedSystems[layerName][groupName]) {
      groupedSystems[layerName][groupName] = [];
    }
    groupedSystems[layerName][groupName].push(item);
  });
  systemLayers.innerHTML = Object.entries(groupedSystems)
    .map(
      ([layerName, groups]) => `
      <article class="layer">
        <h3>${layerName}</h3>
        <div class="system-groups">
          ${Object.entries(groups)
            .map(([groupName, groupItems]) => {
              const componentsByLevel = {};
              groupItems.forEach((s) => {
                const level = s.level || "1";
                const components = String(s.component || "")
                  .split("|")
                  .map((item) => item.trim())
                  .filter(Boolean);
                if (!componentsByLevel[level]) {
                  componentsByLevel[level] = [];
                }
                componentsByLevel[level].push(...components);
              });
              return `
                <div
                  class="system-group-box"
                  data-system-group="${groupName}"
                >
                  <div class="system-group-title">
                    ${groupName}
                  </div>
                  ${Object.entries(componentsByLevel)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(
                      ([level, components]) => `
                        <div
                          class="system-level-row"
                          data-level="${level}"
                        >
                          ${components
                            .map((component) => {
                              const isAffected = affectedSystems.has(component);
                              const isSelected =
                                selectedSystemComponent === component;
                              return `
                                <button
                                  class="
                                    component
                                    system-component-card
                                    ${
                                      isAffected ? "affected-by-capability" : ""
                                    }
                                    ${
                                      isSelected
                                        ? "selected-system-component"
                                        : ""
                                    }
                                  "
                                  type="button"
                                  data-system-component="${component}"
                                  data-system-node="${component}"
                                >
                                  ${component}
                                </button>
                              `;
                            })
                            .join("")}
                        </div>
                      `,
                    )
                    .join("")}
                </div>
              `;
            })
            .join("")}
        </div>
      </article>
    `,
    )
    .join("");
  if (mode === "architecture") {
    const toBeItems = (DATA.systemsToBe || []).filter(
      (item) =>
        item.programId === programId &&
        item.country === selectedCountry &&
        item.product === selectedSystemProduct,
    );
    const groupedToBeSystems = {};
    toBeItems.forEach((item) => {
      const layerName = item.layer || "General";
      if (!groupedToBeSystems[layerName]) {
        groupedToBeSystems[layerName] = {};
      }
      const groupName = item.groupName || "Sin agrupación";
      if (!groupedToBeSystems[layerName][groupName]) {
        groupedToBeSystems[layerName][groupName] = [];
      }
      groupedToBeSystems[layerName][groupName].push(item);
    });
    systemLayersToBe.innerHTML = Object.entries(groupedToBeSystems)
      .map(
        ([layerName, groups]) => `
        <article class="layer">
          <h3>${layerName}</h3>
          <div class="system-groups">
            ${Object.entries(groups)
              .map(([groupName, groupItems]) => {
                const componentsByLevel = {};
                groupItems.forEach((s) => {
                  const level = s.level || "1";
                  const components = String(s.component || "")
                    .split("|")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (!componentsByLevel[level]) {
                    componentsByLevel[level] = [];
                  }
                  componentsByLevel[level].push(...components);
                });
                return `
                  <div
                    class="system-group-box"
                    data-system-group="${groupName}"
                  >
                    <div class="system-group-title">
                      ${groupName}
                    </div>
                    ${Object.entries(componentsByLevel)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(
                        ([level, components]) => `
                          <div
                            class="system-level-row"
                            data-level="${level}"
                          >
                            ${components
                              .map(
                                (component) => `
                                  <button
                                    class="
                                      component
                                      system-component-card
                                      ${affectedSystems.has(component) ? "affected-by-capability" : ""}
                                    "
                                    type="button"
                                    data-system-node="${component}"
                                  >
                                    ${component}
                                  </button>
                                `,
                              )
                              .join("")}
                          </div>
                        `,
                      )
                      .join("")}
                  </div>
                `;
              })
              .join("")}
          </div>
        </article>
      `,
      )
      .join("");
    requestAnimationFrame(() => {
      renderSystemRelationships(
        (DATA.systemRelationshipsToBe || []).filter(
          (item) =>
            item.programId === programId &&
            item.country === selectedCountry &&
            item.product === selectedSystemProduct,
        ),
        "#systemMapCanvasToBe",
        "#systemLinksSvgToBe",
      );
    });
  }
  requestAnimationFrame(() => {
    renderSystemRelationships(relationshipItems);
  });
  if (mode === "architecture" && typeof systemsTable !== "undefined") {
    systemsTable.outerHTML = `
    <div class="architecture-gap-list">
      ${architectureGapItems
        .map((item, index) => {
          const gapKey = [
            item.programId,
            item["RtC Anchor Country"],
            item["GAP Asignado"],
            item.Demanda,
            index,
          ].join("::");
          return `
            <button
              class="
                architecture-gap-card
                ${selectedArchitectureGap === gapKey ? "selected" : ""}
              "
              type="button"
              data-architecture-gap="${gapKey}"
            >
              <div class="architecture-gap-top">
                <span class="architecture-gap-status">
                  ${item["Estatus revisión PA"] || ""}
                </span>
                <span class="architecture-gap-priority">
                  ${item.Prioridad || ""}
                </span>
              </div>
              <strong class="architecture-gap-title">
                ${item.Demanda || "Sin demanda"}
              </strong>
              <div class="architecture-gap-meta">
                <span>
                  <b>GAP:</b>
                  ${item["GAP asignado"] || "-"}
                </span>
                <span>
                  <b>País:</b>
                  ${item["RtC Anchor Country"] || "-"}
                </span>
                <span>
                  <b>Dependencias:</b>
                  ${item.Dependencias || "-"}
                </span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
  }
  const systemsFunctionalMapEl = document.querySelector(
    "#systemsFunctionalMap",
  );
  if (systemsFunctionalMapEl) {
    systemsFunctionalMapEl.innerHTML = Object.entries(groupedDomains)
      .map(
        ([domainName, capabilities]) => `
          <article class="systems-mini-domain">
            <h4>${domainName}</h4>
            ${capabilities
              .map(
                (capability) => `
                  <div class="systems-mini-capability">
                    <strong>
                      ${capability.capability}
                    </strong>
                    <div class="feature-card-list">
                      ${splitPipeList(capability.features)
                        .map((feature) => {
                          const featureKey = `${domainName}::${capability.capability}::${feature}`;
                          return `
                            <button
                              class="
                                feature-card
                                ${
                                  selectedCapability === featureKey
                                    ? "selected"
                                    : ""
                                }
                              "
                              type="button"
                              data-feature="${featureKey}"
                            >
                              ${feature}
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  </div>
                `,
              )
              .join("")}
          </article>
        `,
      )
      .join("");
  }
}

function getFlightDeckReturnRoute(programId) {
  const normalizedProgramId = String(programId || "").trim();
  const storedRoute = sessionStorage.getItem("flightDeckReturnRoute");
  if (
    storedRoute &&
    storedRoute.startsWith(`program/${normalizedProgramId}/`)
  ) {
    return storedRoute;
  }
  return `program/${normalizedProgramId}`;
}

function getCurrentRoute() {
  const hash = location.hash.replace("#", "") || "landing";
  const parts = hash.split("/");
  const routeName = parts[0] || "landing";
  /*
   * =====================================================
   * ROADMAP WORKSPACE DETAIL
   * =====================================================
   *
   * Formato actual:
   *
   * roadmap-workspace-detail/
   *   programId/
   *   viewName/
   *   productId/
   *   quarter/
   *   ambitionId/
   *   itemType/
   *   itemId
   *
   * Ejemplo:
   *
   * roadmap-workspace-detail/
   * aixbanker/
   * timeline/
   * blue-buddy/
   * 2026/
   * ALL/
   * msa/
   * E2E-343616
   */
  if (routeName === "roadmap-workspace-detail") {
    return {
      routeName,
      programId: parts[1] || null,
      viewName: parts[2] || "timeline",
      productId: parts[3] || null,
      quarter: parts[4] || "ALL",
      ambitionId: parts[5] || "ALL",
      itemType: parts[6] || null,
      itemId: parts[7] || null,
      activityId: null,
    };
  }
  /*
   * =====================================================
   * ROADMAP WORKSPACE ACTIVITY
   * =====================================================
   */
  if (routeName === "roadmap-workspace-activity") {
    let activityId = parts[8] || null;
    if (activityId) {
      try {
        activityId = decodeURIComponent(activityId);
      } catch {
        // Mantener valor original.
      }
    }
    return {
      routeName,
      programId: parts[1] || null,
      viewName: parts[2] || "timeline",
      productId: parts[3] || null,
      quarter: parts[4] || "ALL",
      ambitionId: parts[5] || "ALL",
      itemType: parts[6] || null,
      itemId: parts[7] || null,
      activityId,
    };
  }
  /*
   * =====================================================
   * ROUTING LEGACY / GENERAL
   * =====================================================
   */
  const [, programId, productId, quarter, itemType, itemId, encodedActivityId] =
    parts;
  let activityId = null;
  if (encodedActivityId) {
    try {
      activityId = decodeURIComponent(encodedActivityId);
    } catch {
      activityId = encodedActivityId;
    }
  }
  return {
    routeName,
    programId: programId || null,
    productId: productId || null,
    quarter: quarter || null,
    itemType: itemType || null,
    itemId: itemId || null,
    activityId,
  };
}

function buildProgramSources(programs) {
  PROGRAM_SOURCES.clear();

  (programs || []).forEach((program) => {
    const programId = String(program.id || "")
      .trim()
      .toLowerCase();

    if (!programId) {
      return;
    }

    const driveJsonUrl = String(program.driveJsonUrl || "").trim();

    const configuredSnapshotUrl = String(program.snapshotUrl || "").trim();

    const configuredRefreshUrl = String(program.refreshUrl || "").trim();

    PROGRAM_SOURCES.set(programId, {
      id: programId,

      label: program.sourceLabel || program.name || programId,

      spreadsheetId: String(program.spreadsheetId || "").trim(),

      /*
       * ===================================================
       * SNAPSHOT
       * ===================================================
       *
       * Apps Script actúa únicamente como proxy ligero
       * del JSON ya generado.
       *
       * No reconstruye datos.
       */

      snapshotUrl: configuredSnapshotUrl || driveJsonUrl,

      /*
       * ===================================================
       * REFRESH
       * ===================================================
       *
       * Sólo se invoca cuando el usuario pulsa
       * "Actualizar datos".
       */

      refreshUrl: configuredRefreshUrl || driveJsonUrl,

      /*
       * Compatibilidad temporal con código existente.
       */

      driveJsonUrl,
    });
  });
}

function getProgramSource(programId) {
  return PROGRAM_SOURCES.get(String(programId || "").trim()) || null;
}

function getEmptyRestrictedProgramData() {
  return {
    available: false,
    sdaFinancials: [],
    sdaResources: [],
  };
}

function getActiveDataSource() {
  const { programId } = getCurrentRoute();
  if (!programId) {
    return window.APP_CONFIG.portfolio;
  }
  return getProgramSource(programId);
}

function getEmptyProgramData() {
  return {
    /*
     * =====================================================
     * MODELO GENERAL
     * =====================================================
     */

    modules: [],
    roles: [],
    priorities: [],
    functional: [],
    functionalSystemLinks: [],
    systems: [],
    systemsToBe: [],
    architectureFeaturesGaps: [],
    systemRelationships: [],
    systemRelationshipsToBe: [],
    impediments: [],
    decisionsPending: [],
    decisionsDone: [],

    /*
     * =====================================================
     * ROADMAP
     * =====================================================
     */

    roadmapItems: [],
    roadmapItemActivities: [],

    /*
     * JIRA.
     *
     * Tanto el índice ligero como Features y el histórico
     * completo forman parte del snapshot diario.
     */

    jiraMsaIndex: [],
    roadmapItemStatusHistory: [],
    jiraWorkspaceFeatures: [],

    /*
     * Modelo legado.
     */

    projects: [],
    projectPhases: [],
    msas: [],
    msaPhases: [],

    /*
     * =====================================================
     * TEAM
     * =====================================================
     */

    teams: [],

    /*
     * =====================================================
     * PRODUCTO
     * =====================================================
     */

    productCatalog: [],
    productFeatures: [],

    /*
     * =====================================================
     * SDA GENERAL
     * =====================================================
     */

    sdaFlights: [],
    sdaDeliverables: [],

    /*
     * =====================================================
     * STAFFING
     * =====================================================
     *
     * Se carga dentro del mismo snapshot general.
     */

    staffing: {
      generatedAt: "",
      source: {},
      products: [],
    },

    /*
     * =====================================================
     * MANAGEMENT ROADMAP
     * =====================================================
     */

    managementRoadmapLinks: [],
    managementRoadmapLines: [],

    /*
     * =====================================================
     * SDA RESTRICTED
     * =====================================================
     *
     * Restricted sigue teniendo un origen independiente
     * y nunca se incluye en la fotografía general.
     */

    restricted: {
      available: false,
      sdaFinancials: [],
      sdaResources: [],
    },
  };
}

function normalizePortfolioData(rawData) {
  const source = rawData || {};
  return {
    portfolioKpis: Array.isArray(source.portfolioKpis)
      ? source.portfolioKpis
      : [],
    programs: Array.isArray(source.programs) ? source.programs : [],
  };
}

function normalizeProgramData(programId, rawData) {
  const source = rawData || {};

  const normalized = getEmptyProgramData();

  Object.keys(normalized).forEach((collectionName) => {
    /*
     * Restricted se trata aparte.
     */

    if (collectionName === "restricted") {
      return;
    }

    const rows = Array.isArray(source[collectionName])
      ? source[collectionName]
      : [];

    normalized[collectionName] = rows.map((row) => ({
      ...row,

      programId: row.programId || programId,
    }));
  });

  /*
   * =====================================================
   * METADATOS DEL SNAPSHOT
   * =====================================================
   */

  normalized.generatedAt = String(source.generatedAt || "");

  normalized.dataset = String(source.dataset || "");

  /*
   * =====================================================
   * STAFFING
   * =====================================================
   *
   * Staffing no es una colección plana.
   *
   * Tiene estructura:
   *
   * {
   *   generatedAt,
   *   source,
   *   products
   * }
   */

  normalized.staffing = {
    generatedAt: String(source.staffing?.generatedAt || ""),

    source:
      source.staffing?.source && typeof source.staffing.source === "object"
        ? source.staffing.source
        : {},

    products: Array.isArray(source.staffing?.products)
      ? source.staffing.products
      : [],
  };

  /*
   * =====================================================
   * MANAGEMENT ROADMAP LINKS
   * =====================================================
   */

  normalized.managementRoadmapLinks = Array.isArray(
    source.managementRoadmapLinks,
  )
    ? source.managementRoadmapLinks.map((row) => ({
        ...row,

        programId: row.programId || programId,
      }))
    : [];

  /*
   * =====================================================
   * MANAGEMENT ROADMAP LINES
   * =====================================================
   */

  normalized.managementRoadmapLines = Array.isArray(
    source.managementRoadmapLines,
  )
    ? source.managementRoadmapLines.map((row) => ({
        ...row,

        programId: row.programId || programId,
      }))
    : [];

  return normalized;
}

function buildProgramData(programData) {
  return {
    ...PORTFOLIO_DATA,
    ...getEmptyProgramData(),
    ...programData,
  };
}
function getRcsAuthorizationMarkerKey(kind, url) {
  const normalizedKind =
    String(kind || "endpoint")
      .trim()
      .toLowerCase() || "endpoint";

  const rawUrl = String(url || "").trim();

  let endpointKey = rawUrl;

  try {
    const endpoint = new URL(rawUrl, window.location.href);

    endpoint.search = "";
    endpoint.hash = "";

    endpointKey = `${endpoint.origin}${endpoint.pathname}`.replace(/\/+$/, "");
  } catch (error) {
    console.debug(
      "[RCS Access] No se pudo normalizar el endpoint de autorización.",
      error,
    );
  }

  return [
    "rcsCockpit",
    "authorization",
    "v1",
    normalizedKind,
    encodeURIComponent(endpointKey),
  ].join(":");
}

function hasRcsAuthorizationMarker(kind, url) {
  try {
    const key = getRcsAuthorizationMarkerKey(kind, url);

    return window.localStorage.getItem(key) === "1";
  } catch (error) {
    console.debug(
      "[RCS Access] No se pudo leer el marcador de autorización.",
      error,
    );

    return false;
  }
}

function markRcsAuthorizationMarker(kind, url) {
  try {
    const key = getRcsAuthorizationMarkerKey(kind, url);

    window.localStorage.setItem(key, "1");
  } catch (error) {
    console.debug(
      "[RCS Access] No se pudo guardar el marcador de autorización.",
      error,
    );
  }
}
async function loadConfiguredSource(
  source,
  { timeoutMs = 30000, retries = 0, cacheBust = false } = {},
) {
  const sourceUrl = String(
    source?.snapshotUrl || source?.driveJsonUrl || "",
  ).trim();

  if (!sourceUrl) {
    throw new Error(
      `Origen de datos no configurado: ${source?.label || "sin nombre"}`,
    );
  }

  if (typeof loadJsonp !== "function") {
    throw new Error("No está disponible la función loadJsonp.");
  }

  const url = new URL(sourceUrl, window.location.href);

  /*
   * =====================================================
   * SNAPSHOT
   * =====================================================
   */

  url.searchParams.delete("dataset");

  url.searchParams.delete("action");

  url.searchParams.delete("itemId");

  url.searchParams.set("action", "snapshot");

  const previouslyAuthorized = hasRcsAuthorizationMarker(
    "program-backend",
    sourceUrl,
  );

  let payload;

  try {
    payload = await loadJsonp(url.toString(), {
      timeoutMs,
      retries,
      cacheBust,
    });

    /*
     * El Apps Script ha ejecutado correctamente
     * un callback JSONP.
     *
     * A partir de este momento sabemos que este
     * navegador ya ha completado al menos una vez
     * la autorización de este backend.
     */
    markRcsAuthorizationMarker("program-backend", sourceUrl);
  } catch (error) {
    /*
     * ===================================================
     * PRIMER ACCESO REAL AL APPS SCRIPT
     * ===================================================
     *
     * JSONP_SCRIPT_ERROR por sí solo no demuestra que
     * Google esté pidiendo OAuth.
     *
     * Sólo mostramos el flujo de "Primera validación"
     * cuando el backend nunca ha funcionado previamente
     * en este navegador.
     *
     * Si ya funcionó antes, conservamos el error técnico
     * original para que el Cockpit pueda utilizar sus
     * mecanismos normales de caché/fallback.
     */

    const errorCode = String(error?.code || "").trim();

    if (errorCode === "JSONP_SCRIPT_ERROR" && !previouslyAuthorized) {
      const authorizationError = new Error(
        "Es necesario autorizar el Apps Script del programa.",
      );

      authorizationError.code = "AUTHORIZATION_REQUIRED";

      authorizationError.authorization = {
        kind: "program-backend",

        url: url.toString(),

        probeUrl: url.toString(),

        spreadsheetId: String(source?.spreadsheetId || "").trim(),

        programId: String(source?.id || "")
          .trim()
          .toLowerCase(),

        label: String(source?.label || source?.id || "el programa").trim(),
      };

      throw authorizationError;
    }

    throw error;
  }

  if (!payload || payload.ok === false) {
    throw new Error(
      payload?.error ||
        `El origen ${
          source?.label || "configurado"
        } no ha podido cargar la fotografía.`,
    );
  }

  return payload;
}

async function loadJiraFeaturesData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  if (!normalizedProgramId) {
    throw new Error("No se ha informado programId para cargar Features JIRA.");
  }
  if (!forceRefresh && JIRA_FEATURES_DATA_CACHE.has(normalizedProgramId)) {
    return JIRA_FEATURES_DATA_CACHE.get(normalizedProgramId);
  }
  if (!forceRefresh && JIRA_FEATURES_DATA_REQUESTS.has(normalizedProgramId)) {
    return JIRA_FEATURES_DATA_REQUESTS.get(normalizedProgramId);
  }
  const request = loadProgramDataset(
    normalizedProgramId,
    "jira-features",
    {},
    {
      forceRefresh,
      persist: true,
    },
  )
    .then((rawData) => {
      const features = Array.isArray(rawData?.jiraWorkspaceFeatures)
        ? rawData.jiraWorkspaceFeatures
        : [];
      const result = {
        generatedAt: rawData?.generatedAt || "",
        jiraWorkspaceFeatures: features,
      };
      JIRA_FEATURES_DATA_CACHE.set(normalizedProgramId, result);
      return result;
    })
    .finally(() => {
      JIRA_FEATURES_DATA_REQUESTS.delete(normalizedProgramId);
    });
  JIRA_FEATURES_DATA_REQUESTS.set(normalizedProgramId, request);
  return request;
}

function installJiraFeaturesData(programId, jiraData) {
  const features = Array.isArray(jiraData?.jiraWorkspaceFeatures)
    ? jiraData.jiraWorkspaceFeatures
    : [];
  if (!DATA || typeof DATA !== "object") {
    return;
  }
  DATA.jiraWorkspaceFeatures = features.map((row) => ({
    ...row,
    programId: row.programId || programId,
  }));
  if (PROGRAM_DATA_CACHE.has(programId)) {
    const cached = PROGRAM_DATA_CACHE.get(programId);
    PROGRAM_DATA_CACHE.set(programId, {
      ...cached,
      jiraWorkspaceFeatures: DATA.jiraWorkspaceFeatures,
    });
  }
}

async function loadJiraMsaData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  if (!normalizedProgramId) {
    throw new Error(
      "Se necesita programId para cargar los históricos JIRA de los MSAs.",
    );
  }
  if (!forceRefresh && JIRA_MSA_HISTORY_CACHE.has(normalizedProgramId)) {
    return JIRA_MSA_HISTORY_CACHE.get(normalizedProgramId);
  }
  if (!forceRefresh && JIRA_MSA_HISTORY_REQUESTS.has(normalizedProgramId)) {
    return JIRA_MSA_HISTORY_REQUESTS.get(normalizedProgramId);
  }
  const request = loadProgramDataset(
    normalizedProgramId,
    "jira-msa",
    {},
    {
      forceRefresh,
      persist: true,
    },
  )
    .then((rawData) => {
      const result = {
        generatedAt: rawData?.generatedAt || "",
        roadmapItemStatusHistory: Array.isArray(
          rawData?.roadmapItemStatusHistory,
        )
          ? rawData.roadmapItemStatusHistory
          : [],
      };
      JIRA_MSA_HISTORY_CACHE.set(normalizedProgramId, result);
      return result;
    })
    .finally(() => {
      JIRA_MSA_HISTORY_REQUESTS.delete(normalizedProgramId);
    });
  JIRA_MSA_HISTORY_REQUESTS.set(normalizedProgramId, request);
  return request;
}

function hasLoadedJiraMsaHistory(programId) {
  const normalizedProgramId = String(programId || "").trim();
  if (!normalizedProgramId) {
    return false;
  }
  if (JIRA_MSA_HISTORY_CACHE.has(normalizedProgramId)) {
    return true;
  }
  return (
    Array.isArray(DATA?.roadmapItemStatusHistory) &&
    DATA.roadmapItemStatusHistory.length > 0
  );
}

function installJiraMsaData(programId, jiraData) {
  if (!DATA || typeof DATA !== "object") {
    return;
  }
  const normalizedProgramId = String(programId || "").trim();
  const incoming = Array.isArray(jiraData?.roadmapItemStatusHistory)
    ? jiraData.roadmapItemStatusHistory
    : [];
  const normalizedIncoming = incoming.map((row) => ({
    ...row,
    programId: row.programId || normalizedProgramId,
  }));
  /*
   * =====================================================
   * DATA ACTUAL
   * =====================================================
   */
  DATA.roadmapItemStatusHistory = normalizedIncoming;
  /*
   * =====================================================
   * CACHE DEL PROGRAMA
   * =====================================================
   *
   * Imprescindible:
   *
   * render() puede reconstruir DATA
   * desde PROGRAM_DATA_CACHE.
   *
   * Por eso persistimos aquí también
   * el histórico ya descargado.
   */
  if (normalizedProgramId && PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);
    PROGRAM_DATA_CACHE.set(normalizedProgramId, {
      ...cached,
      roadmapItemStatusHistory: normalizedIncoming,
    });
  }
}

function invalidateProgramDeferredData(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  JIRA_FEATURES_DATA_CACHE.delete(normalizedProgramId);
  JIRA_FEATURES_DATA_REQUESTS.delete(normalizedProgramId);
  JIRA_MSA_HISTORY_CACHE.delete(normalizedProgramId);
  JIRA_MSA_HISTORY_REQUESTS.delete(normalizedProgramId);
  STAFFING_DATA_CACHE.delete(normalizedProgramId);
  STAFFING_DATA_REQUESTS.delete(normalizedProgramId);
  /*
   * Eliminamos sólo la caché EN MEMORIA.
   *
   * La fotografía de sessionStorage se conserva
   * para poder hacer fallback si la actualización falla.
   */
  invalidateProgramDatasetMemoryCache(normalizedProgramId, [
    "jira-features",
    "jira-msa",
    "staffing",
  ]);
}

function navigateBackFromRoadmapDetail(fallbackRoute = "") {
  /*
   * Si existe historial del navegador,
   * volvemos exactamente al documento/hash
   * anterior.
   *
   * Es la única forma de preservar sin
   * reconstrucción:
   *
   * - producto
   * - capacidad
   * - país
   * - vista
   * - año
   * - filtros
   */
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  /*
   * Sólo para acceso directo mediante URL.
   */
  const safeFallback = String(fallbackRoute || "").trim();
  if (safeFallback) {
    route(safeFallback);
  }
}

function getRcsSessionCacheKey(scope, id = "") {
  const normalizedScope = String(scope || "")
    .trim()
    .toLowerCase();
  const normalizedId =
    String(id || "")
      .trim()
      .toLowerCase() || "root";
  return `rcsCockpit:v1:${normalizedScope}:${normalizedId}`;
}

function readRcsSessionCache(scope, id = "") {
  try {
    const key = getRcsSessionCacheKey(scope, id);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.data ||
      typeof parsed.data !== "object"
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    const savedAt = parsed.savedAt ? new Date(parsed.savedAt) : null;
    return {
      data: parsed.data,
      savedAt:
        savedAt instanceof Date && !Number.isNaN(savedAt.getTime())
          ? savedAt
          : null,
    };
  } catch (error) {
    console.warn(
      "[RCS Cockpit] No se ha podido leer la caché de sesión.",
      error,
    );
    return null;
  }
}

function writeRcsSessionCache(scope, id = "", data, loadedAt = new Date()) {
  if (!data || typeof data !== "object") {
    return;
  }
  try {
    const key = getRcsSessionCacheKey(scope, id);
    const safeLoadedAt =
      loadedAt instanceof Date && !Number.isNaN(loadedAt.getTime())
        ? loadedAt
        : new Date();
    const payload = {
      version: 1,
      savedAt: safeLoadedAt.toISOString(),
      data,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    /*
     * La caché es una optimización.
     *
     * Un navegador con sessionStorage deshabilitado
     * o sin espacio debe poder seguir usando el cockpit.
     */
    console.warn(
      "[RCS Cockpit] No se ha podido guardar la caché de sesión.",
      error,
    );
  }
}

function hydratePortfolioFromSessionCache() {
  const cached = readRcsSessionCache("portfolio");
  if (!cached?.data) {
    return null;
  }
  const normalized = normalizePortfolioData(cached.data);
  if (!Array.isArray(normalized.programs) || !normalized.programs.length) {
    return null;
  }
  PORTFOLIO_DATA = normalized;
  PORTFOLIO_LAST_LOADED_AT = cached.savedAt;
  buildProgramSources(PORTFOLIO_DATA.programs);
  return PORTFOLIO_DATA;
}

function hydrateProgramFromSessionCache(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!normalizedProgramId) {
    return null;
  }

  const cached = readRcsSessionCache("program", normalizedProgramId);

  if (!cached?.data) {
    return null;
  }

  /*
   * =====================================================
   * SNAPSHOT FORMAT VALIDATION
   * =====================================================
   *
   * Desde el desacoplamiento sólo aceptamos fotografías
   * completas.
   *
   * Esto invalida automáticamente caches antiguas que
   * contenían únicamente:
   *
   * dataset: "core"
   *
   * y que por tanto no llevaban:
   *
   * - Features JIRA
   * - Staffing
   * - histórico completo MSA
   */

  const dataset = String(cached.data.dataset || "")
    .trim()
    .toLowerCase();

  const validFullSnapshot =
    dataset === "full-export" &&
    Array.isArray(cached.data.jiraWorkspaceFeatures) &&
    Array.isArray(cached.data.roadmapItemStatusHistory) &&
    cached.data.staffing &&
    typeof cached.data.staffing === "object" &&
    Array.isArray(cached.data.staffing.products);

  if (!validFullSnapshot) {
    try {
      const key = getRcsSessionCacheKey("program", normalizedProgramId);

      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(
        `[RCS Cockpit] No se ha podido eliminar la fotografía antigua de ${normalizedProgramId}.`,
        error,
      );
    }

    PROGRAM_DATA_CACHE.delete(normalizedProgramId);

    PROGRAM_LAST_LOADED_AT.delete(normalizedProgramId);

    return null;
  }

  /*
   * =====================================================
   * NORMALIZACIÓN
   * =====================================================
   */

  const programData = normalizeProgramData(normalizedProgramId, cached.data);

  const completeProgramData = {
    ...programData,

    restricted: getEmptyRestrictedProgramData(),
  };

  PROGRAM_DATA_CACHE.set(normalizedProgramId, completeProgramData);

  if (cached.savedAt) {
    PROGRAM_LAST_LOADED_AT.set(normalizedProgramId, cached.savedAt);
  }

  return completeProgramData;
}

function getRcsCoreRequestRegistry() {
  if (!window.__RCS_CORE_REQUESTS) {
    window.__RCS_CORE_REQUESTS = {
      portfolio: null,
      programs: new Map(),
    };
  }
  return window.__RCS_CORE_REQUESTS;
}

async function fetchPortfolioSourceData(forceRefresh = false) {
  const source = window.APP_CONFIG.portfolio;
  const requestRegistry = getRcsCoreRequestRegistry();
  if (requestRegistry.portfolio) {
    return requestRegistry.portfolio;
  }
  /*
   * =====================================================
   * APPS SCRIPT · CORE TIMEOUT
   * =====================================================
   *
   * La primera ejecución de Apps Script puede ser
   * sensiblemente más lenta por cold start y por la
   * generación completa del dataset.
   *
   * Con fotografía previa esta petición trabaja en
   * background, por lo que aumentar el timeout no
   * penaliza la navegación habitual.
   */
  const request = loadConfiguredSource(source, {
    timeoutMs: 90000,
    retries: 0,
    cacheBust: forceRefresh,
  });
  requestRegistry.portfolio = request;
  try {
    return await request;
  } finally {
    if (requestRegistry.portfolio === request) {
      requestRegistry.portfolio = null;
    }
  }
}

function installPortfolioSourceData(rawData) {
  PORTFOLIO_DATA = normalizePortfolioData(rawData);
  buildProgramSources(PORTFOLIO_DATA.programs);
  PORTFOLIO_LAST_LOADED_AT = new Date();
  writeRcsSessionCache(
    "portfolio",
    "",
    PORTFOLIO_DATA,
    PORTFOLIO_LAST_LOADED_AT,
  );
  return PORTFOLIO_DATA;
}

async function loadPortfolioData(forceRefresh = false) {
  if (
    !forceRefresh &&
    Array.isArray(PORTFOLIO_DATA.programs) &&
    PORTFOLIO_DATA.programs.length
  ) {
    buildProgramSources(PORTFOLIO_DATA.programs);
    return PORTFOLIO_DATA;
  }
  if (!forceRefresh) {
    const cachedPortfolio = hydratePortfolioFromSessionCache();
    if (cachedPortfolio) {
      return cachedPortfolio;
    }
  }
  const rawData = await fetchPortfolioSourceData(forceRefresh);
  return installPortfolioSourceData(rawData);
}
const PROGRAM_DATASET_CACHE = new Map();
const PROGRAM_DATASET_REQUESTS = new Map();
const JIRA_FEATURES_DATA_CACHE = new Map();
const JIRA_FEATURES_DATA_REQUESTS = new Map();
const JIRA_MSA_HISTORY_CACHE = new Map();
const JIRA_MSA_HISTORY_REQUESTS = new Map();
const STAFFING_DATA_CACHE = new Map();
const STAFFING_DATA_REQUESTS = new Map();
const PROGRAM_RESTRICTED_DATA_REQUESTS = new Map();

function getProgramDatasetCacheKey(programId, dataset, params = {}) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedDataset = String(dataset || "core")
    .trim()
    .toLowerCase();
  const normalizedParams = Object.entries(params || {})
    .filter(
      ([, value]) =>
        value !== null && value !== undefined && String(value).trim() !== "",
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(
          String(value).trim(),
        )}`,
    )
    .join("&");
  return [
    normalizedProgramId,
    normalizedDataset,
    normalizedParams || "default",
  ].join("::");
}

function invalidateProgramDatasetMemoryCache(programId, datasets = null) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedDatasets =
    Array.isArray(datasets) && datasets.length
      ? new Set(
          datasets.map((dataset) =>
            String(dataset || "")
              .trim()
              .toLowerCase(),
          ),
        )
      : null;
  for (const key of PROGRAM_DATASET_CACHE.keys()) {
    const [cachedProgramId, cachedDataset] = String(key).split("::");
    if (cachedProgramId !== normalizedProgramId) {
      continue;
    }
    if (normalizedDatasets && !normalizedDatasets.has(cachedDataset)) {
      continue;
    }
    PROGRAM_DATASET_CACHE.delete(key);
  }
  for (const key of PROGRAM_DATASET_REQUESTS.keys()) {
    const [cachedProgramId, cachedDataset] = String(key).split("::");
    if (cachedProgramId !== normalizedProgramId) {
      continue;
    }
    if (normalizedDatasets && !normalizedDatasets.has(cachedDataset)) {
      continue;
    }
    PROGRAM_DATASET_REQUESTS.delete(key);
  }
}

async function loadProgramDataset(
  programId,
  dataset,
  params = {},
  { forceRefresh = false, persist = true } = {},
) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedDataset = String(dataset || "core")
    .trim()
    .toLowerCase();

  if (!normalizedProgramId) {
    throw new Error("No se ha informado programId para cargar el dataset.");
  }

  if (!normalizedDataset) {
    throw new Error("No se ha informado el dataset que debe cargarse.");
  }

  const cacheKey = getProgramDatasetCacheKey(
    normalizedProgramId,
    normalizedDataset,
    params,
  );

  /*
   * =====================================================
   * CACHE EN MEMORIA
   * =====================================================
   *
   * Estos datasets ya no representan llamadas remotas.
   *
   * Son vistas derivadas del snapshot completo
   * del programa.
   */

  if (!forceRefresh && PROGRAM_DATASET_CACHE.has(cacheKey)) {
    return PROGRAM_DATASET_CACHE.get(cacheKey);
  }

  /*
   * =====================================================
   * PETICIÓN DERIVADA YA EN CURSO
   * =====================================================
   */

  if (!forceRefresh && PROGRAM_DATASET_REQUESTS.has(cacheKey)) {
    return PROGRAM_DATASET_REQUESTS.get(cacheKey);
  }

  const request = (async () => {
    /*
     * ===================================================
     * SNAPSHOT DEL PROGRAMA
     * ===================================================
     *
     * Primero intentamos reutilizar el programa que ya
     * está cargado.
     *
     * Si no existe, loadProgramData() obtiene una única
     * fotografía mediante action=snapshot.
     */

    let programData = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    if (!programData) {
      programData = await loadProgramData(normalizedProgramId, false);
    }

    let payload;

    /*
     * ===================================================
     * JIRA FEATURES
     * ===================================================
     */

    if (normalizedDataset === "jira-features") {
      payload = {
        ok: true,

        generatedAt: programData?.generatedAt || "",

        jiraWorkspaceFeatures: Array.isArray(programData?.jiraWorkspaceFeatures)
          ? programData.jiraWorkspaceFeatures
          : [],
      };
    } else if (normalizedDataset === "jira-msa") {
      /*
       * ===================================================
       * JIRA MSA
       * ===================================================
       */
      payload = {
        ok: true,

        generatedAt: programData?.generatedAt || "",

        roadmapItemStatusHistory: Array.isArray(
          programData?.roadmapItemStatusHistory,
        )
          ? programData.roadmapItemStatusHistory
          : [],
      };
    } else if (normalizedDataset === "staffing") {
      /*
       * ===================================================
       * STAFFING
       * ===================================================
       */
      payload = {
        ok: true,

        generatedAt:
          programData?.staffing?.generatedAt || programData?.generatedAt || "",

        source:
          programData?.staffing?.source &&
          typeof programData.staffing.source === "object"
            ? programData.staffing.source
            : {},

        products: Array.isArray(programData?.staffing?.products)
          ? programData.staffing.products
          : [],
      };
    } else if (normalizedDataset === "core") {
      /*
       * ===================================================
       * CORE
       * ===================================================
       */
      payload = {
        ok: true,
        ...programData,
      };
    } else {
      /*
       * ===================================================
       * DATASET NO SOPORTADO
       * ===================================================
       */
      throw new Error(
        `Dataset no soportado en el snapshot: ${normalizedDataset}`,
      );
    }

    PROGRAM_DATASET_CACHE.set(cacheKey, payload);

    return payload;
  })();

  PROGRAM_DATASET_REQUESTS.set(cacheKey, request);

  try {
    return await request;
  } finally {
    PROGRAM_DATASET_REQUESTS.delete(cacheKey);
  }
}

function normalizeStaffingProductId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadStaffingData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  if (!normalizedProgramId) {
    throw new Error("No se ha informado programId para Staffing.");
  }
  if (!forceRefresh && STAFFING_DATA_CACHE.has(normalizedProgramId)) {
    return STAFFING_DATA_CACHE.get(normalizedProgramId);
  }
  if (!forceRefresh && STAFFING_DATA_REQUESTS.has(normalizedProgramId)) {
    return STAFFING_DATA_REQUESTS.get(normalizedProgramId);
  }
  const request = loadProgramDataset(
    normalizedProgramId,
    "staffing",
    {},
    {
      forceRefresh,
      persist: true,
    },
  )
    .then((data) => {
      if (!data || data.ok === false) {
        throw new Error(
          data?.error || "El dataset de Staffing no está disponible.",
        );
      }
      const normalized = {
        generatedAt: data.generatedAt || "",
        source: data.source || {},
        products: Array.isArray(data.products) ? data.products : [],
      };
      STAFFING_DATA_CACHE.set(normalizedProgramId, normalized);
      return normalized;
    })
    .finally(() => {
      STAFFING_DATA_REQUESTS.delete(normalizedProgramId);
    });
  STAFFING_DATA_REQUESTS.set(normalizedProgramId, request);
  return request;
}

function getStaffingProductData(programId, productId) {
  const normalizedProgramId = String(programId || "").trim();
  const normalizedProductId = normalizeStaffingProductId(productId);
  const dataset = STAFFING_DATA_CACHE.get(normalizedProgramId);
  if (!dataset || !Array.isArray(dataset.products)) {
    return null;
  }
  return (
    dataset.products.find(
      (product) =>
        normalizeStaffingProductId(product?.productId) === normalizedProductId,
    ) || null
  );
}

function getStaffingLatestPeriod(programId, productId) {
  const product = getStaffingProductData(programId, productId);
  if (!product || !Array.isArray(product.periods) || !product.periods.length) {
    return null;
  }
  const latestPeriod = String(product.latestPeriod || "").trim();
  if (latestPeriod) {
    const match = product.periods.find(
      (period) => String(period?.period || "").trim() === latestPeriod,
    );
    if (match) {
      return match;
    }
  }
  return [...product.periods].sort(
    (left, right) => Number(right?.period || 0) - Number(left?.period || 0),
  )[0];
}

function getFlightDeckStaffingData(programId, productId) {
  const period = getStaffingLatestPeriod(programId, productId);
  if (!period) {
    return null;
  }
  const scrums = Array.isArray(period.scrums) ? period.scrums : [];
  let internalFte = 0;
  let externalFte = 0;
  scrums.forEach((scrum) => {
    const companies = Array.isArray(scrum.companies) ? scrum.companies : [];
    companies.forEach((company) => {
      const name = String(company?.name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
      const fte = Number(company?.fte || 0);
      if (!Number.isFinite(fte) || fte <= 0 || name.startsWith("sin ")) {
        return;
      }
      const isInternal =
        name === "bbva" || name.includes("banco bilbao vizcaya");
      if (isInternal) {
        internalFte += fte;
      } else {
        externalFte += fte;
      }
    });
  });
  const totalFte = Number(period.totalFte || 0);
  internalFte = Math.round(internalFte * 100) / 100;
  externalFte = Math.round(externalFte * 100) / 100;
  const unassignedFte =
    Math.round(Math.max(0, totalFte - internalFte - externalFte) * 100) / 100;
  return {
    period: String(period.period || ""),
    year: Number(period.year || 0),
    quarter: String(period.quarter || ""),
    scrumCount: scrums.length,
    totalFte,
    internalFte,
    externalFte,
    unassignedFte,
    scrums,
  };
}

async function ensureFlightDeckStaffingData(
  programId,
  productId,
  forceRefresh = false,
) {
  await loadStaffingData(programId, forceRefresh);
  return getFlightDeckStaffingData(programId, productId);
}

function formatFlightDeckStaffingFte(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return number.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function flightDeckStaffingCurrentContext(programId, productId) {
  const routeParts = String(location.hash || "")
    .replace(/^#\/?/, "")
    .split("/");
  const routeName = String(routeParts[0] || "").trim();
  const routeProgramId = String(routeParts[1] || "").trim();
  const routeProductId = String(routeParts[2] || "").trim();
  const normalizedProgramId = String(programId || "").trim();
  const normalizedProductId = String(productId || "").trim();
  if (routeName !== "program" || routeProgramId !== normalizedProgramId) {
    return false;
  }
  /*
   * Programas con producto explícito:
   *
   * #program/aixbanker/blue-buddy
   */
  if (routeProductId) {
    return routeProductId === normalizedProductId;
  }
  /*
   * Programas con un único producto:
   *
   * #program/blue
   *
   * En estos casos programId y productId
   * son el mismo identificador.
   */
  return normalizedProgramId === normalizedProductId;
}

function updateFlightDeckStaffingSummary(programId, productId) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = normalizeStaffingProductId(productId);

  const scrumElement = document.querySelector("#flightDeckStaffingScrumCount");

  const totalElement = document.querySelector("#flightDeckStaffingTotalFte");

  const internalElement = document.querySelector(
    "#flightDeckStaffingInternalFte",
  );

  const externalElement = document.querySelector(
    "#flightDeckStaffingExternalFte",
  );

  const summary = document.querySelector("#flightDeckTeamPlanningSummary");

  const elements = [
    scrumElement,
    totalElement,
    internalElement,
    externalElement,
  ].filter(Boolean);

  if (elements.length !== 4) {
    return;
  }

  const setUnavailable = () => {
    elements.forEach((element) => {
      element.textContent = "—";

      element.classList.remove("is-loading");

      element.classList.add("is-unavailable");
    });

    if (summary) {
      summary.setAttribute("aria-label", "Staffing no disponible");
    }
  };

  elements.forEach((element) => {
    element.textContent = "…";

    element.classList.add("is-loading");

    element.classList.remove("is-unavailable");
  });

  ensureFlightDeckStaffingData(normalizedProgramId, normalizedProductId)
    .then((staffingData) => {
      if (
        !flightDeckStaffingCurrentContext(
          normalizedProgramId,
          normalizedProductId,
        )
      ) {
        return;
      }

      /*
       * =================================================
       * STAFFING NO CONFIGURADO
       * =================================================
       *
       * No es un error.
       *
       * Algunos programas todavía no disponen
       * de esta fuente.
       * =================================================
       */

      if (!staffingData) {
        setUnavailable();

        return;
      }

      scrumElement.textContent = String(staffingData.scrumCount);

      totalElement.textContent = formatFlightDeckStaffingFte(
        staffingData.totalFte,
      );

      internalElement.textContent = formatFlightDeckStaffingFte(
        staffingData.internalFte,
      );

      externalElement.textContent = formatFlightDeckStaffingFte(
        staffingData.externalFte,
      );

      elements.forEach((element) => {
        element.classList.remove("is-loading", "is-unavailable");
      });

      if (summary) {
        summary.setAttribute(
          "aria-label",
          [
            `${staffingData.scrumCount} scrums`,

            `${formatFlightDeckStaffingFte(staffingData.totalFte)} FTE totales`,

            `${formatFlightDeckStaffingFte(staffingData.internalFte)} internos`,

            `${formatFlightDeckStaffingFte(staffingData.externalFte)} externos`,

            `${formatFlightDeckStaffingFte(
              staffingData.unassignedFte,
            )} sin asignar`,
          ].join(" · "),
        );
      }
    })
    .catch((error) => {
      console.error("[Flight Deck] Error real cargando Staffing", error);

      setUnavailable();
    });
}

async function loadProgramData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!normalizedProgramId) {
    throw new Error("No se ha informado programId.");
  }

  /*
   * =====================================================
   * ACCESS CONTROL
   * =====================================================
   */

  const access = await ensureRcsProgramAccess(
    normalizedProgramId,
    forceRefresh,
  );

  if (!access.granted) {
    blockRcsCockpitAccess(access);

    const error = new Error("ACCESS_DENIED");

    error.code = access.code || "ACCESS_DENIED";

    throw error;
  }

  /*
   * =====================================================
   * MEMORY CACHE
   * =====================================================
   */

  if (!forceRefresh && PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    return PROGRAM_DATA_CACHE.get(normalizedProgramId);
  }

  /*
   * =====================================================
   * SESSION CACHE
   * =====================================================
   */

  if (!forceRefresh) {
    const cachedProgram = hydrateProgramFromSessionCache(normalizedProgramId);

    if (cachedProgram) {
      return cachedProgram;
    }
  }

  /*
   * =====================================================
   * SOURCE
   * =====================================================
   */

  const source = getProgramSource(normalizedProgramId);

  if (!source) {
    throw new Error(
      `No existe un origen configurado para el programa ${normalizedProgramId}`,
    );
  }

  if (!source.snapshotUrl && !source.driveJsonUrl) {
    throw new Error(
      `El programa ${normalizedProgramId} no tiene snapshotUrl configurado.`,
    );
  }

  /*
   * =====================================================
   * REQUEST DEDUPLICATION
   * =====================================================
   */

  const requestRegistry = getRcsCoreRequestRegistry();

  if (requestRegistry.programs.has(normalizedProgramId)) {
    return requestRegistry.programs.get(normalizedProgramId);
  }

  const request = (async () => {
    /*
     * ===============================================
     * SNAPSHOT
     * ===============================================
     */

    const rawData = await loadConfiguredSource(source, {
      timeoutMs: 30000,

      retries: 0,

      cacheBust: forceRefresh,
    });

    const programData = normalizeProgramData(normalizedProgramId, rawData);

    const completeProgramData = {
      ...programData,

      restricted: getEmptyRestrictedProgramData(),
    };

    /*
     * ===============================================
     * MEMORY
     * ===============================================
     */

    PROGRAM_DATA_CACHE.set(normalizedProgramId, completeProgramData);

    /*
     * ===============================================
     * GENERATED AT
     * ===============================================
     */

    const snapshotDate = rawData?.generatedAt
      ? new Date(rawData.generatedAt)
      : new Date();

    const loadedAt = Number.isNaN(snapshotDate.getTime())
      ? new Date()
      : snapshotDate;

    PROGRAM_LAST_LOADED_AT.set(normalizedProgramId, loadedAt);

    /*
     * ===============================================
     * SESSION CACHE
     * ===============================================
     */

    writeRcsSessionCache("program", normalizedProgramId, programData, loadedAt);

    return completeProgramData;
  })();

  requestRegistry.programs.set(normalizedProgramId, request);

  try {
    return await request;
  } catch (error) {
    /*
     * ===================================================
     * PRIMER ACCESO AL BACKEND DEL PROGRAMA
     * ===================================================
     */

    if (String(error?.code || "").trim() === "AUTHORIZATION_REQUIRED") {
      blockRcsCockpitAccess({
        spreadsheetId: String(source?.spreadsheetId || "").trim(),

        granted: false,

        role: "none",

        canEdit: false,

        landing: null,

        code: "AUTHORIZATION_REQUIRED",

        authorization:
          error?.authorization && typeof error.authorization === "object"
            ? error.authorization
            : {
                kind: "program-backend",

                url: String(
                  source?.snapshotUrl || source?.driveJsonUrl || "",
                ).trim(),

                probeUrl: String(
                  source?.snapshotUrl || source?.driveJsonUrl || "",
                ).trim(),

                spreadsheetId: String(source?.spreadsheetId || "").trim(),

                programId: normalizedProgramId,

                label: source?.label || normalizedProgramId,
              },

        checkedAt: Date.now(),
      });
    }

    throw error;
  } finally {
    requestRegistry.programs.delete(normalizedProgramId);
  }
}

function renderCurrentRoute(
  routeName,
  programId,
  productId = null,
  quarter = null,
  itemType = null,
  itemId = null,
  activityId = null,
) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const singleProductFlightDeck = {
    blue: "blue",
    rosetta: "nbc",
  };

  const usesProductFlightDeck = ["aixbanker", "blue", "rosetta"].includes(
    normalizedProgramId,
  );

  /*
   * =====================================================
   * PROGRAMA
   * =====================================================
   */
  if (routeName === "program") {
    if (usesProductFlightDeck && typeof renderAIxBankerHome === "function") {
      const resolvedProductId =
        String(productId || "").trim() ||
        singleProductFlightDeck[normalizedProgramId] ||
        null;

      if (
        normalizedProgramId === "rosetta" &&
        !String(productId || "").trim() &&
        resolvedProductId
      ) {
        route(`program/${normalizedProgramId}/${resolvedProductId}`);
        return;
      }

      renderAIxBankerHome(normalizedProgramId, resolvedProductId);

      if (
        normalizedProgramId === "rosetta" &&
        typeof applyFlightDeckProgramIdentity === "function"
      ) {
        applyFlightDeckProgramIdentity(normalizedProgramId);
      }

      return;
    }

    renderProgram(programId, productId);
    return;
  }

  /*
   * =====================================================
   * ROADMAP LEGACY AIxBANKER
   * =====================================================
   */
  if (routeName === "roadmap" && programId === "aixbanker") {
    renderAIxBankerRoadmap(programId, productId, quarter);
    return;
  }

  /*
   * =====================================================
   * DETALLE ROADMAP
   * =====================================================
   */
  if (routeName === "roadmap-detail" && programId === "aixbanker") {
    renderAIxBankerRoadmapDetail(
      programId,
      productId,
      quarter,
      itemType,
      itemId,
    );
    return;
  }

  /*
   * =====================================================
   * DETALLE ACTIVIDAD ROADMAP
   * =====================================================
   */
  if (routeName === "roadmap-activity" && programId === "aixbanker") {
    renderAIxBankerRoadmapActivityDetail(
      programId,
      productId,
      quarter,
      itemType,
      itemId,
      activityId,
    );
    return;
  }

  /*
   * =====================================================
   * MAPA FUNCIONAL
   * =====================================================
   */
  if (routeName === "functional") {
    renderFunctional(programId);
    return;
  }

  /*
   * =====================================================
   * SISTEMAS
   * =====================================================
   */
  if (routeName === "systems") {
    renderSystems(programId, "systems");
    return;
  }

  /*
   * =====================================================
   * ARQUITECTURA
   * =====================================================
   */
  if (routeName === "architecture") {
    renderSystems(programId, "architecture");
    return;
  }

  /*
   * =====================================================
   * IMPEDIMENTOS
   * =====================================================
   */
  if (routeName === "impediments") {
    renderImpediments(programId);
    return;
  }

  /*
   * =====================================================
   * DECISIONES
   * =====================================================
   */
  if (routeName === "decisions") {
    renderDecisions(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS
   * =====================================================
   */
  if (routeName === "projects") {
    renderProjectsView(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS · CONTRASTE Y VALIDACIÓN
   * =====================================================
   */
  if (routeName === "management-contrast") {
    renderManagementContrastValidationView(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS · DEMOS
   * =====================================================
   */
  if (routeName === "management-demos") {
    renderManagementDemosView(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS · GLOBAL STATUS
   * =====================================================
   */
  if (routeName === "management-global-status" && programId === "aixbanker") {
    renderManagementGlobalStatusView(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS · PASE A ESPECIALISTA
   * =====================================================
   */
  if (
    routeName === "management-specialist-roadmap" &&
    programId === "aixbanker"
  ) {
    renderManagementSpecialistRoadmapView(programId);
    return;
  }

  /*
   * =====================================================
   * MANAGEMENT REPORTS · ROADMAP
   * =====================================================
   */
  if (routeName === "management-roadmap") {
    renderManagementRoadmapView(programId);
    return;
  }

  /*
   * =====================================================
   * MSAS LEGACY
   * =====================================================
   */
  if (routeName === "msas") {
    route(`projects/${programId}`);
    return;
  }

  /*
   * =====================================================
   * TEAMS
   * =====================================================
   */
  if (routeName === "teams") {
    renderTeamsView(programId);
    return;
  }

  /*
   * =====================================================
   * FALLBACK
   * =====================================================
   */
  renderLanding();
}

function getRcsDataState() {
  if (!window.RCS_DATA_STATE) {
    window.RCS_DATA_STATE = {
      portfolio: "live",
      programs: {},
    };
  }
  return window.RCS_DATA_STATE;
}

function setRcsDataMode(scope, mode) {
  const state = getRcsDataState();
  const safeMode = mode === "demo" ? "demo" : "live";
  if (scope === "portfolio") {
    state.portfolio = safeMode;
  } else {
    state.programs[scope] = safeMode;
  }
}

function resetRcsProgramDataModes() {
  const state = getRcsDataState();
  state.programs = {};
  PROGRAM_DATA_CACHE.clear();
  PROGRAM_LAST_LOADED_AT.clear();
  /*
   * Restricted:
   * exclusivamente memoria.
   */
  PROGRAM_RESTRICTED_DATA_CACHE.clear();
  PROGRAM_RESTRICTED_DATA_REQUESTS.clear();
  /*
   * Dataset genérico:
   * limpiamos memoria y peticiones.
   *
   * NO eliminamos sessionStorage.
   */
  PROGRAM_DATASET_CACHE.clear();
  PROGRAM_DATASET_REQUESTS.clear();
  JIRA_FEATURES_DATA_CACHE.clear();
  JIRA_FEATURES_DATA_REQUESTS.clear();
  JIRA_MSA_HISTORY_CACHE.clear();
  JIRA_MSA_HISTORY_REQUESTS.clear();
  STAFFING_DATA_CACHE.clear();
  STAFFING_DATA_REQUESTS.clear();
}

function getDemoProgramData(programId) {
  if (typeof window.getSampleProgramData !== "function") {
    return null;
  }
  const rawData = window.getSampleProgramData(programId);
  return rawData ? normalizeProgramData(programId, rawData) : null;
}

function showDataFallbackBanner(message) {
  const banner = document.getElementById("errorBanner");
  if (!banner) {
    return;
  }
  banner.hidden = false;
  banner.textContent = message;
}

function clearDataFallbackBanner() {
  const banner = document.getElementById("errorBanner");
  if (!banner) {
    return;
  }
  banner.hidden = true;
  banner.textContent = "";
}

function renderRouteContext(context) {
  renderCurrentRoute(
    context.routeName,
    context.programId,
    context.productId,
    context.quarter,
    context.itemType,
    context.itemId,
    context.activityId,
  );
}

function formatLastLoadedDate(date) {
  if (!(date instanceof Date)) {
    return "Sin actualizar";
  }
  const datePart = date
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .replaceAll(" de ", "-");
  const timePart = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

function updateDataStatus(programId = null) {
  if (!programId) {
    statusEl.textContent =
      `Últimos datos cargados: ` +
      `Portfolio General ` +
      `(${formatLastLoadedDate(PORTFOLIO_LAST_LOADED_AT)})`;
    return;
  }
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const source = getProgramSource(normalizedProgramId);
  const lastLoadedAt = PROGRAM_LAST_LOADED_AT.get(normalizedProgramId);
  statusEl.textContent =
    `Últimos datos cargados: ` +
    `${source?.label || normalizedProgramId} ` +
    `(${formatLastLoadedDate(lastLoadedAt)})`;
}

function routeRequiresJiraMsaData(context) {
  if (!context) {
    return false;
  }
  const routeName = String(context.routeName || "")
    .trim()
    .toLowerCase();
  const isRoadmapDetailRoute = [
    "roadmap-detail",
    "roadmap-workspace-detail",
  ].includes(routeName);
  if (!isRoadmapDetailRoute) {
    return false;
  }
  const programId = String(context.programId || "").trim();
  if (programId !== "aixbanker") {
    return false;
  }
  const itemType = String(context.itemType || "")
    .trim()
    .toLowerCase();
  if (itemType !== "msa") {
    return false;
  }
  const itemId = String(context.itemId || "").trim();
  return Boolean(itemId);
}
const ROADMAP_DETAIL_RETURN_ROUTE_KEY = "aixbankerRoadmapDetailReturnRoute";

function saveRoadmapDetailReturnRoute() {
  const hash = String(location.hash || "")
    .replace(/^#/, "")
    .trim();
  if (!hash) {
    return "";
  }
  const routeName = String(hash.split("/")[0] || "")
    .trim()
    .toLowerCase();
  /*
   * Sólo guardamos pantallas que pueden
   * ser realmente origen de un detalle.
   *
   * Nunca guardamos:
   *
   * roadmap-detail
   * roadmap-workspace-detail
   * roadmap-activity
   * roadmap-workspace-activity
   *
   * para evitar sustituir el origen real
   * por otro detalle.
   */
  const allowedRoutes = new Set(["product", "capability", "roadmap"]);
  if (!allowedRoutes.has(routeName)) {
    return "";
  }
  sessionStorage.setItem(ROADMAP_DETAIL_RETURN_ROUTE_KEY, hash);
  return hash;
}

function getRoadmapDetailOriginContext() {
  const hash = String(location.hash || "")
    .replace(/^#/, "")
    .trim();
  const routeName = String(hash.split("/")[0] || "")
    .trim()
    .toLowerCase();
  /*
   * =====================================================
   * NUEVO ROADMAP WORKSPACE
   * =====================================================
   *
   * Ejemplo:
   *
   * roadmap/
   * aixbanker/
   * timeline/
   * blue-buddy/
   * 2026/
   * ALL/
   * knowledge-assistant/
   * ES
   *
   * getCurrentRoute() NO puede utilizarse aquí porque
   * pertenece al routing legacy y leería:
   *
   * productId = timeline
   * quarter   = blue-buddy
   *
   * El parser correcto es roadmapWorkspaceParseRoute().
   */
  if (
    routeName === "roadmap" &&
    typeof roadmapWorkspaceParseRoute === "function"
  ) {
    const workspaceContext = roadmapWorkspaceParseRoute();
    if (workspaceContext) {
      return {
        routeName,
        programId: String(workspaceContext.programId || "").trim(),
        productId: String(workspaceContext.productId || "").trim(),
        quarter: isValidRoadmapQuarter(workspaceContext.quarter)
          ? workspaceContext.quarter
          : "ALL",
        capabilityId: String(workspaceContext.capabilityId || "ALL").trim(),
        countryId: String(workspaceContext.countryId || selectedCountry || "")
          .trim()
          .toUpperCase(),
        sourceRoute: hash,
      };
    }
  }
  /*
   * =====================================================
   * PRODUCTO / CAPACIDAD / ROUTING LEGACY
   * =====================================================
   */
  const context = getCurrentRoute();
  return {
    routeName,
    programId: String(context.programId || "").trim(),
    productId: String(context.productId || "").trim(),
    quarter: isValidRoadmapQuarter(context.quarter) ? context.quarter : "ALL",
    capabilityId: "ALL",
    countryId: String(selectedCountry || "")
      .trim()
      .toUpperCase(),
    sourceRoute: hash,
  };
}

function getRoadmapDetailReturnRoute(fallbackRoute = "") {
  const storedRoute = sessionStorage.getItem(ROADMAP_DETAIL_RETURN_ROUTE_KEY);
  if (storedRoute) {
    return storedRoute;
  }
  return String(fallbackRoute || "").trim();
}

async function ensureJiraMsaDataForRoute(context) {
  if (!routeRequiresJiraMsaData(context)) {
    return;
  }
  const programId = String(context.programId || "")
    .trim()
    .toLowerCase();
  if (!programId) {
    return;
  }
  /*
   * =====================================================
   * YA CARGADO
   * =====================================================
   *
   * Si el histórico existe en memoria pero DATA
   * se ha reconstruido desde el core del programa,
   * volvemos a instalarlo sin acceder a red.
   */
  if (hasLoadedJiraMsaHistory(programId)) {
    const hasInstalledHistory =
      Array.isArray(DATA?.roadmapItemStatusHistory) &&
      DATA.roadmapItemStatusHistory.length > 0;
    if (JIRA_MSA_HISTORY_CACHE.has(programId) && !hasInstalledHistory) {
      installJiraMsaData(programId, JIRA_MSA_HISTORY_CACHE.get(programId));
    }
    return;
  }
  /*
   * =====================================================
   * PRIMER MSA
   * =====================================================
   */
  showLoadingOverlay("Cargando históricos JIRA de MSAs...");
  try {
    const jiraData = await loadJiraMsaData(programId);
    installJiraMsaData(programId, jiraData);
  } catch (error) {
    console.error("[AIxBanker] Error cargando históricos JIRA de MSAs", error);
  } finally {
    /*
     * Este overlay pertenece a la carga
     * on-demand del histórico.
     *
     * No depende del loader del core del programa.
     */
    hideLoadingOverlay();
  }
}

function routeRequiresJiraFeaturesData(context) {
  if (!context) {
    return false;
  }

  const routeName = String(context.routeName || "")
    .trim()
    .toLowerCase();

  const programId = String(context.programId || "")
    .trim()
    .toLowerCase();

  const supportedPrograms = new Set(["aixbanker", "blue", "rosetta"]);

  return (
    [
      "management-roadmap",
      "management-global-status",
      "management-specialist-roadmap",
    ].includes(routeName) && supportedPrograms.has(programId)
  );
}

function hasInstalledJiraFeaturesForProgram(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  return (
    Array.isArray(DATA?.jiraWorkspaceFeatures) &&
    DATA.jiraWorkspaceFeatures.some((item) => {
      const itemProgramId = String(item.programId || "")
        .trim()
        .toLowerCase();
      return itemProgramId === normalizedProgramId;
    })
  );
}

async function ensureJiraFeaturesDataForRoute(context) {
  const routeName = String(context?.routeName || "")
    .trim()
    .toLowerCase();

  if (
    ![
      "management-roadmap",
      "management-global-status",
      "management-specialist-roadmap",
    ].includes(routeName)
  ) {
    return;
  }

  const programId = String(context?.programId || "")
    .trim()
    .toLowerCase();

  if (!programId) {
    return;
  }

  if (hasInstalledJiraFeaturesForProgram(programId)) {
    return;
  }

  showLoadingOverlay("Cargando Features para Management Reports...");

  try {
    const jiraData = await loadJiraFeaturesData(programId);

    installJiraFeaturesData(programId, jiraData);
  } catch (error) {
    console.error("[Management Reports] Error cargando Features JIRA", error);
  } finally {
    hideLoadingOverlay();
  }
}

async function render() {
  const context = getCurrentRoute();

  const { routeName, programId } = context;

  syncPortfolioSidebarNavigation(routeName);

  /*
   * =====================================================
   * NAVEGACIÓN PORTFOLIO
   * =====================================================
   */

  const portfolioPlaceholderRoutes = new Set([
    "governance",
    "kpis",
    "ambition",
    "key-reports",
  ]);

  if (portfolioPlaceholderRoutes.has(routeName)) {
    DATA = PORTFOLIO_DATA;

    renderPortfolioComingSoon(routeName);

    updateDataStatus();

    clearDataFallbackBanner();

    syncRcsAccessRoleBadge();

    return;
  }

  /*
   * =====================================================
   * PORTFOLIO · PROGRAMAS
   * =====================================================
   */

  if (!programId || routeName === "landing") {
    DATA = PORTFOLIO_DATA;

    renderLanding();

    updateDataStatus();

    clearDataFallbackBanner();

    syncRcsAccessRoleBadge();

    return;
  }

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const hasMemorySnapshot = PROGRAM_DATA_CACHE.has(normalizedProgramId);

  const hasSessionSnapshot =
    !hasMemorySnapshot &&
    Boolean(readRcsSessionCache("program", normalizedProgramId));

  const requiresBlockingLoad = !hasMemorySnapshot && !hasSessionSnapshot;

  try {
    const source = getProgramSource(normalizedProgramId);

    if (requiresBlockingLoad) {
      showLoadingOverlay(
        `Cargando datos de ${source?.label || normalizedProgramId}...`,
      );
    }

    const programData = await loadProgramData(normalizedProgramId);

    setRcsDataMode(normalizedProgramId, "live");

    DATA = buildProgramData(programData);

    /*
     * ===================================================
     * DATASETS ON-DEMAND
     * ===================================================
     */

    await ensureJiraMsaDataForRoute(context);

    await ensureJiraFeaturesDataForRoute(context);

    /*
     * ===================================================
     * RENDER
     * ===================================================
     */

    renderRouteContext(context);

    updateDataStatus(normalizedProgramId);

    clearDataFallbackBanner();

    syncRcsAccessRoleBadge();
  } catch (error) {
    console.error(`[RCS] Error cargando ${normalizedProgramId}`, error);

    let fallbackProgram = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    if (!fallbackProgram) {
      fallbackProgram = hydrateProgramFromSessionCache(normalizedProgramId);
    }

    if (fallbackProgram) {
      DATA = buildProgramData(fallbackProgram);

      renderRouteContext(context);

      updateDataStatus(normalizedProgramId);

      showDataFallbackBanner(
        `No se han podido actualizar los datos de ${
          getProgramSource(normalizedProgramId)?.label || normalizedProgramId
        }. ` +
          `Se mantiene la última fotografía real disponible. ` +
          `Pulsa “Actualizar datos” para reintentar la conexión.`,
      );

      syncRcsAccessRoleBadge();

      return;
    }

    DATA = {
      ...PORTFOLIO_DATA,
      ...getEmptyProgramData(),
    };

    renderRouteContext(context);

    statusEl.textContent = `No se han podido cargar los datos de ${
      getProgramSource(normalizedProgramId)?.label || normalizedProgramId
    }`;

    showDataFallbackBanner(
      `El origen de ${
        getProgramSource(normalizedProgramId)?.label || normalizedProgramId
      } no ha respondido a tiempo. ` +
        `Pulsa “Actualizar datos” para volver a intentarlo.`,
    );

    syncRcsAccessRoleBadge();
  } finally {
    /*
     * Siempre cerramos el loading asociado
     * a una navegación de programa.
     *
     * Si la carga vino de caché será prácticamente
     * inmediato.
     *
     * Si necesitó Access + snapshot permanecerá
     * visible hasta completar la carga.
     */

    hideLoadingOverlay();
  }
}

function renderCountrySelector() {
  return `
    <div class="country-selector">
      ${COUNTRIES.map(
        (country) => `
          <button
            class="country-flag ${selectedCountry === country.id ? "active" : ""}"
            type="button"
            data-country="${country.id}"
            title="${country.label}"
            aria-label="${country.label}"
          >
            <img src="${country.flagSrc}" alt="${country.label}" />
            </button>
            <span>${country.label}</span>
        `,
      ).join("")}
    </div>
  `;
}

function renderSystemsProductSelector(programId) {
  const products = getAvailableSystemProducts(programId);
  if (!products.length) return "";
  if (!products.some((p) => p.id === selectedSystemProduct)) {
    selectedSystemProduct = products[0].id;
  }
  return `
    <div class="systems-product-selector">
      ${products
        .map(
          (product) => `
            <button
              class="systems-product-btn ${
                selectedSystemProduct === product.id ? "active" : ""
              }"
              type="button"
              data-system-product="${product.id}"
            >
              ${product.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSystemRelationships(
  relationships,
  canvasSelector = "#systemMapCanvas",
  svgSelector = "#systemLinksSvg",
) {
  const canvas = document.querySelector(canvasSelector);
  const svg = document.querySelector(svgSelector);
  if (!canvas || !svg) return;
  const canvasRect = canvas.getBoundingClientRect();
  svg.setAttribute("width", canvasRect.width);
  svg.setAttribute("height", canvasRect.height);
  svg.setAttribute("viewBox", `0 0 ${canvasRect.width} ${canvasRect.height}`);
  svg.innerHTML = `
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" class="relationship-arrow-head"></path>
      </marker>
    </defs>
  `;
  relationships.forEach((relationship, index) => {
    function getRelationshipNode(type, id) {
      const cleanType = String(type || "component").trim();
      const cleanId = String(id || "").trim();
      if (cleanType === "group") {
        return canvas.querySelector(
          `[data-system-group="${CSS.escape(cleanId)}"]`,
        );
      }
      return canvas.querySelector(
        `[data-system-node="${CSS.escape(cleanId)}"]`,
      );
    }
    const fromNode = getRelationshipNode(
      relationship.fromType,
      relationship.fromId || relationship.fromComponent,
    );
    const toNode = getRelationshipNode(
      relationship.toType,
      relationship.toId || relationship.toComponent,
    );
    if (!fromNode || !toNode) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("system-relationship-link");
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const fromCenterX = fromRect.left + fromRect.width / 2 - canvasRect.left;
    const fromBottomY = fromRect.bottom - canvasRect.top;
    const toCenterX = toRect.left + toRect.width / 2 - canvasRect.left;
    const toTopY = toRect.top - canvasRect.top;
    const sameGroup =
      fromNode.closest(".system-group-box") ===
      toNode.closest(".system-group-box");
    const sameLayer = fromNode.closest(".layer") === toNode.closest(".layer");
    const gap = 18;
    const laneOffset = 28 + (index % 4) * 14;
    let d;
    if (sameGroup) {
      const startY = fromBottomY + 4;
      const endY = toTopY - 4;
      const midY = startY + (endY - startY) / 2;
      d = `
    M ${fromCenterX} ${startY}
    L ${fromCenterX} ${midY}
    L ${toCenterX} ${midY}
    L ${toCenterX} ${endY}
  `;
    } else if (sameLayer) {
      const fromRightX = fromRect.right - canvasRect.left + 4;
      const toLeftX = toRect.left - canvasRect.left - 4;
      const laneY =
        Math.min(fromRect.top, toRect.top) - canvasRect.top - laneOffset;
      d = `
    M ${fromRightX} ${fromRect.top + fromRect.height / 2 - canvasRect.top}
    L ${fromRightX + gap} ${fromRect.top + fromRect.height / 2 - canvasRect.top}
    L ${fromRightX + gap} ${laneY}
    L ${toLeftX - gap} ${laneY}
    L ${toLeftX - gap} ${toRect.top + toRect.height / 2 - canvasRect.top}
    L ${toLeftX} ${toRect.top + toRect.height / 2 - canvasRect.top}
  `;
    } else {
      const startX = fromCenterX;
      const startY = fromBottomY + 4;
      const endX = toCenterX;
      const endY = toTopY - 4;
      const laneY = startY + laneOffset;
      d = `
    M ${startX} ${startY}
    L ${startX} ${laneY}
    L ${endX} ${laneY}
    L ${endX} ${endY}
  `;
    }
    path.setAttribute("d", d);
    //   path.setAttribute(
    //     "d",
    //     `
    //   M ${startX} ${startY}
    //   C ${startX + sideOffset} ${startY + Math.min(36, verticalDistance / 2)},
    //     ${endX + sideOffset} ${endY - Math.min(36, verticalDistance / 2)},
    //     ${endX} ${endY}
    // `,
    //   );
    // path.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(path);
    if (relationship.label) {
      const labelGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("class", "relationship-label");
      const pathLength = path.getTotalLength();
      const labelPoint = path.getPointAtLength(pathLength * 0.5);
      text.setAttribute("x", labelPoint.x);
      text.setAttribute("y", labelPoint.y - 8);
      text.textContent = relationship.label;
      labelGroup.appendChild(text);
      svg.appendChild(labelGroup);
      const bbox = text.getBBox();
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      rect.setAttribute("x", bbox.x - 6);
      rect.setAttribute("y", bbox.y - 2);
      rect.setAttribute("width", bbox.width + 12);
      rect.setAttribute("height", bbox.height + 4);
      rect.setAttribute("rx", 6);
      rect.setAttribute("class", "relationship-label-bg");
      labelGroup.insertBefore(rect, text);
    }
  });
}

async function init() {
  if (isLoadingData) {
    return;
  }

  installPortfolioSidebarNavigation();

  isLoadingData = true;

  try {
    /*
     * =====================================================
     * ACCESS CONTROL
     * =====================================================
     *
     * forceRefresh = false.
     *
     * Si existe una validación válida en sessionStorage,
     * F5 no despierta Apps Script.
     */

    const portfolioSpreadsheetId = String(
      window.APP_CONFIG?.portfolio?.spreadsheetId || "",
    ).trim();

    const cachedAccess = portfolioSpreadsheetId
      ? readRcsSessionCache("access", portfolioSpreadsheetId)
      : null;

    const hasCachedAccess = cachedAccess?.data?.granted === true;

    /*
     * Sólo mostramos overlay si realmente
     * vamos a necesitar validación remota.
     */

    if (!hasCachedAccess) {
      showLoadingOverlay("Validando acceso al cockpit...");
    }

    const portfolioAccess = await ensureRcsPortfolioAccess(false);

    if (!portfolioAccess.granted) {
      blockRcsCockpitAccess(portfolioAccess);

      return;
    }

    restoreRcsCockpitAccess();

    applyRcsEditPermissions();

    installRcsAccessRoleTracking();

    /*
     * =====================================================
     * LANDING
     * =====================================================
     */

    const landingInstalled = installPortfolioLandingData(
      portfolioAccess.landing,
    );

    if (landingInstalled) {
      setRcsDataMode("portfolio", "live");

      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();
    } else {
      /*
       * ===================================================
       * SESSION SNAPSHOT
       * ===================================================
       */

      const restoredPortfolio = hydratePortfolioFromSessionCache();

      if (restoredPortfolio) {
        DATA = PORTFOLIO_DATA;

        setRcsDataMode("portfolio", "live");

        updateDataStatus();

        clearDataFallbackBanner();
      } else {
        PORTFOLIO_DATA = {
          portfolioKpis: [],
          programs: [],
        };

        DATA = PORTFOLIO_DATA;

        buildProgramSources([]);

        setRcsDataMode("portfolio", "live");

        statusEl.textContent =
          "No se ha podido cargar el catálogo del Portfolio";

        showDataFallbackBanner(
          "No se ha podido cargar el catálogo de programas. " +
            "Pulsa “Actualizar datos” para volver a intentarlo.",
        );
      }
    }
  } catch (error) {
    console.error("[RCS Cockpit] Error durante el arranque.", error);

    const accessState = getRcsAccessState();

    if (!accessState.portfolio?.granted) {
      blockRcsCockpitAccess({
        granted: false,

        role: "none",

        canEdit: false,

        code: error?.code || "ACCESS_CHECK_FAILED",
      });

      return;
    }

    const restoredPortfolio = hydratePortfolioFromSessionCache();

    if (restoredPortfolio) {
      DATA = PORTFOLIO_DATA;

      setRcsDataMode("portfolio", "live");

      updateDataStatus();

      clearDataFallbackBanner();
    } else {
      PORTFOLIO_DATA = {
        portfolioKpis: [],
        programs: [],
      };

      DATA = PORTFOLIO_DATA;

      buildProgramSources([]);

      setRcsDataMode("portfolio", "live");

      statusEl.textContent = "No se ha podido cargar el catálogo del Portfolio";

      showDataFallbackBanner(
        "No se ha podido cargar el catálogo de programas. " +
          "Pulsa “Actualizar datos” para volver a intentarlo.",
      );
    }
  } finally {
    isLoadingData = false;

    hideLoadingOverlay();
  }

  syncDataSourceToggle();

  if (getRcsAccessState().blocked) {
    return;
  }

  await render();
}

async function refreshCurrentDataSource() {
  const context = getCurrentRoute();

  const { routeName, programId } = context;

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const source = normalizedProgramId
    ? getProgramSource(normalizedProgramId)
    : window.APP_CONFIG.portfolio;

  showLoadingOverlay(
    normalizedProgramId
      ? `Actualizando datos de ${source?.label || normalizedProgramId}...`
      : "Actualizando catálogo del Portfolio...",
  );

  try {
    /*
     * ===================================================
     * LANDING
     * ===================================================
     */

    if (!normalizedProgramId || routeName === "landing") {
      const access = await ensureRcsPortfolioAccess(true, {
        refreshLanding: true,
      });

      if (!access.granted) {
        blockRcsCockpitAccess(access);

        return;
      }

      const installed = installPortfolioLandingData(access.landing);

      if (!installed) {
        throw new Error(
          access.landing?.error ||
            "No se ha podido actualizar el catálogo del Portfolio.",
        );
      }

      setRcsDataMode("portfolio", "live");

      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();

      syncRcsAccessRoleBadge();

      renderLanding();

      return;
    }

    /*
     * ===================================================
     * PROGRAMA · ACCESS
     * ===================================================
     *
     * Reutilizamos el permiso existente en sesión.
     *
     * No forzamos una nueva validación.
     */

    const access = await ensureRcsProgramAccess(normalizedProgramId, false);

    if (!access.granted) {
      blockRcsCockpitAccess(access);

      return;
    }

    if (!access.canEdit) {
      throw new Error(
        "Sólo un perfil Editor puede actualizar los datos del programa.",
      );
    }

    /*
     * ===================================================
     * REFRESH URL
     * ===================================================
     */

    const refreshUrl = String(
      source?.refreshUrl || source?.driveJsonUrl || "",
    ).trim();

    if (!refreshUrl) {
      throw new Error(
        `No existe URL de actualización para ${normalizedProgramId}.`,
      );
    }

    if (typeof triggerDataRefresh !== "function") {
      throw new Error("No está disponible triggerDataRefresh.");
    }

    /*
     * ===================================================
     * REFRESH
     * ===================================================
     *
     * El backend:
     *
     * 1. importa las fuentes;
     * 2. actualiza la Spreadsheet;
     * 3. genera app-common-data.json;
     * 4. devuelve directamente el nuevo snapshot.
     *
     * NO debe existir una llamada action=snapshot
     * después de esta operación.
     */

    const rawData = await triggerDataRefresh(refreshUrl, {
      timeoutMs: 300000,
    });

    if (!rawData || rawData.ok === false) {
      throw new Error(
        rawData?.error ||
          "No se ha podido recuperar la fotografía actualizada.",
      );
    }

    /*
     * ===================================================
     * INVALIDAR CACHÉS DERIVADAS ANTERIORES
     * ===================================================
     */

    PROGRAM_DATA_CACHE.delete(normalizedProgramId);

    PROGRAM_LAST_LOADED_AT.delete(normalizedProgramId);

    invalidateProgramDeferredData(normalizedProgramId);

    /*
     * ===================================================
     * NORMALIZAR NUEVO SNAPSHOT
     * ===================================================
     */

    const programData = normalizeProgramData(normalizedProgramId, rawData);

    const completeProgramData = {
      ...programData,

      restricted: getEmptyRestrictedProgramData(),
    };

    /*
     * ===================================================
     * MEMORY CACHE
     * ===================================================
     */

    PROGRAM_DATA_CACHE.set(normalizedProgramId, completeProgramData);

    /*
     * ===================================================
     * FECHA SNAPSHOT
     * ===================================================
     */

    const snapshotDate = rawData.generatedAt
      ? new Date(rawData.generatedAt)
      : new Date();

    const loadedAt = Number.isNaN(snapshotDate.getTime())
      ? new Date()
      : snapshotDate;

    PROGRAM_LAST_LOADED_AT.set(normalizedProgramId, loadedAt);

    /*
     * ===================================================
     * SESSION STORAGE
     * ===================================================
     */

    writeRcsSessionCache("program", normalizedProgramId, programData, loadedAt);

    /*
     * ===================================================
     * INSTALAR DATA
     * ===================================================
     */

    setRcsDataMode(normalizedProgramId, "live");

    DATA = buildProgramData(completeProgramData);

    /*
     * ===================================================
     * CACHÉS DERIVADAS
     * ===================================================
     *
     * Se reconstruyen desde PROGRAM_DATA_CACHE.
     *
     * No generan llamadas de red porque el snapshot
     * completo ya está cargado en memoria.
     */

    if (routeRequiresJiraMsaData(context)) {
      const jiraMsaData = await loadJiraMsaData(normalizedProgramId, false);

      installJiraMsaData(normalizedProgramId, jiraMsaData);
    }

    if (routeRequiresJiraFeaturesData(context)) {
      const jiraFeaturesData = await loadJiraFeaturesData(
        normalizedProgramId,
        false,
      );

      installJiraFeaturesData(normalizedProgramId, jiraFeaturesData);
    }

    /*
     * ===================================================
     * RENDER DIRECTO
     * ===================================================
     *
     * MUY IMPORTANTE:
     *
     * NO llamamos a render().
     *
     * render() volvería a entrar en:
     *
     * loadProgramData()
     * → Access Control
     * → snapshot
     *
     * cuando acabamos de recibir e instalar
     * exactamente esos datos.
     */

    renderRouteContext(context);

    updateDataStatus(normalizedProgramId);

    clearDataFallbackBanner();

    syncRcsAccessRoleBadge();
  } catch (error) {
    console.error("[RCS] Error actualizando datos", error);

    /*
     * ===================================================
     * LANDING FALLBACK
     * ===================================================
     */

    if (!normalizedProgramId || routeName === "landing") {
      const cachedPortfolio = hydratePortfolioFromSessionCache();

      if (
        cachedPortfolio ||
        (Array.isArray(PORTFOLIO_DATA.programs) &&
          PORTFOLIO_DATA.programs.length)
      ) {
        DATA = PORTFOLIO_DATA;

        renderLanding();

        updateDataStatus();

        showDataFallbackBanner(
          "No se ha podido actualizar el catálogo del Portfolio. " +
            "Se mantiene la última fotografía real disponible.",
        );

        return;
      }

      DATA = PORTFOLIO_DATA;

      renderLanding();

      statusEl.textContent = "No se ha podido cargar el catálogo del Portfolio";

      showDataFallbackBanner(
        "No se ha podido cargar el catálogo de programas. " +
          "Pulsa “Actualizar datos” para volver a intentarlo.",
      );

      return;
    }

    /*
     * ===================================================
     * PROGRAM FALLBACK
     * ===================================================
     */

    let fallbackProgram = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    if (!fallbackProgram) {
      fallbackProgram = hydrateProgramFromSessionCache(normalizedProgramId);
    }

    if (fallbackProgram) {
      DATA = buildProgramData(fallbackProgram);

      renderRouteContext(context);

      updateDataStatus(normalizedProgramId);

      showDataFallbackBanner(
        `No se han podido actualizar los datos de ${
          source?.label || normalizedProgramId
        }. ` + "Se mantiene la última fotografía real disponible.",
      );

      return;
    }

    DATA = {
      ...PORTFOLIO_DATA,

      ...getEmptyProgramData(),
    };

    renderRouteContext(context);

    statusEl.textContent = `No se han podido cargar los datos de ${
      source?.label || normalizedProgramId
    }`;

    showDataFallbackBanner(
      `El origen de ${source?.label || normalizedProgramId} no ha respondido.`,
    );
  } finally {
    hideLoadingOverlay();
  }
}

function openDataSource() {
  const programId = getRcsCurrentProgramId();
  const canEdit = rcsCanEdit(programId);
  /*
   * =======================================================
   * ACCESS CONTROL
   * =======================================================
   *
   * El origen sólo puede abrirse desde el Cockpit
   * para perfiles Editor.
   *
   * El botón también está oculto por CSS para lectores,
   * pero mantenemos esta comprobación para impedir
   * aperturas manuales desde consola o llamadas directas
   * a esta función.
   */
  if (!canEdit) {
    console.warn(
      "[RCS Access] Apertura de origen bloqueada para perfil de solo lectura.",
    );
    return;
  }
  const source = getActiveDataSource();
  if (
    !source?.spreadsheetId ||
    source.spreadsheetId.includes("SPREADSHEET_ID") ||
    source.spreadsheetId.includes("PEGA_AQUI")
  ) {
    alert(
      `Spreadsheet no configurada para ${source?.label || "esta pantalla"}.`,
    );
    return;
  }
  window.open(
    `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function syncDataSourceToggle() {
  const toggle = document.getElementById("dataSourceToggle");
  if (!toggle) return;
  toggle.checked = window.APP_CONFIG.runtime === "drive-json";
}
/* dashboard inspired*/

function rcsEsc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
/* hipervínculos */

function rcsExternalLink(item, defaultLabel = "Abrir documento") {
  const url = item.documentUrl || "";
  if (!url) return "";
  const label = item.documentLabel || defaultLabel;
  return `
    <a
      class="document-link"
      href="${rcsEsc(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${rcsEsc(label)} ↗
    </a>
  `;
}
/* hipervínculos*/

function rcsNormalizeStatus(s) {
  const v = String(s || "planned")
    .toLowerCase()
    .trim();
  return (
    {
      ok: "on-track",
      green: "on-track",
      on_track: "on-track",
      "on track": "on-track",
      "en curso": "on-track",
      "en progreso": "on-track",
      progreso: "on-track",
      "en proceso": "on-track",
      ready: "on-track",
      stretch: "on-track",
      "analysis in progress": "pending",
      analysis: "pending",
      pending: "pending",
      pendiente: "pending",
      dependiente: "pending",
      dependencia: "pending",
      planned: "planned",
      planificado: "planned",
      planificada: "planned",
      "sin iniciar": "planned",
      "no iniciado": "planned",
      "no iniciada": "planned",
      risk: "at-risk",
      riesgo: "at-risk",
      "en riesgo": "at-risk",
      amber: "at-risk",
      at_risk: "at-risk",
      "at risk": "at-risk",
      red: "blocked",
      blocker: "blocked",
      blocked: "blocked",
      bloqueado: "blocked",
      bloqueada: "blocked",
      done: "done",
      closed: "done",
      completed: "done",
      hecho: "done",
      hecha: "done",
      completado: "done",
      completada: "done",
      finalizado: "done",
      finalizada: "done",
      deprecated: "planned",
      deprecado: "planned",
      deprecada: "planned",
      "n/a": "pending",
      na: "pending",
    }[v] || v.replaceAll("_", "-")
  );
}

function rcsStatusLabel(status) {
  return (
    {
      done: "Hecho",
      "on-track": "En progreso",
      pending: "Pendiente",
      planned: "Pendiente",
      "at-risk": "Riesgo",
      blocked: "Bloqueado",
    }[status] || "Pendiente"
  );
}
const MANAGEMENT_SPECIALIST_ROADMAPS = {
  aixbanker: {
    id: "pase-a-especialista",
    title: "Pase a Especialista",
    subtitle:
      "Roadmap ejecutivo 4Q2026 para la evolución funcional y técnica del pase a especialista.",
    sourceNote:
      "Fuente: extracto del Excel compartido para 4Q2026 (Pase a Especialista).",
    periods: [
      {
        id: "S1",
        label: "S1",
        range: "23/09 al 13/10",
      },
      {
        id: "S2",
        label: "S2",
        range: "14/10 al 03/11",
      },
      {
        id: "S3",
        label: "S3",
        range: "04/11 al 17/11",
      },
      {
        id: "S4",
        label: "S4",
        range: "18/11 al 01/12",
      },
      {
        id: "S5",
        label: "S5",
        range: "02/12 al 16/12",
      },
      {
        id: "S0",
        label: "S0",
        range: "16/12 al 22/12",
      },
    ],
    items: [
      {
        id: "pae-01",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Go System España",
        owner: "TL + TL ES",
        status: "En progreso ⏱",
        comments: "Revisar fecha de entrega",
        startPhase: "S2",
        endPhase: "S2",
      },
      {
        id: "pae-02",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Modificación de la Lambda y la KB",
        owner: "MLE",
        status: "Pendiente 📌",
        comments: "Cuál Lambda?",
        startPhase: "S2",
        endPhase: "S3",
      },
      {
        id: "pae-03",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Actualización del retrieval",
        owner: "DS",
        status: "Pendiente 📌",
        comments: "",
        startPhase: "S2",
        endPhase: "S3",
      },
      {
        id: "pae-04",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Envío de la cola (modificación respuesta supervisor)",
        owner: "MLE",
        status: "Pendiente 📌",
        comments: "",
        startPhase: "S3",
        endPhase: "S3",
      },
      {
        id: "pae-05",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Modificación de la API Conversa",
        owner: "Back",
        status: "Pendiente 📌",
        comments: "",
        startPhase: "S3",
        endPhase: "S4",
      },
      {
        id: "pae-06",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Modificaciones en front",
        owner: "Front SF",
        status: "Pendiente 📌",
        comments: "",
        startPhase: "S3",
        endPhase: "S4",
      },
      {
        id: "pae-07",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Análisis de colas en FAQs con pase a Humano",
        owner: "DS",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S3",
        endPhase: "S4",
      },
      {
        id: "pae-08",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Análisis de cambios del Supervisor + KA",
        owner: "DS + MLE",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S3",
        endPhase: "S4",
      },
      {
        id: "pae-09",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Sensorización del pase a agente humano para definir KPIs",
        owner: "DS + BEX",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S4",
        endPhase: "S5",
      },
      {
        id: "pae-10",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Enviar en la respuesta del Supervisor los datos requeridos por Front",
        owner: "MLE",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S4",
        endPhase: "S4",
      },
      {
        id: "pae-11",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Respuestas de fallback enviar a las colas correspondientes",
        owner: "MLE",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S4",
        endPhase: "S5",
      },
      {
        id: "pae-12",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Guardar en la KB los nuevos campos que llegan en las FAQs",
        owner: "MLE",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S4",
        endPhase: "S5",
      },
      {
        id: "pae-13",
        area: "Nuevas Funcionalidades",
        deliverable: "Pase a Especialista",
        task: "Validación / experimentación con fallbacks de pase a especialista",
        owner: "DS",
        status: "Pendiente 📌",
        comments: "Validar Asun",
        startPhase: "S5",
        endPhase: "S0",
      },
    ],
  },
};

function normalizeManagementSpecialistRoadmapStatus(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (
    [
      "done",
      "closed",
      "completed",
      "terminado",
      "terminada",
      "hecho",
      "hecha",
    ].some((candidate) => normalized.includes(candidate))
  ) {
    return "done";
  }

  if (normalized.includes("review") || normalized.includes("revision")) {
    return "review";
  }

  if (normalized.includes("risk") || normalized.includes("riesgo")) {
    return "at-risk";
  }

  if (normalized.includes("blocked") || normalized.includes("bloqueado")) {
    return "blocked";
  }

  if (
    normalized.includes("on-track") ||
    normalized.includes("en progreso") ||
    normalized.includes("en curso") ||
    normalized.includes("progress")
  ) {
    return "in-progress";
  }

  return "pending";
}

function getManagementSpecialistRoadmapStatusMeta(statusKey) {
  const normalizedStatus =
    normalizeManagementSpecialistRoadmapStatus(statusKey);

  return (
    {
      done: {
        key: "done",
        label: "Terminado",
        status: "done",
        statusLabel: "Terminado",
        statusTone: "done",
        textColor: "#0a7a33",
        background: "rgba(17, 156, 82, 0.14)",
        border: "rgba(17, 156, 82, 0.24)",
      },

      review: {
        key: "review",
        label: "Revisión",
        status: "review",
        statusLabel: "Revisión",
        statusTone: "review",
        textColor: "#8a5b00",
        background: "rgba(240, 185, 11, 0.18)",
        border: "rgba(240, 185, 11, 0.28)",
      },

      "in-progress": {
        key: "in-progress",
        label: "En progreso",
        status: "on-track",
        statusLabel: "En progreso",
        statusTone: "",
        textColor: "#0b4aa2",
        background: "rgba(59, 130, 246, 0.14)",
        border: "rgba(59, 130, 246, 0.24)",
      },

      "at-risk": {
        key: "at-risk",
        label: "En riesgo",
        status: "at-risk",
        statusLabel: "En riesgo",
        statusTone: "",
        textColor: "#8a5b00",
        background: "rgba(245, 158, 11, 0.16)",
        border: "rgba(245, 158, 11, 0.28)",
      },

      blocked: {
        key: "blocked",
        label: "Bloqueado",
        status: "blocked",
        statusLabel: "Bloqueado",
        statusTone: "",
        textColor: "#b42318",
        background: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.24)",
      },

      pending: {
        key: "pending",
        label: "Pendiente",
        status: "pending",
        statusLabel: "Pendiente",
        statusTone: "pending",
        textColor: "#5f6b7a",
        background: "rgba(148, 163, 184, 0.14)",
        border: "rgba(148, 163, 184, 0.24)",
      },
    }[normalizedStatus] || {
      key: "pending",
      label: "Pendiente",
      status: "pending",
      statusLabel: "Pendiente",
      statusTone: "pending",
      textColor: "#5f6b7a",
      background: "rgba(148, 163, 184, 0.14)",
      border: "rgba(148, 163, 184, 0.24)",
    }
  );
}
function getManagementSpecialistRoadmapUiState() {
  if (!window.RCS_MANAGEMENT_SPECIALIST_ROADMAP_UI) {
    window.RCS_MANAGEMENT_SPECIALIST_ROADMAP_UI = {
      year: 2026,
      quarter: "Q4",
      configMode: false,
    };
  }

  const state = window.RCS_MANAGEMENT_SPECIALIST_ROADMAP_UI;

  if (
    !["ALL", "Q1", "Q2", "Q3", "Q4"].includes(
      String(state.quarter || "").toUpperCase(),
    )
  ) {
    state.quarter = "Q4";
  }

  state.year = Number(state.year) || 2026;

  return state;
}

function getManagementSpecialistRoadmapStatusOptions() {
  return [
    getManagementSpecialistRoadmapStatusMeta("pending"),
    getManagementSpecialistRoadmapStatusMeta("in-progress"),
    getManagementSpecialistRoadmapStatusMeta("review"),
    getManagementSpecialistRoadmapStatusMeta("at-risk"),
    getManagementSpecialistRoadmapStatusMeta("blocked"),
    getManagementSpecialistRoadmapStatusMeta("done"),
  ];
}

function buildManagementSpecialistRoadmapSeedLines(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const source = MANAGEMENT_SPECIALIST_ROADMAPS[normalizedProgramId];

  const items = Array.isArray(source?.items) ? source.items : [];

  return items
    .filter((item) => String(item?.task || "").trim())
    .map((item, index) => {
      const statusMeta = getManagementSpecialistRoadmapStatusMeta(item.status);

      return normalizeManagementRoadmapLine(
        {
          id: String(item.id || `pae-${index + 1}`).trim(),

          programId: normalizedProgramId,

          productId: "blue-buddy",

          country: "ES",

          year: 2026,

          order: 6000 + index,

          reportId: "pase-a-especialista",

          category: String(item.area || "").trim() || "Nuevas Funcionalidades",

          categoryTone: "info",

          title: String(item.task || "").trim(),

          owner: String(item.owner || "").trim(),

          quarter: "Q4",

          startDate: "",

          endDate: "",

          status: statusMeta.status,

          statusLabel: statusMeta.statusLabel,

          statusTone: statusMeta.statusTone,

          comments: String(item.comments || "").trim(),

          manualValue: "",

          active: true,
        },
        6000 + index,
      );
    });
}

function installManagementSpecialistRoadmapSeedLines(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const currentLines = Array.isArray(DATA?.managementRoadmapLines)
    ? DATA.managementRoadmapLines
    : [];

  const existingSpecialistLines = currentLines.filter(
    (line) =>
      String(line?.programId || normalizedProgramId)
        .trim()
        .toLowerCase() === normalizedProgramId &&
      String(line?.reportId || "")
        .trim()
        .toLowerCase() === "pase-a-especialista",
  );

  if (existingSpecialistLines.length) {
    return currentLines;
  }

  const seedLines =
    buildManagementSpecialistRoadmapSeedLines(normalizedProgramId);

  const mergedLines = [...currentLines, ...seedLines];

  DATA.managementRoadmapLines = mergedLines;

  if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    PROGRAM_DATA_CACHE.set(normalizedProgramId, {
      ...cached,
      managementRoadmapLines: mergedLines,
    });
  }

  return mergedLines;
}

function getManagementSpecialistRoadmapTasks(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  installManagementSpecialistRoadmapSeedLines(normalizedProgramId);

  return getEffectiveManagementExecutiveLines()
    .filter(
      (line) =>
        String(line.programId || "")
          .trim()
          .toLowerCase() === normalizedProgramId &&
        String(line.reportId || "")
          .trim()
          .toLowerCase() === "pase-a-especialista",
    )
    .sort(
      (left, right) => Number(left.order || 999) - Number(right.order || 999),
    );
}

function buildManagementSpecialistTaskId(title) {
  const slug = slugifyManagementRoadmapText(title) || "nueva-tarea";

  const baseId = `pase-especialista--${slug}`;

  const existingIds = new Set(
    getEffectiveManagementExecutiveLines().map((line) =>
      String(line.id || "")
        .trim()
        .toLowerCase(),
    ),
  );

  if (!existingIds.has(baseId.toLowerCase())) {
    return baseId;
  }

  let suffix = 2;

  let candidate = `${baseId}-${suffix}`;

  while (existingIds.has(candidate.toLowerCase())) {
    suffix += 1;

    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

function buildManagementSpecialistRoadmapDraftTask(programId) {
  const state = getManagementSpecialistRoadmapUiState();

  const tasks = getManagementSpecialistRoadmapTasks(programId);

  const maxOrder = tasks.reduce(
    (currentMax, task) => Math.max(currentMax, Number(task.order || 0)),
    6000,
  );

  return normalizeManagementRoadmapLine(
    {
      id: "",

      programId,

      productId: "blue-buddy",

      country: "ES",

      year: state.year,

      order: maxOrder + 1,

      reportId: "pase-a-especialista",

      category: "Nuevas Funcionalidades",

      categoryTone: "info",

      title: "",

      owner: "",

      quarter: state.quarter === "ALL" ? "Q4" : state.quarter,

      startDate: "",

      endDate: "",

      status: "pending",

      statusLabel: "Pendiente",

      statusTone: "pending",

      comments: "",

      active: true,
    },
    maxOrder + 1,
  );
}

function getManagementSpecialistTaskProgress(task) {
  const links = getManagementReportLinksForLine(task?.id);

  const features = getManagementRoadmapFeaturesForLinks(links);

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

  const sourceCounts = {
    sda: links.filter(
      (link) => normalizeManagementReportSourceType(link) === "sda-deliverable",
    ).length,

    epic: links.filter(
      (link) => normalizeManagementReportSourceType(link) === "epic",
    ).length,

    feature: links.filter(
      (link) => normalizeManagementReportSourceType(link) === "feature",
    ).length,
  };

  return {
    links,

    features,

    deployedFeatures,

    featureCount: features.length,

    deployedCount: deployedFeatures.length,

    progress: features.length
      ? Math.round((deployedFeatures.length / features.length) * 100)
      : null,

    sourceCounts,
  };
}

function getManagementSpecialistRoadmapProgress(tasks) {
  const featureMap = new Map();

  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const progress = getManagementSpecialistTaskProgress(task);

    progress.features.forEach((feature, index) => {
      const key = String(
        getManagementFeatureDisplayId(feature) ||
          feature?.id ||
          feature?.jiraKey ||
          `${task.id}-${index}`,
      )
        .trim()
        .toUpperCase();

      if (key) {
        featureMap.set(key, feature);
      }
    });
  });

  const features = [...featureMap.values()];

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

  return {
    featureCount: features.length,

    deployedCount: deployedFeatures.length,

    progress: features.length
      ? Math.round((deployedFeatures.length / features.length) * 100)
      : null,
  };
}

function getManagementSpecialistTaskPlanningRange(task) {
  const year = Number(task?.year) || 2026;

  const progress = getManagementSpecialistTaskProgress(task);

  const featureRanges = progress.features
    .map((feature) => mgqFeatureRange(feature, year))
    .filter(Boolean);

  const sourceStart = featureRanges.length
    ? new Date(Math.min(...featureRanges.map((range) => range.start.getTime())))
    : null;

  const sourceEnd = featureRanges.length
    ? new Date(Math.max(...featureRanges.map((range) => range.end.getTime())))
    : null;

  const manualStart = mgqParseDate(task?.startDate);

  const manualEnd = mgqParseDate(task?.endDate);

  const start = manualStart || sourceStart;

  const end = manualEnd || sourceEnd;

  return mgqRange(start, end);
}

function managementSpecialistTaskMatchesQuarter(task, quarter) {
  const normalizedQuarter = String(quarter || "")
    .trim()
    .toUpperCase();

  if (normalizedQuarter === "ALL") {
    return true;
  }

  const taskQuarter = String(task?.quarter || "")
    .trim()
    .toUpperCase();

  if (taskQuarter) {
    return taskQuarter === normalizedQuarter;
  }

  const bounds = getManagementRoadmapQuarterBounds(
    Number(task?.year) || 2026,
    normalizedQuarter,
  );

  const range = getManagementSpecialistTaskPlanningRange(task);

  if (!bounds || !range) {
    return false;
  }

  return range.start <= bounds.end && range.end >= bounds.start;
}

function renderManagementSpecialistTaskEditor(programId, task = null) {
  closeManagementRoadmapLineEditorPanel();

  closeManagementRoadmapMappingPanel();

  const isCreate = !task;

  const line = task || buildManagementSpecialistRoadmapDraftTask(programId);

  const statusKey = normalizeManagementSpecialistRoadmapStatus(
    line.statusLabel || line.status,
  );

  const toInputDate = (value) => {
    const date = mgqParseDate(value);

    if (!date) {
      return "";
    }

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  };

  const overlay = document.createElement("div");

  overlay.id = "managementRoadmapLineEditorOverlay";

  overlay.className = "management-roadmap-mapping-overlay";

  overlay.innerHTML = `
    <aside
      class="management-roadmap-mapping-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="managementSpecialistTaskEditorTitle"
    >
      <header
        class="management-roadmap-mapping-header"
      >
        <div>
          <span
            class="management-roadmap-mapping-eyebrow"
          >
            Configurar Pase a Especialista
          </span>

          <h2
            id="managementSpecialistTaskEditorTitle"
          >
            ${isCreate ? "Nueva tarea" : rcsEsc(line.title)}
          </h2>

          <p>
            Blue Buddy · España · 4Q2026
          </p>
        </div>

        <button
          class="management-roadmap-mapping-close"
          type="button"
          data-management-roadmap-line-editor-close
          aria-label="Cerrar"
        >
          ×
        </button>
      </header>

      <div
        class="management-roadmap-mapping-body"
      >
        <section
          class="management-roadmap-mapping-section"
        >
          <div
            class="management-roadmap-line-meta"
          >
            <article>
              <span>
                Informe
              </span>

              <strong>
                Pase a Especialista
              </strong>
            </article>

            <article>
              <span>
                Producto
              </span>

              <strong>
                Blue Buddy
              </strong>
            </article>

            <article>
              <span>
                País
              </span>

              <strong>
                España
              </strong>
            </article>
          </div>

          <div
            class="management-roadmap-line-form"
          >
            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskTitle"
              >
                Tarea
              </label>

              <input
                id="managementSpecialistTaskTitle"
                class="management-roadmap-line-input"
                type="text"
                value="${rcsEsc(line.title || "")}"
                placeholder="Nombre de la tarea"
              />
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskOwner"
              >
                Owner
              </label>

              <input
                id="managementSpecialistTaskOwner"
                class="management-roadmap-line-input"
                type="text"
                value="${rcsEsc(line.owner || "")}"
                placeholder="Ej. DS + MLE"
              />
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskQuarter"
              >
                Quarter
              </label>

              <select
                id="managementSpecialistTaskQuarter"
                class="management-roadmap-line-select"
              >
                ${["Q1", "Q2", "Q3", "Q4"]
                  .map(
                    (quarter) => `
                      <option
                        value="${quarter}"
                        ${line.quarter === quarter ? "selected" : ""}
                      >
                        ${quarter}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskStatus"
              >
                Estado
              </label>

              <select
                id="managementSpecialistTaskStatus"
                class="management-roadmap-line-select"
              >
                ${getManagementSpecialistRoadmapStatusOptions()
                  .map(
                    (option) => `
                      <option
                        value="${rcsEsc(option.key)}"
                        ${statusKey === option.key ? "selected" : ""}
                      >
                        ${rcsEsc(option.label)}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskStartDate"
              >
                Inicio manual
              </label>

              <input
                id="managementSpecialistTaskStartDate"
                class="management-roadmap-line-input"
                type="date"
                value="${rcsEsc(toInputDate(line.startDate))}"
              />
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskEndDate"
              >
                Fin manual
              </label>

              <input
                id="managementSpecialistTaskEndDate"
                class="management-roadmap-line-input"
                type="date"
                value="${rcsEsc(toInputDate(line.endDate))}"
              />
            </div>

            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementSpecialistTaskComments"
              >
                Comentarios
              </label>

              <textarea
                id="managementSpecialistTaskComments"
                class="management-roadmap-line-textarea"
              >${rcsEsc(line.comments || "")}</textarea>
            </div>
          </div>
        </section>
      </div>

      <footer
        class="management-roadmap-mapping-footer"
      >
        <div>
          <strong>
            Configuración persistente
          </strong>

          <span>
            Las fechas manuales tienen prioridad
            sobre la planificación derivada de Features.
          </span>
        </div>

        <div
          class="management-roadmap-mapping-footer-actions"
        >
          ${
            isCreate
              ? ""
              : `
                <button
                  class="management-roadmap-line-delete-button"
                  type="button"
                  data-management-roadmap-line-editor-delete
                >
                  Eliminar
                </button>
              `
          }

          <button
            class="ghost-button"
            type="button"
            data-management-roadmap-line-editor-close
          >
            Cancelar
          </button>

          <button
            class="management-roadmap-mapping-save"
            type="button"
            data-management-roadmap-line-editor-save
          >
            ${isCreate ? "Crear tarea" : "Guardar"}
          </button>
        </div>
      </footer>
    </aside>
  `;

  document.body.appendChild(overlay);

  overlay
    .querySelectorAll("[data-management-roadmap-line-editor-close]")
    .forEach((button) => {
      button.addEventListener("click", closeManagementRoadmapLineEditorPanel);
    });

  const deleteButton = overlay.querySelector(
    "[data-management-roadmap-line-editor-delete]",
  );

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`¿Quieres eliminar "${line.title}"?`);

      if (!confirmed) {
        return;
      }

      await deleteManagementRoadmapLine(programId, line.id);
    });
  }

  const saveButton = overlay.querySelector(
    "[data-management-roadmap-line-editor-save]",
  );

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const title = String(
        overlay.querySelector("#managementSpecialistTaskTitle")?.value || "",
      ).trim();

      if (!title) {
        window.alert("La tarea necesita un nombre.");

        return;
      }

      const owner = String(
        overlay.querySelector("#managementSpecialistTaskOwner")?.value || "",
      ).trim();

      const quarter = String(
        overlay.querySelector("#managementSpecialistTaskQuarter")?.value ||
          "Q4",
      )
        .trim()
        .toUpperCase();

      const selectedStatus = String(
        overlay.querySelector("#managementSpecialistTaskStatus")?.value ||
          "pending",
      ).trim();

      const statusMeta =
        getManagementSpecialistRoadmapStatusMeta(selectedStatus);

      const startDate = String(
        overlay.querySelector("#managementSpecialistTaskStartDate")?.value ||
          "",
      ).trim();

      const endDate = String(
        overlay.querySelector("#managementSpecialistTaskEndDate")?.value || "",
      ).trim();

      if (startDate && endDate && Date.parse(endDate) < Date.parse(startDate)) {
        window.alert(
          "La fecha de fin no puede ser anterior a la fecha de inicio.",
        );

        return;
      }

      const comments = String(
        overlay.querySelector("#managementSpecialistTaskComments")?.value || "",
      ).trim();

      const updatedTask = {
        ...line,

        id: line.id || buildManagementSpecialistTaskId(title),

        programId: String(programId || "")
          .trim()
          .toLowerCase(),

        productId: "blue-buddy",

        country: "ES",

        year: 2026,

        reportId: "pase-a-especialista",

        category: line.category || "Nuevas Funcionalidades",

        categoryTone: line.categoryTone || "info",

        title,

        owner,

        quarter,

        startDate,

        endDate,

        status: statusMeta.status,

        statusLabel: statusMeta.statusLabel,

        statusTone: statusMeta.statusTone,

        comments,

        active: true,
      };

      await saveManagementRoadmapLine(programId, updatedTask);
    });
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeManagementRoadmapLineEditorPanel();
    }
  });
}
function getManagementSpecialistRoadmap(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  return MANAGEMENT_SPECIALIST_ROADMAPS[normalizedProgramId] || null;
}
function renderManagementSpecialistRoadmapCard(programId) {
  const tasks = getManagementSpecialistRoadmapTasks(programId);

  const progress = getManagementSpecialistRoadmapProgress(tasks);

  const inProgress = tasks.filter(
    (task) =>
      normalizeManagementSpecialistRoadmapStatus(
        task.statusLabel || task.status,
      ) === "in-progress",
  ).length;

  const pending = tasks.filter(
    (task) =>
      normalizeManagementSpecialistRoadmapStatus(
        task.statusLabel || task.status,
      ) === "pending",
  ).length;

  return `
    <article
      class="management-report-card"
    >
      <div
        class="management-report-card-top"
      >
        <div>
          <h3>
            Pase a Especialista
          </h3>

          <p>
            Roadmap configurable con tareas,
            Owners, fuentes JIRA y seguimiento
            de avance por Features desplegadas.
          </p>
        </div>

        <span
          class="management-report-badge"
        >
          Live
        </span>
      </div>

      <div
        class="management-report-card-kpis"
      >
        <span>
          ${tasks.length}
          tareas
        </span>

        <span>
          ${inProgress}
          en progreso
        </span>

        <span>
          ${progress.progress === null ? "—" : `${progress.progress}%`}
          avance
        </span>
      </div>

      <div
        class="management-report-card-footer"
      >
        <span
          class="management-report-caption"
        >
          ${pending}
          pendientes ·
          ${progress.deployedCount}/${progress.featureCount}
          Features deployed
        </span>

        <button
          class="management-report-card-link"
          type="button"
          data-route="management-specialist-roadmap/${rcsEsc(programId)}"
        >
          Abrir roadmap →
        </button>
      </div>
    </article>
  `;
}

function renderManagementSpecialistRoadmapView(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const program = (DATA.programs || []).find(
    (item) =>
      String(item.id || "")
        .trim()
        .toLowerCase() === normalizedProgramId,
  );

  const state = getManagementSpecialistRoadmapUiState();

  const allTasks = getManagementSpecialistRoadmapTasks(normalizedProgramId);

  const visibleTasks = allTasks.filter((task) =>
    managementSpecialistTaskMatchesQuarter(task, state.quarter),
  );

  const roadmapProgress = getManagementSpecialistRoadmapProgress(visibleTasks);

  const period = getRoadmapPeriod(state.quarter, state.year);

  const canEdit = rcsCanEdit(normalizedProgramId);

  const riskCount = visibleTasks.filter((task) =>
    ["at-risk", "blocked"].includes(
      normalizeManagementSpecialistRoadmapStatus(
        task.statusLabel || task.status,
      ),
    ),
  ).length;

  const doneCount = visibleTasks.filter(
    (task) =>
      normalizeManagementSpecialistRoadmapStatus(
        task.statusLabel || task.status,
      ) === "done",
  ).length;

  const monthCount = period.months.length;

  const monthHeaders = period.months
    .map(
      (month) => `
        <div
          style="
            padding: 12px 8px;
            text-align: center;
            border-left: 1px solid rgba(255, 255, 255, 0.14);
            color: #ffffff;
          "
        >
          <strong
            style="
              display: block;
              font-size: 13px;
              text-transform: capitalize;
            "
          >
            ${rcsEsc(
              month.toLocaleDateString("es-ES", {
                month: "short",
              }),
            )}
          </strong>

          <span
            style="
              display: block;
              margin-top: 3px;
              font-size: 11px;
              opacity: 0.82;
            "
          >
            ${month.getFullYear()}
          </span>
        </div>
      `,
    )
    .join("");

  const renderTaskRow = (task) => {
    const statusKey = normalizeManagementSpecialistRoadmapStatus(
      task.statusLabel || task.status,
    );

    const statusMeta = getManagementSpecialistRoadmapStatusMeta(statusKey);

    const taskProgress = getManagementSpecialistTaskProgress(task);

    const range = getManagementSpecialistTaskPlanningRange(task);

    const hasVisibleRange =
      range && range.start <= period.endDate && range.end >= period.startDate;

    let left = 0;
    let width = 0;

    if (hasVisibleRange) {
      const visibleStart = clampRoadmapDate(
        range.start,
        period.startDate,
        period.endDate,
      );

      const visibleEnd = clampRoadmapDate(
        range.end,
        period.startDate,
        period.endDate,
      );

      left = getRoadmapDatePosition(visibleStart, period) || 0;

      const right = getRoadmapDatePosition(visibleEnd, period) || left;

      width = Math.max(state.quarter === "ALL" ? 1.5 : 3, right - left);

      width = Math.min(width, 100 - left);
    }

    const progressValue =
      taskProgress.progress === null ? 0 : taskProgress.progress;

    return `
      <article
        style="
          display: grid;
          grid-template-columns:
            minmax(360px, 420px)
            minmax(720px, 1fr);
          border-top: 1px solid #e5ebf5;
          background: #ffffff;
        "
      >
        <div
          style="
            padding: 18px;
            border-right: 1px solid #dbe5f4;
          "
        >
          <div
            style="
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 12px;
            "
          >
            <div>
              <span
                style="
                  display: inline-flex;
                  margin-bottom: 6px;
                  font-size: 11px;
                  font-weight: 700;
                  color: #64748b;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                "
              >
                ${rcsEsc(task.quarter || "Sin Q")}
              </span>

              <strong
                style="
                  display: block;
                  color: #001391;
                  font-size: 15px;
                  line-height: 1.35;
                "
              >
                ${rcsEsc(task.title)}
              </strong>
            </div>

            <span
              style="
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                min-height: 30px;
                padding: 0 10px;
                border-radius: 999px;
                border: 1px solid ${statusMeta.border};
                background: ${statusMeta.background};
                color: ${statusMeta.textColor};
                font-size: 11px;
                font-weight: 700;
              "
            >
              ${rcsEsc(statusMeta.label)}
            </span>
          </div>

          <div
            style="
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 10px;
              margin-top: 12px;
              color: #475569;
              font-size: 12px;
            "
          >
            <span>
              <b>Owner:</b>
              ${rcsEsc(task.owner || "—")}
            </span>

            <strong
              style="
                color: #001391;
              "
            >
              ${
                taskProgress.progress === null
                  ? "—"
                  : `${taskProgress.progress}%`
              }
            </strong>
          </div>

          ${
            task.comments
              ? `
                <p
                  style="
                    margin: 10px 0 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.45;
                  "
                >
                  ${rcsEsc(task.comments)}
                </p>
              `
              : ""
          }

          <div
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: 12px;
            "
          >
            <span
              class="management-report-badge"
            >
              ${taskProgress.sourceCounts.sda}
              SDA
            </span>

            <span
              class="management-report-badge"
            >
              ${taskProgress.sourceCounts.epic}
              Épicas
            </span>

            <span
              class="management-report-badge"
            >
              ${taskProgress.sourceCounts.feature}
              Features
            </span>

            <span
              class="management-report-badge"
            >
              ${taskProgress.deployedCount}/${taskProgress.featureCount}
              deployed
            </span>
          </div>

          ${
            canEdit && state.configMode
              ? `
                <div
                  style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 14px;
                  "
                >
                  <button
                    class="ghost-button"
                    type="button"
                    data-specialist-task-edit="${rcsEsc(task.id)}"
                  >
                    Editar
                  </button>

                  <button
                    class="ghost-button"
                    type="button"
                    data-specialist-task-sources="${rcsEsc(task.id)}"
                  >
                    Fuentes
                  </button>
                </div>
              `
              : ""
          }
        </div>

        <div
          style="
            position: relative;
            min-height: 150px;
            overflow: hidden;
          "
        >
          <div
            style="
              position: absolute;
              inset: 0;
              display: grid;
              grid-template-columns:
                repeat(${monthCount}, 1fr);
              pointer-events: none;
            "
          >
            ${period.months
              .map(
                () => `
                  <span
                    style="
                      border-left: 1px solid #edf1f7;
                    "
                  ></span>
                `,
              )
              .join("")}
          </div>

          ${
            hasVisibleRange
              ? `
                <div
                  style="
                    position: absolute;
                    top: 52px;
                    left: ${left}%;
                    width: ${width}%;
                    min-width: 16px;
                    height: 42px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #dfe9f8;
                    border: 1px solid rgba(0, 19, 145, 0.18);
                    box-sizing: border-box;
                  "
                  title="${rcsEsc(
                    `${task.title} · ${
                      taskProgress.progress === null
                        ? "Sin avance calculable"
                        : `${taskProgress.progress}%`
                    }`,
                  )}"
                >
                  <span
                    style="
                      position: absolute;
                      inset: 0 auto 0 0;
                      width: ${progressValue}%;
                      background: #1464c9;
                    "
                  ></span>

                  <strong
                    style="
                      position: absolute;
                      inset: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: 0 8px;
                      color: ${progressValue >= 45 ? "#ffffff" : "#001391"};
                      font-size: 12px;
                      font-weight: 700;
                      white-space: nowrap;
                      z-index: 2;
                    "
                  >
                    ${
                      taskProgress.progress === null
                        ? "Sin Features"
                        : `${taskProgress.progress}% · ${taskProgress.deployedCount}/${taskProgress.featureCount}`
                    }
                  </strong>
                </div>

                <small
                  style="
                    position: absolute;
                    top: 104px;
                    left: ${left}%;
                    color: #64748b;
                    font-size: 10px;
                    white-space: nowrap;
                  "
                >
                  ${rcsEsc(formatDate(range.start))}
                  →
                  ${rcsEsc(formatDate(range.end))}
                </small>
              `
              : `
                <div
                  style="
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    color: #94a3b8;
                    font-size: 12px;
                    text-align: center;
                  "
                >
                  Sin planificación temporal.
                  Asocia Features o informa fechas
                  manuales en Configurar.
                </div>
              `
          }
        </div>
      </article>
    `;
  };

  setHead(
    `${program?.name || "AIxBanker"} · Pase a Especialista`,
    "Roadmap configurable de tareas, Owners, fuentes y avance.",
    `Retail Client Solutions > ${
      program?.name || normalizedProgramId
    } > Management Reports > Live Reports > Pase a Especialista`,
  );

  view.innerHTML = "";

  view.append(tpl("#projects-template"));

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `projects/${normalizedProgramId}/live`;

    backButton.textContent = "← Volver a Live Reports";
  }

  const titleElement = document.querySelector("#backlogHeader h2");

  const subtitleElement = document.querySelector("#backlogHeader p");

  if (titleElement) {
    titleElement.textContent = "Pase a Especialista";
  }

  if (subtitleElement) {
    subtitleElement.textContent =
      "Seguimiento trimestral de tareas y avance por Features JIRA.";
  }

  const container = document.querySelector("#managementReportsCards");

  if (!container) {
    console.error(
      "[Pase a Especialista] No se ha encontrado #managementReportsCards.",
    );

    return;
  }

  /*
   * El template utiliza originalmente este
   * contenedor como grid de tarjetas.
   *
   * En esta vista pasa a contener un único
   * dashboard completo.
   */
  container.classList.remove("management-reports-grid");

  container.innerHTML = `
    <section
      style="
        display: flex;
        flex-direction: column;
        gap: 18px;
        width: 100%;
        min-width: 0;
      "
    >
      <section
        class="panel"
        style="
          padding: 22px;
          border-radius: 22px;
        "
      >
        <div
          style="
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
          "
        >
          <div>
            <span
              style="
                color: #0b4aa2;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.07em;
              "
            >
              Live Report · 2026
            </span>

            <h3
              style="
                margin: 8px 0 4px;
                color: #001391;
                font-size: 30px;
              "
            >
              Pase a Especialista
            </h3>

            <p
              style="
                margin: 0;
                color: #64748b;
              "
            >
              Tareas, Owners, estado,
              comentarios y ejecución JIRA.
            </p>
          </div>

          ${
            canEdit
              ? `
                <div
                  style="
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                  "
                >
                  ${
                    state.configMode
                      ? `
                        <button
                          class="management-roadmap-mapping-save"
                          type="button"
                          data-specialist-new-task
                        >
                          + Nueva tarea
                        </button>

                        <button
                          class="ghost-button"
                          type="button"
                          data-specialist-config-toggle="false"
                        >
                          Cerrar configuración
                        </button>
                      `
                      : `
                        <button
                          class="management-roadmap-mapping-save"
                          type="button"
                          data-specialist-config-toggle="true"
                        >
                          Configurar informe
                        </button>
                      `
                  }
                </div>
              `
              : ""
          }
        </div>

        <section
          class="aixbanker-roadmap-summary"
          style="
            margin-top: 20px;
          "
        >
          <article>
            <span>
              Tareas
            </span>

            <strong>
              ${visibleTasks.length}
            </strong>
          </article>

          <article>
            <span>
              Features
            </span>

            <strong>
              ${roadmapProgress.featureCount}
            </strong>
          </article>

          <article>
            <span>
              Deployed
            </span>

            <strong>
              ${roadmapProgress.deployedCount}
            </strong>
          </article>

          <article>
            <span>
              Avance
            </span>

            <strong>
              ${
                roadmapProgress.progress === null
                  ? "—"
                  : `${roadmapProgress.progress}%`
              }
            </strong>
          </article>

          <article>
            <span>
              Riesgo / bloqueado
            </span>

            <strong>
              ${riskCount}
            </strong>
          </article>

          <article>
            <span>
              Terminadas
            </span>

            <strong>
              ${doneCount}
            </strong>
          </article>
        </section>

        <div
          class="aixbanker-roadmap-filters"
          style="
            margin-top: 18px;
          "
        >
          <div
            class="aixbanker-roadmap-filter-group"
          >
            <span
              class="aixbanker-roadmap-filter-label"
            >
              Periodo
            </span>

            <nav
              class="executive-filter-row"
              aria-label="Seleccionar quarter"
            >
              ${[
                ["ALL", "Todo el año"],
                ["Q1", "Q1"],
                ["Q2", "Q2"],
                ["Q3", "Q3"],
                ["Q4", "Q4"],
              ]
                .map(
                  ([id, label]) => `
                    <button
                      class="quarter-btn ${
                        state.quarter === id ? "active" : ""
                      }"
                      type="button"
                      data-specialist-quarter="${id}"
                    >
                      ${label}
                    </button>
                  `,
                )
                .join("")}
            </nav>
          </div>
        </div>
      </section>

      <section
        class="panel"
        style="
          overflow-x: auto;
          padding: 0;
          border-radius: 22px;
          width: 100%;
        "
      >
        <div
          style="
            min-width: ${state.quarter === "ALL" ? "1500px" : "1180px"};
          "
        >
          <div
            style="
              display: grid;
              grid-template-columns:
                minmax(360px, 420px)
                minmax(720px, 1fr);
              background: #001391;
            "
          >
            <div
              style="
                padding: 16px 18px;
                color: #ffffff;
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
              "
            >
              Tarea · Owner · Estado
            </div>

            <div
              style="
                display: grid;
                grid-template-columns:
                  repeat(${monthCount}, 1fr);
              "
            >
              ${monthHeaders}
            </div>
          </div>

          ${
            visibleTasks.length
              ? visibleTasks.map(renderTaskRow).join("")
              : `
                <div
                  style="
                    padding: 44px;
                    text-align: center;
                    color: #64748b;
                  "
                >
                  No hay tareas configuradas para
                  ${rcsEsc(state.quarter === "ALL" ? "2026" : state.quarter)}.
                </div>
              `
          }
        </div>
      </section>
    </section>
  `;

  container.querySelectorAll("[data-specialist-quarter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.quarter = button.dataset.specialistQuarter;

      renderManagementSpecialistRoadmapView(normalizedProgramId);
    });
  });

  container
    .querySelectorAll("[data-specialist-config-toggle]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.configMode = button.dataset.specialistConfigToggle === "true";

        renderManagementSpecialistRoadmapView(normalizedProgramId);
      });
    });

  const newTaskButton = container.querySelector("[data-specialist-new-task]");

  if (newTaskButton) {
    newTaskButton.addEventListener("click", () => {
      renderManagementSpecialistTaskEditor(normalizedProgramId, null);
    });
  }

  container
    .querySelectorAll("[data-specialist-task-edit]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const taskId = button.dataset.specialistTaskEdit;

        const task = allTasks.find(
          (item) => String(item.id) === String(taskId),
        );

        if (task) {
          renderManagementSpecialistTaskEditor(normalizedProgramId, task);
        }
      });
    });

  container
    .querySelectorAll("[data-specialist-task-sources]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const taskId = button.dataset.specialistTaskSources;

        renderManagementReportSourcesPanel(normalizedProgramId, taskId);
      });
    });
}
function renderManagementReportsCategoryView(programId, categoryId) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedCategoryId = String(categoryId || "")
    .trim()
    .toLowerCase();

  const categories = {
    static: {
      label: "Static Reports",
      subtitle:
        "Informes consolidados, snapshots ejecutivos y material preparado para reporting.",
    },
    live: {
      label: "Live Reports",
      subtitle:
        "Seguimiento ejecutivo de planificación, ejecución y rendimiento de KPIs.",
    },
    ai: {
      label: "AI Reports",
      subtitle:
        "Inteligencia ejecutiva generada a partir de los datos y contexto del Cockpit.",
    },
  };

  const category = categories[normalizedCategoryId];

  if (!category) {
    route(`projects/${programId}`);
    return;
  }

  view.innerHTML = "";
  view.append(tpl("#projects-template"));

  setHead(
    `${program?.name || "Programa"} · ${category.label}`,
    category.subtitle,
    `Retail Client Solutions > ${
      program?.name || programId
    } > Management Reports > ${category.label}`,
  );

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `projects/${programId}`;
    backButton.textContent = "← Volver a Management Reports";
  }

  const cardsContainer =
    document.querySelector("#managementReportsCards") ||
    document.querySelector("#projects");

  if (!cardsContainer) {
    return;
  }

  /*
   * =====================================================
   * STATIC REPORTS
   * =====================================================
   */
  if (normalizedCategoryId === "static") {
    const contrastPrograms = new Set(["blue", "aixbanker", "rosetta"]);
    const hasContrastValidation = contrastPrograms.has(normalizedProgramId);

    cardsContainer.innerHTML = `
      <article class="management-report-card ${
        hasContrastValidation ? "" : "is-disabled"
      }">
        <div class="management-report-card-top">
          <div>
            <h3>Contraste y Validación RCS</h3>
            <p>
              Seguimiento ejecutivo del contraste y validación
              por prioridad RCS, entregable y país.
            </p>
          </div>

          <span class="management-report-badge ${
            hasContrastValidation ? "" : "is-soon"
          }">
            ${hasContrastValidation ? "4Q26" : "Próximamente"}
          </span>
        </div>

        <div class="management-report-card-kpis">
          <span>Strategic Cycle</span>
          <span>RCS Priorities</span>
          <span>FIG Invoice</span>
        </div>

        <div class="management-report-card-footer">
          <span class="management-report-caption">
            ${
              hasContrastValidation
                ? "Contraste trimestral por programa y geografías."
                : "Vista todavía no disponible para este programa."
            }
          </span>

          ${
            hasContrastValidation
              ? `
                <button
                  class="management-report-card-link"
                  type="button"
                  data-route="management-contrast/${rcsEsc(programId)}"
                >
                  Abrir contraste →
                </button>
              `
              : `
                <button
                  class="management-report-card-link is-disabled"
                  type="button"
                  disabled
                  aria-disabled="true"
                >
                  Próximamente
                </button>
              `
          }
        </div>
      </article>

      <article class="management-report-card">
        <div class="management-report-card-top">
          <div>
            <h3>Demos</h3>
            <p>
              Demostraciones ejecutivas de productos
              y capacidades.
            </p>
          </div>

          <span class="management-report-badge">
            Demos
          </span>
        </div>

        <div class="management-report-card-kpis">
          <span>Vídeo</span>
          <span>Experiencias</span>
          <span>Capacidades</span>
        </div>

        <div class="management-report-card-footer">
          <span class="management-report-caption">
            Material de demostración disponible.
          </span>

          <button
            class="management-report-card-link"
            type="button"
            data-route="management-demos/${rcsEsc(programId)}"
          >
            Ver demos →
          </button>
        </div>
      </article>
    `;

    return;
  }

  /*
   * =====================================================
   * LIVE REPORTS
   * =====================================================
   */
  if (normalizedCategoryId === "live") {
    const roadmapItems = getManagementReportSourceItems(programId);

    const products = [
      ...new Set(
        roadmapItems
          .map((item) => normalizeRoadmapProduct(item.product))
          .filter(Boolean),
      ),
    ];

    const availableCountries = [
      ...new Set(
        roadmapItems
          .map((item) =>
            String(item.country || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    ];

    const globalStatusCard =
      normalizedProgramId === "aixbanker"
        ? `
          <article class="management-report-card">
            <div class="management-report-card-top">
              <div>
                <h3>Blue Buddy Global Status</h3>
                <p>
                  Executive snapshot por país y capability,
                  conectado con SDA, Deliverables y Features JIRA.
                </p>
              </div>

              <span class="management-report-badge">
                Live
              </span>
            </div>

            <div class="management-report-card-kpis">
              <span>Blue Buddy</span>
              <span>5 países</span>
              <span>% deployed</span>
            </div>

            <div class="management-report-card-footer">
              <span class="management-report-caption">
                Evolución global del producto y capacidades por geografía.
              </span>

              <button
                class="management-report-card-link"
                type="button"
                data-route="management-global-status/${rcsEsc(programId)}"
              >
                Abrir Global Status →
              </button>
            </div>
          </article>
        `
        : "";

    const specialistRoadmapCard =
      normalizedProgramId === "aixbanker"
        ? renderManagementSpecialistRoadmapCard(programId)
        : "";

    cardsContainer.innerHTML = `
      <article class="management-report-card">
        <div class="management-report-card-top">
          <div>
            <h3>Roadmap</h3>
            <p>
              Cronograma ejecutivo de planificación
              y ejecución por producto, país, SDA y Features JIRA.
            </p>
          </div>

          <span class="management-report-badge">
            Live
          </span>
        </div>

        <div class="management-report-card-kpis">
          <span>
            ${products.length}
            producto${products.length === 1 ? "" : "s"}
          </span>

          <span>
            ${availableCountries.length}
            país${availableCountries.length === 1 ? "" : "es"}
          </span>

          <span>
            Features vs deployed
          </span>
        </div>

        <div class="management-report-card-footer">
          <span class="management-report-caption">
            Vista global de planificación, ejecución y avance.
          </span>

          <button
            class="management-report-card-link"
            type="button"
            data-route="management-roadmap/${rcsEsc(programId)}"
          >
            Abrir roadmap →
          </button>
        </div>
      </article>

      ${globalStatusCard}

      ${specialistRoadmapCard}

      <article class="management-report-card">
        <div class="management-report-card-top">
          <div>
            <h3>RCS KPIs Heatmap</h3>
            <p>
              Vista ejecutiva del rendimiento de KPIs
              por prioridad, país y programa.
            </p>
          </div>

          <span class="management-report-badge">
            Live
          </span>
        </div>

        <div class="management-report-card-kpis">
          <span>KPI Performance</span>
          <span>Heatmap</span>
          <span>Geografías</span>
        </div>

        <div class="management-report-card-footer">
          <span class="management-report-caption">
            Seguimiento vivo de KPIs y focos de atención.
          </span>

          <a
            class="management-report-card-link"
            href="https://script.google.com/a/macros/bbva.com/s/AKfycbwB4Pe197DmvUW8j1x_YTA_j96CDkeKp3hH5GCSJGYNnlEinJbCS8Awm8RfJgy30BLj/exec"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir heatmap ↗
          </a>
        </div>
      </article>
    `;

    return;
  }

  /*
   * =====================================================
   * AI REPORTS
   * =====================================================
   */
  cardsContainer.innerHTML = `
    <article class="management-report-card is-disabled">
      <div class="management-report-card-top">
        <div>
          <h3>Executive Summary</h3>
          <p>
            Resumen ejecutivo generado a partir
            del contexto y datos disponibles.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Resumen</span>
        <span>Highlights</span>
        <span>Insights</span>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Vista ejecutiva automática para dirección.
        </span>

        <button
          class="management-report-card-link is-disabled"
          type="button"
          disabled
          aria-disabled="true"
        >
          Próximamente
        </button>
      </div>
    </article>

    <article class="management-report-card is-disabled">
      <div class="management-report-card-top">
        <div>
          <h3>Risks & Attention</h3>
          <p>
            Riesgos, alertas y focos prioritarios
            detectados automáticamente.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Riesgos</span>
        <span>Alertas</span>
        <span>Atención</span>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Foco automático sobre excepciones relevantes.
        </span>

        <button
          class="management-report-card-link is-disabled"
          type="button"
          disabled
          aria-disabled="true"
        >
          Próximamente
        </button>
      </div>
    </article>

    <article class="management-report-card is-disabled">
      <div class="management-report-card-top">
        <div>
          <h3>What's Changed</h3>
          <p>
            Resumen de los cambios más relevantes
            desde el último periodo de reporting.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Cambios</span>
        <span>Variaciones</span>
        <span>Impacto</span>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Comparativa automática entre periodos.
        </span>

        <button
          class="management-report-card-link is-disabled"
          type="button"
          disabled
          aria-disabled="true"
        >
          Próximamente
        </button>
      </div>
    </article>
  `;
}
function renderProjectsView(programId) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const routeContext = getCurrentRoute();
  const categoryId = String(routeContext.productId || "")
    .trim()
    .toLowerCase();

  if (["static", "live", "ai"].includes(categoryId)) {
    renderManagementReportsCategoryView(programId, categoryId);
    return;
  }

  const contrastPrograms = new Set(["blue", "aixbanker", "rosetta"]);
  const hasContrastValidation = contrastPrograms.has(normalizedProgramId);
  const hasGlobalStatus = normalizedProgramId === "aixbanker";

  view.innerHTML = "";
  view.append(tpl("#projects-template"));

  setHead(
    `${program?.name || "Programa"} · Management Reports`,
    "Informes ejecutivos, seguimiento dinámico e inteligencia generada con IA.",
    `Retail Client Solutions > ${
      program?.name || programId
    } > Management Reports`,
  );

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = getFlightDeckReturnRoute(programId);
    backButton.textContent = `← Volver a ${program?.name || "programa"}`;
  }

  const cardsContainer = document.querySelector("#managementReportsCards");

  if (!cardsContainer) {
    return;
  }

  const primaryReportButtonStyle = `
    min-height: 46px;
    padding: 0 18px;
    background: var(--blue);
    color: #ffffff;
    border-color: var(--blue);
    box-shadow: 0 8px 18px rgba(0, 19, 145, 0.18);
    text-decoration: none;
  `;

  cardsContainer.innerHTML = `
    <article class="management-report-card">
      <div class="management-report-card-top">
        <div>
          <h3>Static Reports</h3>
          <p>
            Informes cerrados, snapshots ejecutivos
            y material preparado para reporting.
          </p>
        </div>
      </div>

      <div class="management-report-card-kpis">
        <span>Snapshots</span>
        <span>Reporting ejecutivo</span>
        <span>Material de referencia</span>
      </div>

      <div
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        "
      >
        ${
          hasContrastValidation
            ? `
              <button
                class="management-report-card-link"
                type="button"
                data-route="management-contrast/${rcsEsc(programId)}"
                style="${primaryReportButtonStyle}"
              >
                Contraste y Validación RCS →
              </button>
            `
            : `
              <button
                class="management-report-card-link is-disabled"
                type="button"
                disabled
                aria-disabled="true"
              >
                Contraste y Validación RCS
              </button>
            `
        }

        <button
          class="management-report-card-link"
          type="button"
          data-route="management-demos/${rcsEsc(programId)}"
          style="${primaryReportButtonStyle}"
        >
          Demos →
        </button>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Informes ejecutivos consolidados.
        </span>

        <button
          class="management-report-card-link"
          type="button"
          data-route="projects/${rcsEsc(programId)}/static"
        >
          Ver todos →
        </button>
      </div>
    </article>

    <article class="management-report-card">
      <div class="management-report-card-top">
        <div>
          <h3>Live Reports</h3>
          <p>
            Seguimiento del roadmap y del rendimiento
            de KPIs por programa y geografía.
          </p>
        </div>
      </div>

      <div class="management-report-card-kpis">
        <span>Roadmap</span>
        <span>KPI Performance</span>
        <span>Geografías</span>
      </div>

      <div
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        "
      >
        <button
          class="management-report-card-link"
          type="button"
          data-route="management-roadmap/${rcsEsc(programId)}"
          style="${primaryReportButtonStyle}"
        >
          Roadmap →
        </button>

        ${
          hasGlobalStatus
            ? `
              <button
                class="management-report-card-link"
                type="button"
                data-route="management-global-status/${rcsEsc(programId)}"
                style="${primaryReportButtonStyle}"
              >
                Global Status →
              </button>
            `
            : ""
        }

        <a
          class="management-report-card-link"
          href="https://script.google.com/a/macros/bbva.com/s/AKfycbwB4Pe197DmvUW8j1x_YTA_j96CDkeKp3hH5GCSJGYNnlEinJbCS8Awm8RfJgy30BLj/exec"
          target="_blank"
          rel="noopener noreferrer"
          style="${primaryReportButtonStyle}"
        >
          RCS KPIs Heatmap ↗
        </a>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Planificación, ejecución y performance ejecutiva.
        </span>

        <button
          class="management-report-card-link"
          type="button"
          data-route="projects/${rcsEsc(programId)}/live"
        >
          Ver todos →
        </button>
      </div>
    </article>

    <article class="management-report-card">
      <div class="management-report-card-top">
        <div>
          <h3>AI Reports</h3>
          <p>
            Reporting generado a partir de los datos
            y el contexto disponible en el Cockpit.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Executive Summary</span>
        <span>Risks & Attention</span>
        <span>What's Changed</span>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Nueva capa de inteligencia ejecutiva.
        </span>

        <button
          class="management-report-card-link"
          type="button"
          data-route="projects/${rcsEsc(programId)}/ai"
        >
          Ver área →
        </button>
      </div>
    </article>
  `;
}

function getManagementContrastData() {
  const countries = [
    {
      id: "ES",
      label: "España",
      flag: "🇪🇸",
    },
    {
      id: "MX",
      label: "México",
      flag: "🇲🇽",
    },
    {
      id: "PE",
      label: "Perú",
      flag: "🇵🇪",
    },
    {
      id: "CO",
      label: "Colombia",
      flag: "🇨🇴",
    },
    {
      id: "UY",
      label: "Uruguay",
      flag: "🇺🇾",
    },
    {
      id: "AR",
      label: "Argentina",
      flag: "🇦🇷",
    },
    {
      id: "TR",
      label: "Turquía",
      flag: "🇹🇷",
    },
  ];
  return {
    blue: {
      programId: "blue",
      snapshots: {
        Q4: {
          quarter: "Q4",
          quarterLabel: "4Q26",
          title: "R1 Blue",
          cycle: "2025-2029 Strategic Cycle",
          cashoutReference: "3Q26",
          rcp: 75,
          priorities: [
            {
              id: "innovation",
              label: "Unlock the potential of AI & Innovation",
              value: 100,
              color: "#ffe35e",
            },
          ],
          countries: countries.map((country) => ({
            ...country,
            invoice:
              {
                ES: "1,93",
                MX: "6,28",
                PE: "0,75",
                CO: "0,54",
                UY: "0,05",
                AR: "0,54",
                TR: "0,29",
              }[country.id] || "",
          })),
          headline: "",
          groups: [
            {
              title: "Elevar la experiencia de cliente Blue",
              rows: [
                {
                  title: "Experiencias avanzadas: movimientos",
                  experience: "Exp. 2",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "1Q26 ✅",
                    MX: "2Q26 ✅",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
                {
                  title: "Experiencia generativa con multiagentes",
                  experience: "Exp. 3",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "3Q26 ✅",
                    MX: "3Q26 ✅",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
                {
                  title: "Implementación AdS",
                  experience: "",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "NA",
                    MX: "NA",
                    PE: "4Q26",
                    CO: "NA",
                    UY: "NA",
                    AR: "4Q26",
                    TR: "NA",
                  },
                },
              ],
            },
            {
              title: "Blue como First Contact Resolution (FCR)",
              rows: [
                {
                  title:
                    "Blue proactivo: primeros casos de venta y asesoramiento",
                  experience: "Exp. 10",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "3Q26 ✅",
                    MX: "3Q26 ✅\n4Q26",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
                {
                  title: "Blue como FCR en Mis Conversaciones",
                  experience: "Exp. 1",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "1Q26 ✅",
                    MX: "1Q26 ✅\n4Q26",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
              ],
            },
            {
              title: "Killing the Contact Center",
              experience: "Exp. 1",
              rows: [
                {
                  title: "Voz inbound informacional",
                  experience: "",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "NA",
                    MX: "3Q26 ✅\n4Q26",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
                {
                  title: "Voz inbound operacional",
                  experience: "",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "NA",
                    MX: "3Q26 ✅\n4Q26",
                    PE: "NA",
                    CO: "NA",
                    UY: "NA",
                    AR: "NA",
                    TR: "NA",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    rosetta: {
      programId: "rosetta",
      snapshots: {
        Q4: {
          quarter: "Q4",
          quarterLabel: "4Q26",
          title: "R1 Rosetta (Interaction Orchestration)",
          cycle: "2025-2029 Strategic Cycle",
          cashoutReference: "3Q26",
          rcp: 51,
          priorities: [
            {
              id: "client",
              label: "Embed a Radical Client Perspective in all we do",
              value: 7.4,
              color: "#81d9e5",
            },
            {
              id: "scalability",
              label: "Evolve Scalability of our Relationship Model",
              value: 47.1,
              color: "#8985f3",
            },
            {
              id: "innovation",
              label: "Unlock the potential of AI & Innovation",
              value: 45.5,
              color: "#ffe35e",
            },
          ],
          countries: countries.map((country) => ({
            ...country,
            invoice:
              {
                ES: "0,68",
                MX: "2,14",
                PE: "0,26",
                CO: "0,19",
                UY: "0,02",
                AR: "0,20",
                TR: "0,10",
              }[country.id] || "",
          })),
          headline:
            "Orchestration as the mechanism to guarantee that Human Bankers only intervene when adding value",
          groups: [
            {
              title: "Filtrado y Enrutado",
              rows: [
                {
                  title: "Experiencia Blue First Mis Conversaciones",
                  experience: "Exp. 1 y 10",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "4Q25 ✅\n2026\next DTs",
                    MX: "4Q26",
                    PE: "",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Experiencia Blue First Voz",
                  experience: "Exp. 1 y 10",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "",
                    MX: "3Q2026\nOrc F3",
                    PE: "",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Orquestación en canal Blue",
                  experience: "Exp. 2 y 3",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "TBD",
                    MX: "Fallbacks\n26 Full",
                    PE: "",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Orquestación en canal remoto masivo",
                  experience: "",
                  global: true,
                  status: "amber",
                  countries: {
                    ES: "✅\nGenesys",
                    MX: "3Q26",
                    PE: "",
                    CO: "3Q26\non-hold",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
            {
              title: "Asistencia Proactiva",
              rows: [
                {
                  title: "Asistencia proactiva en Contratación",
                  experience: "Exp. 7",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "2Q25 ✅\n2026",
                    MX: "3Q26",
                    PE: "3Q26",
                    CO: "1Q26 ✅\n(31/03)",
                    UY: "",
                    AR: "",
                    TR: "1Q26 ✅\n(31/03)",
                  },
                },
                {
                  title: "Asistencia proactiva en Servicing",
                  experience: "Exp. 7",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "3Q25 ✅\n2026",
                    MX: "",
                    PE: "",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
            {
              title: "Foresight Interaction",
              rows: [
                {
                  title: "Foresight Interaction: Primeros casos de uso",
                  experience: "Exp. 8",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "(MSA)\n2Q26 ✅\n3Q26",
                    MX: "TBD",
                    PE: "",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
            {
              title: "Capacidades y AI Routing Rules",
              rows: [
                {
                  title: "Pieza enrutamiento y pase de contexto",
                  experience: "Exp. 3, 7",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "1Q25 ✅",
                    MX: "3Q25 ✅",
                    PE: "3Q26",
                    CO: "1Q26 ✅\n(31/03)",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    aixbanker: {
      programId: "aixbanker",
      snapshots: {
        Q4: {
          quarter: "Q4",
          quarterLabel: "4Q26",
          title: "R2 AI Banker for Retail",
          cycle: "2025-2029 Strategic Cycle",
          cashoutReference: "3Q26",
          rcp: 11,
          priorities: [
            {
              id: "client",
              label: "Embed a Radical Client Perspective in all we do",
              value: 11.3,
              color: "#81d9e5",
            },
            {
              id: "scalability",
              label: "Evolve Scalability of our Relationship Model",
              value: 52.7,
              color: "#8985f3",
            },
            {
              id: "innovation",
              label: "Unlock the potential of AI & Innovation",
              value: 36,
              color: "#ffe35e",
            },
          ],
          countries: countries.map((country) => ({
            ...country,
            invoice:
              {
                ES: "1,09",
                MX: "2,31",
                PE: "0,28",
                CO: "0,22",
                UY: "0,02",
                AR: "0,22",
                TR: "0,12",
              }[country.id] || "",
          })),
          headline: "Create a real Bionic RM (AI x Banker)",
          groups: [
            {
              title: "Blue Buddy",
              rows: [
                {
                  title: "Despliegue Blue Buddy (knowledge assistant)",
                  experience: "Exp. 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "2Q25 ✅",
                    MX: "4Q26",
                    PE: "4Q25 ✅",
                    CO: "2Q26 ✅",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Blue Buddy: incremento de conocimiento",
                  experience: "Exp. 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "POC y evoluciona\n2Q26 ✅",
                    MX: "CUC\n4Q26",
                    PE: "CUC\n2Q26 ✅",
                    CO: "2027",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Blue Buddy: integración en frontal",
                  experience: "Exp. 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "Salesforce\n2Q26 ✅",
                    MX: "Salesforce\n4Q26",
                    PE: "Salesforce\n4Q26",
                    CO: "AUG\n3Q26",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Blue Buddy: conexión ecosistema agentes",
                  experience: "Exp. 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "Supervisor\n2Q26 ✅\nMarzo\n3Q26",
                    MX: "Supervisor\n4Q26",
                    PE: "Supervisor\n2027",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Sales Assistant: competidores",
                  experience: "Exp. 3 y 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "2027",
                    MX: "4Q26",
                    PE: "2027",
                    CO: "TBD",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Sales Assistant: agente de venta",
                  experience: "Exp. 3 y 5",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "4Q26",
                    MX: "2027",
                    PE: "2027",
                    CO: "TBD",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
            {
              title: "Franchise",
              rows: [
                {
                  title: "Ortodoxia (Mala Praxis)",
                  experience: "Exp. 6",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "POC\n1Q26 ✅\nProducción\n2Q26 ✅",
                    MX: "TBD",
                    PE: "TBD",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Llamada 10 (Buena Praxis)",
                  experience: "Exp. 6",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "3Q26\n4Q26",
                    MX: "TBD",
                    PE: "TBD",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
                {
                  title: "Best Practices",
                  experience: "Exp. 6",
                  global: true,
                  status: "green",
                  countries: {
                    ES: "4Q26",
                    MX: "TBD",
                    PE: "TBD",
                    CO: "",
                    UY: "",
                    AR: "",
                    TR: "",
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };
}

function getManagementContrastSelectedQuarter(programId) {
  if (!window.RCS_MANAGEMENT_CONTRAST_QUARTERS) {
    window.RCS_MANAGEMENT_CONTRAST_QUARTERS = {};
  }
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  return window.RCS_MANAGEMENT_CONTRAST_QUARTERS[normalizedProgramId] || "Q4";
}

function setManagementContrastSelectedQuarter(programId, quarter) {
  if (!window.RCS_MANAGEMENT_CONTRAST_QUARTERS) {
    window.RCS_MANAGEMENT_CONTRAST_QUARTERS = {};
  }
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedQuarter = ["Q1", "Q2", "Q3", "Q4"].includes(quarter)
    ? quarter
    : "Q4";
  window.RCS_MANAGEMENT_CONTRAST_QUARTERS[normalizedProgramId] =
    normalizedQuarter;
}

function buildManagementContrastPriorityGradient(priorities) {
  const items = Array.isArray(priorities) ? priorities : [];
  if (!items.length) {
    return "#eef2f7 0deg 360deg";
  }
  let current = 0;
  return items
    .map((priority) => {
      const value = Math.max(0, Number(priority.value || 0));
      const start = current;
      current += value;
      return `${priority.color} ${start}% ${current}%`;
    })
    .join(", ");
}

function getManagementContrastCellClass(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return "is-empty";
  }
  if (normalized === "NA") {
    return "is-na";
  }
  if (normalized.includes("TBD")) {
    return "is-tbd";
  }
  if (normalized.includes("ON-HOLD")) {
    return "is-risk";
  }
  if (normalized.includes("2027")) {
    return "is-future";
  }
  return "";
}

function renderManagementContrastCell(value) {
  const text = String(value || "");
  if (!text) {
    return "";
  }
  return rcsEsc(text).replaceAll("\n", "<br>");
}

function renderManagementContrastPriorityLegend(snapshot) {
  return (snapshot.priorities || [])
    .map(
      (priority) => `
        <div class="management-contrast-legend-item">
          <span
            class="management-contrast-legend-dot"
            style="background:${rcsEsc(priority.color)}"
            aria-hidden="true"
          ></span>
          <span>
            ${rcsEsc(priority.label)}
          </span>
          <span class="management-contrast-legend-value">
            ${rcsEsc(
              Number(priority.value || 0).toLocaleString("es-ES", {
                maximumFractionDigits: 1,
              }),
            )}%
          </span>
        </div>
      `,
    )
    .join("");
}

function renderManagementContrastCountryHeader(snapshot) {
  return `
    <div class="management-contrast-country-head">
      ${(snapshot.countries || [])
        .map(
          (country) => `
            <div
              class="management-contrast-country"
              title="${rcsEsc(country.label)}"
            >
              <span class="management-contrast-country-flag">
                ${rcsEsc(country.flag)}
              </span>
              <strong>
                ${rcsEsc(country.invoice)}
              </strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderManagementContrastTable(snapshot) {
  const countryIds = (snapshot.countries || []).map((country) => country.id);
  const countryColumns = countryIds.map(() => "<col>").join("");
  const headline = snapshot.headline
    ? `
      <tr class="management-contrast-headline-row">
        <th colspan="${3 + countryIds.length}">
          ${rcsEsc(snapshot.headline)}
        </th>
      </tr>
    `
    : "";
  const groups = (snapshot.groups || [])
    .map((group) => {
      const groupExperience = group.experience
        ? `
          <span class="management-contrast-group-experience">
            (${rcsEsc(group.experience)})
          </span>
        `
        : "";
      const rows = (group.rows || [])
        .map((row) => {
          const experience = row.experience
            ? `
              <span class="management-contrast-experience">
                (${rcsEsc(row.experience)})
              </span>
            `
            : "";
          return `
            <tr>
              <td>
                <span class="management-contrast-deliverable">
                  ${rcsEsc(row.title)}
                  ${experience}
                </span>
              </td>
              <td>
                ${
                  row.global
                    ? `
                      <span
                        class="management-contrast-global"
                        title="Desarrollo global"
                      >
                        🌍
                      </span>
                    `
                    : ""
                }
              </td>
              <td>
                <span
                  class="
                    management-contrast-status
                    ${row.status === "amber" ? "is-amber" : "is-green"}
                  "
                  aria-label="${
                    row.status === "amber" ? "Atención" : "En curso"
                  }"
                ></span>
              </td>
              ${countryIds
                .map((countryId) => {
                  const value = row.countries?.[countryId] || "";
                  return `
                    <td
                      class="
                        management-contrast-country-cell
                        ${getManagementContrastCellClass(value)}
                      "
                    >
                      ${renderManagementContrastCell(value)}
                    </td>
                  `;
                })
                .join("")}
            </tr>
          `;
        })
        .join("");
      return `
        <tr class="management-contrast-group-row">
          <th colspan="${3 + countryIds.length}">
            ${rcsEsc(group.title)}
            ${groupExperience}
          </th>
        </tr>
        ${rows}
      `;
    })
    .join("");
  return `
    <div class="management-contrast-table-scroll">
      <table class="management-contrast-table">
        <colgroup>
          <col class="management-contrast-name-col">
          <col class="management-contrast-icon-col">
          <col class="management-contrast-status-col">
          ${countryColumns}
        </colgroup>
        <tbody>
          ${headline}
          ${groups}
        </tbody>
      </table>
    </div>
  `;
}

function renderManagementContrastSnapshot(snapshot) {
  const gradient = buildManagementContrastPriorityGradient(snapshot.priorities);
  return `
    <section class="management-contrast-snapshot">
      <header class="management-contrast-hero">
        <div>
          <div>
            <span class="management-contrast-quarter-label">
              ${rcsEsc(snapshot.quarterLabel)}
            </span>
            <h2>
              ${rcsEsc(snapshot.title)}
            </h2>
          </div>
          <div class="management-contrast-cycle">
            ${rcsEsc(snapshot.cycle)}
          </div>
        </div>
        <div class="management-contrast-brand">
          📊 RCS | C&V ${rcsEsc(snapshot.quarterLabel)}
        </div>
      </header>
      <section class="management-contrast-main">
        <aside class="management-contrast-side">
          <div class="management-contrast-side-copy">
            <h3>
              Peso (%) Entregables asociados a las prioridades RCS
            </h3>
            <p class="management-contrast-side-subtitle">
              (ponderado por Cashout solicitado
              ${rcsEsc(snapshot.cashoutReference)}
              del proyecto/entregables)
            </p>
            <div class="management-contrast-legend">
              ${renderManagementContrastPriorityLegend(snapshot)}
            </div>
            <div class="management-contrast-note">
              <span aria-hidden="true">
                🌍
              </span>
              <span>
                Desarrollo SW, no incluye acompañamientos
                a países, planes estratégicos,
                definiciones, etc.
              </span>
            </div>
            <div class="management-contrast-footnote">
              (*) no incluye mark-up ni impuestos locales
            </div>
          </div>
          <div class="management-contrast-donut-shell">
            <div
              class="management-contrast-donut"
              style="
                --management-priority-gradient:
                  conic-gradient(${gradient});
                --management-rcp:${Number(snapshot.rcp || 0)};
              "
            >
              <div class="management-contrast-donut-inner-ring"></div>
              <div class="management-contrast-donut-center">
                <strong>
                  ${rcsEsc(snapshot.rcp)}%
                </strong>
                <span>
                  RCP
                </span>
              </div>
            </div>
          </div>
        </aside>
        <section class="management-contrast-table-panel">
          <div class="management-contrast-table-top">
            <div>
              <h3>
                ${rcsEsc(snapshot.cycle)}
              </h3>
              <div class="management-contrast-invoice-label">
                FIG Invoice M€*
              </div>
            </div>
            ${renderManagementContrastCountryHeader(snapshot)}
          </div>
          ${renderManagementContrastTable(snapshot)}
        </section>
      </section>
    </section>
  `;
}

function renderManagementContrastValidationView(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const program = (DATA.programs || []).find(
    (item) =>
      String(item.id || "")
        .trim()
        .toLowerCase() === normalizedProgramId,
  );
  const contrastData = getManagementContrastData();
  const programContrast = contrastData[normalizedProgramId];
  const selectedQuarter =
    getManagementContrastSelectedQuarter(normalizedProgramId);
  const snapshot = programContrast?.snapshots?.[selectedQuarter] || null;
  setHead(
    `${program?.name || "Programa"} · Contraste y Validación RCS`,
    "Seguimiento ejecutivo trimestral de contraste y validación.",
    `Retail Client Solutions > ${
      program?.name || programId
    } > Management Reports > Contraste y Validación RCS`,
  );
  view.innerHTML = `
    <section class="management-contrast-view">
      <div class="management-contrast-toolbar">
        <button
          class="ghost-button"
          type="button"
          data-route="projects/${rcsEsc(programId)}"
        >
          ← Volver a Management Reports
        </button>
        <div
          class="management-contrast-quarter-selector"
          aria-label="Seleccionar trimestre"
        >
          ${["Q1", "Q2", "Q3", "Q4"]
            .map(
              (quarter) => `
                <button
                  class="
                    management-contrast-quarter-btn
                    ${selectedQuarter === quarter ? "is-active" : ""}
                  "
                  type="button"
                  data-management-contrast-quarter="${quarter}"
                >
                  ${quarter.replace("Q", "")}Q26
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
      <div id="managementContrastContent">
        ${
          snapshot
            ? renderManagementContrastSnapshot(snapshot)
            : `
              <section class="management-contrast-empty">
                <div>
                  <strong>
                    ${rcsEsc(selectedQuarter.replace("Q", "") + "Q26")}
                  </strong>
                  <p>
                    Todavía no hay un snapshot de
                    Contraste y Validación RCS
                    cargado para este trimestre.
                  </p>
                </div>
              </section>
            `
        }
      </div>
    </section>
  `;
  document
    .querySelectorAll("[data-management-contrast-quarter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const quarter = String(
          button.dataset.managementContrastQuarter || "",
        ).trim();
        setManagementContrastSelectedQuarter(normalizedProgramId, quarter);
        renderManagementContrastValidationView(normalizedProgramId);
      });
    });
}

function renderManagementDemosView(programId) {
  const program = (DATA.programs || []).find((item) => item.id === programId);
  view.innerHTML = "";
  view.append(tpl("#management-demos-template"));
  setHead(
    `${program?.name || "Programa"} · Demos`,
    "Demostraciones ejecutivas de productos y capacidades.",
    `Retail Client Solutions > ${
      program?.name || programId
    } > Management Reports > Demos`,
  );
  const backButton = document.querySelector(".back-to-management-reports-btn");
  if (backButton) {
    backButton.dataset.route = `projects/${programId}`;
  }
  const board = document.querySelector("#managementDemosBoard");
  if (!board) {
    return;
  }
  const demos = [
    {
      id: "sales-assistant",
      title: "Sales Assistant",
      product: "Blue Buddy",
      description: "Demostración de las capacidades de Sales Assistant.",
      driveFileId: "1n-VXeRLa-JmfbeiQNTCxWfd9HqBJb8oC",
    },
    {
      id: "blue-buddy",
      title: "Blue Buddy",
      product: "Blue Buddy",
      description:
        "Demostración de la experiencia y capacidades de Blue Buddy.",
      driveFileId: "1eFCGOptnVyo4KpqvnOPKTDi1_fc3_cog",
    },
  ];
  board.innerHTML = demos
    .map((demo) => {
      const driveViewUrl =
        `https://drive.google.com/file/d/` + `${demo.driveFileId}/view`;
      const drivePreviewUrl =
        `https://drive.google.com/file/d/` + `${demo.driveFileId}/preview`;
      return `
        <article
          class="management-demo-card"
          data-management-demo="${rcsEsc(demo.id)}"
        >
          <div class="management-demo-header">
            <div>
              <span class="management-demo-eyebrow">
                ${rcsEsc(demo.product)}
              </span>
              <h3>
                ${rcsEsc(demo.title)}
              </h3>
              <p>
                ${rcsEsc(demo.description)}
              </p>
            </div>
            <span class="management-report-badge">
              Vídeo
            </span>
          </div>
          <div class="management-demo-video">
            <iframe
              src="${rcsEsc(drivePreviewUrl)}"
              title="${rcsEsc(demo.title)}"
              loading="lazy"
              allow="autoplay; fullscreen"
              allowfullscreen
              referrerpolicy="no-referrer"
            ></iframe>
          </div>
          <div class="management-demo-footer">
            <span class="management-report-caption">
              El acceso al vídeo depende de los permisos
              corporativos configurados en Google Drive.
            </span>
            <a
              class="management-report-card-link"
              href="${rcsEsc(driveViewUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en Drive ↗
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function formatManagementReportProductLabel(productId) {
  return String(productId || "")
    .trim()
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getManagementExecutiveLines() {
  return [
    /*
     * =====================================================
     * BLUE BUDDY · ESPAÑA
     * =====================================================
     */
    {
      id: "es-blue-buddy-drive-gobernado",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 10,
      category: "Aumento conocimiento",
      categoryTone: "knowledge",
      title: "Información de Pymes con Drive Gobernado",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      quarterSignals: {
        Q4: "risk",
      },
      status: "at-risk",
      statusLabel: "En curso",
      comments:
        "Habilitadores técnicos no disponibles para integrar, fecha prevista 6 oct en riesgo",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-marko",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 20,
      category: "Aumento conocimiento",
      categoryTone: "knowledge",
      title: "Integración agente Marko a Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: false,
      },
      quarterSignals: {
        Q3: "attention",
      },
      status: "on-track",
      statusLabel: "En curso",
      comments:
        "Integración técnica OK, llamada a Marko. Se realizará piloto 07/10 con gestores HV para testar experiencia (link DEMO).",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-competidores",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 30,
      category: "Sales Assistant",
      categoryTone: "sales",
      title: "Competidores (objeciones) en Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: false,
        Q4: false,
      },
      status: "planned",
      statusLabel: "Reprogramado",
      statusTone: "replanned",
      comments:
        "Se depende de la salida de México en Q4 para implementarlo. Se reprograma para Q1.",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-discurso-venta",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 40,
      category: "Agente de venta",
      categoryTone: "sales-agent",
      title: "Discurso de venta personalizado",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-performance",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 50,
      category: "",
      categoryTone: "",
      title: "Optimizar el desempeño de Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-preparacion-visitas",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 60,
      category: "Preparación de visitas",
      categoryTone: "visits",
      title: "Preparación de visitas para Pymes",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-blue-buddy-pase-humano",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "ES",
      year: 2026,
      order: 70,
      category: "Mejora experiencia",
      categoryTone: "experience",
      title: "Pase a humano",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    /*
     * =====================================================
     * BLUE BUDDY · MÉXICO
     * =====================================================
     */
    {
      id: "mx-blue-buddy-knowledge-assistant",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "MX",
      year: 2026,
      order: 10,
      category: "Despliegue Blue Buddy",
      categoryTone: "deployment",
      title: "Blue Buddy (Knowledge Assistant)",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "mx-blue-buddy-supervisor",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "MX",
      year: 2026,
      order: 20,
      category: "Aumento conocimiento",
      categoryTone: "knowledge",
      title: "Integración Supervisor para Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      quarterSignals: {
        Q4: "risk",
      },
      status: "at-risk",
      statusLabel: "En curso",
      comments:
        "México ha solicitado salir con una primera versión de pieza Supervisor que sea adhoc al Quickwin de Blue Buddy que actualmente tienen.",
      spaceVision: false,
    },
    {
      id: "mx-blue-buddy-competidores",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "MX",
      year: 2026,
      order: 30,
      category: "Sales Assistant",
      categoryTone: "sales",
      title: "Competidores (objeciones) en Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    /*
     * =====================================================
     * BLUE BUDDY · PERÚ
     * =====================================================
     */
    {
      id: "pe-blue-buddy-pymes-salesforce",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "PE",
      year: 2026,
      order: 10,
      category: "Extensión de público",
      categoryTone: "audience",
      title: "Blue Buddy para PYMES (Salesforce)",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "pe-blue-buddy-commercial-info",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "PE",
      year: 2026,
      order: 20,
      category: "Aumento conocimiento",
      categoryTone: "knowledge",
      title: "Nueva información comercial en Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "pe-blue-buddy-performance",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "PE",
      year: 2026,
      order: 30,
      category: "",
      categoryTone: "",
      title: "Optimizar el desempeño de Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "pe-blue-buddy-dashboard",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "PE",
      year: 2026,
      order: 40,
      category: "",
      categoryTone: "",
      title: "Implementación de dashboard global",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: false,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments:
        "Probabilidad de replanificación a Q4 por priorización de su scrum. Pendiente de confirmación.",
      spaceVision: false,
    },
    /*
     * =====================================================
     * BLUE BUDDY · COLOMBIA
     * =====================================================
     */
    {
      id: "co-blue-buddy-b-wealth",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "CO",
      year: 2026,
      order: 10,
      category: "Extensión de público",
      categoryTone: "audience",
      title: "Blue Buddy para segmento B Wealth (Salesforce)",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: false,
        Q4: false,
      },
      status: "planned",
      statusLabel: "Cancelado",
      statusTone: "cancelled",
      comments: "",
      spaceVision: false,
    },
    {
      id: "co-blue-buddy-performance",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "CO",
      year: 2026,
      order: 20,
      category: "",
      categoryTone: "",
      title: "Optimizar el desempeño de Blue Buddy",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "co-blue-buddy-dashboard",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "CO",
      year: 2026,
      order: 30,
      category: "",
      categoryTone: "",
      title: "Implementación de dashboard global",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: false,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments:
        "Probabilidad de replanificación a Q4 por priorización de su scrum. Pendiente de confirmación.",
      spaceVision: false,
    },
    /*
     * =====================================================
     * BLUE BUDDY · GLOBAL
     * =====================================================
     */
    {
      id: "global-blue-buddy-scout",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "HL",
      year: 2026,
      order: 10,
      category: "Agente de venta",
      categoryTone: "sales-agent",
      title: "Piezas de SCOUT y Customer Overview",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "global-blue-buddy-supervisor-piece",
      programId: "aixbanker",
      productId: "blue-buddy",
      country: "HL",
      year: 2026,
      order: 20,
      category: "Aumento conocimiento",
      categoryTone: "knowledge",
      title: "Disponibilización pieza Supervisor",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: false,
      },
      status: "done",
      statusLabel: "Finalizado",
      statusTone: "done",
      comments: "",
      spaceVision: false,
    },
    /*
     * =====================================================
     * FRANQUICIA · ESPAÑA
     * =====================================================
     */
    {
      id: "es-franchise-ortodoxia",
      programId: "aixbanker",
      productId: "franchise",
      country: "ES",
      year: 2026,
      order: 10,
      category: "Ortodoxia",
      categoryTone: "deployment",
      title: "Productivización en Venta de Seguros",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: false,
        Q4: false,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-franchise-llamada-10-agregada",
      programId: "aixbanker",
      productId: "franchise",
      country: "ES",
      year: 2026,
      order: 20,
      category: "Llamada 10",
      categoryTone: "knowledge",
      title: "Protocolo de Llamada 10 en Vista agregada",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      quarterSignals: {
        Q3: "focus",
      },
      status: "at-risk",
      statusLabel: "Retrasado",
      statusTone: "delayed",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-franchise-llamada-10-coordinator",
      programId: "aixbanker",
      productId: "franchise",
      country: "ES",
      year: 2026,
      order: 30,
      category: "Llamada 10",
      categoryTone: "knowledge",
      title: "Vista coordinador desagregada de Llamada 10",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      quarterSignals: {
        Q3: "focus",
      },
      status: "at-risk",
      statusLabel: "Retrasado",
      statusTone: "delayed",
      comments: "",
      spaceVision: false,
    },
    {
      id: "es-franchise-best-practices",
      programId: "aixbanker",
      productId: "franchise",
      country: "ES",
      year: 2026,
      order: 40,
      category: "Best Practices",
      categoryTone: "best-practices",
      title: "Vista de best practices para la red",
      quarterCoverage: {
        Q1: false,
        Q2: false,
        Q3: true,
        Q4: false,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "Vuelve como fecha fin Q3",
      spaceVision: false,
    },
    {
      id: "es-franchise-future-vision",
      programId: "aixbanker",
      productId: "franchise",
      country: "ES",
      year: 2026,
      order: 50,
      category: "Panorama",
      categoryTone: "audience",
      title: "Análisis de la visión del futuro",
      quarterCoverage: {
        Q1: false,
        Q2: true,
        Q3: true,
        Q4: true,
      },
      status: "on-track",
      statusLabel: "En curso",
      comments: "",
      spaceVision: false,
    },
  ];
}

function getManagementReportSourceItems(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  return adaptUnifiedRoadmapCollection().filter(
    (item) =>
      String(item.programId || "")
        .trim()
        .toLowerCase() === normalizedProgramId,
  );
}

function isManagementRoadmapLinkActive(link) {
  if (!link) {
    return false;
  }
  if (link.active === true) {
    return true;
  }
  const normalized = String(link.active || "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes", "y", "si", "sí"].includes(normalized);
}

function normalizeManagementSdaId(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  if (!text) {
    return "";
  }
  /*
   * En Management Roadmap Links:
   *
   * SDATOOL-54491
   *
   * En jiraWorkspaceFeatures:
   *
   * 54491
   *
   * Internamente trabajamos siempre
   * con el identificador numérico.
   */
  const sdaToolMatch = text.match(/SDATOOL[-_\s]*(\d+)/i);
  if (sdaToolMatch) {
    return sdaToolMatch[1];
  }
  const numericMatch = text.match(/(?:^|[^0-9])(\d{4,})(?:[^0-9]|$)/);
  if (numericMatch) {
    return numericMatch[1];
  }
  return text;
}

function normalizeManagementDeliverableId(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  if (!text) {
    return "";
  }
  /*
   * Formatos admitidos:
   *
   * D2450760
   * D-2450760
   * D_2450760
   * D 2450760
   */
  const prefixedMatch = text.match(
    /(?:^|[^A-Z0-9])D[\s_-]*(\d{6,})(?:[^0-9]|$)/i,
  );
  if (prefixedMatch) {
    return `D${prefixedMatch[1]}`;
  }
  /*
   * Algunos valores JIRA pueden contener
   * únicamente el identificador numérico
   * del deliverable.
   *
   * Los deliverables SDA que estamos
   * utilizando tienen identificadores
   * suficientemente largos como para
   * distinguirlos del sdaId.
   */
  const numericMatch = text.match(/(?:^|[^0-9])(\d{6,})(?:[^0-9]|$)/);
  if (numericMatch) {
    return `D${numericMatch[1]}`;
  }
  return text;
}

function getManagementFeatureDeliverableIds(feature) {
  if (!feature || typeof feature !== "object") {
    return [];
  }
  /*
   * Aunque actualmente Apps Script exporta
   * principalmente "deliverable", dejamos
   * preparados aliases para no depender de
   * un único nombre de propiedad.
   */
  const values = [
    feature.deliverable,
    feature.deliverableId,
    feature.deliverable_id,
    feature.sdaDeliverableId,
    feature.sda_deliverable_id,
  ].filter(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== "",
  );
  const result = new Set();
  values.forEach((value) => {
    const text = String(value).trim().toUpperCase();
    /*
     * D2450760
     * D-2450760
     * D 2450760
     */
    const prefixedMatches = text.matchAll(
      /(?:^|[^A-Z0-9])D[\s_-]*(\d{6,})(?=[^0-9]|$)/gi,
    );
    for (const match of prefixedMatches) {
      if (match[1]) {
        result.add(`D${match[1]}`);
      }
    }
    /*
     * Fallback:
     *
     * si el custom field contiene el número
     * del deliverable sin la D.
     */
    const numericMatches = text.matchAll(/(?:^|[^0-9])(\d{6,})(?=[^0-9]|$)/g);
    for (const match of numericMatches) {
      if (match[1]) {
        result.add(`D${match[1]}`);
      }
    }
  });
  return [...result];
}

function normalizeManagementReportSourceType(link) {
  let type = String(link?.sourceType || "")
    .trim()
    .toLowerCase();

  if (type === "sda" || type === "deliverable") {
    type = "sda-deliverable";
  }

  if (type === "epica" || type === "épica") {
    type = "epic";
  }

  if (type) {
    return type;
  }

  if (
    normalizeManagementSdaId(link?.sdaId) &&
    normalizeManagementDeliverableId(link?.deliverableId)
  ) {
    return "sda-deliverable";
  }

  if (String(link?.featureId || "").trim()) {
    return "feature";
  }

  if (String(link?.staffingId || "").trim()) {
    return "staffing";
  }

  return "";
}

function getManagementReportLinkSourceId(link) {
  const type = normalizeManagementReportSourceType(link);

  if (type === "sda-deliverable") {
    const sdaId = normalizeManagementSdaId(link?.sdaId);

    const deliverableId = normalizeManagementDeliverableId(link?.deliverableId);

    return sdaId && deliverableId ? `${sdaId}::${deliverableId}` : "";
  }

  if (type === "epic") {
    return String(link?.sourceId || "")
      .trim()
      .toUpperCase();
  }

  if (type === "feature") {
    return String(link?.sourceId || link?.featureId || "")
      .trim()
      .toUpperCase();
  }

  if (type === "staffing") {
    return String(link?.sourceId || link?.staffingId || "").trim();
  }

  return "";
}

function getManagementReportLinksForLine(executiveLineId) {
  const normalizedLineId = String(executiveLineId || "")
    .trim()
    .toLowerCase();

  if (!normalizedLineId) {
    return [];
  }

  const links = Array.isArray(DATA?.managementRoadmapLinks)
    ? DATA.managementRoadmapLinks
    : [];

  return links.filter((link) => {
    if (
      String(link.executiveLineId || "")
        .trim()
        .toLowerCase() !== normalizedLineId
    ) {
      return false;
    }

    if (!isManagementRoadmapLinkActive(link)) {
      return false;
    }

    const type = normalizeManagementReportSourceType(link);

    const sourceId = getManagementReportLinkSourceId(link);

    return Boolean(type && sourceId);
  });
}

function getManagementRoadmapLinksForLine(executiveLineId) {
  return getManagementReportLinksForLine(executiveLineId).filter(
    (link) => normalizeManagementReportSourceType(link) === "sda-deliverable",
  );
}

function normalizeManagementComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getManagementSdaDeliverable(link) {
  const expectedSdaId = normalizeManagementSdaId(link?.sdaId);
  const expectedDeliverableId = normalizeManagementDeliverableId(
    link?.deliverableId,
  );
  if (!expectedSdaId || !expectedDeliverableId) {
    return null;
  }
  const deliverables = Array.isArray(DATA?.sdaDeliverables)
    ? DATA.sdaDeliverables
    : [];
  return (
    deliverables.find((deliverable) => {
      const deliverableSdaId = normalizeManagementSdaId(
        deliverable.sdaCode || deliverable.sdaId,
      );
      const deliverableId = normalizeManagementDeliverableId(
        deliverable.deliverableId,
      );
      return (
        deliverableSdaId === expectedSdaId &&
        deliverableId === expectedDeliverableId
      );
    }) || null
  );
}

function managementFeatureMatchesDeliverable(feature, link) {
  const expectedSdaId = normalizeManagementSdaId(link?.sdaId);
  const featureSdaId = normalizeManagementSdaId(feature?.sdaId);
  /*
   * Primera condición obligatoria:
   * la Feature debe pertenecer a la SDA.
   */
  if (!expectedSdaId || featureSdaId !== expectedSdaId) {
    return false;
  }
  const expectedDeliverableId = normalizeManagementDeliverableId(
    link?.deliverableId,
  );
  if (!expectedDeliverableId) {
    return false;
  }
  /*
   * =====================================================
   * MATCH 1
   * ID DEL DELIVERABLE
   * =====================================================
   */
  const featureDeliverableIds = getManagementFeatureDeliverableIds(feature);
  if (featureDeliverableIds.includes(expectedDeliverableId)) {
    return true;
  }
  /*
   * =====================================================
   * MATCH 2
   * NOMBRE DEL DELIVERABLE
   * =====================================================
   *
   * Resolvemos:
   *
   * link.deliverableId
   *        ↓
   * sdaDeliverables
   *        ↓
   * nombre oficial
   *        ↓
   * custom field JIRA
   */
  const sdaDeliverable = getManagementSdaDeliverable(link);
  if (!sdaDeliverable) {
    return false;
  }
  const expectedName = normalizeManagementComparableText(sdaDeliverable.name);
  const jiraDeliverable = normalizeManagementComparableText(
    feature?.deliverable,
  );
  if (!expectedName || !jiraDeliverable) {
    return false;
  }
  return (
    jiraDeliverable.includes(expectedName) ||
    expectedName.includes(jiraDeliverable)
  );
}

function getManagementFeaturesForLine(executiveLineId) {
  const links = getManagementReportLinksForLine(executiveLineId);

  if (!links.length) {
    return [];
  }

  const features = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  const result = new Map();

  const registerFeature = (feature, fallbackIndex) => {
    const featureKey = String(
      feature?.jiraKey ||
        feature?.sourceFeatureKey ||
        feature?.featureId ||
        feature?.id ||
        `FEATURE-${fallbackIndex}`,
    )
      .trim()
      .toUpperCase();

    if (!featureKey) {
      return;
    }

    if (!result.has(featureKey)) {
      result.set(featureKey, feature);
    }
  };

  links.forEach((link) => {
    const sourceType = normalizeManagementReportSourceType(link);

    if (sourceType === "sda-deliverable") {
      features.forEach((feature, index) => {
        if (managementFeatureMatchesDeliverable(feature, link)) {
          registerFeature(feature, index);
        }
      });

      return;
    }

    if (sourceType === "epic") {
      features.forEach((feature, index) => {
        if (managementFeatureMatchesEpicSource(feature, link)) {
          registerFeature(feature, index);
        }
      });

      return;
    }

    if (sourceType === "feature") {
      const expectedKey = getManagementReportLinkSourceId(link).toUpperCase();

      const feature = features.find(
        (item) =>
          String(getManagementFeatureDisplayId(item)).trim().toUpperCase() ===
          expectedKey,
      );

      if (feature) {
        registerFeature(feature, 0);
      }
    }
  });

  return [...result.values()];
}

function isManagementFeatureDeployed(feature) {
  if (!feature) {
    return false;
  }
  /*
   * Usamos statusRaw deliberadamente.
   *
   * El status normalizado del Cockpit
   * transforma también Accepted,
   * Closed y Discarded en estados
   * terminales.
   *
   * Para Management Reports queremos
   * específicamente:
   *
   * Features DEPLOYED / total Features.
   */
  const rawStatus = String(feature.statusRaw || feature.currentStatusRaw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return rawStatus === "deployed";
}

function getManagementRoadmapSnapshotState() {
  if (!window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT) {
    window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT = {
      productId: "blue-buddy",
      countryId: "ES",
      year: null,
      quarter: "ALL",
    };
  }

  const state = window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT;

  if (!["ALL", "Q1", "Q2", "Q3", "Q4"].includes(state.quarter)) {
    state.quarter = "ALL";
  }

  return state;
}

function setManagementRoadmapSnapshotProduct(productId) {
  const state = getManagementRoadmapSnapshotState();
  state.productId = normalizeRoadmapProduct(productId);
  const countries = getManagementRoadmapAvailableCountries(
    "aixbanker",
    state.productId,
  );
  if (!countries.includes(state.countryId)) {
    state.countryId = countries[0] || "ES";
  }
}

function setManagementRoadmapSnapshotCountry(countryId) {
  const state = getManagementRoadmapSnapshotState();
  state.countryId = String(countryId || "")
    .trim()
    .toUpperCase();
}

function isManagementRoadmapLineActive(line) {
  if (!line) {
    return false;
  }
  if (
    line.active === true ||
    line.active === undefined ||
    line.active === null ||
    line.active === ""
  ) {
    return true;
  }
  return !["false", "0", "no", "off"].includes(
    String(line.active).trim().toLowerCase(),
  );
}
function normalizeManagementRoadmapDateValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();

  if (!text) {
    return "";
  }

  /*
   * =====================================================
   * YYYY-MM-DD
   * =====================================================
   */

  const isoDateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateOnly) {
    return [isoDateOnly[1], isoDateOnly[2], isoDateOnly[3]].join("-");
  }

  /*
   * =====================================================
   * ISO DATETIME
   * =====================================================
   *
   * Google Sheets devuelve las celdas Date mediante
   * sheetToObjects_() como:
   *
   * 2026-09-29T00:00:00.000Z
   *
   * Para persistencia del Roadmap sólo nos interesa
   * la fecha, no la hora.
   * =====================================================
   */

  const isoDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})T/);

  if (isoDateTime) {
    return [isoDateTime[1], isoDateTime[2], isoDateTime[3]].join("-");
  }

  /*
   * =====================================================
   * DD/MM/YYYY
   * =====================================================
   */

  const spanishDate = text.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);

  if (spanishDate) {
    const day = String(Number(spanishDate[1])).padStart(2, "0");

    const month = String(Number(spanishDate[2])).padStart(2, "0");

    const year = spanishDate[3];

    return `${year}-${month}-${day}`;
  }

  /*
   * =====================================================
   * FALLBACK
   * =====================================================
   */

  const parsed = Date.parse(text);

  if (!Number.isFinite(parsed)) {
    return text;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}
function normalizeManagementRoadmapLine(line, fallbackOrder = 999) {
  const normalizedQuarter = String(line?.quarter || "")
    .trim()
    .toUpperCase();

  return {
    ...line,

    id: String(line?.id || "").trim(),

    programId: String(line?.programId || "")
      .trim()
      .toLowerCase(),

    productId: normalizeRoadmapProduct(line?.productId),

    country: String(line?.country || "")
      .trim()
      .toUpperCase(),

    year: Number(line?.year) || 2026,

    order: Number(line?.order) || fallbackOrder,

    reportId: String(line?.reportId || "")
      .trim()
      .toLowerCase(),

    category: String(line?.category || "").trim(),

    categoryTone: String(line?.categoryTone || "").trim(),

    title: String(line?.title || "").trim(),

    owner: String(line?.owner || "").trim(),

    quarter: ["Q1", "Q2", "Q3", "Q4"].includes(normalizedQuarter)
      ? normalizedQuarter
      : "",

    startDate: normalizeManagementRoadmapDateValue(line?.startDate),

    endDate: normalizeManagementRoadmapDateValue(line?.endDate),

    status: String(line?.status || "on-track").trim(),

    statusLabel: String(line?.statusLabel || "En curso").trim(),

    statusTone: String(line?.statusTone || "").trim(),

    comments: String(line?.comments || "").trim(),

    manualValue: normalizeManagementGlobalStatusManualValue(line?.manualValue),

    active: isManagementRoadmapLineActive(line),
  };
}
function getEffectiveManagementExecutiveLines() {
  const persistedLines = Array.isArray(DATA?.managementRoadmapLines)
    ? DATA.managementRoadmapLines
    : [];
  const source = persistedLines.length
    ? persistedLines
    : getManagementExecutiveLines();
  return source
    .map((line, index) => normalizeManagementRoadmapLine(line, index + 1))
    .filter((line) => line.id && line.title && line.active);
}

function slugifyManagementRoadmapText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-+/g, "-");
}

function getManagementRoadmapNextOrder(programId, productId, countryId) {
  const rows = getManagementRoadmapRows(programId, productId, countryId);
  const maxOrder = rows.reduce(
    (currentMax, row) => Math.max(currentMax, Number(row?.order) || 0),
    0,
  );
  return maxOrder + 1;
}

function buildManagementRoadmapLineId(
  productId,
  countryId,
  title,
  existingLines = [],
) {
  const normalizedProductId = normalizeRoadmapProduct(productId);
  const normalizedCountryId = String(countryId || "")
    .trim()
    .toLowerCase();
  const slug = slugifyManagementRoadmapText(title) || "nuevo-deliverable";
  const baseId = [normalizedCountryId, normalizedProductId, slug]
    .filter(Boolean)
    .join("-");
  const existingIds = new Set(
    existingLines.map((line) =>
      String(line?.id || "")
        .trim()
        .toLowerCase(),
    ),
  );
  if (!existingIds.has(baseId.toLowerCase())) {
    return baseId;
  }
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (existingIds.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}

function buildManagementRoadmapDraftLine(programId, productId, countryId) {
  const rows = getManagementRoadmapRows(programId, productId, countryId);
  const sampleRow = rows[0] || {};
  const nextOrder = getManagementRoadmapNextOrder(
    programId,
    productId,
    countryId,
  );
  return normalizeManagementRoadmapLine(
    {
      id: "",
      programId,
      productId: normalizeRoadmapProduct(productId),
      country: String(countryId || "")
        .trim()
        .toUpperCase(),
      year: Number(sampleRow?.year) || 2026,
      order: nextOrder,
      category: "",
      categoryTone: "",
      title: "",
      status: "on-track",
      statusLabel: "En curso",
      statusTone: "",
      comments: "",
      active: true,
    },
    nextOrder,
  );
}

function getManagementRoadmapAvailableProducts(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  /*
   * =====================================================
   * 1. MANAGEMENT ROADMAP YA CONFIGURADO
   * =====================================================
   */
  const configuredProducts = [
    ...new Set(
      getEffectiveManagementExecutiveLines()
        .filter(
          (line) =>
            String(line.programId || "")
              .trim()
              .toLowerCase() === normalizedProgramId,
        )
        .map((line) => normalizeRoadmapProduct(line.productId))
        .filter(Boolean),
    ),
  ];
  if (configuredProducts.length) {
    return configuredProducts;
  }
  /*
   * =====================================================
   * 2. PRODUCT CATALOG
   * =====================================================
   *
   * Nos permite arrancar un programa que todavía
   * no tiene Management Roadmap Lines.
   */
  const catalogProducts = [
    ...new Set(
      (Array.isArray(DATA?.productCatalog) ? DATA.productCatalog : [])
        .filter((product) => {
          const productProgramId = String(product.programId || "")
            .trim()
            .toLowerCase();
          /*
           * Algunos orígenes antiguos
           * no informan programId.
           */
          return !productProgramId || productProgramId === normalizedProgramId;
        })
        .map((product) => normalizeRoadmapProduct(product.productId))
        .filter(Boolean),
    ),
  ];
  if (catalogProducts.length) {
    return catalogProducts;
  }
  /*
   * =====================================================
   * 3. ROADMAP OPERATIVO
   * =====================================================
   */
  const roadmapProducts = [
    ...new Set(
      getManagementReportSourceItems(normalizedProgramId)
        .map((item) => normalizeRoadmapProduct(item.product || item.productId))
        .filter(Boolean),
    ),
  ];
  if (roadmapProducts.length) {
    return roadmapProducts;
  }
  /*
   * =====================================================
   * 4. BOOTSTRAP
   * =====================================================
   *
   * Último fallback.
   *
   * Permite crear el primer deliverable ejecutivo
   * aunque todavía no exista ninguna configuración.
   */
  const bootstrapProducts = {
    aixbanker: ["blue-buddy"],
    blue: ["blue"],
    rosetta: ["interaction-orchestration"],
  };
  return bootstrapProducts[normalizedProgramId] || [];
}

function getManagementRoadmapAvailableCountries(programId, productId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedProductId = normalizeRoadmapProduct(productId);
  const preferredOrder = ["ES", "MX", "PE", "CO", "UY", "AR", "TR", "HL"];
  /*
   * =====================================================
   * 1. PAÍSES YA CONFIGURADOS
   * =====================================================
   */
  let available = [
    ...new Set(
      getEffectiveManagementExecutiveLines()
        .filter(
          (line) =>
            String(line.programId || "")
              .trim()
              .toLowerCase() === normalizedProgramId &&
            normalizeRoadmapProduct(line.productId) === normalizedProductId,
        )
        .map((line) =>
          String(line.country || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  ];
  /*
   * =====================================================
   * 2. PAÍSES DEL ROADMAP OPERATIVO
   * =====================================================
   */
  if (!available.length) {
    available = [
      ...new Set(
        getManagementReportSourceItems(normalizedProgramId)
          .filter(
            (item) =>
              normalizeRoadmapProduct(item.product || item.productId) ===
              normalizedProductId,
          )
          .map((item) =>
            String(item.country || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    ];
  }
  /*
   * =====================================================
   * 3. BOOTSTRAP
   * =====================================================
   *
   * Si no existe absolutamente nada todavía,
   * ofrecemos las geografías estándar RCS.
   */
  if (!available.length && ["blue", "rosetta"].includes(normalizedProgramId)) {
    available = ["ES", "MX", "PE", "CO", "UY", "AR", "TR", "HL"];
  }
  return available.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);
    return (
      (leftIndex === -1 ? 999 : leftIndex) -
      (rightIndex === -1 ? 999 : rightIndex)
    );
  });
}

function getManagementRoadmapProductLabel(productId) {
  const normalizedProductId = normalizeRoadmapProduct(productId);
  return (
    {
      "blue-buddy": "Blue Buddy",
      franchise: "Franquicia",
      blue: "Blue",
      rosetta: "Interaction Orchestration",
      "interaction-orchestration": "Interaction Orchestration",
    }[normalizedProductId] ||
    formatManagementReportProductLabel(normalizedProductId)
  );
}

function getManagementRoadmapCountrySelectorLabel(countryId) {
  return (
    {
      ES: "España",
      MX: "México",
      PE: "Perú",
      CO: "Colombia",
      UY: "Uruguay",
      AR: "Argentina",
      TR: "Turquía",
      HL: "Global",
    }[
      String(countryId || "")
        .trim()
        .toUpperCase()
    ] || countryId
  );
}

function getManagementRoadmapCountrySelectorFlag(countryId) {
  return (
    {
      ES: "🇪🇸",
      MX: "🇲🇽",
      PE: "🇵🇪",
      CO: "🇨🇴",
      UY: "🇺🇾",
      AR: "🇦🇷",
      TR: "🇹🇷",
      HL: "🌐",
    }[
      String(countryId || "")
        .trim()
        .toUpperCase()
    ] || "●"
  );
}

function getManagementRoadmapRows(programId, productId, countryId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const normalizedCountryId = String(countryId || "")
    .trim()
    .toUpperCase();

  return getEffectiveManagementExecutiveLines()
    .filter((line) => {
      const lineProgramId = String(line.programId || "")
        .trim()
        .toLowerCase();

      const lineProductId = normalizeRoadmapProduct(line.productId);

      const lineCountryId = String(line.country || "")
        .trim()
        .toUpperCase();

      const reportId = String(line.reportId || "")
        .trim()
        .toLowerCase();

      return (
        lineProgramId === normalizedProgramId &&
        lineProductId === normalizedProductId &&
        lineCountryId === normalizedCountryId &&
        !reportId
      );
    })
    .sort(
      (left, right) => Number(left.order || 999) - Number(right.order || 999),
    );
}
function getManagementRoadmapQuarterIndex(quarter) {
  return (
    {
      Q1: 0,
      Q2: 1,
      Q3: 2,
      Q4: 3,
    }[
      String(quarter || "")
        .trim()
        .toUpperCase()
    ] ?? -1
  );
}

function getManagementRoadmapQuarterBounds(year, quarter) {
  const normalizedYear = Number(year);
  const quarterIndex = getManagementRoadmapQuarterIndex(quarter);
  if (!Number.isFinite(normalizedYear) || quarterIndex < 0) {
    return null;
  }
  const start = new Date(
    Date.UTC(normalizedYear, quarterIndex * 3, 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(normalizedYear, quarterIndex * 3 + 3, 0, 23, 59, 59, 999),
  );
  return {
    start,
    end,
  };
}

function parseManagementRoadmapDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  const timestamp = Date.parse(String(value).trim());
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp);
}

function getManagementRoadmapQuarterFromText(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  if (!text) {
    return "";
  }
  const qFirst = text.match(/\bQ\s*([1-4])\b/i);
  if (qFirst) {
    return `Q${qFirst[1]}`;
  }
  const numberFirst = text.match(/\b([1-4])\s*Q\b/i);
  if (numberFirst) {
    return `Q${numberFirst[1]}`;
  }
  /*
   * También cubrimos formatos:
   *
   * 2Q26
   * 3Q2026
   */
  const compact = text.match(/(?:^|[^0-9])([1-4])Q(?:20)?\d{2}(?:[^0-9]|$)/i);
  if (compact) {
    return `Q${compact[1]}`;
  }
  return "";
}

function getManagementRoadmapFeaturePlanningRange(feature, year) {
  if (!feature) {
    return null;
  }
  let start = parseManagementRoadmapDate(feature.startDate);
  let end = parseManagementRoadmapDate(feature.targetDate || feature.endDate);
  /*
   * El importador JIRA ya convierte
   * Program Increment / PI Estimate
   * en fechas cuando puede.
   *
   * Este fallback cubre Features
   * antiguas que todavía no tengan
   * esas fechas normalizadas.
   */
  if (!start && !end) {
    const planningQuarter = getManagementRoadmapQuarterFromText(
      [feature.programIncrement, feature.piEstimate].filter(Boolean).join(" "),
    );
    if (planningQuarter) {
      return getManagementRoadmapQuarterBounds(year, planningQuarter);
    }
    return null;
  }
  /*
   * Si sólo conocemos uno de los extremos,
   * utilizamos ese punto como planificación
   * del Feature.
   */
  if (!start) {
    start = end;
  }
  if (!end) {
    end = start;
  }
  if (!start || !end) {
    return null;
  }
  /*
   * Protección ante datos intercambiados.
   */
  if (start.getTime() > end.getTime()) {
    return {
      start: end,
      end: start,
    };
  }
  return {
    start,
    end,
  };
}

function managementRoadmapFeatureIsInQuarter(feature, year, quarter) {
  const quarterBounds = getManagementRoadmapQuarterBounds(year, quarter);
  const planningRange = getManagementRoadmapFeaturePlanningRange(feature, year);
  if (!quarterBounds || !planningRange) {
    return false;
  }
  /*
   * Hay planificación en el trimestre
   * cuando ambas ventanas se solapan.
   */
  return (
    planningRange.start.getTime() <= quarterBounds.end.getTime() &&
    planningRange.end.getTime() >= quarterBounds.start.getTime()
  );
}

function managementRoadmapSdaDeliverableIsInQuarter(
  deliverable,
  year,
  quarter,
) {
  if (!deliverable) {
    return false;
  }
  const targetQuarterIndex = getManagementRoadmapQuarterIndex(quarter);
  if (targetQuarterIndex < 0) {
    return false;
  }
  const startQuarter = getManagementRoadmapQuarterFromText(
    deliverable.startQuarter,
  );
  const endQuarter = getManagementRoadmapQuarterFromText(
    deliverable.endQuarter,
  );
  const startIndex = getManagementRoadmapQuarterIndex(startQuarter);
  const endIndex = getManagementRoadmapQuarterIndex(endQuarter);
  /*
   * Caso normal:
   *
   * SDA informa trimestre inicial
   * y trimestre final.
   */
  if (startIndex >= 0 && endIndex >= 0) {
    return (
      targetQuarterIndex >= Math.min(startIndex, endIndex) &&
      targetQuarterIndex <= Math.max(startIndex, endIndex)
    );
  }
  if (startIndex >= 0) {
    return targetQuarterIndex === startIndex;
  }
  if (endIndex >= 0) {
    return targetQuarterIndex === endIndex;
  }
  /*
   * Fallback a las fechas SDA.
   *
   * Preferimos clientDate,
   * después productionDate
   * y finalmente developmentEndDate.
   */
  const date = parseManagementRoadmapDate(
    deliverable.clientDate ||
      deliverable.productionDate ||
      deliverable.developmentEndDate,
  );
  if (!date) {
    return false;
  }
  const quarterBounds = getManagementRoadmapQuarterBounds(year, quarter);
  if (!quarterBounds) {
    return false;
  }
  return (
    date.getTime() >= quarterBounds.start.getTime() &&
    date.getTime() <= quarterBounds.end.getTime()
  );
}

function getManagementRoadmapQuarterData(row, quarter) {
  const year = Number(row?.year) || new Date().getFullYear();
  const links = getManagementRoadmapLinksForLine(row?.id);
  if (!links.length) {
    return {
      hasAssociation: false,
      totalFeatures: 0,
      deployedFeatures: 0,
      progress: null,
      sdaPlanned: false,
      status: "unmapped",
    };
  }
  const allFeatures = getManagementFeaturesForLine(row.id);
  const quarterFeatures = allFeatures.filter((feature) =>
    managementRoadmapFeatureIsInQuarter(feature, year, quarter),
  );
  const deployedFeatures = quarterFeatures.filter(isManagementFeatureDeployed);
  const totalFeatures = quarterFeatures.length;
  const deployedCount = deployedFeatures.length;
  const progress =
    totalFeatures > 0
      ? Math.round((deployedCount / totalFeatures) * 100)
      : null;
  const sdaPlanned = links.some((link) => {
    const deliverable = getManagementSdaDeliverable(link);
    return managementRoadmapSdaDeliverableIsInQuarter(
      deliverable,
      year,
      quarter,
    );
  });
  let status = "empty";
  if (totalFeatures > 0 && deployedCount === totalFeatures) {
    status = "complete";
  } else if (deployedCount > 0) {
    status = "progress";
  } else if (totalFeatures > 0) {
    status = "planned";
  } else if (sdaPlanned) {
    status = "sda";
  }
  return {
    hasAssociation: true,
    totalFeatures,
    deployedFeatures: deployedCount,
    progress,
    sdaPlanned,
    status,
  };
}

function renderManagementRoadmapQuarterCell(row, quarter) {
  const data = getManagementRoadmapQuarterData(row, quarter);
  const classes = ["management-deliverables-quarter", `is-${data.status}`]
    .filter(Boolean)
    .join(" ");
  /*
   * =====================================================
   * SIN ASOCIACIÓN
   * =====================================================
   */
  if (!data.hasAssociation) {
    return `
      <td class="${classes}">
        <div
          class="
            management-deliverables-quarter-content
          "
        >
          <span
            class="
              management-deliverables-quarter-empty
            "
          >
            —
          </span>
        </div>
      </td>
    `;
  }
  /*
   * =====================================================
   * FEATURES PLANIFICADAS EN EL TRIMESTRE
   * =====================================================
   */
  if (data.totalFeatures > 0) {
    return `
      <td class="${classes}">
        <div
          class="
            management-deliverables-quarter-content
          "
          title="${data.deployedFeatures} de ${
            data.totalFeatures
          } Features desplegadas"
        >
          <strong
            class="
              management-deliverables-quarter-value
            "
          >
            ${data.deployedFeatures}/${data.totalFeatures}
          </strong>
          <div
            class="
              management-deliverables-quarter-progress
            "
            aria-label="${data.progress}% desplegado"
          >
            <span
              style="
                width:${Math.max(
                  0,
                  Math.min(100, Number(data.progress || 0)),
                )}%;
              "
            ></span>
          </div>
          <span
            class="
              management-deliverables-quarter-label
            "
          >
            deployed
          </span>
        </div>
      </td>
    `;
  }
  /*
   * =====================================================
   * HAY PLAN SDA PERO NO FEATURES CON FECHA EN ESTE Q
   * =====================================================
   */
  if (data.sdaPlanned) {
    return `
      <td class="${classes}">
        <div
          class="
            management-deliverables-quarter-content
          "
          title="El Deliverable SDA tiene planificación en ${rcsEsc(
            quarter,
          )}, pero no hay Features con planificación temporal en este trimestre."
        >
          <span
            class="
              management-deliverables-quarter-sda
            "
          >
            Plan SDA
          </span>
        </div>
      </td>
    `;
  }
  /*
   * =====================================================
   * SIN ACTIVIDAD PARA EL TRIMESTRE
   * =====================================================
   */
  return `
    <td class="${classes}">
      <div
        class="
          management-deliverables-quarter-content
        "
      >
        <span
          class="
            management-deliverables-quarter-empty
          "
        >
          —
        </span>
      </div>
    </td>
  `;
}

function getManagementRoadmapStatusClass(row) {
  const explicitTone = String(row.statusTone || "")
    .trim()
    .toLowerCase();
  if (explicitTone) {
    return `is-${explicitTone}`;
  }
  const normalizedStatus = rcsNormalizeStatus(row.status);
  return `is-${normalizedStatus}`;
}

function renderManagementRoadmapCategory(row) {
  if (!row.category) {
    return "";
  }
  const tone =
    String(row.categoryTone || "")
      .trim()
      .toLowerCase() || "default";
  return `
    <span
      class="
        management-deliverables-category
        is-${rcsEsc(tone)}
      "
    >
      ${rcsEsc(row.category)}
    </span>
  `;
}

function getManagementRoadmapMappingUiState() {
  if (!window.RCS_MANAGEMENT_ROADMAP_MAPPING_UI) {
    window.RCS_MANAGEMENT_ROADMAP_MAPPING_UI = {
      enabled: false,
      selectedLineId: null,
    };
  }
  return window.RCS_MANAGEMENT_ROADMAP_MAPPING_UI;
}

function setManagementRoadmapMappingMode(enabled) {
  const state = getManagementRoadmapMappingUiState();
  state.enabled = enabled === true;
  if (!state.enabled) {
    state.selectedLineId = null;
    closeManagementRoadmapMappingPanel();
  }
}

function getManagementRoadmapLineById(lineId) {
  const normalizedLineId = String(lineId || "")
    .trim()
    .toLowerCase();
  if (!normalizedLineId) {
    return null;
  }
  return (
    getEffectiveManagementExecutiveLines().find(
      (line) =>
        String(line.id || "")
          .trim()
          .toLowerCase() === normalizedLineId,
    ) || null
  );
}
function groupManagementFeaturesByEpic(features) {
  const groups = new Map();

  (Array.isArray(features) ? features : []).forEach((feature) => {
    if (!feature || typeof feature !== "object") return;

    const epic =
      feature.epic && typeof feature.epic === "object" ? feature.epic : null;

    const parent =
      feature.parent && typeof feature.parent === "object"
        ? feature.parent
        : null;

    const parentType = String(
      parent?.issueType?.name || parent?.issueType || parent?.type || "",
    ).trim();

    const parentIsEpic = /^(epic|épica)$/i.test(parentType);

    const firstText = (...values) =>
      values.map((value) => String(value ?? "").trim()).find(Boolean) || "";

    const epicKey = firstText(
      feature.epicKey,
      feature.epic_key,
      feature.jiraEpicKey,
      feature.parentEpicKey,
      feature.epicId,
      feature.epic_id,
      epic?.key,
      epic?.jiraKey,
      epic?.id,
      parentIsEpic ? parent.key || parent.id : "",
    );

    const epicTitle = firstText(
      feature.epicName,
      feature.epic_name,
      feature.epicSummary,
      feature.epic_summary,
      epic?.name,
      epic?.summary,
      epic?.title,
      typeof feature.epic === "string" ? feature.epic : "",
      parentIsEpic ? parent.summary || parent.name : "",
    );

    const identifier = epicKey || epicTitle;

    // No contabilizar épicas sin identificación en JIRA.
    if (!identifier) return;

    const mapKey = identifier.toLocaleLowerCase("es");

    if (!groups.has(mapKey)) {
      groups.set(mapKey, {
        key: epicKey || identifier,
        title: epicTitle || epicKey,
        features: [],
      });
    }

    groups.get(mapKey).features.push(feature);
  });

  return [...groups.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "es"),
  );
}
function getManagementFeatureEpicKey(feature) {
  if (!feature || typeof feature !== "object") {
    return "";
  }

  const epic =
    feature.epic && typeof feature.epic === "object" ? feature.epic : null;

  const parent =
    feature.parent && typeof feature.parent === "object"
      ? feature.parent
      : null;

  const parentType = String(
    parent?.issueType?.name || parent?.issueType || parent?.type || "",
  ).trim();

  const parentIsEpic = /^(epic|épica)$/i.test(parentType);

  const firstText = (...values) =>
    values.map((value) => String(value ?? "").trim()).find(Boolean) || "";

  return firstText(
    feature.epicKey,
    feature.epic_key,
    feature.jiraEpicKey,
    feature.parentEpicKey,
    feature.epicId,
    feature.epic_id,
    epic?.key,
    epic?.jiraKey,
    epic?.id,
    parentIsEpic ? parent.key || parent.id : "",
  )
    .trim()
    .toUpperCase();
}

function managementFeatureMatchesEpicSource(feature, link) {
  const expectedEpicKey = getManagementReportLinkSourceId(link)
    .trim()
    .toUpperCase();

  if (!expectedEpicKey) {
    return false;
  }

  return getManagementFeatureEpicKey(feature) === expectedEpicKey;
}
function getManagementRoadmapProgressData(executiveLineId) {
  const links = getManagementRoadmapLinksForLine(executiveLineId);

  if (!links.length) {
    return {
      hasAssociation: false,
      linkCount: 0,
      features: [],
      featureCount: 0,
      deployedFeatures: [],
      deployedCount: 0,
      epicGroups: [],
      epicCount: 0,
      progress: null,
    };
  }

  const features = getManagementFeaturesForLine(executiveLineId);

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

  const epicGroups = groupManagementFeaturesByEpic(features);

  const featureCount = features.length;
  const deployedCount = deployedFeatures.length;

  const progress =
    featureCount > 0 ? Math.round((deployedCount / featureCount) * 100) : null;

  return {
    hasAssociation: true,
    linkCount: links.length,
    features,
    featureCount,
    deployedFeatures,
    deployedCount,
    epicGroups,
    epicCount: epicGroups.length,
    progress,
  };
}
function renderManagementRoadmapProgress(executiveLineId) {
  const progress = getManagementRoadmapProgressData(executiveLineId);

  if (!progress.hasAssociation) {
    return `
      <div
        class="
          management-deliverables-progress
          is-unmapped
        "
      >
        <span>
          Por asociar
        </span>
      </div>
    `;
  }

  if (!progress.featureCount) {
    return `
      <div
        class="
          management-deliverables-progress
          is-empty
        "
      >
        <strong>
          0
        </strong>

        <span>
          Sin Features
        </span>
      </div>
    `;
  }

  return `
    <div
      class="
        management-deliverables-progress
      "
    >
      <div
        class="
          management-deliverables-progress-head
        "
      >
        <strong>
          ${progress.deployedCount}/${progress.featureCount}
        </strong>

        <span>
          ${progress.progress}%
        </span>
      </div>

      <div
        class="
          management-deliverables-progress-bar
        "
        aria-label="${progress.progress}% desplegado"
      >
        <span
          style="
            width:${Math.max(
              0,
              Math.min(100, Number(progress.progress || 0)),
            )}%;
          "
        ></span>
      </div>

      <small>
        ${
          progress.epicCount > 0
            ? `
              ${progress.epicCount}
              ${progress.epicCount === 1 ? "épica" : "épicas"}
              ·
            `
            : ""
        }
        Features desplegadas
      </small>
    </div>
  `;
}

function renderManagementRoadmapMappingAction(executiveLineId) {
  const progress = getManagementRoadmapProgressData(executiveLineId);
  if (!progress.hasAssociation) {
    return `
      <button
        class="
          management-roadmap-mapping-btn
          is-unmapped
        "
        type="button"
        data-management-roadmap-map-line="${rcsEsc(executiveLineId)}"
      >
        <span aria-hidden="true">⚠</span>
        Sin asociar
      </button>
    `;
  }
  return `
    <button
      class="
        management-roadmap-mapping-btn
        is-mapped
      "
      type="button"
      data-management-roadmap-map-line="${rcsEsc(executiveLineId)}"
    >
      <span aria-hidden="true">✓</span>
      ${progress.linkCount}
      ${progress.linkCount === 1 ? "relación" : "relaciones"}
    </button>
  `;
}

function getManagementFeatureDisplayId(feature) {
  return String(
    feature?.key ||
      feature?.jiraKey ||
      feature?.featureKey ||
      feature?.featureId ||
      feature?.feature_id ||
      feature?.id ||
      "",
  ).trim();
}

function getManagementFeatureDisplayTitle(feature) {
  return String(
    feature?.summary ||
      feature?.title ||
      feature?.name ||
      feature?.description ||
      "Feature sin título",
  ).trim();
}

function getManagementFeatureDisplayStatus(feature) {
  const rawStatus =
    [
      feature?.deploymentStatus,
      feature?.deployment_status,
      feature?.releaseStatus,
      feature?.release_status,
      feature?.currentStatus,
      feature?.current_status,
      feature?.status,
      feature?.state,
    ].find((value) => String(value || "").trim()) || "";
  return String(rawStatus).trim() || "Sin estado";
}

function closeManagementRoadmapMappingPanel() {
  removeManagementRoadmapMappingOverlay();
  const state = getManagementRoadmapMappingEditorState();
  state.selectedLineId = null;
  state.selectedSdaId = "";
  state.selectedDeliverableIds = [];
  state.draftLinks = [];
  state.originalLinks = [];
}

function getManagementRoadmapMappingEditorState() {
  const state = getManagementRoadmapMappingUiState();
  if (!Array.isArray(state.draftLinks)) {
    state.draftLinks = [];
  }
  if (!Array.isArray(state.originalLinks)) {
    state.originalLinks = [];
  }
  if (!Array.isArray(state.selectedDeliverableIds)) {
    state.selectedDeliverableIds = [];
  }
  if (typeof state.selectedSdaId !== "string") {
    state.selectedSdaId = "";
  }
  return state;
}

function cloneManagementRoadmapLinks(links) {
  return (Array.isArray(links) ? links : []).map((link) => ({
    ...link,
  }));
}

function getManagementSdaIdFromDeliverable(deliverable) {
  return normalizeManagementSdaId(
    deliverable?.sdaId ||
      deliverable?.sdaCode ||
      deliverable?.sda ||
      deliverable?.flightId ||
      deliverable?.flight_id ||
      "",
  );
}

function getManagementDeliverableIdFromCatalogItem(deliverable) {
  return normalizeManagementDeliverableId(
    deliverable?.deliverableId ||
      deliverable?.deliverable_id ||
      deliverable?.id ||
      deliverable?.code ||
      "",
  );
}

function getManagementSdaDeliverableLabel(deliverable) {
  const deliverableId = getManagementDeliverableIdFromCatalogItem(deliverable);
  const name = String(
    deliverable?.deliverableName ||
      deliverable?.deliverable_name ||
      deliverable?.name ||
      deliverable?.title ||
      deliverable?.label ||
      deliverable?.description ||
      "",
  ).trim();
  if (deliverableId && name) {
    return `${deliverableId} · ${name}`;
  }
  return deliverableId || name || "Deliverable";
}

function getManagementRoadmapSdaSourceProducts(productId) {
  const normalizedProductId = normalizeRoadmapProduct(productId);

  const mappings = {
    /*
     * Management Roadmap:
     *
     * Franquicia es la agrupación ejecutiva.
     *
     * Sus SDA / Deliverables proceden actualmente
     * del producto técnico Panorama.
     */
    franchise: ["franchise", "panorama"],

    /*
     * Blue Buddy Global Status:
     *
     * La matriz combina capacidades propias de Blue Buddy
     * y technical enablers que viven en Panorama.
     */
    "blue-global-status": ["blue-buddy", "panorama"],
  };

  const sourceProducts = mappings[normalizedProductId] || [normalizedProductId];

  return new Set(
    sourceProducts
      .map((value) => normalizeRoadmapProduct(value))
      .filter(Boolean),
  );
}

function getManagementSdaDisplayLabel(programId, productId, sdaId) {
  const normalizedSdaId = normalizeManagementSdaId(sdaId);
  if (!normalizedSdaId) {
    return "SDA";
  }
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const allowedProducts = getManagementRoadmapSdaSourceProducts(productId);
  const flights = Array.isArray(DATA?.sdaFlights) ? DATA.sdaFlights : [];
  const flight =
    flights.find((item) => {
      const itemSdaId = normalizeManagementSdaId(
        item?.sdaId || item?.sdaCode || item?.id || item?.code || "",
      );
      if (itemSdaId !== normalizedSdaId) {
        return false;
      }
      const itemProgramId = String(item?.programId || "")
        .trim()
        .toLowerCase();
      const itemProductId = normalizeRoadmapProduct(
        item?.productId || item?.product || "",
      );
      const programMatches =
        !itemProgramId || itemProgramId === normalizedProgramId;
      const productMatches =
        !itemProductId || allowedProducts.has(itemProductId);
      return programMatches && productMatches;
    }) || null;
  const name = String(
    flight?.sdaName ||
      flight?.flightName ||
      flight?.name ||
      flight?.title ||
      flight?.label ||
      "",
  ).trim();
  const code = `SDATOOL-${normalizedSdaId}`;
  return name ? `${code} · ${name}` : code;
}

function getManagementRoadmapSdaCatalog(programId, productId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const normalizedProductId = normalizeRoadmapProduct(productId);
  const allowedProducts =
    getManagementRoadmapSdaSourceProducts(normalizedProductId);
  const source = Array.isArray(DATA?.sdaDeliverables)
    ? DATA.sdaDeliverables
    : [];
  const groups = new Map();
  source.forEach((deliverable) => {
    const itemProgramId = String(deliverable?.programId || "")
      .trim()
      .toLowerCase();
    const itemProductId = normalizeRoadmapProduct(
      deliverable?.productId || deliverable?.product || "",
    );
    /*
     * Programa.
     */
    if (itemProgramId && itemProgramId !== normalizedProgramId) {
      return;
    }
    /*
     * Producto SDA.
     *
     * No exigimos que coincida literalmente
     * con el producto ejecutivo.
     *
     * Ejemplo:
     *
     * Management Roadmap:
     * franchise
     *
     * SDA:
     * panorama
     */
    if (itemProductId && !allowedProducts.has(itemProductId)) {
      return;
    }
    const sdaId = getManagementSdaIdFromDeliverable(deliverable);
    const deliverableId =
      getManagementDeliverableIdFromCatalogItem(deliverable);
    if (!sdaId || !deliverableId) {
      return;
    }
    if (!groups.has(sdaId)) {
      groups.set(sdaId, {
        id: sdaId,
        label: getManagementSdaDisplayLabel(
          normalizedProgramId,
          normalizedProductId,
          sdaId,
        ),
        deliverables: [],
      });
    }
    const group = groups.get(sdaId);
    if (!group.deliverables.some((item) => item.id === deliverableId)) {
      group.deliverables.push({
        id: deliverableId,
        label: getManagementSdaDeliverableLabel(deliverable),
        source: deliverable,
      });
    }
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      deliverables: group.deliverables.sort((left, right) =>
        left.label.localeCompare(right.label, "es"),
      ),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));
}

function getManagementRoadmapFeaturesForLinks(links) {
  const features = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  const result = new Map();

  const registerFeature = (feature, fallbackKey) => {
    const key = String(
      feature?.jiraKey ||
        feature?.id ||
        feature?.featureId ||
        feature?.feature_id ||
        feature?.key ||
        fallbackKey,
    )
      .trim()
      .toUpperCase();

    if (!key) {
      return;
    }

    result.set(key, feature);
  };

  (Array.isArray(links) ? links : []).forEach((link) => {
    const sourceType = normalizeManagementReportSourceType(link);

    if (sourceType === "sda-deliverable") {
      features.forEach((feature, index) => {
        if (!managementFeatureMatchesDeliverable(feature, link)) {
          return;
        }

        registerFeature(
          feature,
          `${link.sdaId}-${link.deliverableId}-${index}`,
        );
      });

      return;
    }

    if (sourceType === "epic") {
      features.forEach((feature, index) => {
        if (!managementFeatureMatchesEpicSource(feature, link)) {
          return;
        }

        registerFeature(feature, `${link.sourceId}-${index}`);
      });

      return;
    }

    if (sourceType === "feature") {
      const expectedKey = getManagementReportLinkSourceId(link).toUpperCase();

      const feature = features.find(
        (item) =>
          String(getManagementFeatureDisplayId(item)).trim().toUpperCase() ===
          expectedKey,
      );

      if (feature) {
        registerFeature(feature, expectedKey);
      }
    }
  });

  return [...result.values()];
}

function getManagementRoadmapDraftProgress(links) {
  const normalizedLinks = Array.isArray(links) ? links.filter(Boolean) : [];

  /*
   * =====================================================
   * BLUE BUDDY GLOBAL STATUS
   * =====================================================
   *
   * La previsualización debe utilizar exactamente
   * el mismo ámbito geográfico que utilizará después
   * la celda de la matriz.
   *
   * Antes:
   *
   *   SDA / Deliverable
   *          ↓
   *   todas las Features asociadas
   *
   * Eso provocaba que una celda de España mostrase
   * en la previsualización Features de otros países.
   *
   * Ahora:
   *
   *   Executive Line
   *          ↓
   *   Country
   *          ↓
   *   SDA / Deliverable
   *          ↓
   *   Features de ese país
   */
  const executiveLineId = String(
    normalizedLinks.find(
      (link) => link?.executiveLineId && String(link.executiveLineId).trim(),
    )?.executiveLineId || "",
  ).trim();

  const line = executiveLineId
    ? getManagementRoadmapLineById(executiveLineId)
    : null;

  const isGlobalStatusLine =
    line &&
    normalizeRoadmapProduct(line.productId) ===
      normalizeRoadmapProduct(MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID);

  const features = isGlobalStatusLine
    ? getManagementGlobalStatusFeaturesForLinks(normalizedLinks, line.country)
    : getManagementRoadmapFeaturesForLinks(normalizedLinks);

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

  const featureCount = features.length;
  const deployedCount = deployedFeatures.length;

  return {
    features,
    deployedFeatures,
    featureCount,
    deployedCount,
    progress:
      featureCount > 0
        ? Math.round((deployedCount / featureCount) * 100)
        : null,
  };
}

function getManagementRoadmapLinkKey(link) {
  return [
    normalizeManagementSdaId(link?.sdaId),
    normalizeManagementDeliverableId(link?.deliverableId),
  ].join("::");
}

function managementRoadmapDraftHasLink(links, sdaId, deliverableId) {
  const expectedKey = getManagementRoadmapLinkKey({
    sdaId,
    deliverableId,
  });
  return (links || []).some(
    (link) => getManagementRoadmapLinkKey(link) === expectedKey,
  );
}

function removeManagementRoadmapDraftLink(sdaId, deliverableId) {
  const state = getManagementRoadmapMappingEditorState();
  const key = getManagementRoadmapLinkKey({
    sdaId,
    deliverableId,
  });
  state.draftLinks = state.draftLinks.filter(
    (link) => getManagementRoadmapLinkKey(link) !== key,
  );
}

function addManagementRoadmapDraftLink(line, sdaId, deliverableId) {
  const state = getManagementRoadmapMappingEditorState();
  if (managementRoadmapDraftHasLink(state.draftLinks, sdaId, deliverableId)) {
    return;
  }
  state.draftLinks.push({
    executiveLineId: line.id,
    programId: line.programId,
    productId: line.productId,
    country: line.country,
    sdaId: normalizeManagementSdaId(sdaId),
    deliverableId: normalizeManagementDeliverableId(deliverableId),
    active: true,
  });
}

function getManagementRoadmapLinksSignature(links) {
  return (links || [])
    .map(getManagementRoadmapLinkKey)
    .filter(Boolean)
    .sort()
    .join("|");
}

function isManagementRoadmapDraftDirty() {
  const state = getManagementRoadmapMappingEditorState();
  return (
    getManagementRoadmapLinksSignature(state.draftLinks) !==
    getManagementRoadmapLinksSignature(state.originalLinks)
  );
}
async function verifyManagementRoadmapLinksInBackground(
  programId,
  expectedLinks,
) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const expectedPersistableLinks =
    buildManagementRoadmapPersistableLinks(expectedLinks);

  const expectedSignature = getManagementRoadmapPersistenceSignature(
    expectedPersistableLinks,
  );

  try {
    const persistedConfig =
      await loadManagementRoadmapConfig(normalizedProgramId);

    const persistedLinks = buildManagementRoadmapPersistableLinks(
      persistedConfig.managementRoadmapLinks,
    );

    const persistedSignature =
      getManagementRoadmapPersistenceSignature(persistedLinks);

    if (expectedSignature !== persistedSignature) {
      throw new Error(
        "Las fuentes recuperadas no coinciden con las guardadas.",
      );
    }

    /*
     * Puede haberse producido otro guardado
     * mientras esta verificación estaba en curso.
     *
     * En ese caso no sobrescribimos DATA con
     * una fotografía anterior.
     */
    const currentLocalLinks = buildManagementRoadmapPersistableLinks(
      DATA?.managementRoadmapLinks,
    );

    const currentLocalSignature =
      getManagementRoadmapPersistenceSignature(currentLocalLinks);

    if (currentLocalSignature !== expectedSignature) {
      return;
    }

    DATA.managementRoadmapLinks = persistedLinks;

    DATA.managementRoadmapLines = buildManagementRoadmapPersistableLines(
      persistedConfig.managementRoadmapLines,
    );

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLinks: DATA.managementRoadmapLinks,

        managementRoadmapLines: DATA.managementRoadmapLines,
      });
    }

    console.info("[Management Reports] Guardado verificado en segundo plano.");
  } catch (error) {
    console.error(
      "[Management Reports] No se ha podido verificar el guardado",
      error,
    );

    const currentSignature = getManagementRoadmapPersistenceSignature(
      buildManagementRoadmapPersistableLinks(DATA?.managementRoadmapLinks),
    );

    /*
     * Sólo avisamos si el usuario sigue
     * trabajando sobre exactamente el guardado
     * que acaba de fallar.
     */
    if (currentSignature === expectedSignature) {
      window.alert(
        "El cambio se ha enviado, pero no se ha podido verificar su persistencia. Recarga la página antes de seguir modificando este entregable.",
      );
    }
  }
}
async function saveManagementRoadmapDraftLinks(programId, executiveLineId) {
  const state = getManagementRoadmapMappingEditorState();

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedLineId = String(executiveLineId || "")
    .trim()
    .toLowerCase();

  const line = getManagementRoadmapLineById(executiveLineId);

  const source = getProgramSource(normalizedProgramId);

  if (!source || !source.driveJsonUrl) {
    window.alert(
      "No existe un Web App configurado para guardar las relaciones.",
    );

    return;
  }

  const saveButton = document.querySelector(
    "[data-management-roadmap-mapping-save]",
  );

  const statusElement = document.querySelector(
    ".management-roadmap-mapping-session-note",
  );

  if (saveButton) {
    saveButton.disabled = true;

    saveButton.textContent = "Guardando...";
  }

  if (statusElement) {
    statusElement.innerHTML = `
      <strong>
        Guardando cambios
      </strong>

      <span>
        Actualizando las fuentes del informe...
      </span>
    `;
  }

  try {
    const currentLinks = Array.isArray(DATA?.managementRoadmapLinks)
      ? DATA.managementRoadmapLinks
      : [];

    const unrelatedLinks = currentLinks.filter(
      (linkItem) =>
        String(linkItem.executiveLineId || "")
          .trim()
          .toLowerCase() !== normalizedLineId,
    );

    const nextLinks = buildManagementRoadmapPersistableLinks([
      ...unrelatedLinks,
      ...cloneManagementRoadmapLinks(state.draftLinks),
    ]);

    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

    endpoint.searchParams.delete("action");

    await fetch(endpoint.toString(), {
      method: "POST",

      mode: "no-cors",

      credentials: "include",

      cache: "no-store",

      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },

      body: JSON.stringify({
        action: "save-management-roadmap-links",

        links: nextLinks,
      }),
    });

    DATA.managementRoadmapLinks = nextLinks;

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLinks: nextLinks,
      });
    }

    state.originalLinks = cloneManagementRoadmapLinks(state.draftLinks);

    closeManagementRoadmapMappingPanel();

    const reportId = String(line?.reportId || "")
      .trim()
      .toLowerCase();

    if (reportId === "pase-a-especialista") {
      renderManagementSpecialistRoadmapView(normalizedProgramId);
    } else {
      renderManagementRoadmapView(normalizedProgramId);
    }

    window.setTimeout(() => {
      void verifyManagementRoadmapLinksInBackground(
        normalizedProgramId,
        nextLinks,
      );
    }, 100);
  } catch (error) {
    console.error("[Management Reports] Error guardando fuentes", error);

    if (saveButton) {
      saveButton.disabled = false;

      saveButton.textContent = "Guardar fuentes";
    }

    if (statusElement) {
      statusElement.innerHTML = `
        <strong>
          No se han podido guardar los cambios
        </strong>

        <span>
          ${rcsEsc(error?.message || "Error desconocido.")}
        </span>
      `;
    }
  }
}

function applyManagementRoadmapPersistenceUi(root = document) {
  const note = root.querySelector?.(".management-roadmap-mapping-session-note");
  if (!note) {
    return;
  }
  const strong = note.querySelector("strong");
  const span = note.querySelector("span");
  const expectedTitle = "Guardado persistente";
  const expectedDescription =
    "Los cambios se almacenan en Management Roadmap Links.";
  /*
   * IMPORTANTE:
   *
   * Esta función debe ser idempotente.
   *
   * No utilizamos innerHTML porque esta función
   * puede ejecutarse desde un MutationObserver.
   *
   * Si modificásemos el DOM en cada ejecución,
   * provocaríamos otra mutación y entraríamos
   * en un bucle infinito.
   */
  if (strong && strong.textContent !== expectedTitle) {
    strong.textContent = expectedTitle;
  }
  if (span && span.textContent !== expectedDescription) {
    span.textContent = expectedDescription;
  }
}

function buildManagementRoadmapPersistableLinks(links) {
  const result = new Map();

  (Array.isArray(links) ? links : []).forEach((link) => {
    const executiveLineId = String(link?.executiveLineId || "").trim();

    const sourceType = normalizeManagementReportSourceType(link);

    if (!executiveLineId || !sourceType) {
      return;
    }

    const sdaId =
      sourceType === "sda-deliverable"
        ? normalizeManagementSdaId(link?.sdaId)
        : "";

    const deliverableId =
      sourceType === "sda-deliverable"
        ? normalizeManagementDeliverableId(link?.deliverableId)
        : "";

    const sourceId = getManagementReportLinkSourceId({
      ...link,
      sdaId,
      deliverableId,
    });

    if (!sourceId) {
      return;
    }

    const featureId = sourceType === "feature" ? sourceId.toUpperCase() : "";

    const staffingId = sourceType === "staffing" ? sourceId : "";

    const normalizedLink = {
      executiveLineId,
      sourceType,
      sourceId,
      sdaId,
      deliverableId,
      featureId,
      staffingId,
      active: true,
    };

    const key = [
      executiveLineId.toLowerCase(),
      sourceType,
      sourceId.toUpperCase(),
    ].join("::");

    result.set(key, normalizedLink);
  });

  return [...result.values()];
}

function installManagementRoadmapPersistenceUiObserver() {
  /*
   * Si por Live Reload o cualquier otra causa
   * ya existiese un observer anterior,
   * lo desconectamos antes de crear uno nuevo.
   */
  if (window.RCS_MANAGEMENT_ROADMAP_PERSISTENCE_OBSERVER) {
    try {
      window.RCS_MANAGEMENT_ROADMAP_PERSISTENCE_OBSERVER.disconnect();
    } catch (error) {
      console.warn(
        "[Management Roadmap] No se pudo desconectar el observer anterior.",
        error,
      );
    }
  }
  let scheduled = false;
  const applyUi = () => {
    scheduled = false;
    applyManagementRoadmapPersistenceUi(document);
  };
  const observer = new MutationObserver(() => {
    /*
     * Agrupamos todas las mutaciones del mismo
     * ciclo de render en una sola ejecución.
     *
     * Además applyManagementRoadmapPersistenceUi()
     * sólo modifica nodos cuando el texto
     * realmente es diferente.
     *
     * Esto evita el loop:
     *
     * observer
     *   -> innerHTML
     *   -> observer
     *   -> innerHTML
     *   -> ...
     */
    if (scheduled) {
      return;
    }
    scheduled = true;
    window.requestAnimationFrame(applyUi);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  window.RCS_MANAGEMENT_ROADMAP_PERSISTENCE_OBSERVER = observer;
  /*
   * Aplicación inicial.
   */
  applyManagementRoadmapPersistenceUi(document);
}
installManagementRoadmapPersistenceUiObserver();
function normalizeManagementGlobalStatusManualValue(value) {
  /*
   * Google Sheets puede devolver un porcentaje
   * introducido como 100% como valor numérico 1.
   */
  if (Number(value) === 1 && String(value).trim() !== "100") {
    return "100%";
  }

  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "N/A" || normalized === "2027" || normalized === "100%") {
    return normalized;
  }

  return "";
}

function buildManagementGlobalStatusLineId(itemId, countryId) {
  return [
    "aixbanker",
    MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID,
    String(itemId || "")
      .trim()
      .toLowerCase(),
    String(countryId || "")
      .trim()
      .toUpperCase(),
  ].join("--");
}

function buildManagementGlobalStatusSeedLines(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const lines = [];
  let order = 5000;

  MANAGEMENT_GLOBAL_STATUS_CONFIG.sections.forEach((section, sectionIndex) => {
    section.items.forEach((item, itemIndex) => {
      MANAGEMENT_GLOBAL_STATUS_CONFIG.countries.forEach((country) => {
        lines.push({
          id: buildManagementGlobalStatusLineId(item.id, country.id),
          programId: normalizedProgramId,
          productId: MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID,
          country: country.id,
          year: MANAGEMENT_GLOBAL_STATUS_YEAR,
          order: order + sectionIndex * 100 + itemIndex * 10,
          category: section.title,
          categoryTone: "info",
          title: item.label,
          status: "pending",
          statusLabel: "Pending",
          statusTone: "pending",
          comments: "",
          manualValue: "",
          active: true,
        });
      });
    });
  });

  return lines;
}

function installManagementGlobalStatusSeedLines(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const currentLines = Array.isArray(DATA?.managementRoadmapLines)
    ? DATA.managementRoadmapLines
    : [];

  const seedLines = buildManagementGlobalStatusSeedLines(normalizedProgramId);

  const result = new Map();

  currentLines.forEach((line) => {
    const key = String(line?.id || "")
      .trim()
      .toLowerCase();

    if (!key) {
      return;
    }

    result.set(key, {
      ...line,
      manualValue: normalizeManagementGlobalStatusManualValue(
        line?.manualValue,
      ),
    });
  });

  seedLines.forEach((line) => {
    const key = String(line.id || "")
      .trim()
      .toLowerCase();

    if (!result.has(key)) {
      result.set(key, line);
      return;
    }

    result.set(key, {
      ...line,
      ...result.get(key),
      manualValue: normalizeManagementGlobalStatusManualValue(
        result.get(key)?.manualValue,
      ),
    });
  });

  const mergedLines = [...result.values()];

  DATA.managementRoadmapLines = mergedLines;

  if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);
    PROGRAM_DATA_CACHE.set(normalizedProgramId, {
      ...cached,
      managementRoadmapLines: mergedLines,
    });
  }

  return mergedLines;
}

function getManagementGlobalStatusLine(programId, itemId, countryId) {
  installManagementGlobalStatusSeedLines(programId);

  const expectedId = buildManagementGlobalStatusLineId(itemId, countryId);

  return (
    Array.isArray(DATA?.managementRoadmapLines)
      ? DATA.managementRoadmapLines
      : []
  ).find(
    (line) =>
      String(line?.id || "")
        .trim()
        .toLowerCase() === expectedId.toLowerCase(),
  );
}

function managementGlobalStatusFeatureMatchesCountry(feature, countryId) {
  return (
    String(feature?.country || "HL")
      .trim()
      .toUpperCase() ===
    String(countryId || "")
      .trim()
      .toUpperCase()
  );
}

function getManagementGlobalStatusFeaturesForLinks(links, countryId) {
  const features = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  const result = new Map();

  (Array.isArray(links) ? links : []).forEach((link) => {
    features.forEach((feature, index) => {
      if (!managementFeatureMatchesDeliverable(feature, link)) {
        return;
      }

      if (!managementGlobalStatusFeatureMatchesCountry(feature, countryId)) {
        return;
      }

      const key = String(
        feature?.id ||
          feature?.featureId ||
          feature?.feature_id ||
          feature?.jiraKey ||
          `${link.sdaId}-${link.deliverableId}-${countryId}-${index}`,
      ).trim();

      result.set(key, feature);
    });
  });

  return [...result.values()];
}

function getManagementGlobalStatusProgress(line) {
  const links = (getManagementRoadmapLinksForLine(line?.id) || []).filter(
    (link) => link?.active !== false,
  );

  const features = getManagementGlobalStatusFeaturesForLinks(
    links,
    line?.country,
  );

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

  return {
    links,
    features,
    featureCount: features.length,
    deployedCount: deployedFeatures.length,
    progress:
      features.length > 0
        ? Math.round((deployedFeatures.length / features.length) * 100)
        : null,
    manualValue: normalizeManagementGlobalStatusManualValue(line?.manualValue),
  };
}
function getManagementGlobalStatusUiState() {
  if (!window.RCS_MANAGEMENT_GLOBAL_STATUS_UI) {
    window.RCS_MANAGEMENT_GLOBAL_STATUS_UI = {
      editMode: false,
      saving: false,
      draftManualValues: {},
      lastSavedAt: "",
    };
  }

  return window.RCS_MANAGEMENT_GLOBAL_STATUS_UI;
}

function beginManagementGlobalStatusConfiguration(programId) {
  if (!rcsCanEdit(programId)) {
    return;
  }

  installManagementGlobalStatusSeedLines(programId);

  const state = getManagementGlobalStatusUiState();

  state.editMode = true;
  state.saving = false;
  state.draftManualValues = {};

  getEffectiveManagementExecutiveLines()
    .filter(
      (line) =>
        normalizeRoadmapProduct(line.productId) ===
        normalizeRoadmapProduct(MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID),
    )
    .forEach((line) => {
      state.draftManualValues[line.id] =
        normalizeManagementGlobalStatusManualValue(line.manualValue);
    });

  renderManagementGlobalStatusView(programId);
}

function cancelManagementGlobalStatusConfiguration(programId) {
  const state = getManagementGlobalStatusUiState();

  state.editMode = false;
  state.saving = false;
  state.draftManualValues = {};

  renderManagementGlobalStatusView(programId);
}

function getManagementGlobalStatusDraftManualValue(line) {
  const state = getManagementGlobalStatusUiState();

  if (
    state.editMode &&
    Object.prototype.hasOwnProperty.call(
      state.draftManualValues,
      String(line?.id || ""),
    )
  ) {
    return normalizeManagementGlobalStatusManualValue(
      state.draftManualValues[String(line.id)],
    );
  }

  return normalizeManagementGlobalStatusManualValue(line?.manualValue);
}

function setManagementGlobalStatusDraftManualValue(lineId, value) {
  const state = getManagementGlobalStatusUiState();

  if (!state.editMode) {
    return;
  }

  const normalizedLineId = String(lineId || "").trim();

  if (!normalizedLineId) {
    return;
  }

  state.draftManualValues[normalizedLineId] =
    normalizeManagementGlobalStatusManualValue(value);
}
async function loadManagementRoadmapConfig(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const source = getProgramSource(normalizedProgramId);

  if (!source || !source.driveJsonUrl) {
    throw new Error(
      "No existe un Web App configurado para leer la configuración del Roadmap.",
    );
  }

  if (typeof loadJsonp !== "function") {
    throw new Error("No está disponible la función loadJsonp.");
  }

  const endpoint = new URL(source.driveJsonUrl, window.location.href);

  endpoint.searchParams.delete("dataset");
  endpoint.searchParams.delete("itemId");
  endpoint.searchParams.delete("action");

  endpoint.searchParams.set("action", "management-roadmap-config");

  const payload = await loadJsonp(endpoint.toString(), {
    timeoutMs: 25000,
    retries: 1,
    cacheBust: true,
  });

  if (!payload || payload.ok === false) {
    throw new Error(
      payload?.error ||
        "No se ha podido leer la configuración persistida del Roadmap.",
    );
  }

  return {
    managementRoadmapLines: Array.isArray(payload.managementRoadmapLines)
      ? payload.managementRoadmapLines
      : [],

    managementRoadmapLinks: Array.isArray(payload.managementRoadmapLinks)
      ? payload.managementRoadmapLinks
      : [],

    generatedAt: String(payload.generatedAt || ""),
  };
}
function getManagementGlobalStatusPersistenceSignature(lines) {
  return (Array.isArray(lines) ? lines : [])
    .filter(
      (line) =>
        normalizeRoadmapProduct(line?.productId) ===
        normalizeRoadmapProduct(MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID),
    )
    .map((line) => ({
      id: String(line?.id || "")
        .trim()
        .toLowerCase(),

      manualValue: normalizeManagementGlobalStatusManualValue(
        line?.manualValue,
      ),
    }))
    .filter((line) => line.id)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((line) => JSON.stringify(line))
    .join("|");
}
async function saveManagementGlobalStatusConfiguration(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!rcsCanEdit(normalizedProgramId)) {
    return;
  }

  const state = getManagementGlobalStatusUiState();

  if (!state.editMode || state.saving) {
    return;
  }

  const source = getProgramSource(normalizedProgramId);

  if (!source || !source.driveJsonUrl) {
    window.alert(
      "No existe un Web App configurado para guardar el Global Status.",
    );
    return;
  }

  installManagementGlobalStatusSeedLines(normalizedProgramId);

  /*
   * =====================================================
   * 45 FILAS CANÓNICAS
   * =====================================================
   *
   * Partimos siempre del seed actual.
   *
   * De esta forma una versión antigua no puede dejar
   * residuos en la Spreadsheet.
   */
  const seedLines = buildManagementGlobalStatusSeedLines(normalizedProgramId);

  const currentLines = Array.isArray(DATA?.managementRoadmapLines)
    ? DATA.managementRoadmapLines
    : [];

  const currentById = new Map(
    currentLines.map((line) => [
      String(line?.id || "")
        .trim()
        .toLowerCase(),
      line,
    ]),
  );

  const globalStatusLines = buildManagementRoadmapPersistableLines(
    seedLines.map((seedLine) => {
      const key = String(seedLine.id || "")
        .trim()
        .toLowerCase();

      const currentLine = currentById.get(key) || {};

      const hasDraftValue = Object.prototype.hasOwnProperty.call(
        state.draftManualValues,
        seedLine.id,
      );

      return {
        ...seedLine,
        ...currentLine,

        /*
         * Mantenemos siempre identidad y estructura
         * del seed actual.
         */
        id: seedLine.id,
        programId: seedLine.programId,
        productId: seedLine.productId,
        country: seedLine.country,
        year: seedLine.year,
        order: seedLine.order,
        category: seedLine.category,
        categoryTone: seedLine.categoryTone,
        title: seedLine.title,
        active: true,

        manualValue: hasDraftValue
          ? normalizeManagementGlobalStatusManualValue(
              state.draftManualValues[seedLine.id],
            )
          : normalizeManagementGlobalStatusManualValue(currentLine.manualValue),
      };
    }),
  );

  /*
   * Protección: la configuración actual
   * debe contener exactamente 45 celdas.
   */
  if (globalStatusLines.length !== 45) {
    console.error(
      "[Blue Buddy Global Status] Número inesperado de líneas",
      globalStatusLines,
    );

    window.alert(
      `La configuración contiene ${globalStatusLines.length} celdas en lugar de 45.`,
    );

    return;
  }

  state.saving = true;

  const saveButton = document.querySelector(
    "[data-management-global-status-save]",
  );

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";
  }

  try {
    /*
     * =====================================================
     * WRITE
     * =====================================================
     */
    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");
    endpoint.searchParams.delete("_");
    endpoint.searchParams.delete("dataset");
    endpoint.searchParams.delete("action");

    await fetch(endpoint.toString(), {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      cache: "no-store",

      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },

      body: JSON.stringify({
        action: "save-management-global-status-lines",

        lines: globalStatusLines,
      }),
    });

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    /*
     * =====================================================
     * READ BACK DIRECTO
     * =====================================================
     */
    const persistedConfig =
      await loadManagementRoadmapConfig(normalizedProgramId);

    const persistedLines = buildManagementRoadmapPersistableLines(
      persistedConfig.managementRoadmapLines,
    );

    const persistedGlobalStatus = persistedLines.filter(
      (line) =>
        normalizeRoadmapProduct(line?.productId) ===
        normalizeRoadmapProduct(MANAGEMENT_GLOBAL_STATUS_PRODUCT_ID),
    );

    /*
     * =====================================================
     * VALIDACIÓN ESTRUCTURAL
     * =====================================================
     */
    if (persistedGlobalStatus.length !== 45) {
      console.error("[Blue Buddy Global Status] Persistencia incorrecta", {
        expected: 45,
        persisted: persistedGlobalStatus.length,
        persistedGlobalStatus,
      });

      throw new Error(
        `Se esperaban 45 celdas de Global Status y se han recuperado ${persistedGlobalStatus.length}.`,
      );
    }

    /*
     * =====================================================
     * VALIDACIÓN DE VALORES
     * =====================================================
     */
    const expectedSignature =
      getManagementGlobalStatusPersistenceSignature(globalStatusLines);

    const persistedSignature = getManagementGlobalStatusPersistenceSignature(
      persistedGlobalStatus,
    );

    if (expectedSignature !== persistedSignature) {
      console.error("[Blue Buddy Global Status] Valores manuales distintos", {
        expectedGlobalStatus: globalStatusLines.map((line) => ({
          id: line.id,
          manualValue: line.manualValue,
        })),

        persistedGlobalStatus: persistedGlobalStatus.map((line) => ({
          id: line.id,
          manualValue: line.manualValue,
        })),
      });

      throw new Error(
        "Los valores manuales recuperados no coinciden con los guardados.",
      );
    }

    /*
     * =====================================================
     * DATA LOCAL
     * =====================================================
     */
    DATA.managementRoadmapLines = persistedLines;

    DATA.managementRoadmapLinks = buildManagementRoadmapPersistableLinks(
      persistedConfig.managementRoadmapLinks,
    );

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLines: DATA.managementRoadmapLines,

        managementRoadmapLinks: DATA.managementRoadmapLinks,
      });
    }

    /*
     * =====================================================
     * FIN EDICIÓN
     * =====================================================
     */
    state.editMode = false;
    state.saving = false;
    state.draftManualValues = {};
    state.lastSavedAt = new Date().toISOString();

    renderManagementGlobalStatusView(normalizedProgramId);
  } catch (error) {
    console.error(
      "[Blue Buddy Global Status] Error guardando configuración",
      error,
    );

    state.saving = false;

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Guardar cambios";
    }

    window.alert(
      error?.message ||
        "No se ha podido guardar la configuración del Global Status.",
    );
  }
}
function renderManagementGlobalStatusCell(programId, line) {
  const uiState = getManagementGlobalStatusUiState();
  const editMode = uiState.editMode && rcsCanEdit(programId);

  const progress = getManagementGlobalStatusProgress(line);
  const hasLinks = progress.links.length > 0;

  const manualValue = getManagementGlobalStatusDraftManualValue(line);

  /*
   * =====================================================
   * FEATURES
   * =====================================================
   */
  if (hasLinks && progress.featureCount > 0) {
    const cardClass =
      progress.progress === 100
        ? "is-complete"
        : progress.progress >= 1
          ? "is-warning"
          : "";

    return `
      <div class="management-global-status-cell-card ${rcsEsc(cardClass)}">
        <div class="management-global-status-progress">
          <strong>${rcsEsc(progress.progress)}%</strong>
          <span>avance</span>
        </div>

        <div class="management-global-status-subline">
          <strong>
            ${rcsEsc(progress.deployedCount)}/${rcsEsc(progress.featureCount)}
          </strong>
          Features desplegadas
        </div>

        ${
          editMode
            ? `
              <div class="management-global-status-subline">
                <strong>${rcsEsc(progress.links.length)}</strong>
                asociación(es) SDA / deliverable
              </div>

              <div class="management-global-status-actions">
                <button
                  class="management-roadmap-action"
                  type="button"
                  data-management-global-status-links
                  data-line-id="${rcsEsc(line.id)}"
                >
                  Gestionar SDA
                </button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  /*
   * =====================================================
   * SDA ASOCIADA PERO SIN FEATURES
   * =====================================================
   */
  if (hasLinks && progress.featureCount === 0) {
    return `
      <div class="management-global-status-cell-card is-warning">
        <div class="management-global-status-manual">
          Sin Features
        </div>

        ${
          editMode
            ? `
              <div class="management-global-status-subline">
                Hay una asociación SDA / deliverable,
                pero no se han encontrado Features para este país.
              </div>

              <div class="management-global-status-actions">
                <button
                  class="management-roadmap-action"
                  type="button"
                  data-management-global-status-links
                  data-line-id="${rcsEsc(line.id)}"
                >
                  Revisar SDA
                </button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  /*
   * =====================================================
   * READ ONLY
   * =====================================================
   */
  if (!editMode) {
    return `
      <div class="management-global-status-cell-card is-empty">
        ${
          manualValue
            ? `
              <div class="management-global-status-manual">
                ${rcsEsc(manualValue)}
              </div>
            `
            : `
              <div class="management-global-status-empty-label">
                —
              </div>
            `
        }
      </div>
    `;
  }

  /*
   * =====================================================
   * CONFIGURACIÓN
   * =====================================================
   */
  return `
    <div class="management-global-status-cell-card is-empty">
      <div class="management-global-status-empty-label">
        Sin SDA asociada
      </div>

      <div class="management-global-status-subline">
        Asocia una SDA o informa un valor manual.
      </div>

      <div class="management-global-status-actions">
        <select
          class="management-global-status-select"
          data-management-global-status-manual
          data-line-id="${rcsEsc(line.id)}"
        >
          <option value="">Seleccionar…</option>

          ${MANAGEMENT_GLOBAL_STATUS_MANUAL_VALUES.map(
            (value) => `
              <option
                value="${rcsEsc(value)}"
                ${manualValue === value ? "selected" : ""}
              >
                ${rcsEsc(value)}
              </option>
            `,
          ).join("")}
        </select>

        <button
          class="management-roadmap-action"
          type="button"
          data-management-global-status-links
          data-line-id="${rcsEsc(line.id)}"
        >
          Relacionar SDA
        </button>
      </div>
    </div>
  `;
}

function renderManagementGlobalStatusView(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  installManagementGlobalStatusSeedLines(normalizedProgramId);

  const uiState = getManagementGlobalStatusUiState();
  const canEdit = rcsCanEdit(normalizedProgramId);
  const editMode = canEdit && uiState.editMode === true;

  setHead(
    "Blue Buddy Global Status",
    "Executive snapshot de Blue Buddy por país, capability y avance real.",
    normalizedProgramId === "aixbanker" ? "AIxBanker" : "Management Reports",
  );

  view.innerHTML = "";
  view.append(tpl("#management-global-status-template"));

  const board = document.querySelector("#managementGlobalStatusBoard");

  if (!board) {
    return;
  }

  const configurationActions = canEdit
    ? editMode
      ? `
        <div
          style="
            display:flex;
            align-items:center;
            justify-content:flex-end;
            flex-wrap:wrap;
            gap:8px;
          "
        >
          <span class="management-global-status-meta">
            Modo configuración
          </span>

          <button
            class="management-report-card-link"
            type="button"
            data-management-global-status-cancel
          >
            Cancelar
          </button>

          <button
            class="management-report-card-link"
            type="button"
            data-management-global-status-save
            style="
              background:var(--blue);
              border-color:var(--blue);
              color:#ffffff;
            "
          >
            Guardar cambios
          </button>
        </div>
      `
      : `
        <div
          style="
            display:flex;
            align-items:center;
            justify-content:flex-end;
            flex-wrap:wrap;
            gap:8px;
          "
        >
          <span class="management-global-status-meta">
            Solo lectura
          </span>

          <button
            class="management-report-card-link"
            type="button"
            data-management-global-status-configure
          >
            ⚙ Configurar
          </button>
        </div>
      `
    : `
      <span class="management-global-status-meta">
        Solo lectura
      </span>
    `;

  board.innerHTML = `
    <section class="management-global-status-shell">
      <div class="management-global-status-hero">
        <div>
          <h3>
            ${rcsEsc(MANAGEMENT_GLOBAL_STATUS_CONFIG.title)}
            — ${rcsEsc(MANAGEMENT_GLOBAL_STATUS_CONFIG.subtitle)}
          </h3>

          <p>
            ${
              editMode
                ? `
                  Configura las asociaciones SDA y los valores manuales de la matriz.
                  Los valores N/A / 2027 no se persistirán hasta pulsar
                  <strong>Guardar cambios</strong>.
                `
                : `
                  La matriz calcula automáticamente el avance mediante
                  <strong>SDA → Deliverable → Feature</strong>.
                `
            }
          </p>
        </div>

        ${configurationActions}
      </div>

      <div class="management-global-status-table-wrap">
        <table class="management-global-status-table">
          <thead>
            <tr>
              <th class="management-global-status-stub"></th>

              ${MANAGEMENT_GLOBAL_STATUS_CONFIG.countries
                .map(
                  (country) => `
                    <th class="management-global-status-country-head">
                      <span class="management-global-status-country-flag">
                        ${rcsEsc(country.flag)}
                      </span>

                      <span class="management-global-status-country-name">
                        ${rcsEsc(country.label)}
                      </span>
                    </th>
                  `,
                )
                .join("")}
            </tr>

            <tr>
              <th class="management-global-status-target-label">
                Target users already deployed
              </th>

              ${MANAGEMENT_GLOBAL_STATUS_CONFIG.countries
                .map(
                  (country) => `
                    <th class="management-global-status-target-cell">
                      ${rcsEsc(country.deployedTarget)}
                    </th>
                  `,
                )
                .join("")}
            </tr>

            <tr>
              <th class="management-global-status-target-label">
                Expected target
              </th>

              ${MANAGEMENT_GLOBAL_STATUS_CONFIG.countries
                .map(
                  (country) => `
                    <th class="management-global-status-target-cell">
                      ${rcsEsc(country.expectedTarget)}
                    </th>
                  `,
                )
                .join("")}
            </tr>
          </thead>

          <tbody>
            ${MANAGEMENT_GLOBAL_STATUS_CONFIG.sections
              .map(
                (section) => `
                  <tr class="management-global-status-section-row">
                    <th
                      colspan="${
                        1 + MANAGEMENT_GLOBAL_STATUS_CONFIG.countries.length
                      }"
                    >
                      ${rcsEsc(section.title)}

                      ${
                        section.badge
                          ? `
                            <span class="management-global-status-section-badge">
                              ${rcsEsc(section.badge)}
                            </span>
                          `
                          : ""
                      }
                    </th>
                  </tr>

                  ${section.items
                    .map(
                      (item) => `
                        <tr>
                          <th class="management-global-status-item-label">
                            <span class="management-global-status-item-title">
                              ${rcsEsc(item.label)}
                            </span>
                          </th>

                          ${MANAGEMENT_GLOBAL_STATUS_CONFIG.countries
                            .map((country) => {
                              const line = getManagementGlobalStatusLine(
                                normalizedProgramId,
                                item.id,
                                country.id,
                              );

                              return `
                                <td class="management-global-status-cell">
                                  ${renderManagementGlobalStatusCell(
                                    normalizedProgramId,
                                    line,
                                  )}
                                </td>
                              `;
                            })
                            .join("")}
                        </tr>
                      `,
                    )
                    .join("")}
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="management-global-status-footnote">
        ${
          editMode
            ? `
              Modo configuración activo.
              Las asociaciones SDA se gestionan desde cada celda.
              Los valores manuales se guardan conjuntamente con
              <strong>Guardar cambios</strong>.
            `
            : `
              Vista de consulta.
              El porcentaje muestra Features desplegadas sobre el total
              de Features asociadas a cada capability y país.
            `
        }
      </div>
    </section>
  `;

  const backButton = document.querySelector("#managementGlobalStatusBackBtn");

  if (backButton) {
    backButton.addEventListener("click", () => {
      uiState.editMode = false;
      uiState.draftManualValues = {};

      route(`projects/${normalizedProgramId}/live`);
    });
  }

  const configureButton = document.querySelector(
    "[data-management-global-status-configure]",
  );

  if (configureButton) {
    configureButton.addEventListener("click", () => {
      beginManagementGlobalStatusConfiguration(normalizedProgramId);
    });
  }

  const cancelButton = document.querySelector(
    "[data-management-global-status-cancel]",
  );

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      cancelManagementGlobalStatusConfiguration(normalizedProgramId);
    });
  }

  const saveButton = document.querySelector(
    "[data-management-global-status-save]",
  );

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      await saveManagementGlobalStatusConfiguration(normalizedProgramId);
    });
  }

  if (!editMode) {
    return;
  }

  document
    .querySelectorAll("[data-management-global-status-links]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const lineId = String(button.dataset.lineId || "").trim();

        if (!lineId) {
          return;
        }

        renderManagementRoadmapMappingPanel(normalizedProgramId, lineId);
      });
    });

  document
    .querySelectorAll("[data-management-global-status-manual]")
    .forEach((select) => {
      select.addEventListener("change", () => {
        const lineId = String(select.dataset.lineId || "").trim();

        if (!lineId) {
          return;
        }

        setManagementGlobalStatusDraftManualValue(lineId, select.value);
      });
    });
}
function getManagementRoadmapPersistenceSignature(links) {
  return [
    ...new Set(
      (Array.isArray(links) ? links : [])
        .filter((link) => isManagementRoadmapLinkActive(link))
        .map((link) => {
          const executiveLineId = String(link?.executiveLineId || "")
            .trim()
            .toLowerCase();

          const sourceType = normalizeManagementReportSourceType(link);

          const sourceId = getManagementReportLinkSourceId(link)
            .trim()
            .toUpperCase();

          if (!executiveLineId || !sourceType || !sourceId) {
            return "";
          }

          return [executiveLineId, sourceType, sourceId].join("::");
        })
        .filter(Boolean),
    ),
  ]
    .sort()
    .join("|");
}

function removeManagementRoadmapMappingOverlay() {
  const overlay = document.querySelector("#managementRoadmapMappingOverlay");
  if (overlay) {
    overlay.remove();
  }
}
function getManagementReportFeatureCatalog(line) {
  const source = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  const allowedProducts = getManagementRoadmapSdaSourceProducts(line.productId);

  return source
    .filter((feature) => {
      const productId = normalizeRoadmapProduct(
        feature?.productId || feature?.product || "",
      );

      if (productId && !allowedProducts.has(productId)) {
        return false;
      }

      const country = String(feature?.country || "")
        .trim()
        .toUpperCase();

      if (
        country &&
        line.country &&
        country !== String(line.country).trim().toUpperCase()
      ) {
        return false;
      }

      return Boolean(getManagementFeatureDisplayId(feature));
    })
    .sort((left, right) =>
      getManagementFeatureDisplayTitle(left).localeCompare(
        getManagementFeatureDisplayTitle(right),
        "es",
      ),
    );
}
function getManagementReportEpicCatalog(line) {
  const features = getManagementReportFeatureCatalog(line);

  return groupManagementFeaturesByEpic(features)
    .map((epic) => {
      const sourceFeature = epic.features.find(Boolean) || {};

      const epicObject =
        sourceFeature.epic && typeof sourceFeature.epic === "object"
          ? sourceFeature.epic
          : null;

      const parent =
        sourceFeature.parent && typeof sourceFeature.parent === "object"
          ? sourceFeature.parent
          : null;

      const description = String(
        sourceFeature.epicDescription ||
          sourceFeature.epic_description ||
          epicObject?.description ||
          parent?.description ||
          "",
      ).trim();

      const deployed = epic.features.filter(isManagementFeatureDeployed).length;

      return {
        id: String(epic.key || "")
          .trim()
          .toUpperCase(),

        title: String(epic.title || epic.key || "").trim(),

        description: description || "Sin descripción disponible.",

        featureCount: epic.features.length,

        deployedCount: deployed,

        progress: epic.features.length
          ? Math.round((deployed / epic.features.length) * 100)
          : null,

        features: epic.features,
      };
    })
    .filter((epic) => Boolean(epic.id));
}
function getManagementReportStaffingCatalog(programId, line) {
  const product = getStaffingProductData(programId, line.productId);

  if (!product || !Array.isArray(product.periods)) {
    return [];
  }

  const snapshot = getManagementRoadmapSnapshotState();

  const year = Number(snapshot.year || line.year);

  const quarter = snapshot.quarter || "ALL";

  const periods = product.periods.filter(
    (period) =>
      Number(period.year) === year &&
      (quarter === "ALL" ||
        String(period.quarter).trim().toUpperCase() === quarter),
  );

  const result = new Map();

  periods.forEach((period) => {
    (period.scrums || []).forEach((scrum) => {
      const id = String(scrum.name || "").trim();

      if (!id) {
        return;
      }

      if (!result.has(id)) {
        result.set(id, {
          id,
          name: id,
          periods: [],
          totalFte: 0,
          assignedFte: 0,
          openFte: 0,
          positions: 0,
        });
      }

      const item = result.get(id);

      item.periods.push(String(period.period || ""));

      item.totalFte += Number(scrum.totalFte || 0);

      item.assignedFte += Number(scrum.assignedFte || 0);

      item.openFte += Number(scrum.openFte || 0);

      item.positions += Number(scrum.positions || 0);
    });
  });

  return [...result.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "es"),
  );
}

function getManagementReportSourceLinkKey(link) {
  return [
    normalizeManagementReportSourceType(link),
    getManagementReportLinkSourceId(link),
  ].join("::");
}

function managementReportDraftHasSource(links, candidate) {
  const key = getManagementReportSourceLinkKey(candidate);

  return (links || []).some(
    (link) => getManagementReportSourceLinkKey(link) === key,
  );
}

function toggleManagementReportDraftSource(line, candidate, checked) {
  const state = getManagementRoadmapMappingEditorState();

  const key = getManagementReportSourceLinkKey(candidate);

  if (checked) {
    if (!managementReportDraftHasSource(state.draftLinks, candidate)) {
      state.draftLinks.push({
        executiveLineId: line.id,
        programId: line.programId,
        productId: line.productId,
        country: line.country,
        ...candidate,
        active: true,
      });
    }

    return;
  }

  state.draftLinks = state.draftLinks.filter(
    (link) => getManagementReportSourceLinkKey(link) !== key,
  );
}

function getManagementReportSourceDescription(value) {
  const text = String(value || "").trim();

  return text || "Sin descripción disponible.";
}

async function renderManagementReportSourcesPanel(
  programId,
  executiveLineId,
  options = {},
) {
  const line = getManagementRoadmapLineById(executiveLineId);

  if (!line) {
    return;
  }

  const state = getManagementRoadmapMappingEditorState();

  const sameLine = state.selectedLineId === executiveLineId;

  if (!options.preserveDraft || !sameLine) {
    const existing = getManagementReportLinksForLine(executiveLineId);

    state.selectedLineId = executiveLineId;

    state.originalLinks = cloneManagementRoadmapLinks(existing);

    state.draftLinks = cloneManagementRoadmapLinks(existing);

    state.reportSourceTab = "sda";
  }

  state.reportSourceTab = String(options.tab || state.reportSourceTab || "sda");

  removeManagementRoadmapMappingOverlay();

  if (!STAFFING_DATA_CACHE.has(String(programId).trim().toLowerCase())) {
    try {
      await loadStaffingData(programId);
    } catch (error) {
      console.warn("[Management Reports] Staffing no disponible", error);
    }
  }

  const sdaCatalog = getManagementRoadmapSdaCatalog(programId, line.productId);

  const featureCatalog = getManagementReportFeatureCatalog(line);

  const epicCatalog = getManagementReportEpicCatalog(line);

  const staffingCatalog = getManagementReportStaffingCatalog(programId, line);

  const preview = getManagementRoadmapDraftProgress(state.draftLinks);

  const selectedSdaCount = state.draftLinks.filter(
    (link) => normalizeManagementReportSourceType(link) === "sda-deliverable",
  ).length;

  const selectedEpicCount = state.draftLinks.filter(
    (link) => normalizeManagementReportSourceType(link) === "epic",
  ).length;

  const selectedFeatureCount = state.draftLinks.filter(
    (link) => normalizeManagementReportSourceType(link) === "feature",
  ).length;

  const selectedStaffingCount = state.draftLinks.filter(
    (link) => normalizeManagementReportSourceType(link) === "staffing",
  ).length;

  const overlay = document.createElement("div");

  overlay.id = "managementRoadmapMappingOverlay";

  overlay.className = "management-roadmap-mapping-overlay";

  const renderSda = () =>
    sdaCatalog
      .map((sda) => {
        const deliverables = sda.deliverables
          .map((item) => {
            const candidate = {
              sourceType: "sda-deliverable",

              sourceId: `${sda.id}::${item.id}`,

              sdaId: sda.id,

              deliverableId: item.id,

              featureId: "",

              staffingId: "",
            };

            const checked = managementReportDraftHasSource(
              state.draftLinks,
              candidate,
            );

            const description = getManagementReportSourceDescription(
              item.source?.description ||
                item.source?.goal ||
                item.source?.rationale,
            );

            const searchText = normalizeManagementReportSearchText(
              [sda.id, sda.label, item.id, item.label, description].join(" "),
            );

            return `
                <label
                  class="management-report-source-card"
                  data-management-report-search-item
                  data-search-type="sda"
                  data-search-text="${rcsEsc(searchText)}"
                >
                  <input
                    type="checkbox"
                    data-management-report-source-toggle
                    data-source-type="sda-deliverable"
                    data-source-id="${rcsEsc(candidate.sourceId)}"
                    data-sda-id="${rcsEsc(sda.id)}"
                    data-deliverable-id="${rcsEsc(item.id)}"
                    ${checked ? "checked" : ""}
                  />

                  <span>
                    <strong>
                      ${rcsEsc(item.label)}
                    </strong>

                    <small
                      class="management-report-source-identifiers"
                    >
                      SDA ${rcsEsc(sda.id)}
                      ·
                      ${rcsEsc(item.id)}
                    </small>

                    <small>
                      ${rcsEsc(description)}
                    </small>
                  </span>
                </label>
              `;
          })
          .join("");

        return `
          <section
            class="management-report-source-group"
            data-management-report-search-group
          >
            <h4>
              ${rcsEsc(sda.label)}
            </h4>

            <small
              class="management-report-source-group-id"
            >
              SDA ${rcsEsc(sda.id)}
            </small>

            ${deliverables}
          </section>
        `;
      })
      .join("");

  const renderEpics = () =>
    epicCatalog
      .map((epic) => {
        const candidate = {
          sourceType: "epic",
          sourceId: epic.id,
          sdaId: "",
          deliverableId: "",
          featureId: "",
          staffingId: "",
        };

        const checked = managementReportDraftHasSource(
          state.draftLinks,
          candidate,
        );

        const searchText = normalizeManagementReportSearchText(
          [epic.id, epic.title, epic.description].join(" "),
        );

        return `
          <label
            class="management-report-source-card"
            data-management-report-search-item
            data-search-type="epic"
            data-search-text="${rcsEsc(searchText)}"
          >
            <input
              type="checkbox"
              data-management-report-source-toggle
              data-source-type="epic"
              data-source-id="${rcsEsc(epic.id)}"
              ${checked ? "checked" : ""}
            />

            <span>
              <strong>
                ${rcsEsc(epic.id)}
                ·
                ${rcsEsc(epic.title)}
              </strong>

              <small>
                ${rcsEsc(epic.description)}
              </small>

              <em>
                ${epic.featureCount}
                ${epic.featureCount === 1 ? "feature" : "features"}
                ·
                ${epic.deployedCount}
                deployed
                ·
                ${epic.progress === null ? "—" : `${epic.progress}%`}
              </em>
            </span>
          </label>
        `;
      })
      .join("");

  const renderFeatures = () =>
    featureCatalog
      .map((feature) => {
        const id = getManagementFeatureDisplayId(feature);

        const title = getManagementFeatureDisplayTitle(feature);

        const description = getManagementReportSourceDescription(
          feature.description,
        );

        const status = getManagementFeatureDisplayStatus(feature);

        const candidate = {
          sourceType: "feature",

          sourceId: id,

          sdaId: "",

          deliverableId: "",

          featureId: id,

          staffingId: "",
        };

        const checked = managementReportDraftHasSource(
          state.draftLinks,
          candidate,
        );

        const searchText = normalizeManagementReportSearchText(
          [
            id,
            title,
            description,
            status,
            feature.sdaId,
            feature.deliverableId,
            getManagementFeatureEpicKey(feature),
          ].join(" "),
        );

        return `
          <label
            class="management-report-source-card"
            data-management-report-search-item
            data-search-type="feature"
            data-search-text="${rcsEsc(searchText)}"
          >
            <input
              type="checkbox"
              data-management-report-source-toggle
              data-source-type="feature"
              data-source-id="${rcsEsc(id)}"
              data-feature-id="${rcsEsc(id)}"
              ${checked ? "checked" : ""}
            />

            <span>
              <strong>
                ${rcsEsc(id)}
                ·
                ${rcsEsc(title)}
              </strong>

              <small>
                ${rcsEsc(description)}
              </small>

              <em>
                ${rcsEsc(status)}
              </em>
            </span>
          </label>
        `;
      })
      .join("");

  const renderStaffing = () =>
    staffingCatalog
      .map((item) => {
        const candidate = {
          sourceType: "staffing",

          sourceId: item.id,

          sdaId: "",

          deliverableId: "",

          featureId: "",

          staffingId: item.id,
        };

        const checked = managementReportDraftHasSource(
          state.draftLinks,
          candidate,
        );

        return `
          <label
            class="management-report-source-card"
          >
            <input
              type="checkbox"
              data-management-report-source-toggle
              data-source-type="staffing"
              data-source-id="${rcsEsc(item.id)}"
              data-staffing-id="${rcsEsc(item.id)}"
              ${checked ? "checked" : ""}
            />

            <span>
              <strong>
                ${rcsEsc(item.name)}
              </strong>

              <small>
                ${rcsEsc(item.periods.join(", "))}
                ·
                ${item.positions}
                posiciones
                ·
                ${formatFlightDeckStaffingFte(item.totalFte)}
                FTE
                ·
                ${formatFlightDeckStaffingFte(item.openFte)}
                FTE pendientes
              </small>
            </span>
          </label>
        `;
      })
      .join("");

  const searchableTabs = ["sda", "epic", "feature"];

  const searchHtml = searchableTabs.includes(state.reportSourceTab)
    ? `
        <div
          class="management-report-source-search"
        >
          <span
            class="management-report-source-search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="${
              state.reportSourceTab === "sda"
                ? "Buscar SDA o entregable..."
                : state.reportSourceTab === "epic"
                  ? "Buscar épica por ID, nombre o descripción..."
                  : "Buscar feature por ID, nombre o descripción..."
            }"
            aria-label="${
              state.reportSourceTab === "sda"
                ? "Buscar SDA o entregable"
                : state.reportSourceTab === "epic"
                  ? "Buscar épica"
                  : "Buscar feature"
            }"
            data-management-report-source-search
          />

          <button
            type="button"
            class="management-report-source-search-clear"
            data-management-report-source-search-clear
            hidden
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        </div>

        <div
          class="management-report-source-search-result"
          data-management-report-source-search-result
        ></div>
      `
    : "";

  overlay.innerHTML = `
    <aside
      class="
        management-roadmap-mapping-panel
        management-report-source-panel
      "
      role="dialog"
      aria-modal="true"
    >
      <header
        class="management-roadmap-mapping-header"
      >
        <div>
          <span
            class="management-roadmap-mapping-eyebrow"
          >
            Configurar fuentes
          </span>

          <h2>
            ${rcsEsc(line.title)}
          </h2>

          <p>
            Selecciona la información que
            alimentará este entregable.
          </p>
        </div>

        <button
          class="management-roadmap-mapping-close"
          type="button"
          data-management-roadmap-mapping-cancel
        >
          ×
        </button>
      </header>

      <div
        class="management-report-source-tabs"
      >
        <button
          class="${state.reportSourceTab === "sda" ? "is-active" : ""}"
          type="button"
          data-management-report-source-tab="sda"
        >
          SDA
          <span>${selectedSdaCount}</span>
        </button>

        <button
          class="${state.reportSourceTab === "epic" ? "is-active" : ""}"
          type="button"
          data-management-report-source-tab="epic"
        >
          Épicas
          <span>${selectedEpicCount}</span>
        </button>

        <button
          class="${state.reportSourceTab === "feature" ? "is-active" : ""}"
          type="button"
          data-management-report-source-tab="feature"
        >
          Features
          <span>${selectedFeatureCount}</span>
        </button>

        <button
          class="${state.reportSourceTab === "staffing" ? "is-active" : ""}"
          type="button"
          data-management-report-source-tab="staffing"
        >
          Staffing
          <span>${selectedStaffingCount}</span>
        </button>
      </div>

      <div
        class="management-roadmap-mapping-body"
      >
        <section
          class="management-report-source-picker"
        >
          ${searchHtml}

          <div
            class="management-report-source-list"
          >
            ${
              state.reportSourceTab === "sda"
                ? renderSda()
                : state.reportSourceTab === "epic"
                  ? renderEpics()
                  : state.reportSourceTab === "feature"
                    ? renderFeatures()
                    : renderStaffing()
            }
          </div>

          <div
            class="management-report-source-search-empty"
            data-management-report-source-search-empty
            hidden
          >
            No hay resultados para esta búsqueda.
          </div>
        </section>

        <section
          class="management-report-source-preview"
        >
          <h3>
            Previsualización
          </h3>

          <div
            class="management-roadmap-feature-summary"
          >
            <article>
              <span>Features</span>
              <strong>
                ${preview.featureCount}
              </strong>
            </article>

            <article>
              <span>Deployed</span>
              <strong>
                ${preview.deployedCount}
              </strong>
            </article>

            <article>
              <span>Avance</span>
              <strong>
                ${preview.progress === null ? "—" : `${preview.progress}%`}
              </strong>
            </article>
          </div>

          <div
            class="management-report-source-preview-counts"
          >
            <span>
              SDA
              <strong>
                ${selectedSdaCount}
              </strong>
            </span>

            <span>
              Épicas
              <strong>
                ${selectedEpicCount}
              </strong>
            </span>

            <span>
              Features directas
              <strong>
                ${selectedFeatureCount}
              </strong>
            </span>

            <span>
              Staffing
              <strong>
                ${selectedStaffingCount}
              </strong>
            </span>
          </div>
        </section>
      </div>

      <footer
        class="management-roadmap-mapping-footer"
      >
        <div>
          <strong>
            Fuentes del informe
          </strong>

          <span>
            Los cambios se guardarán en
            Management Roadmap Links.
          </span>
        </div>

        <div
          class="management-roadmap-mapping-footer-actions"
        >
          <button
            class="ghost-button"
            type="button"
            data-management-roadmap-mapping-cancel
          >
            Cancelar
          </button>

          <button
            class="management-roadmap-mapping-save"
            type="button"
            data-management-roadmap-mapping-save
          >
            Guardar fuentes
          </button>
        </div>
      </footer>
    </aside>
  `;

  document.body.appendChild(overlay);

  overlay
    .querySelectorAll("[data-management-roadmap-mapping-cancel]")
    .forEach((button) => {
      button.addEventListener("click", closeManagementRoadmapMappingPanel);
    });

  overlay
    .querySelectorAll("[data-management-report-source-tab]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        renderManagementReportSourcesPanel(programId, executiveLineId, {
          preserveDraft: true,

          tab: button.dataset.managementReportSourceTab,
        });
      });
    });

  overlay
    .querySelectorAll("[data-management-report-source-toggle]")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const candidate = {
          sourceType: input.dataset.sourceType,

          sourceId: input.dataset.sourceId || "",

          sdaId: input.dataset.sdaId || "",

          deliverableId: input.dataset.deliverableId || "",

          featureId: input.dataset.featureId || "",

          staffingId: input.dataset.staffingId || "",
        };

        toggleManagementReportDraftSource(line, candidate, input.checked);

        renderManagementReportSourcesPanel(programId, executiveLineId, {
          preserveDraft: true,

          tab: state.reportSourceTab,
        });
      });
    });

  const searchInput = overlay.querySelector(
    "[data-management-report-source-search]",
  );

  const clearSearchButton = overlay.querySelector(
    "[data-management-report-source-search-clear]",
  );

  const searchResult = overlay.querySelector(
    "[data-management-report-source-search-result]",
  );

  const emptySearch = overlay.querySelector(
    "[data-management-report-source-search-empty]",
  );

  const applySearch = () => {
    if (!searchInput) {
      return;
    }

    const query = normalizeManagementReportSearchText(searchInput.value);

    let visibleItems = 0;

    const items = overlay.querySelectorAll(
      "[data-management-report-search-item]",
    );

    items.forEach((item) => {
      const searchText = normalizeManagementReportSearchText(
        item.dataset.searchText,
      );

      const visible = !query || searchText.includes(query);

      item.hidden = !visible;

      if (visible) {
        visibleItems += 1;
      }
    });

    overlay
      .querySelectorAll("[data-management-report-search-group]")
      .forEach((group) => {
        const visibleCards = group.querySelectorAll(
          "[data-management-report-search-item]:not([hidden])",
        );

        group.hidden = visibleCards.length === 0;
      });

    if (clearSearchButton) {
      clearSearchButton.hidden = !query;
    }

    if (searchResult) {
      searchResult.textContent = query
        ? `${visibleItems} ${visibleItems === 1 ? "resultado" : "resultados"}`
        : "";
    }

    if (emptySearch) {
      emptySearch.hidden = !query || visibleItems > 0;
    }
  };

  if (searchInput) {
    searchInput.addEventListener("input", applySearch);

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchInput.value) {
        searchInput.value = "";

        applySearch();

        event.stopPropagation();
      }
    });
  }

  if (clearSearchButton && searchInput) {
    clearSearchButton.addEventListener("click", () => {
      searchInput.value = "";

      applySearch();

      searchInput.focus();
    });
  }

  const saveButton = overlay.querySelector(
    "[data-management-roadmap-mapping-save]",
  );

  if (saveButton) {
    saveButton.addEventListener("click", () =>
      saveManagementRoadmapDraftLinks(programId, executiveLineId),
    );
  }
}
function normalizeManagementReportSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function renderManagementRoadmapMappingPanel(
  programId,
  executiveLineId,
  options = {},
) {
  const preserveDraft = options.preserveDraft === true;
  const line = getManagementRoadmapLineById(executiveLineId);
  if (!line) {
    return;
  }
  const state = getManagementRoadmapMappingEditorState();
  const isSameLine = state.selectedLineId === executiveLineId;
  if (!preserveDraft || !isSameLine) {
    const existingLinks = getManagementRoadmapLinksForLine(executiveLineId);
    state.selectedLineId = executiveLineId;
    state.originalLinks = cloneManagementRoadmapLinks(existingLinks);
    state.draftLinks = cloneManagementRoadmapLinks(existingLinks);
    state.selectedSdaId = "";
    state.selectedDeliverableIds = [];
  }
  removeManagementRoadmapMappingOverlay();
  const catalog = getManagementRoadmapSdaCatalog(programId, line.productId);
  if (
    state.selectedSdaId &&
    !catalog.some((item) => item.id === state.selectedSdaId)
  ) {
    state.selectedSdaId = "";
  }
  if (!state.selectedSdaId && catalog.length) {
    state.selectedSdaId = catalog[0].id;
  }
  const selectedSda =
    catalog.find((item) => item.id === state.selectedSdaId) || null;
  const preview = getManagementRoadmapDraftProgress(state.draftLinks);
  const dirty = isManagementRoadmapDraftDirty();
  const overlay = document.createElement("div");
  overlay.id = "managementRoadmapMappingOverlay";
  overlay.className = "management-roadmap-mapping-overlay";
  overlay.innerHTML = `
    <aside
      class="management-roadmap-mapping-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="managementRoadmapMappingTitle"
    >
      <header
        class="management-roadmap-mapping-header"
      >
        <div>
          <span
            class="
              management-roadmap-mapping-eyebrow
            "
          >
            Configurar relaciones SDA
          </span>
          <h2
            id="managementRoadmapMappingTitle"
          >
            ${rcsEsc(line.title)}
          </h2>
          <p>
            ${rcsEsc(getManagementRoadmapProductLabel(line.productId))}
            ·
            ${rcsEsc(getManagementRoadmapCountrySelectorLabel(line.country))}
          </p>
        </div>
        <button
          class="
            management-roadmap-mapping-close
          "
          type="button"
          data-management-roadmap-mapping-cancel
          aria-label="Cerrar"
        >
          ×
        </button>
      </header>
      <div
        class="management-roadmap-mapping-body"
      >
        <section
          class="
            management-roadmap-mapping-section
          "
        >
          <div
            class="
              management-roadmap-mapping-section-head
            "
          >
            <div>
              <h3>
                Relaciones
              </h3>
              <p>
                Selecciona una SDA y uno o varios
                entregables asociados.
              </p>
            </div>
            <span
              class="
                management-roadmap-mapping-count
              "
            >
              ${state.draftLinks.length}
            </span>
          </div>
          ${
            catalog.length
              ? `
                <div
                  class="
                    management-roadmap-editor-block
                  "
                >
                  <div
                    class="
                      management-roadmap-editor-field
                    "
                  >
                    <label>
                      SDA
                    </label>
                    <select
                      class="
                        management-roadmap-editor-select
                      "
                      data-management-roadmap-sda-select
                    >
                      ${catalog
                        .map(
                          (sda) => `
                            <option
                              value="${rcsEsc(sda.id)}"
                              ${
                                state.selectedSdaId === sda.id ? "selected" : ""
                              }
                            >
                              ${rcsEsc(sda.label)}
                            </option>
                          `,
                        )
                        .join("")}
                    </select>
                  </div>
                  ${
                    selectedSda
                      ? `
                        <div
                          class="
                            management-roadmap-editor-field
                          "
                        >
                          <label>
                            Entregables SDA
                          </label>
                          <div
                            class="
                              management-roadmap-editor-deliverables
                            "
                          >
                            ${selectedSda.deliverables
                              .map((deliverable) => {
                                const checked = managementRoadmapDraftHasLink(
                                  state.draftLinks,
                                  selectedSda.id,
                                  deliverable.id,
                                );
                                return `
                                    <label
                                      class="
                                        management-roadmap-editor-deliverable
                                      "
                                    >
                                      <input
                                        type="checkbox"
                                        data-management-roadmap-deliverable-toggle
                                        data-sda-id="${rcsEsc(selectedSda.id)}"
                                        value="${rcsEsc(deliverable.id)}"
                                        ${checked ? "checked" : ""}
                                      />
                                      <strong>
                                        ${rcsEsc(deliverable.label)}
                                      </strong>
                                    </label>
                                  `;
                              })
                              .join("")}
                          </div>
                        </div>
                      `
                      : ""
                  }
                  <p
                    class="
                      management-roadmap-editor-help
                    "
                  >
                    Puedes seleccionar entregables de
                    distintas SDAs. Cambia la SDA y las
                    selecciones anteriores se conservarán.
                  </p>
                </div>
              `
              : `
                <div
                  class="
                    management-roadmap-mapping-empty
                  "
                >
                  <strong>
                    No hay catálogo SDA disponible
                  </strong>
                  <p>
                    El programa no contiene
                    sdaDeliverables utilizables para
                    este producto.
                  </p>
                </div>
              `
          }
          ${
            state.draftLinks.length
              ? `
                <div
                  class="
                    management-roadmap-link-list
                  "
                  style="margin-top:14px"
                >
                  ${state.draftLinks
                    .map((link, index) => {
                      const deliverable = getManagementSdaDeliverable(link);
                      return `
                          <article
                            class="
                              management-roadmap-link-card
                            "
                          >
                            <div
                              class="
                                management-roadmap-link-number
                              "
                            >
                              ${index + 1}
                            </div>
                            <div>
                              <span>
                                SDA
                              </span>
                              <strong>
                                ${rcsEsc(
                                  getManagementSdaDisplayLabel(
                                    programId,
                                    line.productId,
                                    link.sdaId,
                                  ),
                                )}
                              </strong>
                            </div>
                            <div>
                              <span>
                                Deliverable
                              </span>
                              <strong>
                                ${rcsEsc(
                                  normalizeManagementDeliverableId(
                                    link.deliverableId,
                                  ),
                                )}
                              </strong>
                            </div>
                            ${
                              deliverable
                                ? `
                                  <div
                                    class="
                                      management-roadmap-link-name
                                    "
                                  >
                                    <span>
                                      Nombre
                                    </span>
                                    <strong>
                                      ${rcsEsc(
                                        getManagementSdaDeliverableLabel(
                                          deliverable,
                                        ),
                                      )}
                                    </strong>
                                  </div>
                                `
                                : ""
                            }
                            <button
                              class="
                                management-roadmap-link-remove
                              "
                              type="button"
                              data-management-roadmap-remove-link
                              data-sda-id="${rcsEsc(link.sdaId)}"
                              data-deliverable-id="${rcsEsc(
                                link.deliverableId,
                              )}"
                              title="Eliminar relación"
                            >
                              ×
                            </button>
                          </article>
                        `;
                    })
                    .join("")}
                </div>
              `
              : `
                <div
                  class="
                    management-roadmap-mapping-empty
                  "
                  style="margin-top:14px"
                >
                  <strong>
                    Sin relaciones
                  </strong>
                  <p>
                    Selecciona al menos un entregable SDA.
                  </p>
                </div>
              `
          }
        </section>
        <section
          class="
            management-roadmap-mapping-section
          "
        >
          <div
            class="
              management-roadmap-mapping-section-head
            "
          >
            <div>
              <h3>
                Previsualización
              </h3>
              <p>
                Resultado que tendrá el avance
                al guardar estas relaciones.
              </p>
            </div>
            <span
              class="
                management-roadmap-mapping-count
              "
            >
              ${preview.featureCount}
            </span>
          </div>
          <div
            class="
              management-roadmap-feature-summary
            "
          >
            <article>
              <span>
                Features
              </span>
              <strong>
                ${preview.featureCount}
              </strong>
            </article>
            <article>
              <span>
                Deployed
              </span>
              <strong>
                ${preview.deployedCount}
              </strong>
            </article>
            <article>
              <span>
                Avance
              </span>
              <strong>
                ${preview.progress === null ? "—" : `${preview.progress}%`}
              </strong>
            </article>
          </div>
          ${
            preview.features.length
              ? `
                <div
                  class="
                    management-roadmap-feature-list
                  "
                >
                  ${preview.features
                    .map((feature) => {
                      const deployed = isManagementFeatureDeployed(feature);
                      return `
                        <article
                          class="
                            management-roadmap-feature-row
                            ${deployed ? "is-deployed" : ""}
                          "
                        >
                          <span
                            class="
                              management-roadmap-feature-dot
                            "
                          ></span>
                          <div
                            class="
                              management-roadmap-feature-main
                            "
                          >
                            <div>
                              ${
                                getManagementFeatureDisplayId(feature)
                                  ? `
                                    <span
                                      class="
                                        management-roadmap-feature-id
                                      "
                                    >
                                      ${rcsEsc(
                                        getManagementFeatureDisplayId(feature),
                                      )}
                                    </span>
                                  `
                                  : ""
                              }
                              <strong>
                                ${rcsEsc(
                                  getManagementFeatureDisplayTitle(feature),
                                )}
                              </strong>
                            </div>
                            <span
                              class="
                                management-roadmap-feature-status
                              "
                            >
                              ${rcsEsc(
                                getManagementFeatureDisplayStatus(feature),
                              )}
                            </span>
                          </div>
                        </article>
                      `;
                    })
                    .join("")}
                </div>
              `
              : `
                <div
                  class="
                    management-roadmap-mapping-empty
                  "
                >
                  <strong>
                    ${
                      state.draftLinks.length
                        ? "Sin Features encontradas"
                        : "Selecciona relaciones"
                    }
                  </strong>
                  <p>
                    ${
                      state.draftLinks.length
                        ? "Los entregables seleccionados no devuelven Features JIRA."
                        : "La previsualización se actualizará automáticamente."
                    }
                  </p>
                </div>
              `
          }
        </section>
      </div>
      <footer
        class="management-roadmap-mapping-footer"
      >
        <div
          class="
            management-roadmap-mapping-session-note
          "
        >
          <strong>
            Guardado temporal
          </strong>
          <span>
            Los cambios permanecen en memoria
            hasta recargar el cockpit.
          </span>
        </div>
        <div
          class="
            management-roadmap-mapping-footer-actions
          "
        >
          <button
            class="ghost-button"
            type="button"
            data-management-roadmap-mapping-cancel
          >
            Cancelar
          </button>
          <button
            class="
              management-roadmap-mapping-save
            "
            type="button"
            data-management-roadmap-mapping-save
            ${dirty ? "" : "disabled"}
          >
            Guardar
          </button>
        </div>
      </footer>
    </aside>
  `;
  document.body.appendChild(overlay);
  const sdaSelect = overlay.querySelector(
    "[data-management-roadmap-sda-select]",
  );
  if (sdaSelect) {
    sdaSelect.addEventListener("change", () => {
      state.selectedSdaId = normalizeManagementSdaId(sdaSelect.value);
      renderManagementRoadmapMappingPanel(programId, executiveLineId, {
        preserveDraft: true,
      });
    });
  }
  overlay
    .querySelectorAll("[data-management-roadmap-deliverable-toggle]")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const sdaId = checkbox.dataset.sdaId;
        const deliverableId = checkbox.value;
        if (checkbox.checked) {
          addManagementRoadmapDraftLink(line, sdaId, deliverableId);
        } else {
          removeManagementRoadmapDraftLink(sdaId, deliverableId);
        }
        renderManagementRoadmapMappingPanel(programId, executiveLineId, {
          preserveDraft: true,
        });
      });
    });
  overlay
    .querySelectorAll("[data-management-roadmap-remove-link]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        removeManagementRoadmapDraftLink(
          button.dataset.sdaId,
          button.dataset.deliverableId,
        );
        renderManagementRoadmapMappingPanel(programId, executiveLineId, {
          preserveDraft: true,
        });
      });
    });
  overlay
    .querySelectorAll("[data-management-roadmap-mapping-cancel]")
    .forEach((button) => {
      button.addEventListener("click", closeManagementRoadmapMappingPanel);
    });
  const saveButton = overlay.querySelector(
    "[data-management-roadmap-mapping-save]",
  );
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      saveManagementRoadmapDraftLinks(programId, executiveLineId);
    });
  }
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeManagementRoadmapMappingPanel();
    }
  });
}
function getManagementRoadmapMonthLabels() {
  return [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
}

function getManagementRoadmapQuarterMonthRange(quarter) {
  return (
    {
      Q1: { start: 0, end: 2 },
      Q2: { start: 3, end: 5 },
      Q3: { start: 6, end: 8 },
      Q4: { start: 9, end: 11 },
    }[
      String(quarter || "")
        .trim()
        .toUpperCase()
    ] || null
  );
}

/* MANAGEMENT ROADMAP · SDA + VISTA ANUAL / TRIMESTRAL */

function mgqParseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  const spanish = text.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);

  if (spanish) {
    const date = new Date(Date.UTC(+spanish[3], +spanish[2] - 1, +spanish[1]));

    return date.getUTCDate() === +spanish[1] &&
      date.getUTCMonth() === +spanish[2] - 1
      ? date
      : null;
  }

  const parsed = Date.parse(text);

  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function mgqQuarterPoint(value, fallbackYear, edge = "start") {
  const text = String(value || "")
    .toUpperCase()
    .trim();
  const quarter = getManagementRoadmapQuarterFromText(text);

  if (!quarter) return null;

  const fullYear = text.match(/20\d{2}/);
  const shortYear = text.match(/[1-4]Q\s*(\d{2})(?!\d)/);

  const year = fullYear
    ? +fullYear[0]
    : shortYear
      ? 2000 + +shortYear[1]
      : +fallbackYear;

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return null;
  }

  const index = getManagementRoadmapQuarterIndex(quarter);

  return edge === "end"
    ? new Date(Date.UTC(year, index * 3 + 3, 1) - 1)
    : new Date(Date.UTC(year, index * 3, 1));
}

function mgqTokens(value) {
  return (
    String(value || "").match(
      /(?:20\d{2}\s*[-/]?\s*Q[1-4]|Q[1-4]\s*(?:20\d{2})|[1-4]Q(?:20)?\d{2})/gi,
    ) || []
  );
}

function mgqRange(start, end) {
  if (!start && !end) return null;

  const first = start || end;
  const last = end || start;

  return first.getTime() <= last.getTime() ? { start: first, end: last } : null;
}

function mgqSdaRange(deliverable, fallbackYear) {
  if (!deliverable) return null;

  const year = Number(deliverable.year) || fallbackYear;

  const start =
    mgqQuarterPoint(deliverable.startQuarter, year, "start") ||
    mgqParseDate(deliverable.startDate || deliverable.developmentStartDate);

  const end =
    mgqQuarterPoint(deliverable.endQuarter, year, "end") ||
    mgqParseDate(
      deliverable.clientDate ||
        deliverable.productionDate ||
        deliverable.developmentEndDate ||
        deliverable.targetDate,
    );

  return mgqRange(start, end);
}

function mgqFeatureRange(feature, fallbackYear) {
  const piTokens = mgqTokens(
    [feature.programIncrement, feature.piEstimate].filter(Boolean).join(" "),
  );

  const starts = piTokens
    .map((token) => mgqQuarterPoint(token, fallbackYear, "start"))
    .filter(Boolean);

  const ends = piTokens
    .map((token) => mgqQuarterPoint(token, fallbackYear, "end"))
    .filter(Boolean);

  const start =
    mgqParseDate(feature.startDate) ||
    (starts.length
      ? new Date(Math.min(...starts.map((date) => date.getTime())))
      : null);

  const end =
    mgqParseDate(feature.targetDate || feature.endDate) ||
    (ends.length
      ? new Date(Math.max(...ends.map((date) => date.getTime())))
      : null);

  return mgqRange(start, end);
}

function mgqOverlap(range, start, end) {
  return Boolean(range && range.start <= end && range.end >= start);
}

function mgqSdaItems(row) {
  const year = Number(row?.year) || new Date().getFullYear();

  const groups = new Map();

  const mergeRanges = (left, right) => {
    if (!left) {
      return right || null;
    }

    if (!right) {
      return left;
    }

    return {
      start: new Date(Math.min(left.start.getTime(), right.start.getTime())),

      end: new Date(Math.max(left.end.getTime(), right.end.getTime())),
    };
  };

  const registerGroup = ({
    sdaId,
    deliverableId,
    deliverable = null,
    fallbackFeature = null,
  }) => {
    const code = normalizeManagementSdaId(sdaId);

    const normalizedDeliverableId =
      normalizeManagementDeliverableId(deliverableId);

    if (!code || !normalizedDeliverableId) {
      return;
    }

    const id = `${code}:${normalizedDeliverableId}`;

    const resolvedDeliverable =
      deliverable ||
      getManagementSdaDeliverable({
        sdaId: code,
        deliverableId: normalizedDeliverableId,
      });

    const featureRange = fallbackFeature
      ? mgqFeatureRange(fallbackFeature, year)
      : null;

    const deliverableRange = resolvedDeliverable
      ? mgqSdaRange(resolvedDeliverable, year)
      : null;

    const existing = groups.get(id);

    if (existing) {
      /*
       * Si el grupo no procede del catálogo SDA,
       * ampliamos el rango utilizando las Features
       * que hayan entrado directamente.
       *
       * Si sí existe un Deliverable SDA oficial,
       * mantenemos siempre su planificación.
       */
      if (!existing.catalogBacked && featureRange) {
        existing.range = mergeRanges(existing.range, featureRange);
      }

      return;
    }

    const fallbackName = String(
      fallbackFeature?.deliverableName ||
        fallbackFeature?.deliverable_name ||
        fallbackFeature?.deliverable ||
        fallbackFeature?.deliverableId ||
        fallbackFeature?.deliverable_id ||
        "",
    ).trim();

    groups.set(id, {
      id,

      code,

      name:
        resolvedDeliverable?.name ||
        resolvedDeliverable?.deliverableName ||
        resolvedDeliverable?.deliverable_name ||
        resolvedDeliverable?.title ||
        resolvedDeliverable?.label ||
        fallbackName ||
        normalizedDeliverableId,

      range: deliverableRange || featureRange,

      endQuarter: resolvedDeliverable?.endQuarter || "",

      clientDate: resolvedDeliverable?.clientDate || "",

      catalogBacked: Boolean(resolvedDeliverable),
    });
  };

  /*
   * =====================================================
   * SDA / DELIVERABLES SELECCIONADOS EXPLÍCITAMENTE
   * =====================================================
   */

  const explicitSdaLinks = getManagementRoadmapLinksForLine(row.id);

  explicitSdaLinks.forEach((link) => {
    const sdaId = normalizeManagementSdaId(link.sdaId);

    const deliverableId = normalizeManagementDeliverableId(link.deliverableId);

    if (!sdaId || !deliverableId) {
      return;
    }

    registerGroup({
      sdaId,
      deliverableId,
      deliverable: getManagementSdaDeliverable(link),
    });
  });

  /*
   * Si existe al menos una SDA configurada,
   * ésa sigue siendo la estructura visual
   * principal del entregable.
   *
   * Las Features directas y las procedentes
   * de Épicas se incorporarán posteriormente
   * a estos grupos desde mgqFeatureItems().
   */
  if (explicitSdaLinks.length) {
    return [...groups.values()].map(({ catalogBacked, ...item }) => item);
  }

  /*
   * =====================================================
   * ENTREGABLE SIN SDA EXPLÍCITA
   * =====================================================
   *
   * Una línea puede alimentarse únicamente mediante:
   *
   * - Épicas
   * - Features directas
   *
   * En ese caso intentamos recuperar la SDA /
   * Deliverable naturales de las Features JIRA
   * para que sigan siendo visibles en el cronograma.
   */

  const directLinks = getManagementReportLinksForLine(row.id).filter((link) => {
    const sourceType = normalizeManagementReportSourceType(link);

    return sourceType === "epic" || sourceType === "feature";
  });

  if (!directLinks.length) {
    return [];
  }

  const directFeatures = getManagementRoadmapFeaturesForLinks(directLinks);

  directFeatures.forEach((feature) => {
    const sdaId = normalizeManagementSdaId(
      feature?.sdaId ||
        feature?.sdaCode ||
        feature?.sda ||
        feature?.flightId ||
        feature?.flight_id ||
        "",
    );

    if (!sdaId) {
      return;
    }

    const deliverableIds = getManagementFeatureDeliverableIds(feature);

    if (deliverableIds.length) {
      deliverableIds.forEach((deliverableId) => {
        registerGroup({
          sdaId,
          deliverableId,
          fallbackFeature: feature,
        });
      });

      return;
    }

    /*
     * Fallback por nombre.
     *
     * Algunas Features JIRA pueden traer el
     * nombre del Deliverable pero no su ID.
     */
    const featureDeliverableName = normalizeManagementComparableText(
      feature?.deliverableName ||
        feature?.deliverable_name ||
        feature?.deliverable ||
        "",
    );

    if (!featureDeliverableName) {
      return;
    }

    const catalog = Array.isArray(DATA?.sdaDeliverables)
      ? DATA.sdaDeliverables
      : [];

    const matchingDeliverable = catalog.find((deliverable) => {
      const deliverableSdaId = getManagementSdaIdFromDeliverable(deliverable);

      if (deliverableSdaId !== sdaId) {
        return false;
      }

      const catalogName = normalizeManagementComparableText(
        deliverable?.deliverableName ||
          deliverable?.deliverable_name ||
          deliverable?.name ||
          deliverable?.title ||
          deliverable?.label ||
          "",
      );

      if (!catalogName) {
        return false;
      }

      return (
        catalogName.includes(featureDeliverableName) ||
        featureDeliverableName.includes(catalogName)
      );
    });

    if (!matchingDeliverable) {
      return;
    }

    const deliverableId =
      getManagementDeliverableIdFromCatalogItem(matchingDeliverable);

    if (!deliverableId) {
      return;
    }

    registerGroup({
      sdaId,
      deliverableId,
      deliverable: matchingDeliverable,
      fallbackFeature: feature,
    });
  });

  return [...groups.values()].map(({ catalogBacked, ...item }) => item);
}

function mgqFeatureItems(row) {
  const year = Number(row?.year) || new Date().getFullYear();

  const features = getManagementFeaturesForLine(row.id);

  const links = getManagementReportLinksForLine(row.id);

  const sdaLinks = links.filter(
    (link) => normalizeManagementReportSourceType(link) === "sda-deliverable",
  );

  const directLinks = links.filter((link) => {
    const sourceType = normalizeManagementReportSourceType(link);

    return sourceType === "epic" || sourceType === "feature";
  });

  /*
   * Grupos que realmente se van a pintar.
   *
   * Pueden proceder de:
   *
   * - SDA seleccionadas explícitamente.
   * - SDA / Deliverable deducidos de una
   *   Épica o Feature directa cuando no
   *   existe ninguna SDA seleccionada.
   */
  const displayedSdaItems = mgqSdaItems(row);

  const featureMatchesDisplayedGroup = (feature) =>
    displayedSdaItems.some((item) => {
      const prefix = `${item.code}:`;

      const deliverableId = String(item.id || "").startsWith(prefix)
        ? String(item.id).slice(prefix.length)
        : "";

      if (!deliverableId) {
        return false;
      }

      return managementFeatureMatchesDeliverable(feature, {
        sdaId: item.code,
        deliverableId,
      });
    });

  const featureComesFromDirectSource = (feature) =>
    directLinks.some((link) => {
      const sourceType = normalizeManagementReportSourceType(link);

      if (sourceType === "epic") {
        return managementFeatureMatchesEpicSource(feature, link);
      }

      if (sourceType === "feature") {
        const expectedKey = getManagementReportLinkSourceId(link)
          .trim()
          .toUpperCase();

        const featureKey = String(getManagementFeatureDisplayId(feature))
          .trim()
          .toUpperCase();

        return Boolean(expectedKey) && featureKey === expectedKey;
      }

      return false;
    });

  /*
   * SDA principal.
   *
   * Si una Feature ha sido seleccionada
   * directamente o mediante una Épica y no
   * tiene una asociación SDA / Deliverable
   * que pueda mostrarse por sí misma,
   * la incorporamos al primer Deliverable SDA
   * configurado para la línea ejecutiva.
   *
   * Es únicamente una proyección visual:
   * no modificamos DATA ni la información JIRA.
   */
  const primarySdaLink = sdaLinks[0] || null;

  return features.map((feature) => {
    const range = mgqFeatureRange(feature, year);

    /*
     * Ya pertenece de forma natural a uno
     * de los grupos visibles.
     */
    if (featureMatchesDisplayedGroup(feature)) {
      return {
        feature,
        range,
      };
    }

    /*
     * No procede de una selección directa.
     * Conservamos el comportamiento actual.
     */
    if (!featureComesFromDirectSource(feature)) {
      return {
        feature,
        range,
      };
    }

    /*
     * Si no hay SDA explícita tampoco
     * podemos proyectarla artificialmente.
     *
     * mgqSdaItems() ya habrá intentado
     * obtener su SDA / Deliverable natural.
     */
    if (!primarySdaLink) {
      return {
        feature,
        range,
      };
    }

    const hostSdaId = normalizeManagementSdaId(primarySdaLink.sdaId);

    const hostDeliverableId = normalizeManagementDeliverableId(
      primarySdaLink.deliverableId,
    );

    if (!hostSdaId || !hostDeliverableId) {
      return {
        feature,
        range,
      };
    }

    /*
     * Clonamos únicamente para la capa de
     * presentación del Management Report.
     *
     * Esto hace que el renderer SDA actual
     * pueda pintar también las Features
     * añadidas mediante Épica / Feature.
     *
     * El objeto original de JIRA permanece
     * intacto.
     */
    const projectedFeature = {
      ...feature,

      sdaId: hostSdaId,
      sdaCode: hostSdaId,

      deliverableId: hostDeliverableId,
      deliverable_id: hostDeliverableId,
      sdaDeliverableId: hostDeliverableId,
      sda_deliverable_id: hostDeliverableId,
    };

    return {
      feature: projectedFeature,
      range,
    };
  });
}

function mgqYears(rows) {
  const years = new Set();

  rows.forEach((row) => {
    if (Number(row.year) >= 2020) {
      years.add(Number(row.year));
    }

    const ranges = [
      ...mgqSdaItems(row).map((item) => item.range),
      ...mgqFeatureItems(row).map((item) => item.range),
    ];

    ranges.filter(Boolean).forEach((range) => {
      const first = range.start.getUTCFullYear();
      const last = range.end.getUTCFullYear();

      if (last - first < 8) {
        for (let year = first; year <= last; year++) {
          years.add(year);
        }
      }
    });
  });

  return [...years].sort((a, b) => a - b);
}

function mgqPeriod(year, quarter) {
  const index =
    quarter === "ALL" ? 0 : getManagementRoadmapQuarterIndex(quarter);

  const months = quarter === "ALL" ? 12 : 3;

  const start = new Date(Date.UTC(year, index * 3, 1));

  const endExclusive = new Date(Date.UTC(year, index * 3 + months, 1));

  return {
    start,
    end: new Date(endExclusive.getTime() - 1),
    endExclusive,
    startMonth: index * 3,
    months,
  };
}

function mgqPosition(date, period) {
  return Math.min(
    100,
    Math.max(
      0,
      ((date.getTime() - period.start.getTime()) * 100) /
        (period.endExclusive.getTime() - period.start.getTime()),
    ),
  );
}

function mgqSegment(range, period) {
  if (!mgqOverlap(range, period.start, period.end)) {
    return null;
  }

  const left = mgqPosition(
    new Date(Math.max(range.start.getTime(), period.start.getTime())),
    period,
  );

  const right = mgqPosition(
    new Date(Math.min(range.end.getTime() + 1, period.endExclusive.getTime())),
    period,
  );

  return {
    left,
    width: Math.min(100 - left, Math.max(1.4, right - left)),
  };
}

function mgqDateLabel(date) {
  return date
    ? date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Sin fecha";
}

function mgqQuarterLabel(date) {
  return date
    ? `Q${Math.floor(date.getUTCMonth() / 3) + 1} ` + date.getUTCFullYear()
    : "Sin fecha";
}

function mgqRowData(row, period, quarter) {
  const sdas = mgqSdaItems(row);
  const features = mgqFeatureItems(row);

  const plannedSdas = sdas.filter((item) =>
    mgqOverlap(item.range, period.start, period.end),
  );

  const quarterFeatures = features.filter((item) =>
    mgqOverlap(item.range, period.start, period.end),
  );

  const hasPlanning = Boolean(plannedSdas.length || quarterFeatures.length);

  const sourceRanges = sdas.map((item) => item.range).filter(Boolean);

  const featureRanges = features.map((item) => item.range).filter(Boolean);

  const starts = (sourceRanges.length ? sourceRanges : featureRanges).map(
    (item) => item.start,
  );

  const ends = (sourceRanges.length ? sourceRanges : featureRanges).map(
    (item) => item.end,
  );

  const start = starts.length
    ? new Date(Math.min(...starts.map((date) => date.getTime())))
    : null;

  const end = ends.length
    ? new Date(Math.max(...ends.map((date) => date.getTime())))
    : null;

  const deployed = quarterFeatures.filter((item) =>
    isManagementFeatureDeployed(item.feature),
  ).length;

  const total = quarterFeatures.length;

  const percent = total ? Math.round((deployed * 100) / total) : null;

  return {
    sdas,
    features,
    plannedSdas,
    quarterFeatures,
    hasPlanning,
    start,
    end,
    deployed,
    total,
    percent,
  };
}

function mgqQuarterStats(row, year, quarter) {
  const data = mgqRowData(row, mgqPeriod(year, quarter), quarter);

  return data.total
    ? `${data.deployed}/${data.total} · ${data.percent}%`
    : data.plannedSdas.length
      ? "Plan SDA"
      : "";
}
function renderManagementRoadmapBoard(programId, productId, countryId) {
  const rows = getManagementRoadmapRows(programId, productId, countryId);

  if (!rows.length) {
    return `
      <div class="management-deliverables-empty">
        No hay entregables configurados para este producto y país.
      </div>
    `;
  }

  const state = getManagementRoadmapSnapshotState();
  const years = mgqYears(rows);
  const currentYear = new Date().getFullYear();

  if (!years.length) years.push(currentYear);

  if (!years.includes(Number(state.year))) {
    state.year = years.includes(currentYear) ? currentYear : years[0];
  }

  if (!["ALL", "Q1", "Q2", "Q3", "Q4"].includes(state.quarter)) {
    state.quarter = "ALL";
  }

  const year = Number(state.year);
  const quarter = state.quarter;
  const period = mgqPeriod(year, quarter);

  const periodLabel = quarter === "ALL" ? `Año ${year}` : `${quarter} ${year}`;

  const months = getManagementRoadmapMonthLabels().slice(
    period.startMonth,
    period.startMonth + period.months,
  );

  const statusTypes = [
    { key: "deployed", label: "Deployed", color: "#229B60" },
    { key: "new", label: "New", color: "#A8ADB5" },
    { key: "in-progress", label: "In Progress", color: "#72BCEB" },
    { key: "discarded", label: "Discarded", color: "#C93D43" },
    { key: "other", label: "Otros", color: "#242424" },
  ];

  function featureStatus(feature) {
    if (isManagementFeatureDeployed(feature)) {
      return "deployed";
    }

    const raw = String(
      feature.statusRaw ||
        feature.currentStatusRaw ||
        getManagementFeatureDisplayStatus(feature),
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (raw === "new") return "new";
    if (raw === "inprogress") return "in-progress";
    if (raw === "discarded") return "discarded";

    return "other";
  }

  const now = new Date();

  const today =
    now >= period.start && now <= period.end ? mgqPosition(now, period) : null;

  function renderTimeGrid() {
    return `
      <span class="mgqv-time-grid" aria-hidden="true"></span>
      ${
        today === null
          ? ""
          : `
            <span
              class="mgqv-today"
              style="left:${today.toFixed(3)}%"
              title="Hoy"
              aria-hidden="true"
            ></span>
          `
      }
    `;
  }

  function renderPie(counts, total) {
    if (!total) {
      return `
        <div class="mgqv-pie mgqv-pie-empty"
             role="img"
             aria-label="Sin features planificadas en el periodo">
        </div>
      `;
    }

    let cursor = 0;

    const slices = statusTypes
      .filter((type) => counts[type.key] > 0)
      .map((type) => {
        const from = cursor;
        cursor += (counts[type.key] / total) * 100;

        return `${type.color} ${from.toFixed(3)}% ` + `${cursor.toFixed(3)}%`;
      });

    const description = statusTypes
      .filter((type) => counts[type.key])
      .map((type) => `${type.label}: ${counts[type.key]}`)
      .join(". ");

    return `
      <div
        class="mgqv-pie"
        style="background:conic-gradient(${slices.join(",")})"
        role="img"
        aria-label="${rcsEsc(description)}"
        title="${rcsEsc(description)}"
      ></div>
    `;
  }

  function renderFeatureDetail(item, scope) {
    const { feature, range } = item;

    const id = getManagementFeatureDisplayId(feature);
    const name = getManagementFeatureDisplayTitle(feature);
    const status = featureStatus(feature);

    const rawStatus =
      String(
        feature.statusRaw ||
          feature.currentStatusRaw ||
          getManagementFeatureDisplayStatus(feature),
      ).trim() || "Sin estado";

    const actualEnd = isManagementFeatureDeployed(feature)
      ? mgqParseDate(feature.resolvedAt)
      : null;

    const startLabel = range ? mgqDateLabel(range.start) : "Sin fecha";

    const endLabel = actualEnd
      ? mgqDateLabel(actualEnd)
      : range
        ? mgqDateLabel(range.end)
        : "Sin fecha";

    const segment = scope === "current" ? mgqSegment(range, period) : null;

    return `
      <div class="mgqv-feature-row">
        <div class="mgqv-feature-info">
          <strong>${rcsEsc(name)}</strong>

          <div class="mgqv-feature-meta">
            ${id ? `<span>${rcsEsc(id)}</span>` : ""}

            <span class="mgqv-status-tag mgqv-${status}">
              ${rcsEsc(rawStatus)}
            </span>

            ${
              scope !== "current"
                ? `
                  <span class="mgqv-scope-tag">
                    ${
                      scope === "undated"
                        ? "Sin Q asignado"
                        : "Fuera del periodo"
                    }
                  </span>
                `
                : ""
            }
          </div>

          <small>
            Inicio: ${rcsEsc(startLabel)}
            ·
            ${actualEnd ? "Fin registrado" : "Fin estimado"}:
            ${rcsEsc(endLabel)}
          </small>
        </div>

        <div class="mgqv-feature-timeline">
          ${renderTimeGrid()}

          ${
            segment
              ? `
                <div
                  class="mgqv-feature-bar mgqv-${status}"
                  style="
                    left:${segment.left.toFixed(3)}%;
                    width:${segment.width.toFixed(3)}%;
                  "
                  title="${rcsEsc(`${name}: ${startLabel} - ${endLabel}`)}"
                ></div>
              `
              : `
                <span class="mgqv-feature-placeholder">
                  ${
                    scope === "undated"
                      ? "Sin planificación temporal"
                      : "Planificada fuera del periodo"
                  }
                </span>
              `
          }
        </div>

        <div class="mgqv-feature-status-cell">
          <span class="mgqv-status-tag mgqv-${status}">
            ${rcsEsc(rawStatus)}
          </span>
        </div>
      </div>
    `;
  }

  const visibleRows = rows
    .map((row) => {
      const features = mgqFeatureItems(row);
      const sdas = mgqSdaItems(row);

      const groups = sdas
        .map((sda) => {
          const deliverableId = sda.id.slice(sda.code.length + 1);

          const associated = features.filter(({ feature }) =>
            managementFeatureMatchesDeliverable(feature, {
              sdaId: sda.code,
              deliverableId,
            }),
          );

          const selected = associated.filter(({ range }) =>
            mgqOverlap(range, period.start, period.end),
          );

          const undated = associated.filter(({ range }) => !range);

          const outside = associated.filter(
            ({ range }) =>
              range && !mgqOverlap(range, period.start, period.end),
          );

          const visible =
            mgqOverlap(sda.range, period.start, period.end) ||
            selected.length > 0 ||
            (quarter === "ALL" && Number(row.year) === year && !sda.range);

          const counts = Object.fromEntries(
            statusTypes.map((type) => [type.key, 0]),
          );

          selected.forEach(({ feature }) => {
            counts[featureStatus(feature)]++;
          });

          const starts = selected.map(({ range }) => range.start.getTime());

          const ends = selected.map(({ range }) => range.end.getTime());

          const start = starts.length ? new Date(Math.min(...starts)) : null;

          const estimatedEnd = ends.length ? new Date(Math.max(...ends)) : null;

          const allDeployed =
            selected.length > 0 &&
            selected.every(({ feature }) =>
              isManagementFeatureDeployed(feature),
            );

          const resolved = selected.map(({ feature }) =>
            mgqParseDate(feature.resolvedAt),
          );

          const actualEnd =
            allDeployed && resolved.every(Boolean)
              ? new Date(Math.max(...resolved.map((date) => date.getTime())))
              : null;

          return {
            sda,
            deliverableId,
            associated,
            selected,
            undated,
            outside,
            visible,
            counts,
            start,
            end: actualEnd || estimatedEnd,
            actualEnd,
            deployed: counts.deployed,
            percent: selected.length
              ? Math.round((counts.deployed / selected.length) * 100)
              : null,
          };
        })
        .filter((group) => group.visible);

      return { row, groups };
    })
    .filter(
      ({ row, groups }) =>
        groups.length > 0 ||
        (quarter === "ALL" &&
          Number(row.year) === year &&
          !mgqSdaItems(row).length),
    );

  const visibleSdas = visibleRows.reduce(
    (total, item) => total + item.groups.length,
    0,
  );

  return `
    <section class="mgq-view mgqv-view">

      <div class="mgq-controls">
        <div>
          <strong>Horizonte de entregables</strong>
          <small>
            Planificación SDA y distribución de features por estado.
          </small>
        </div>

        <label class="mgq-year-label">
          Año
          <select
            data-mgq-year
            aria-label="Seleccionar año"
          >
            ${years
              .map(
                (option) => `
              <option
                value="${option}"
                ${option === year ? "selected" : ""}
              >
                ${option}
              </option>
            `,
              )
              .join("")}
          </select>
        </label>

        <div
          class="mgq-quarter-group"
          role="group"
          aria-label="Seleccionar trimestre"
        >
          ${["ALL", "Q1", "Q2", "Q3", "Q4"]
            .map(
              (option) => `
              <button
                type="button"
                class="
                  mgq-quarter-button
                  ${quarter === option ? "is-active" : ""}
                "
                data-mgq-quarter="${option}"
                aria-pressed="${quarter === option}"
              >
                ${option === "ALL" ? "Año completo" : option}
              </button>
            `,
            )
            .join("")}
        </div>
      </div>

      <div class="mgq-period-summary">
        <strong>${rcsEsc(periodLabel)}</strong>
        <span>${visibleSdas} entregables SDA visibles</span>
      </div>

      <div class="management-roadmap-board-wrap">
        <div
          class="management-roadmap-board mgqv-board"
          style="--mgqv-months:${months.length}"
        >

          <div class="management-roadmap-board-header">

            <div class="management-roadmap-board-left">
              <div class="management-roadmap-board-title">
                Entregables
              </div>
              <div class="management-roadmap-board-subtitle">
                ${rcsEsc(getManagementRoadmapProductLabel(productId))}
                ·
                ${rcsEsc(getManagementRoadmapCountrySelectorLabel(countryId))}
                ·
                ${rcsEsc(periodLabel)}
              </div>
            </div>

            <div class="management-roadmap-board-months">
              ${months
                .map(
                  (month) => `
                <div class="management-roadmap-board-month">
                  ${rcsEsc(month)}
                </div>
              `,
                )
                .join("")}
            </div>

            <div class="mgqv-status-header">
              Estados de features
            </div>
          </div>

          <div class="management-roadmap-board-body">

            ${
              visibleRows.length
                ? visibleRows
                    .map(
                      ({ row, groups }) => `
                    <section class="mgqv-executive">

                      <header class="mgqv-executive-header">
                        <div>
                          <h4>${rcsEsc(row.title)}</h4>

                          <div class="mgqv-executive-tags">
                            ${renderManagementRoadmapCategory(row)}

                            <span
                              class="
                                management-roadmap-status-pill
                                ${rcsEsc(getManagementRoadmapStatusClass(row))}
                              "
                            >
                              ${rcsEsc(row.statusLabel || "Sin estado")}
                            </span>
                          </div>
                        </div>

                        ${
                          row.comments
                            ? `
                              <details class="mgqv-notes">
                                <summary>Observaciones</summary>
                                <p>${rcsEsc(row.comments)}</p>
                              </details>
                            `
                            : ""
                        }
                      </header>

                      ${
                        groups.length
                          ? groups
                              .map((group) => {
                                const {
                                  sda,
                                  deliverableId,
                                  associated,
                                  selected,
                                  undated,
                                  outside,
                                  counts,
                                  start,
                                  end,
                                  actualEnd,
                                  deployed,
                                  percent,
                                } = group;

                                const sdaSegment = mgqSegment(
                                  sda.range,
                                  period,
                                );

                                const name = `${sda.name} (${deliverableId})`;

                                const planStart = sda.range
                                  ? mgqQuarterLabel(sda.range.start)
                                  : "Sin fecha";

                                const planEnd = sda.range
                                  ? mgqQuarterLabel(sda.range.end)
                                  : "Sin fecha";

                                const statusSummary = statusTypes
                                  .filter((type) => counts[type.key])
                                  .map(
                                    (type) => `
                                    <span class="mgqv-count">
                                      <i class="mgqv-${type.key}"></i>
                                      ${type.label}
                                      <b>${counts[type.key]}</b>
                                    </span>
                                  `,
                                  )
                                  .join("");

                                const details = [
                                  ...selected.map((item) => ({
                                    item,
                                    scope: "current",
                                  })),
                                  ...undated.map((item) => ({
                                    item,
                                    scope: "undated",
                                  })),
                                  ...outside.map((item) => ({
                                    item,
                                    scope: "outside",
                                  })),
                                ];

                                return `
                                <details class="mgqv-sda-group">

                                  <!-- ÚNICA FILA SDA -->

                                  <summary class="mgqv-sda-row">

                                    <div class="mgqv-sda-info">
                                      <strong>
                                        SDA ${rcsEsc(sda.code)}
                                      </strong>

                                      <small>
                                        ${rcsEsc(planStart)}
                                        →
                                        ${rcsEsc(planEnd)}
                                      </small>

                                      <span class="mgqv-expand-action">
                                        <span class="mgqv-chevron">
                                          ›
                                        </span>

                                        ${
                                          associated.length
                                            ? `Ver ${associated.length} features`
                                            : "Sin features creadas"
                                        }
                                      </span>
                                    </div>

                                    <!-- BARRA SDA DESPLEGABLE -->

                                    <div class="mgqv-sda-timeline">
                                      ${renderTimeGrid()}

                                      <span class="mgqv-bar-caption">
                                        ${rcsEsc(name)}
                                      </span>

                                      ${
                                        sdaSegment
                                          ? `
                                            <div
                                              class="mgqv-sda-bar"
                                              style="
                                                left:${sdaSegment.left.toFixed(3)}%;
                                                width:${sdaSegment.width.toFixed(3)}%;
                                              "
                                              title="${rcsEsc(name)} · Pulsar para ver features"
                                            >
                                              <span>
                                                ${rcsEsc(name)}
                                              </span>
                                              <span class="mgqv-bar-chevron">
                                                ▾
                                              </span>
                                            </div>
                                          `
                                          : `
                                            <span class="mgqv-no-plan">
                                              ${
                                                sda.range
                                                  ? "Plan SDA fuera del periodo"
                                                  : "Sin fechas SDA"
                                              }
                                            </span>
                                          `
                                      }
                                    </div>

                                    <!-- NUEVA COLUMNA: TARTA -->

                                    <div class="mgqv-pie-column">

                                      ${renderPie(counts, selected.length)}

                                      <div class="mgqv-pie-info">
                                        ${
                                          selected.length
                                            ? `
                                              <strong>
                                                ${percent}%
                                              </strong>
                                              <small>
                                                ${deployed}/${selected.length}
                                                desplegadas
                                              </small>
                                            `
                                            : `
                                              <span class="mgqv-pie-empty-label">
                                                Sin features
                                                del periodo
                                              </span>
                                            `
                                        }
                                      </div>

                                      ${
                                        selected.length
                                          ? `
                                            <div class="mgqv-pie-counts">
                                              ${statusSummary}
                                            </div>

                                            <small class="mgqv-feature-dates">
                                              Features:
                                              ${rcsEsc(mgqDateLabel(start))}
                                              →
                                              ${rcsEsc(mgqDateLabel(end))}
                                              ${
                                                actualEnd
                                                  ? "(fin registrado)"
                                                  : "(fin estimado)"
                                              }
                                            </small>
                                          `
                                          : ""
                                      }
                                    </div>
                                  </summary>

                                  <!-- DETALLE QUE ABRE LA SDA -->

                                  <div class="mgqv-expanded">

                                    <header>
                                      <strong>
                                        Features · ${rcsEsc(sda.name)}
                                      </strong>

                                      <span>
                                        ${selected.length}
                                        en ${rcsEsc(periodLabel)}
                                        ·
                                        ${associated.length}
                                        vinculadas en total
                                      </span>
                                    </header>

                                    ${
                                      details.length
                                        ? details
                                            .map(({ item, scope }) =>
                                              renderFeatureDetail(item, scope),
                                            )
                                            .join("")
                                        : `
                                          <p class="mgqv-empty">
                                            Todavía no hay features vinculadas
                                            a este entregable SDA.
                                          </p>
                                        `
                                    }
                                  </div>
                                </details>
                              `;
                              })
                              .join("")
                          : `
                            <div class="mgqv-empty">
                              Sin asociación con entregables SDA.
                            </div>
                          `
                      }
                    </section>
                  `,
                    )
                    .join("")
                : `
                  <div class="mgqv-empty">
                    No hay entregables SDA planificados para
                    ${rcsEsc(periodLabel)}.
                  </div>
                `
            }
          </div>
        </div>
      </div>

      <div class="mgqv-legend">
        ${statusTypes
          .map(
            (type) => `
          <span>
            <i class="mgqv-${type.key}"></i>
            ${type.label}
          </span>
        `,
          )
          .join("")}
      </div>

      <p class="mgq-warning">
        La barra SDA representa el horizonte del entregable.
        La tarta contabiliza únicamente las features conocidas
        y planificadas en ${rcsEsc(periodLabel)}.
        El porcentaje no representa el avance total del
        entregable SDA. Los estados JIRA mostrados son actuales.
      </p>
    </section>
  `;
}
function renderManagementRoadmapSnapshotEditorTable(
  programId,
  productId,
  countryId,
) {
  const rows = getManagementRoadmapRows(programId, productId, countryId);
  const mappingState = getManagementRoadmapMappingUiState();

  if (!rows.length) {
    return `
      <div
        class="management-deliverables-table-wrap"
      >
        ${
          mappingState.enabled
            ? `
              <div
                class="management-roadmap-table-actions"
              >
                <button
                  class="management-roadmap-line-create-button"
                  type="button"
                  data-management-roadmap-create-line
                >
                  + Nuevo deliverable
                </button>
              </div>
            `
            : ""
        }
        <div class="management-deliverables-empty">
          No hay deliverables configurados para
          ${rcsEsc(getManagementRoadmapProductLabel(productId))}
          en
          ${rcsEsc(getManagementRoadmapCountrySelectorLabel(countryId))}.
        </div>
      </div>
    `;
  }

  return `
    <div
      class="management-deliverables-table-wrap"
    >
      ${
        mappingState.enabled
          ? `
            <div
              class="management-roadmap-table-actions"
            >
              <button
                class="management-roadmap-line-create-button"
                type="button"
                data-management-roadmap-create-line
              >
                + Nuevo deliverable
              </button>
            </div>
          `
          : ""
      }
      <table
        class="
          management-deliverables-table
          ${mappingState.enabled ? "is-mapping-mode" : ""}
        "
      >
        <colgroup>
          <col
            class="management-deliverables-col-name"
          >
          <col
            class="management-deliverables-col-quarter"
          >
          <col
            class="management-deliverables-col-quarter"
          >
          <col
            class="management-deliverables-col-quarter"
          >
          <col
            class="management-deliverables-col-progress"
          >
          <col
            class="management-deliverables-col-status"
          >
          <col
            class="management-deliverables-col-comments"
          >
          ${
            mappingState.enabled
              ? `
                <col
                  class="management-deliverables-col-mapping"
                >
              `
              : ""
          }
        </colgroup>
        <thead>
          <tr>
            <th>
              Deliverables
            </th>
            <th>
              Q2
            </th>
            <th>
              Q3
            </th>
            <th>
              Q4
            </th>
            <th>
              Avance
            </th>
            <th>
              Estado
            </th>
            <th>
              Comentarios
            </th>
            ${
              mappingState.enabled
                ? `
                  <th>
                    SDA
                  </th>
                `
                : ""
            }
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr
                  data-management-roadmap-line="${rcsEsc(row.id)}"
                >
                  <td>
                    <div
                      class="management-deliverables-name"
                    >
                      ${renderManagementRoadmapCategory(row)}
                      <div
                        class="management-deliverables-title-wrapper"
                      >
                        <span
                          class="management-deliverables-title"
                        >
                          ${rcsEsc(row.title)}
                        </span>
                        ${
                          mappingState.enabled
                            ? `
                              <button
                                class="management-roadmap-line-edit-button"
                                type="button"
                                data-management-roadmap-edit-line="${rcsEsc(
                                  row.id,
                                )}"
                              >
                                Editar
                              </button>
                            `
                            : ""
                        }
                      </div>
                    </div>
                  </td>
                  ${renderManagementRoadmapQuarterCell(row, "Q2")}
                  ${renderManagementRoadmapQuarterCell(row, "Q3")}
                  ${renderManagementRoadmapQuarterCell(row, "Q4")}
                  <td>
                    ${renderManagementRoadmapProgress(row.id)}
                  </td>
                  <td
                    class="
                      management-deliverables-status
                      ${getManagementRoadmapStatusClass(row)}
                    "
                  >
                    ${rcsEsc(row.statusLabel)}
                  </td>
                  <td
                    class="management-deliverables-comments"
                  >
                    ${rcsEsc(row.comments || "")}
                  </td>
                  ${
                    mappingState.enabled
                      ? `
                        <td>
                          ${renderManagementRoadmapMappingAction(row.id)}
                        </td>
                      `
                      : ""
                  }
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}
function renderManagementRoadmapSnapshotTable(programId, productId, countryId) {
  return renderManagementRoadmapBoard(programId, productId, countryId);
}
function applyManagementRoadmapInlineConfiguration(programId) {
  const mappingState = getManagementRoadmapMappingUiState();

  if (!mappingState.enabled) {
    return;
  }

  const snapshot = getManagementRoadmapSnapshotState();

  const rows = getManagementRoadmapRows(
    programId,
    snapshot.productId,
    snapshot.countryId,
  );

  const controls = document.querySelector(".mgq-controls");

  if (
    controls &&
    !controls.querySelector("[data-management-roadmap-create-line]")
  ) {
    const actions = document.createElement("div");

    actions.className = "management-report-inline-config-main";

    actions.innerHTML = `
      <button
        class="management-roadmap-line-create-button"
        type="button"
        data-management-roadmap-create-line
      >
        + Nuevo entregable
      </button>
    `;

    controls.appendChild(actions);
  }

  document.querySelectorAll(".mgqv-executive").forEach((section) => {
    const heading = section.querySelector(".mgqv-executive-header h4");

    const title = String(heading?.textContent || "").trim();

    const row = rows.find((candidate) => candidate.title === title);

    if (!row) {
      return;
    }

    section.dataset.managementRoadmapLine = row.id;

    const header = section.querySelector(".mgqv-executive-header");

    if (
      !header ||
      header.querySelector(".management-report-inline-config-actions")
    ) {
      return;
    }

    const actions = document.createElement("div");

    actions.className = "management-report-inline-config-actions";

    actions.innerHTML = `
        <button
          class="management-report-inline-config-button"
          type="button"
          data-management-roadmap-edit-line="${rcsEsc(row.id)}"
        >
          Editar
        </button>

        <button
          class="
            management-report-inline-config-button
            is-primary
          "
          type="button"
          data-management-report-sources="${rcsEsc(row.id)}"
        >
          Fuentes
        </button>
      `;

    header.appendChild(actions);
  });

  document
    .querySelectorAll("[data-management-report-sources]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        renderManagementReportSourcesPanel(
          programId,
          button.dataset.managementReportSources,
        );
      });
    });
}
function bindManagementRoadmapLineEditors(programId) {
  applyManagementRoadmapInlineConfiguration(programId);

  const yearSelector = document.querySelector("[data-mgq-year]");

  if (yearSelector) {
    yearSelector.addEventListener("change", () => {
      getManagementRoadmapSnapshotState().year = Number(yearSelector.value);

      renderManagementRoadmapView(programId);
    });
  }

  document.querySelectorAll("[data-mgq-quarter]").forEach((button) => {
    button.addEventListener("click", () => {
      getManagementRoadmapSnapshotState().quarter = button.dataset.mgqQuarter;

      renderManagementRoadmapView(programId);
    });
  });

  document
    .querySelectorAll("[data-management-roadmap-edit-line]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const lineId = String(
          button.dataset.managementRoadmapEditLine || "",
        ).trim();

        if (!lineId) {
          return;
        }

        renderManagementRoadmapLineEditorPanel(programId, lineId);
      });
    });
}

function renderManagementRoadmapView(programId) {
  closeManagementRoadmapMappingPanel();
  closeManagementRoadmapLineEditorPanel();
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  const program = (DATA.programs || []).find(
    (item) =>
      String(item.id || "")
        .trim()
        .toLowerCase() === normalizedProgramId,
  );
  view.innerHTML = "";
  view.append(tpl("#management-roadmap-template"));
  setHead(
    `${program?.name || "Programa"} · Roadmap`,
    "Global Deliverables en desarrollo por producto y país.",
    `Retail Client Solutions > ${
      program?.name || programId
    } > Management Reports > Roadmap`,
  );
  const backButton = document.querySelector(".back-to-management-reports-btn");
  if (backButton) {
    backButton.dataset.route = `projects/${programId}`;
  }
  const pageSectionTitle = document.querySelector(
    "#managementRoadmapFilters",
  )?.previousElementSibling;
  if (pageSectionTitle) {
    const heading = pageSectionTitle.querySelector("h2");
    const description = pageSectionTitle.querySelector("p");
    if (heading) {
      heading.textContent = "Global Deliverables";
    }
    if (description) {
      description.textContent = "Seguimiento ejecutivo por producto y país.";
    }
  }
  const filtersContainer = document.querySelector("#managementRoadmapFilters");
  const board = document.querySelector("#managementRoadmapBoard");
  if (!filtersContainer || !board) {
    return;
  }
  const state = getManagementRoadmapSnapshotState();
  const mappingState = getManagementRoadmapMappingUiState();
  const availableProducts =
    getManagementRoadmapAvailableProducts(normalizedProgramId);
  if (!availableProducts.length) {
    filtersContainer.innerHTML = "";
    board.innerHTML = `
      <div
        class="
          management-deliverables-empty
        "
      >
        No hay información de Roadmap
        configurada para este programa.
      </div>
    `;
    return;
  }
  if (!availableProducts.includes(normalizeRoadmapProduct(state.productId))) {
    state.productId = availableProducts[0];
  }
  const availableCountries = getManagementRoadmapAvailableCountries(
    normalizedProgramId,
    state.productId,
  );
  if (!availableCountries.includes(state.countryId)) {
    state.countryId = availableCountries[0] || "ES";
  }
  filtersContainer.innerHTML = `
    <section
      class="
        management-deliverables-toolbar
      "
    >
      <div
        class="
          management-deliverables-filter-group
        "
      >
        <span
          class="
            management-deliverables-filter-label
          "
        >
          Producto
        </span>
        <div
          class="
            management-deliverables-selector
          "
          aria-label="Seleccionar producto"
        >
          ${availableProducts
            .map(
              (productId) => `
                <button
                  class="
                    management-deliverables-selector-btn
                    ${
                      normalizeRoadmapProduct(state.productId) === productId
                        ? "is-active"
                        : ""
                    }
                  "
                  type="button"
                  data-management-roadmap-product="${rcsEsc(productId)}"
                >
                  ${rcsEsc(getManagementRoadmapProductLabel(productId))}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
      <div
        class="
          management-deliverables-filter-group
        "
      >
        <span
          class="
            management-deliverables-filter-label
          "
        >
          País
        </span>
        <div
          class="
            management-deliverables-selector
          "
          aria-label="Seleccionar país"
        >
          ${availableCountries
            .map(
              (countryId) => `
                <button
                  class="
                    management-deliverables-selector-btn
                    ${state.countryId === countryId ? "is-active" : ""}
                  "
                  type="button"
                  data-management-roadmap-country="${rcsEsc(countryId)}"
                >
                  <span
                    aria-hidden="true"
                  >
                    ${getManagementRoadmapCountrySelectorFlag(countryId)}
                  </span>
                  ${rcsEsc(getManagementRoadmapCountrySelectorLabel(countryId))}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
      <div
        class="
          management-deliverables-filter-group
        "
      >
        <span
          class="
            management-deliverables-filter-label
          "
        >
          Configuración
        </span>
        <button
          class="
            management-roadmap-config-toggle
            ${mappingState.enabled ? "is-active" : ""}
          "
          type="button"
          data-management-roadmap-config-toggle
        >
          <span
            aria-hidden="true"
          >
            ⚙
          </span>
          ${
            mappingState.enabled
              ? "Salir de configuración"
              : "Configurar roadmap"
          }
        </button>
      </div>
    </section>
  `;
  board.innerHTML = `
    <section
      class="
        management-deliverables-view
      "
    >
      <article
        class="
          management-deliverables-content
        "
      >
        <header
          class="
            management-deliverables-content-header
          "
        >
          <h3>
            ${rcsEsc(getManagementRoadmapProductLabel(state.productId))}
          </h3>
          <div
            class="
              management-deliverables-country-strip
            "
          >
            <span
              aria-hidden="true"
            >
              ${getManagementRoadmapCountrySelectorFlag(state.countryId)}
            </span>
            <span>
              ${rcsEsc(
                getManagementRoadmapCountrySelectorLabel(state.countryId),
              )}
            </span>
          </div>
        </header>
        ${renderManagementRoadmapSnapshotTable(
          normalizedProgramId,
          state.productId,
          state.countryId,
        )}
      </article>
    </section>
  `;
  document
    .querySelectorAll("[data-management-roadmap-product]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setManagementRoadmapSnapshotProduct(
          button.dataset.managementRoadmapProduct,
        );
        renderManagementRoadmapView(normalizedProgramId);
      });
    });
  document
    .querySelectorAll("[data-management-roadmap-country]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setManagementRoadmapSnapshotCountry(
          button.dataset.managementRoadmapCountry,
        );
        renderManagementRoadmapView(normalizedProgramId);
      });
    });
  const configToggle = document.querySelector(
    "[data-management-roadmap-config-toggle]",
  );
  if (configToggle) {
    configToggle.addEventListener("click", () => {
      setManagementRoadmapMappingMode(
        !getManagementRoadmapMappingUiState().enabled,
      );
      renderManagementRoadmapView(normalizedProgramId);
    });
  }
  document
    .querySelectorAll("[data-management-roadmap-map-line]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        renderManagementRoadmapMappingPanel(
          normalizedProgramId,
          button.dataset.managementRoadmapMapLine,
        );
      });
    });
  bindManagementRoadmapLineEditors(normalizedProgramId);
  bindManagementRoadmapLineCreateButton(
    normalizedProgramId,
    state.productId,
    state.countryId,
  );
}

function bindManagementRoadmapLineCreateButton(
  programId,
  productId,
  countryId,
) {
  const button = document.querySelector(
    "[data-management-roadmap-create-line]",
  );
  if (!button) {
    return;
  }
  button.addEventListener("click", () => {
    renderManagementRoadmapNewLineEditorPanel(programId, productId, countryId);
  });
}

function renderRoadmapTrackingItem(item, programId, productId) {
  const status = rcsNormalizeStatus(item.status);
  const detailRoute = [
    "roadmap-detail",
    programId,
    productId,
    executiveQuarter || "ALL",
    item.type,
    item.id,
  ].join("/");
  return `
    <article
      class="project-card clickable-card"
      data-route="${rcsEsc(detailRoute)}"
      tabindex="0"
      role="link"
      aria-label="${rcsEsc(`Abrir detalle de ${item.typeLabel} ${item.title}`)}"
    >
      <div class="project-card-main">
        <div>
          <div class="executive-item-top">
            <span
              class="
                executive-item-type
                ${getRoadmapTypeClass(item.type)}
              "
            >
              ${rcsEsc(item.typeLabel)}
            </span>
            <span
              class="status-pill status-${status}"
            >
              ${rcsEsc(rcsStatusLabel(status))}
            </span>
          </div>
          <div class="project-name">
            ${rcsEsc(item.title)}
          </div>
          <div class="project-summary">
            ${rcsEsc(item.summary || item.description || "Sin descripción")}
          </div>
        </div>
        <div class="project-progress">
          ${rcsEsc(item.progress || 0)}%
        </div>
      </div>
      <div class="project-meta">
        <span>
          Owner:
          ${rcsEsc(item.owner || "-")}
        </span>
        <span>
          Hito:
          ${rcsEsc(item.nextMilestoneTitle || "-")}
        </span>
        <span>
          ${rcsEsc(formatDate(item.nextMilestoneDate || item.targetDate))}
        </span>
      </div>
      <div class="project-card-actions">
        <span class="project-card-action">
          Ver detalle →
        </span>
        ${rcsExternalLink(item)}
      </div>
    </article>
  `;
}
/*MSAs*/
/* loading overlay */

function showLoadingOverlay(
  message = "Actualizando la información del cockpit...",
) {
  const overlay = document.querySelector("#loadingOverlay");
  if (!overlay) {
    return;
  }
  if (
    window.RCS_LOADING_EXPERIENCE &&
    typeof window.RCS_LOADING_EXPERIENCE.start === "function"
  ) {
    window.RCS_LOADING_EXPERIENCE.start({
      overlay,
      message,
    });
    return;
  }
  /*
   * Fallback de seguridad.
   *
   * Si por cualquier motivo loading-experience.js
   * no estuviera disponible, conservamos exactamente
   * el comportamiento anterior.
   */
  const text = overlay.querySelector("p");
  if (text) {
    text.textContent = message;
  }
  overlay.hidden = false;
}

function hideLoadingOverlay() {
  const overlay = document.querySelector("#loadingOverlay");
  if (!overlay) {
    return;
  }
  if (
    window.RCS_LOADING_EXPERIENCE &&
    typeof window.RCS_LOADING_EXPERIENCE.stop === "function"
  ) {
    window.RCS_LOADING_EXPERIENCE.stop({
      overlay,
    });
    return;
  }
  overlay.hidden = true;
}
/* loading overlay */
/* executive summary by Q */

function getQuarterOrder(quarter) {
  return (
    {
      Q1: 1,
      Q2: 2,
      Q3: 3,
      Q4: 4,
    }[quarter] || 99
  );
}

function getExecutiveItems(programId) {
  const projects = getProgramProjects(programId).map((item) => ({
    ...item,
    itemType: "project",
    itemTypeLabel: "Proyecto",
  }));
  const msas = getProgramMsas(programId).map((item) => ({
    ...item,
    itemType: "msa",
    itemTypeLabel: "MSA",
  }));
  return [...projects, ...msas]
    .filter((item) => item.quarter)
    .sort((a, b) => {
      const quarterDiff =
        getQuarterOrder(a.quarter) - getQuarterOrder(b.quarter);
      if (quarterDiff !== 0) return quarterDiff;
      return Number(a.priority || 999) - Number(b.priority || 999);
    });
}

function renderExecutiveQuarterView(programId) {
  const container = document.querySelector("#executiveQuarterView");
  if (!container) return;
  const allItems = getExecutiveItems(programId);
  const visibleItems =
    executiveQuarter === "ALL"
      ? allItems
      : allItems.filter((item) => item.quarter === executiveQuarter);
  const groupedByQuarter = visibleItems.reduce((acc, item) => {
    const quarter = item.quarter || "Sin trimestre";
    if (!acc[quarter]) acc[quarter] = [];
    acc[quarter].push(item);
    return acc;
  }, {});
  const quartersToRender =
    executiveQuarter === "ALL"
      ? ["Q1", "Q2", "Q3", "Q4"].filter((q) => groupedByQuarter[q])
      : [executiveQuarter];
  if (!visibleItems.length) {
    container.innerHTML = `
      <p class="empty-state">
        No hay proyectos ni MSAs para esta selección.
      </p>
    `;
    return;
  }
  container.innerHTML = quartersToRender
    .map(
      (quarter) => `
        <section class="executive-quarter-group">
          <h4>${quarter}</h4>
          <div class="executive-quarter-grid">
            ${(groupedByQuarter[quarter] || [])
              .map((item) => {
                const status = rcsNormalizeStatus(item.status);
                return `
                  <article
                    class="executive-item-card"
                    data-executive-item-type="${item.itemType}"
                    data-executive-item-id="${rcsEsc(item.id)}"
                    role="button"
                    tabindex="0"
                  >
                    <div class="executive-item-top">
                      <span class="status-pill status-${status}">
                        ${rcsStatusLabel(status)}
                      </span>
                      <span class="executive-item-type">
                        ${item.itemTypeLabel}
                      </span>
                    </div>
                    <h5>${rcsEsc(item.name)}</h5>
                    <p>${rcsEsc(item.summary || "")}</p>
                    <div class="executive-item-meta">
                      <span>${rcsEsc(item.quarter)}</span>
                      <span>Prioridad ${rcsEsc(item.priority || "-")}</span>
                      <span>${rcsEsc(item.progress || 0)}%</span>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

/* executive summery by Q */
/* calendar */

function getPhaseStartDate(phase) {
  return parseValidDate(
    phase.startDate || phase.start_date || phase.start || phase.beginDate,
  );
}

function getPhaseEndDate(phase) {
  return parseValidDate(phase.endDate);
}

function getPhaseTargetDate(phase) {
  return parseValidDate(phase.targetDate || phase.target_date);
}

function parseValidDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function renderPhaseTimeline(phases, container, options = {}) {
  if (!container || !Array.isArray(phases)) {
    return;
  }
  if (!phases.length) {
    container.innerHTML = `
      <p class="empty-state">
        No hay actividades informadas.
      </p>
    `;
    return;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timelinePhases = phases.map((phase) => {
    const startDate = getPhaseStartDate(phase);
    const endDate = getPhaseEndDate(phase);
    const targetDate = getPhaseTargetDate(phase);
    const hasInvalidRange = Boolean(
      startDate && endDate && endDate < startDate,
    );
    let effectiveBarEnd = null;
    if (startDate && !hasInvalidRange) {
      if (endDate) {
        effectiveBarEnd = endDate;
      } else if (startDate <= today) {
        effectiveBarEnd = today;
      }
    }
    return {
      ...phase,
      _start: startDate,
      _end: endDate,
      _target: targetDate,
      _effectiveBarEnd: effectiveBarEnd,
      _hasInvalidRange: hasInvalidRange,
    };
  });
  const dateCandidates = [today];
  timelinePhases.forEach((phase) => {
    if (phase._start) {
      dateCandidates.push(phase._start);
    }
    if (phase._end) {
      dateCandidates.push(phase._end);
    }
    if (phase._target) {
      dateCandidates.push(phase._target);
    }
    if (phase._effectiveBarEnd) {
      dateCandidates.push(phase._effectiveBarEnd);
    }
  });
  const minDate = new Date(
    Math.min(...dateCandidates.map((date) => date.getTime())),
  );
  const maxDate = new Date(
    Math.max(...dateCandidates.map((date) => date.getTime())),
  );
  const months = [];
  const currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const lastMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  while (currentMonth <= lastMonth) {
    months.push(new Date(currentMonth));
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
  /*
   * Debe calcularse después de construir months.
   */
  const timelineMinWidth = 280 + months.length * 190;
  container.innerHTML = `
    <div class="phase-timeline-wrap">
      <div
        class="phase-timeline"
        style="
          --month-count:${months.length};
          min-width:${timelineMinWidth}px;
        "
      >
        ${buildTimeline(months, timelinePhases, options)}
      </div>
    </div>
  `;
  requestAnimationFrame(() => {
    const timelineWrap = container.querySelector(".phase-timeline-wrap");
    const currentMonthHeader = container.querySelector(
      ".timeline-month.timeline-current-month",
    );
    const todayLine = currentMonthHeader?.querySelector(".timeline-today-line");
    if (!timelineWrap || !currentMonthHeader || !todayLine) {
      return;
    }
    const todayPosition = currentMonthHeader.offsetLeft + todayLine.offsetLeft;
    const targetScrollLeft = todayPosition - timelineWrap.clientWidth / 2;
    timelineWrap.scrollLeft = Math.max(0, targetScrollLeft);
  });
}

function getTimelineTodayData(month) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth =
    today.getFullYear() === month.getFullYear() &&
    today.getMonth() === month.getMonth();
  if (!isCurrentMonth) {
    return {
      isCurrentMonth: false,
      position: 0,
      label: "",
    };
  }
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  /*
   * Se sitúa la línea en el centro del día actual.
   */
  const position = ((today.getDate() - 0.5) / daysInMonth) * 100;
  return {
    isCurrentMonth: true,
    position,
    label: today.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  };
}

function buildTimelineDateMeta(phase, showMissingDates = true) {
  const lines = [];
  if (phase._start && phase._end) {
    lines.push(`
      <small>
        Marco:
        ${rcsEsc(formatDate(phase._start))}
        →
        ${rcsEsc(formatDate(phase._end))}
      </small>
    `);
  } else {
    if (phase._start) {
      lines.push(`
        <small>
          Inicio:
          ${rcsEsc(formatDate(phase._start))}
        </small>
      `);
    }
    if (phase._end) {
      lines.push(`
        <small>
          Fin:
          ${rcsEsc(formatDate(phase._end))}
        </small>
      `);
    }
  }
  if (phase._target) {
    lines.push(`
      <small>
        Entrega:
        ${rcsEsc(formatDate(phase._target))}
      </small>
    `);
  }
  if (!lines.length && showMissingDates) {
    lines.push(`
      <small class="timeline-unplanned-label">
        Sin fechas informadas
      </small>
    `);
  }
  return lines.join("");
}

function buildTimeline(months, phases, options = {}) {
  const firstColumnLabel = options.firstColumnLabel || "Actividad";
  const showMissingDates = options.showMissingDates !== false;
  let html = `
    <div class="timeline-header">
      ${rcsEsc(firstColumnLabel)}
    </div>
  `;
  months.forEach((month) => {
    const todayData = getTimelineTodayData(month);
    html += `
      <div
        class="timeline-month ${
          todayData.isCurrentMonth ? "timeline-current-month" : ""
        }"
      >
        ${month.toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
        })}
        ${
          todayData.isCurrentMonth
            ? `
              <span
                class="
                  timeline-today-line
                  timeline-today-header
                "
                style="left:${todayData.position}%"
              >
                <em>
                  Hoy · ${rcsEsc(todayData.label)}
                </em>
              </span>
            `
            : ""
        }
      </div>
    `;
  });
  phases.forEach((phase) => {
    const itemName =
      phase.activityName ||
      phase.phaseName ||
      phase.name ||
      "Elemento sin nombre";
    const status = rcsNormalizeStatus(phase.status);
    const progress = Math.max(0, Math.min(100, Number(phase.progress || 0)));
    const hasTimelineBar = Boolean(
      phase._start &&
      phase._effectiveBarEnd &&
      !phase._hasInvalidRange &&
      phase._start <= phase._effectiveBarEnd,
    );
    const itemNameHtml =
      phase.detailRoute && !hasTimelineBar
        ? `
        <button
          type="button"
          class="timeline-item-link"
          data-route="${rcsEsc(phase.detailRoute)}"
        >
          ${rcsEsc(itemName)}
        </button>
      `
        : `
        <strong>
          ${rcsEsc(itemName)}
        </strong>
      `;
    html += `
      <div class="timeline-phase-name">
        ${itemNameHtml}
        <div class="timeline-activity-status">
          <span
            class="status-pill status-${status}"
          >
            ${rcsEsc(rcsStatusLabel(status))}
          </span>
          <strong
            class="timeline-activity-progress"
          >
            ${progress}%
          </strong>
        </div>
        ${
          phase.taskCount !== undefined
            ? `
                <small
                  class="timeline-activity-task-count"
                >
                  ${phase.taskCount}
                  ${phase.taskCount === 1 ? "tarea" : "tareas"}
                </small>
              `
            : ""
        }
        ${buildTimelineDateMeta(phase, showMissingDates)}
      </div>
    `;
    months.forEach((month) => {
      html += buildMonthCell(phase, month);
    });
  });
  return html;
}

function buildMonthCell(phase, month) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const todayData = getTimelineTodayData(month);
  const todayHtml = todayData.isCurrentMonth
    ? `
    <span
      class="timeline-today-line"
      style="left:${todayData.position}%"
      aria-hidden="true"
    ></span>
  `
    : "";
  /*
   * La barra solo puede pintarse si existe:
   *
   * - fecha de inicio
   * - fecha final efectiva
   *
   * _effectiveBarEnd será:
   * - endDate, cuando existe fecha fin
   * - hoy, cuando solo existe fecha inicio y ya ha comenzado
   * - null, cuando no debe pintarse barra
   */
  const barStart = phase._start;
  const barEnd = phase._effectiveBarEnd;
  const hasValidBar = Boolean(
    barStart && barEnd && barStart <= barEnd && !phase._hasInvalidRange,
  );
  const overlaps = hasValidBar && barStart <= monthEnd && barEnd >= monthStart;
  /*
   * El target es independiente de la barra.
   * Puede existir aunque no haya inicio ni fin.
   */
  const targetInMonth =
    phase._target &&
    phase._target.getFullYear() === month.getFullYear() &&
    phase._target.getMonth() === month.getMonth();
  if (!overlaps && !targetInMonth) {
    return `
    <div
      class="timeline-cell ${
        todayData.isCurrentMonth ? "timeline-current-month" : ""
      }"
    >
      ${todayHtml}
    </div>
  `;
  }
  const status = rcsNormalizeStatus(phase.status);
  let barHtml = "";
  if (overlaps) {
    const visibleStart = barStart > monthStart ? barStart : monthStart;
    const visibleEnd = barEnd < monthEnd ? barEnd : monthEnd;
    const daysInMonth = monthEnd.getDate();
    const startDay = visibleStart.getDate();
    const endDay = visibleEnd.getDate();
    const left = ((startDay - 1) / daysInMonth) * 100;
    const width = ((endDay - startDay + 1) / daysInMonth) * 100;
    const itemName =
      phase.activityName || phase.phaseName || phase.name || "Actividad";
    if (phase.detailRoute) {
      barHtml = `
    <button
      type="button"
      class="timeline-bar timeline-bar-link"
      data-route="${rcsEsc(phase.detailRoute)}"
      aria-label="Abrir detalle de ${rcsEsc(itemName)}"
      title="Abrir detalle de ${rcsEsc(itemName)}"
      style="
        left:${left}%;
        width:${Math.max(width, 1)}%;
      "
    ></button>
  `;
    } else {
      barHtml = `
    <span
      class="timeline-bar"
      style="
        left:${left}%;
        width:${Math.max(width, 1)}%;
      "
    ></span>
  `;
    }
  }
  let targetHtml = "";
  if (targetInMonth) {
    const daysInMonth = monthEnd.getDate();
    const targetDay = phase._target.getDate();
    const targetPosition = ((targetDay - 1) / daysInMonth) * 100;
    const isNearEnd = targetDay >= daysInMonth - 2;
    const safeLeft = isNearEnd ? 96 : Math.max(0, Math.min(targetPosition, 96));
    targetHtml = `
      <span
        class="timeline-target ${isNearEnd ? "is-near-end" : ""}"
        style="left:${safeLeft}%"
      >
        <em>
          🚩 ${formatDate(phase._target)}
        </em>
      </span>
    `;
  }
  return `
  <div
    class="timeline-cell timeline-${status} ${
      todayData.isCurrentMonth ? "timeline-current-month" : ""
    }"
  >
    ${barHtml}
    ${targetHtml}
    ${todayHtml}
  </div>
`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : parseValidDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
/* calendar */
/* teams */

function renderTeamsView(programId) {
  if (
    !window.RCS_STAFFING_DASHBOARD ||
    typeof window.RCS_STAFFING_DASHBOARD.render !== "function"
  ) {
    throw new Error("Staffing Dashboard no está disponible.");
  }
  const routeParts = String(location.hash || "")
    .replace(/^#\/?/, "")
    .split("/");
  const routeProgramId = String(routeParts[1] || "").trim();
  const routeProductId =
    routeProgramId === String(programId || "").trim()
      ? String(routeParts[2] || "").trim()
      : "";
  return window.RCS_STAFFING_DASHBOARD.render(programId, routeProductId);
}

function formatFte(value) {
  return Number(value || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function renderTeamsQuarterSelector() {
  const quarters = [
    {
      id: "ALL",
      label: "Último snapshot",
    },
    {
      id: "Q1",
      label: "Q1",
    },
    {
      id: "Q2",
      label: "Q2",
    },
    {
      id: "Q3",
      label: "Q3",
    },
    {
      id: "Q4",
      label: "Q4",
    },
  ];
  return `
    <div class="executive-filter-row">
      ${quarters
        .map(
          (quarter) => `
            <button
              class="quarter-btn ${
                selectedTeamQuarter === quarter.id ? "active" : ""
              }"
              type="button"
              data-team-quarter="${quarter.id}"
            >
              ${quarter.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function getRoadmapDetailBackRoute(programId, productId, quarter) {
  const storedRoute = sessionStorage.getItem(ROADMAP_DETAIL_RETURN_ROUTE_KEY);
  if (storedRoute) {
    const routeName = String(storedRoute).split("/")[0];
    if (routeName === "product" || routeName === "roadmap") {
      return storedRoute;
    }
  }
  /*
   * Fallback seguro.
   *
   * Nunca utilizamos ES/MX/etc.
   * como trimestre.
   */
  const safeQuarter = isValidRoadmapQuarter(quarter) ? quarter : "ALL";
  return ["roadmap", programId, productId, safeQuarter].join("/");
}

function getProductColor(product) {
  const key = String(product || "")
    .toLowerCase()
    .trim();
  const colors = {
    "blue buddy": "#1464c9",
    franquicia: "#20a676",
    "task automation": "#ff9f1c",
    "monitor & bex": "#6755c4",
    "cross desarrollo": "#37b7c9",
  };
  return colors[key] || "#60708f";
}

function renderProductPill(product) {
  const color = getProductColor(product);
  return `
    <span
      class="scrum-product-pill"
      style="--product-color:${color}"
    >
      ${rcsEsc(product || "Sin producto")}
    </span>
  `;
}

function closeManagementRoadmapLineEditorPanel() {
  const overlay = document.querySelector("#managementRoadmapLineEditorOverlay");
  if (overlay) {
    overlay.remove();
  }
}

function renderManagementRoadmapLineEditorPanelFromRecord(
  programId,
  line,
  { isCreate = false } = {},
) {
  closeManagementRoadmapLineEditorPanel();
  closeManagementRoadmapMappingPanel();
  if (!line) {
    return;
  }
  const statusKey = getManagementRoadmapEditableStatusKey(line);
  const originalCategory = String(line.category || "").trim();
  const originalCategoryTone = String(line.categoryTone || "").trim();
  const overlay = document.createElement("div");
  overlay.id = "managementRoadmapLineEditorOverlay";
  overlay.className = "management-roadmap-mapping-overlay";
  overlay.innerHTML = `
    <aside
      class="management-roadmap-mapping-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="managementRoadmapLineEditorTitle"
    >
      <header
        class="management-roadmap-mapping-header"
      >
        <div>
          <span
            class="management-roadmap-mapping-eyebrow"
          >
            ${isCreate ? "Nuevo deliverable" : "Configurar deliverable"}
          </span>
          <h2
            id="managementRoadmapLineEditorTitle"
          >
            ${isCreate ? "Crear deliverable" : rcsEsc(line.title)}
          </h2>
          <p>
            ${rcsEsc(getManagementRoadmapProductLabel(line.productId))}
            ·
            ${rcsEsc(getManagementRoadmapCountrySelectorLabel(line.country))}
          </p>
        </div>
        <button
          class="management-roadmap-mapping-close"
          type="button"
          data-management-roadmap-line-editor-close
          aria-label="Cerrar"
        >
          ×
        </button>
      </header>
      <div
        class="management-roadmap-mapping-body"
      >
        <section
          class="management-roadmap-mapping-section"
        >
          <div
            class="management-roadmap-line-meta"
          >
            <article>
              <span>
                ID
              </span>
              <strong>
                ${line.id ? rcsEsc(line.id) : "Se generará al guardar"}
              </strong>
            </article>
            <article>
              <span>
                Producto
              </span>
              <strong>
                ${rcsEsc(getManagementRoadmapProductLabel(line.productId))}
              </strong>
            </article>
            <article>
              <span>
                País
              </span>
              <strong>
                ${rcsEsc(
                  getManagementRoadmapCountrySelectorLabel(line.country),
                )}
              </strong>
            </article>
          </div>
          <div
            class="management-roadmap-line-form"
          >
            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementRoadmapLineTitle"
              >
                Deliverable
              </label>
              <input
                id="managementRoadmapLineTitle"
                class="management-roadmap-line-input"
                type="text"
                value="${rcsEsc(line.title || "")}"
              />
            </div>
            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementRoadmapLineCategory"
              >
                Categoría
              </label>
              <input
                id="managementRoadmapLineCategory"
                class="management-roadmap-line-input"
                type="text"
                value="${rcsEsc(line.category || "")}"
                placeholder="Ej. Aumento conocimiento"
              />
            </div>
            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementRoadmapLineStatus"
              >
                Estado
              </label>
              <select
                id="managementRoadmapLineStatus"
                class="management-roadmap-line-select"
              >
                ${Object.values(MANAGEMENT_ROADMAP_EDITABLE_STATUSES)
                  .map(
                    (option) => `
                      <option
                        value="${rcsEsc(option.key)}"
                        ${statusKey === option.key ? "selected" : ""}
                      >
                        ${rcsEsc(option.statusLabel)}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>
            <div
              class="management-roadmap-line-field"
            >
              <label
                for="managementRoadmapLineComments"
              >
                Comentarios
              </label>
              <textarea
                id="managementRoadmapLineComments"
                class="management-roadmap-line-textarea"
              >${rcsEsc(line.comments || "")}</textarea>
            </div>
          </div>
        </section>
      </div>
      <footer
        class="management-roadmap-mapping-footer"
      >
        <div>
          <strong>
            Management Roadmap Lines
          </strong>
          <span>
            Los cambios se guardarán en el origen del Cockpit.
          </span>
        </div>
        <div
          class="management-roadmap-mapping-footer-actions"
        >
          ${
            isCreate
              ? ""
              : `
                <button
                  class="management-roadmap-line-delete-button"
                  type="button"
                  data-management-roadmap-line-editor-delete
                >
                  Eliminar
                </button>
              `
          }
          <button
            class="ghost-button"
            type="button"
            data-management-roadmap-line-editor-close
          >
            Cancelar
          </button>
          <button
            class="management-roadmap-mapping-save"
            type="button"
            data-management-roadmap-line-editor-save
          >
            ${isCreate ? "Crear" : "Guardar"}
          </button>
        </div>
      </footer>
    </aside>
  `;
  document.body.appendChild(overlay);
  overlay
    .querySelectorAll("[data-management-roadmap-line-editor-close]")
    .forEach((button) => {
      button.addEventListener("click", closeManagementRoadmapLineEditorPanel);
    });
  const deleteButton = overlay.querySelector(
    "[data-management-roadmap-line-editor-delete]",
  );
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`¿Quieres eliminar "${line.title}"?`);
      if (!confirmed) {
        return;
      }
      await deleteManagementRoadmapLine(programId, line.id);
    });
  }
  const saveButton = overlay.querySelector(
    "[data-management-roadmap-line-editor-save]",
  );
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const title = String(
        overlay.querySelector("#managementRoadmapLineTitle")?.value || "",
      ).trim();
      if (!title) {
        window.alert("El deliverable necesita un nombre.");
        return;
      }
      const category = String(
        overlay.querySelector("#managementRoadmapLineCategory")?.value || "",
      ).trim();
      /*
       * Si no se cambia la categoría,
       * mantenemos su tono actual.
       *
       * Si se escribe una categoría nueva,
       * dejamos categoryTone vacío para
       * utilizar el estilo neutro.
       */
      const categoryTone =
        category === originalCategory ? originalCategoryTone : "";
      const selectedStatusKey = String(
        overlay.querySelector("#managementRoadmapLineStatus")?.value ||
          "on-track",
      ).trim();
      const statusConfig =
        MANAGEMENT_ROADMAP_EDITABLE_STATUSES[selectedStatusKey] ||
        MANAGEMENT_ROADMAP_EDITABLE_STATUSES["on-track"];
      const comments = String(
        overlay.querySelector("#managementRoadmapLineComments")?.value || "",
      ).trim();
      const updatedLine = {
        ...line,
        title,
        category,
        categoryTone,
        status: statusConfig.status,
        statusLabel: statusConfig.statusLabel,
        statusTone: statusConfig.statusTone,
        comments,
        active: true,
      };
      await saveManagementRoadmapLine(programId, updatedLine);
    });
  }
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeManagementRoadmapLineEditorPanel();
    }
  });
}

function renderManagementRoadmapNewLineEditorPanel(
  programId,
  productId,
  countryId,
) {
  const draftLine = buildManagementRoadmapDraftLine(
    programId,
    productId,
    countryId,
  );
  renderManagementRoadmapLineEditorPanelFromRecord(programId, draftLine, {
    isCreate: true,
  });
}

function renderManagementRoadmapLineEditorPanel(programId, lineId) {
  const line = getManagementRoadmapLineById(lineId);
  if (!line) {
    return;
  }
  renderManagementRoadmapLineEditorPanelFromRecord(programId, line, {
    isCreate: false,
  });
}

function buildManagementRoadmapPersistableLines(lines) {
  const result = new Map();

  (Array.isArray(lines) ? lines : []).forEach((line, index) => {
    const normalized = normalizeManagementRoadmapLine(line, index + 1);

    if (!normalized.id || !normalized.title) {
      return;
    }

    result.set(normalized.id.toLowerCase(), {
      id: normalized.id,

      programId: normalized.programId,

      productId: normalized.productId,

      country: normalized.country,

      year: normalized.year,

      order: normalized.order,

      reportId: normalized.reportId,

      category: normalized.category,

      categoryTone: normalized.categoryTone,

      title: normalized.title,

      owner: normalized.owner,

      quarter: normalized.quarter,

      startDate: normalized.startDate,

      endDate: normalized.endDate,

      status: normalized.status,

      statusLabel: normalized.statusLabel,

      statusTone: normalized.statusTone,

      comments: normalized.comments,

      manualValue: normalizeManagementGlobalStatusManualValue(
        line?.manualValue || normalized?.manualValue,
      ),

      active: normalized.active,
    });
  });

  return [...result.values()];
}

function getManagementRoadmapLinesPersistenceSignature(lines) {
  return buildManagementRoadmapPersistableLines(lines)
    .map((line) =>
      JSON.stringify({
        id: line.id,

        programId: line.programId,

        productId: line.productId,

        country: line.country,

        year: line.year,

        order: line.order,

        reportId: line.reportId,

        title: line.title,

        owner: line.owner,

        quarter: line.quarter,

        startDate: line.startDate,

        endDate: line.endDate,

        status: line.status,

        statusLabel: line.statusLabel,

        statusTone: line.statusTone,

        comments: line.comments,

        manualValue: line.manualValue,

        active: line.active,
      }),
    )
    .sort()
    .join("|");
}
async function saveManagementRoadmapLine(programId, updatedLine) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const source = getProgramSource(normalizedProgramId);

  if (!source || !source.driveJsonUrl) {
    window.alert("No existe un Web App configurado para guardar el Roadmap.");

    return;
  }

  const saveButton = document.querySelector(
    "[data-management-roadmap-line-editor-save]",
  );

  if (saveButton) {
    saveButton.disabled = true;

    saveButton.textContent = "Guardando...";
  }

  try {
    /*
     * =====================================================
     * ESTADO ACTUAL
     * =====================================================
     */

    const currentLines = getEffectiveManagementExecutiveLines();

    const normalizedUpdatedLine = normalizeManagementRoadmapLine(
      updatedLine,
      updatedLine?.order,
    );

    const resolvedId =
      normalizedUpdatedLine.id ||
      buildManagementRoadmapLineId(
        normalizedUpdatedLine.productId,
        normalizedUpdatedLine.country,
        normalizedUpdatedLine.title,
        currentLines,
      );

    const lineToPersist = {
      ...normalizedUpdatedLine,

      id: resolvedId,

      manualValue: normalizeManagementGlobalStatusManualValue(
        updatedLine?.manualValue,
      ),
    };

    const nextLines = buildManagementRoadmapPersistableLines([
      ...currentLines.filter(
        (line) =>
          String(line?.id || "")
            .trim()
            .toLowerCase() !== resolvedId.toLowerCase(),
      ),

      lineToPersist,
    ]);

    /*
     * =====================================================
     * ESCRITURA
     * =====================================================
     */

    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

    endpoint.searchParams.delete("action");

    await fetch(endpoint.toString(), {
      method: "POST",

      mode: "no-cors",

      credentials: "include",

      cache: "no-store",

      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },

      body: JSON.stringify({
        action: "save-management-roadmap-lines",

        lines: nextLines,
      }),
    });

    /*
     * Damos tiempo a SpreadsheetApp.flush()
     * y a finalizar el doPost.
     */
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    /*
     * =====================================================
     * VERIFICACIÓN DIRECTA
     * =====================================================
     *
     * IMPORTANTE:
     *
     * No verificamos contra el snapshot general de Drive.
     *
     * Leemos directamente:
     *
     * action=management-roadmap-config
     *
     * De esta forma comprobamos el contenido real de:
     *
     * Management Roadmap Lines
     *
     * y evitamos falsos negativos por caché del snapshot.
     * =====================================================
     */

    const persistedConfig =
      await loadManagementRoadmapConfig(normalizedProgramId);

    const persistedLines = buildManagementRoadmapPersistableLines(
      persistedConfig?.managementRoadmapLines,
    );

    const expectedSignature =
      getManagementRoadmapLinesPersistenceSignature(nextLines);

    const persistedSignature =
      getManagementRoadmapLinesPersistenceSignature(persistedLines);

    if (expectedSignature !== persistedSignature) {
      console.error("[Management Roadmap] Diferencia tras guardar", {
        expected: nextLines,
        persisted: persistedLines,
      });

      throw new Error(
        "La configuración guardada no coincide con la recuperada de Management Roadmap Lines.",
      );
    }

    /*
     * =====================================================
     * ESTADO LOCAL
     * =====================================================
     */

    DATA.managementRoadmapLines = persistedLines;

    if (Array.isArray(persistedConfig?.managementRoadmapLinks)) {
      DATA.managementRoadmapLinks = buildManagementRoadmapPersistableLinks(
        persistedConfig.managementRoadmapLinks,
      );
    }

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLines: DATA.managementRoadmapLines,

        managementRoadmapLinks: DATA.managementRoadmapLinks,
      });
    }

    /*
     * =====================================================
     * CIERRE
     * =====================================================
     */

    closeManagementRoadmapLineEditorPanel();

    const reportId = String(lineToPersist?.reportId || "")
      .trim()
      .toLowerCase();

    if (reportId === "pase-a-especialista") {
      renderManagementSpecialistRoadmapView(normalizedProgramId);
    } else {
      renderManagementRoadmapView(normalizedProgramId);
    }
  } catch (error) {
    console.error("[Management Roadmap] Error guardando deliverable", error);

    if (saveButton) {
      saveButton.disabled = false;

      saveButton.textContent = "Guardar";
    }

    window.alert(error?.message || "No se han podido guardar los cambios.");
  }
}

async function deleteManagementRoadmapLine(programId, lineId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedLineId = String(lineId || "").trim();

  if (!normalizedLineId) {
    return;
  }

  const source = getProgramSource(normalizedProgramId);

  if (!source || !source.driveJsonUrl) {
    window.alert(
      "No existe un Web App configurado para eliminar el deliverable.",
    );

    return;
  }

  const currentLine = getManagementRoadmapLineById(normalizedLineId);

  const deleteButton = document.querySelector(
    "[data-management-roadmap-line-editor-delete]",
  );

  if (deleteButton) {
    deleteButton.disabled = true;

    deleteButton.textContent = "Eliminando...";
  }

  try {
    /*
     * =====================================================
     * ELIMINACIÓN
     * =====================================================
     */

    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

    endpoint.searchParams.delete("action");

    await fetch(endpoint.toString(), {
      method: "POST",

      mode: "no-cors",

      credentials: "include",

      cache: "no-store",

      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },

      body: JSON.stringify({
        action: "delete-management-roadmap-line",

        lineId: normalizedLineId,
      }),
    });

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    /*
     * =====================================================
     * VERIFICACIÓN DIRECTA
     * =====================================================
     */

    const persistedConfig =
      await loadManagementRoadmapConfig(normalizedProgramId);

    const persistedLines = buildManagementRoadmapPersistableLines(
      persistedConfig?.managementRoadmapLines,
    );

    const stillExists = persistedLines.some(
      (line) =>
        String(line.id || "")
          .trim()
          .toLowerCase() === normalizedLineId.toLowerCase(),
    );

    if (stillExists) {
      throw new Error(
        "La tarea sigue apareciendo en Management Roadmap Lines después de eliminarla.",
      );
    }

    const persistedLinks = buildManagementRoadmapPersistableLinks(
      persistedConfig?.managementRoadmapLinks,
    );

    const orphanLinks = persistedLinks.filter(
      (link) =>
        String(link.executiveLineId || "")
          .trim()
          .toLowerCase() === normalizedLineId.toLowerCase(),
    );

    if (orphanLinks.length) {
      throw new Error(
        "La tarea se ha eliminado, pero todavía existen fuentes asociadas.",
      );
    }

    /*
     * =====================================================
     * ESTADO LOCAL
     * =====================================================
     */

    DATA.managementRoadmapLines = persistedLines;

    DATA.managementRoadmapLinks = persistedLinks;

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLines: persistedLines,

        managementRoadmapLinks: persistedLinks,
      });
    }

    closeManagementRoadmapLineEditorPanel();

    /*
     * =====================================================
     * VOLVER A LA VISTA CORRECTA
     * =====================================================
     */

    const reportId = String(currentLine?.reportId || "")
      .trim()
      .toLowerCase();

    if (reportId === "pase-a-especialista") {
      renderManagementSpecialistRoadmapView(normalizedProgramId);
    } else {
      renderManagementRoadmapView(normalizedProgramId);
    }
  } catch (error) {
    console.error("[Management Roadmap] Error eliminando deliverable", error);

    if (deleteButton) {
      deleteButton.disabled = false;

      deleteButton.textContent = "Eliminar";
    }

    window.alert(error?.message || "No se ha podido eliminar la tarea.");
  }
}

function getRcsAccessState() {
  if (!window.RCS_ACCESS_STATE) {
    window.RCS_ACCESS_STATE = {
      blocked: false,
      portfolio: null,
      programs: {},
      spreadsheets: {},
    };
  }
  return window.RCS_ACCESS_STATE;
}

function normalizeRcsAccessResult(payload, spreadsheetId) {
  const access =
    payload && payload.access && typeof payload.access === "object"
      ? payload.access
      : {};

  const user =
    access.user && typeof access.user === "object" ? access.user : {};

  const landing =
    payload && payload.landing && typeof payload.landing === "object"
      ? payload.landing
      : null;

  return {
    spreadsheetId,

    granted: payload?.ok === true && access.granted === true,

    role:
      access.role === "editor"
        ? "editor"
        : access.role === "viewer"
          ? "viewer"
          : "none",

    canEdit: payload?.ok === true && access.canEdit === true,

    user: {
      name: String(user.name || "").trim(),

      email: String(user.email || "").trim(),
    },

    landing: landing
      ? {
          available: landing.available === true,

          portfolioKpis: Array.isArray(landing.portfolioKpis)
            ? landing.portfolioKpis
            : [],

          programs: Array.isArray(landing.programs) ? landing.programs : [],

          error: String(landing.error || "").trim(),

          generatedAt: String(landing.generatedAt || "").trim(),
        }
      : null,

    code: String(payload?.code || "").trim(),

    checkedAt: Date.now(),
  };
}

async function loadRcsSpreadsheetAccess(
  spreadsheetId,
  forceRefresh = false,
  { includeLanding = false, refreshLanding = false, timeoutMs = null } = {},
) {
  const normalizedSpreadsheetId = String(spreadsheetId || "").trim();

  if (!normalizedSpreadsheetId) {
    return {
      spreadsheetId: "",

      granted: false,

      role: "none",

      canEdit: false,

      landing: null,

      code: "SPREADSHEET_ID_MISSING",

      checkedAt: Date.now(),
    };
  }

  const config = window.APP_CONFIG?.accessControl;

  if (!config?.driveJsonUrl || config.driveJsonUrl.includes("PEGA_AQUI")) {
    return {
      spreadsheetId: normalizedSpreadsheetId,

      granted: false,

      role: "none",

      canEdit: false,

      landing: null,

      code: "ACCESS_CONTROL_NOT_CONFIGURED",

      checkedAt: Date.now(),
    };
  }

  const state = getRcsAccessState();

  /*
   * =====================================================
   * L1 · MEMORY CACHE
   * =====================================================
   */

  const memoryCached = state.spreadsheets[normalizedSpreadsheetId] || null;

  const memoryHasLanding =
    memoryCached?.landing && typeof memoryCached.landing === "object";

  if (!forceRefresh && memoryCached && (!includeLanding || memoryHasLanding)) {
    return memoryCached;
  }

  /*
   * =====================================================
   * L2 · SESSION CACHE
   * =====================================================
   *
   * La leemos también cuando forceRefresh=true.
   *
   * En ese caso no la devolvemos directamente,
   * pero podremos conservarla como fallback si
   * Apps Script tiene un fallo temporal.
   */

  const sessionCached = readRcsSessionCache("access", normalizedSpreadsheetId);

  const sessionAccess = sessionCached?.data || null;

  const sessionHasLanding =
    sessionAccess?.landing && typeof sessionAccess.landing === "object";

  if (
    !forceRefresh &&
    sessionAccess &&
    (!includeLanding || sessionHasLanding)
  ) {
    state.spreadsheets[normalizedSpreadsheetId] = sessionAccess;

    return sessionAccess;
  }

  /*
   * =====================================================
   * ÚLTIMO ACCESO VÁLIDO
   * =====================================================
   *
   * Un fallo técnico del endpoint no debe convertir
   * automáticamente a un usuario ya validado en un
   * usuario pendiente de OAuth.
   */

  const reusableAccess =
    memoryCached?.granted === true
      ? memoryCached
      : sessionAccess?.granted === true
        ? sessionAccess
        : null;

  const reusableHasLanding =
    reusableAccess?.landing && typeof reusableAccess.landing === "object";

  /*
   * =====================================================
   * ACCESS CONTROL REAL
   * =====================================================
   */

  const url = new URL(config.driveJsonUrl, window.location.href);

  url.searchParams.set("spreadsheetId", normalizedSpreadsheetId);

  if (includeLanding) {
    url.searchParams.set("includeLanding", "1");
  }

  if (refreshLanding) {
    url.searchParams.set("refreshLanding", "1");
  }

  const effectiveTimeoutMs =
    Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 30000;

  const previouslyAuthorized = hasRcsAuthorizationMarker(
    "access-control",
    config.driveJsonUrl,
  );

  try {
    const payload = await loadJsonp(url.toString(), {
      timeoutMs: effectiveTimeoutMs,

      retries: 0,

      cacheBust: true,
    });

    /*
     * Hemos conseguido ejecutar el Web App.
     *
     * Independientemente de que el usuario
     * tenga permiso sobre la Spreadsheet,
     * Google ya ha completado la autorización
     * necesaria para ejecutar este endpoint.
     */
    markRcsAuthorizationMarker("access-control", config.driveJsonUrl);

    const access = normalizeRcsAccessResult(payload, normalizedSpreadsheetId);

    /*
     * ===================================================
     * SESSION
     * ===================================================
     */

    if (access.granted || access.code === "ACCESS_DENIED") {
      state.spreadsheets[normalizedSpreadsheetId] = access;

      writeRcsSessionCache(
        "access",
        normalizedSpreadsheetId,
        access,
        new Date(access.checkedAt || Date.now()),
      );
    }

    return access;
  } catch (error) {
    console.error("[RCS Access] No se pudo validar la Spreadsheet.", error);

    const message = String(error?.message || error || "")
      .trim()
      .toLowerCase();

    const errorCode = String(error?.code || "").trim();

    const scriptError = errorCode === "JSONP_SCRIPT_ERROR";

    const timeout =
      errorCode === "JSONP_TIMEOUT" ||
      message.includes("tiempo de espera") ||
      message.includes("timeout");

    /*
     * ===================================================
     * FALLBACK DE ACCESO
     * ===================================================
     *
     * Si el usuario ya estaba validado en esta sesión
     * y el Access Control tiene un fallo temporal,
     * mantenemos ese acceso.
     *
     * No hacemos esto durante un refresh explícito
     * de la landing, porque ahí sí queremos conocer
     * el resultado real de la actualización.
     */

    const canReuseAccess =
      !refreshLanding &&
      reusableAccess &&
      (!includeLanding || reusableHasLanding);

    if (canReuseAccess && (scriptError || timeout)) {
      console.warn(
        "[RCS Access] Fallo temporal de validación. Se mantiene el acceso ya validado en sesión.",
      );

      state.spreadsheets[normalizedSpreadsheetId] = reusableAccess;

      return reusableAccess;
    }

    /*
     * ===================================================
     * PRIMER ACCESO REAL
     * ===================================================
     *
     * Un JSONP_SCRIPT_ERROR sólo se considera OAuth
     * pendiente cuando este navegador nunca ha
     * conseguido ejecutar correctamente el Web App.
     */

    const authorizationRequired = scriptError && !previouslyAuthorized;

    const authorizationUrl = new URL(config.driveJsonUrl, window.location.href);

    authorizationUrl.searchParams.set("mode", "authorize");

    authorizationUrl.searchParams.set("spreadsheetId", normalizedSpreadsheetId);

    return {
      spreadsheetId: normalizedSpreadsheetId,

      granted: false,

      role: "none",

      canEdit: false,

      landing: null,

      code: authorizationRequired
        ? "AUTHORIZATION_REQUIRED"
        : timeout
          ? "ACCESS_TIMEOUT"
          : "ACCESS_CHECK_FAILED",

      authorization: authorizationRequired
        ? {
            kind: "access-control",

            url: authorizationUrl.toString(),

            probeUrl: url.toString(),

            spreadsheetId: normalizedSpreadsheetId,

            label: includeLanding ? "RCS Cockpit" : "el programa seleccionado",
          }
        : null,

      checkedAt: Date.now(),
    };
  }
}

async function ensureRcsPortfolioAccess(
  forceRefresh = false,
  { refreshLanding = false } = {},
) {
  const state = getRcsAccessState();

  const spreadsheetId = String(
    window.APP_CONFIG?.portfolio?.spreadsheetId || "",
  ).trim();

  const access = await loadRcsSpreadsheetAccess(spreadsheetId, forceRefresh, {
    includeLanding: true,
    refreshLanding,
  });

  state.portfolio = access;

  return access;
}
function installPortfolioLandingData(landing) {
  if (
    !landing ||
    landing.available !== true ||
    !Array.isArray(landing.programs)
  ) {
    return false;
  }

  PORTFOLIO_DATA = normalizePortfolioData({
    portfolioKpis: landing.portfolioKpis,

    programs: landing.programs,
  });

  buildProgramSources(PORTFOLIO_DATA.programs);

  const generatedAt = landing.generatedAt
    ? new Date(landing.generatedAt)
    : new Date();

  PORTFOLIO_LAST_LOADED_AT = Number.isNaN(generatedAt.getTime())
    ? new Date()
    : generatedAt;

  writeRcsSessionCache(
    "portfolio",
    "",
    PORTFOLIO_DATA,
    PORTFOLIO_LAST_LOADED_AT,
  );

  return true;
}
async function ensureRcsProgramAccess(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!normalizedProgramId) {
    return {
      granted: false,
      role: "none",
      canEdit: false,
      code: "PROGRAM_ID_MISSING",
      checkedAt: Date.now(),
    };
  }

  const source = getProgramSource(normalizedProgramId);

  if (!source?.spreadsheetId) {
    return {
      granted: false,
      role: "none",
      canEdit: false,
      code: "PROGRAM_SPREADSHEET_ID_MISSING",
      checkedAt: Date.now(),
    };
  }

  const spreadsheetId = String(source.spreadsheetId || "").trim();

  const access = await loadRcsSpreadsheetAccess(spreadsheetId, forceRefresh, {
    /*
     * Access Control ligero.
     *
     * Dejamos margen suficiente para
     * cold starts de Apps Script.
     */
    timeoutMs: 30000,
  });

  const state = getRcsAccessState();

  state.programs[normalizedProgramId] = access;

  applyRcsEditPermissions(normalizedProgramId);

  return access;
}

function rcsCanEdit(programId = null) {
  const state = getRcsAccessState();
  if (!programId) {
    return state.portfolio?.canEdit === true;
  }
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  return state.programs[normalizedProgramId]?.canEdit === true;
}

function applyRcsEditPermissions(programId = null) {
  const canEdit = rcsCanEdit(programId);
  document.documentElement.dataset.rcsCanEdit = canEdit ? "true" : "false";
  renderRcsAccessRoleBadge(programId);
  if (!canEdit && typeof setManagementRoadmapMappingMode === "function") {
    setManagementRoadmapMappingMode(false);
  }
}

function clearRcsSessionCache() {
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key && key.startsWith("rcsCockpit:")) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("[RCS Access] No se pudo limpiar sessionStorage.", error);
  }
}

function renderRcsAccessScreen(access) {
  const current = document.getElementById("rcsAccessScreen");

  if (current) {
    current.remove();
  }

  const code = String(access?.code || "").trim();

  const denied = code === "ACCESS_DENIED";

  const authorizationRequired = code === "AUTHORIZATION_REQUIRED";

  const timeout = code === "ACCESS_TIMEOUT";

  const authorizationLabel = String(access?.authorization?.label || "").trim();

  const screen = document.createElement("section");

  screen.id = "rcsAccessScreen";

  screen.className = "rcs-access-screen";

  let title = "No se puede validar el acceso";

  let message =
    "No se ha podido comprobar tu acceso al RCS Cockpit. Por seguridad no se mostrará información hasta completar la validación.";

  let buttonLabel = "Reintentar";

  let infoHtml = "";

  if (denied) {
    title = "Acceso no autorizado";

    message =
      "Tu cuenta no dispone de acceso al RCS Cockpit. Solicita acceso de lectura o edición a la Spreadsheet correspondiente.";
  } else if (authorizationRequired) {
    title = "Primera validación de acceso";

    message = authorizationLabel
      ? `Google Workspace necesita validar tu cuenta antes de acceder a ${authorizationLabel}.`
      : "Google Workspace necesita validar tu cuenta antes de acceder al RCS Cockpit.";

    buttonLabel = "Validar acceso";

    infoHtml = `
      <div class="rcs-access-info">
        <span class="rcs-access-info-icon">
          i
        </span>

        <div class="rcs-access-info-content">
          <strong class="rcs-access-info-title">
            Normalmente sólo tendrás que hacer esto una vez
          </strong>

          <span class="rcs-access-info-text">
            Al pulsar “Validar acceso” se abrirá Google Workspace
            para revisar los permisos. Mantén abiertas ambas ventanas.
            Cuando termines, el Cockpit continuará automáticamente.
          </span>
        </div>
      </div>
    `;
  } else if (timeout) {
    title = "La validación está tardando";

    message =
      "Google Workspace todavía no ha podido completar la comprobación de acceso.";

    infoHtml = `
      <div class="rcs-access-info">
        <span class="rcs-access-info-icon">
          i
        </span>

        <div class="rcs-access-info-content">
          <strong class="rcs-access-info-title">
            No cierres la ventana
          </strong>

          <span class="rcs-access-info-text">
            En algunos casos la primera validación puede tardar
            varios minutos. Puedes pulsar “Reintentar” para
            continuar la comprobación.
          </span>
        </div>
      </div>
    `;
  }

  screen.innerHTML = `
    <article class="rcs-access-card">
      <span class="rcs-access-brand">
        BBVA
      </span>

      <h1>
        ${title}
      </h1>

      <p id="rcsAccessMainMessage">
        ${message}
      </p>

      ${infoHtml}

      <div
        id="rcsAccessProgress"
        class="rcs-access-progress"
        role="status"
        aria-live="polite"
      >
        <span
          class="rcs-access-spinner"
          aria-hidden="true"
        ></span>

        <span>
          Validando identidad y permisos. No cierres esta ventana.
        </span>
      </div>

      <button
        type="button"
        id="rcsAccessAction"
      >
        ${buttonLabel}
      </button>
    </article>
  `;

  const app = document.getElementById("app");

  if (app) {
    app.hidden = true;
  }

  document.body.appendChild(screen);

  screen.querySelector("#rcsAccessAction")?.addEventListener("click", () => {
    if (authorizationRequired) {
      setRcsAccessValidationProgress(true);

      openRcsAccessAuthorization(access);

      return;
    }

    window.location.reload();
  });
}

function blockRcsCockpitAccess(access) {
  const state = getRcsAccessState();

  state.blocked = true;

  /*
   * Sólo eliminamos la sesión cuando el backend
   * ha confirmado explícitamente que el usuario
   * ya no tiene acceso.
   *
   * Un timeout, un error de red o un fallo temporal
   * de Apps Script no invalidan un permiso que ya
   * había sido comprobado correctamente.
   */
  const code = String(access?.code || "").trim();

  if (code === "ACCESS_DENIED") {
    clearRcsSessionCache();
  }

  renderRcsAccessScreen(access);
}

function restoreRcsCockpitAccess() {
  const state = getRcsAccessState();
  state.blocked = false;
  const screen = document.getElementById("rcsAccessScreen");
  if (screen) {
    screen.remove();
  }
  const app = document.getElementById("app");
  if (app) {
    app.hidden = false;
  }
}

function getRcsCurrentProgramId() {
  const hash = String(window.location.hash || "")
    .replace(/^#\/?/, "")
    .trim();
  if (!hash || hash === "landing") {
    return null;
  }
  const routeParts = hash
    .split("/")
    .map((part) => decodeURIComponent(part).trim().toLowerCase())
    .filter(Boolean);
  const programId = routeParts.find((part) => PROGRAM_SOURCES.has(part));
  return programId || null;
}

function getRcsEffectiveAccess(programId = null) {
  const state = getRcsAccessState();
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  if (normalizedProgramId) {
    return (
      state.programs[normalizedProgramId] || {
        granted: false,
        role: "none",
        canEdit: false,
      }
    );
  }
  return (
    state.portfolio || {
      granted: false,
      role: "none",
      canEdit: false,
    }
  );
}

function getRcsAccessRoleLabel(access) {
  if (!access?.granted) {
    return "";
  }
  if (access.role === "editor") {
    return "Editor";
  }
  if (access.role === "viewer") {
    return "Lector";
  }
  return "";
}

function getRcsAccessScopeLabel(programId = null) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();
  if (!normalizedProgramId) {
    return "Portfolio";
  }
  const program = (PORTFOLIO_DATA?.programs || []).find(
    (item) =>
      String(item?.id || "")
        .trim()
        .toLowerCase() === normalizedProgramId,
  );
  if (program?.name) {
    return program.name;
  }
  return normalizedProgramId;
}

function renderRcsConnectedUser(programId = null) {
  const container = document.querySelector(".data-status-main");
  if (!container) {
    return;
  }
  let element = document.querySelector("#rcsConnectedUser");
  if (!element) {
    element = document.createElement("span");
    element.id = "rcsConnectedUser";
    element.className = "rcs-connected-user";
    container.prepend(element);
  }
  const access = getRcsEffectiveAccess(programId);
  const user = access?.user || {};
  const name = String(user.name || "").trim();
  const email = String(user.email || "").trim();
  if (!access?.granted || (!name && !email)) {
    element.hidden = true;
    element.textContent = "";
    element.removeAttribute("title");
    return;
  }
  element.hidden = false;
  element.textContent = name || email;
  if (email) {
    element.title = email;
  } else {
    element.removeAttribute("title");
  }
}

function renderRcsAccessRoleBadge(programId = null) {
  let badge = document.querySelector("#rcsAccessRoleBadge");
  const container = document.querySelector(".data-status-main");
  if (!container) {
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "rcsAccessRoleBadge";
    badge.className = "rcs-access-role";
    container.prepend(badge);
  }
  const access = getRcsEffectiveAccess(programId);
  const roleLabel = getRcsAccessRoleLabel(access);
  if (!access.granted || !roleLabel) {
    badge.hidden = true;
    badge.textContent = "";
    badge.removeAttribute("data-role");
    return;
  }
  const scopeLabel = getRcsAccessScopeLabel(programId);
  badge.hidden = false;
  badge.dataset.role = access.role;
  badge.textContent = `${scopeLabel} · ${roleLabel}`;
  badge.title = access.canEdit
    ? `Acceso como Editor de ${scopeLabel}. Puedes modificar el Cockpit.`
    : `Acceso como Lector de ${scopeLabel}. El Cockpit está en modo solo lectura.`;
  badge.setAttribute(
    "aria-label",
    access.canEdit
      ? `${scopeLabel}. Rol Editor.`
      : `${scopeLabel}. Rol Lector.`,
  );
}

function syncRcsAccessRoleBadge() {
  const programId = getRcsCurrentProgramId();
  renderRcsConnectedUser(programId);
  renderRcsAccessRoleBadge(programId);
  const canEdit = rcsCanEdit(programId);
  document.documentElement.dataset.rcsCanEdit = canEdit ? "true" : "false";
}

function installRcsAccessRoleTracking() {
  if (window.RCS_ACCESS_ROLE_TRACKING_INSTALLED) {
    syncRcsAccessRoleBadge();
    return;
  }
  window.RCS_ACCESS_ROLE_TRACKING_INSTALLED = true;
  window.addEventListener("hashchange", () => {
    window.setTimeout(() => {
      syncRcsAccessRoleBadge();
    }, 0);
  });
  syncRcsAccessRoleBadge();
}

function openRcsAccessAuthorization(access = null) {
  const fallbackConfig = window.APP_CONFIG?.accessControl;

  const fallbackSpreadsheetId = String(
    window.APP_CONFIG?.portfolio?.spreadsheetId || "",
  ).trim();

  let authorization =
    access?.authorization && typeof access.authorization === "object"
      ? access.authorization
      : null;

  /*
   * =====================================================
   * COMPATIBILIDAD
   * =====================================================
   *
   * Si por algún flujo antiguo no recibimos contexto,
   * utilizamos el Access Control del Portfolio.
   */

  if (!authorization && fallbackConfig?.driveJsonUrl && fallbackSpreadsheetId) {
    const fallbackUrl = new URL(
      fallbackConfig.driveJsonUrl,
      window.location.href,
    );

    fallbackUrl.searchParams.set("mode", "authorize");

    fallbackUrl.searchParams.set("spreadsheetId", fallbackSpreadsheetId);

    authorization = {
      kind: "access-control",

      url: fallbackUrl.toString(),

      probeUrl: fallbackUrl.toString(),

      spreadsheetId: fallbackSpreadsheetId,

      label: "RCS Cockpit",
    };
  }

  const authorizationUrl = String(authorization?.url || "").trim();

  const probeUrl = String(authorization?.probeUrl || authorizationUrl).trim();

  const kind = String(authorization?.kind || "access-control").trim();

  const spreadsheetId = String(authorization?.spreadsheetId || "").trim();

  if (!authorizationUrl || !probeUrl) {
    setRcsAccessValidationProgress(false);

    window.alert("No se ha podido preparar la validación de Google Workspace.");

    return;
  }

  /*
   * =====================================================
   * GOOGLE AUTHORIZATION WINDOW
   * =====================================================
   */

  const popup = window.open(
    authorizationUrl,
    "rcsCockpitAuthorization",
    ["width=620", "height=720", "resizable=yes", "scrollbars=yes"].join(","),
  );

  if (!popup) {
    setRcsAccessValidationProgress(false);

    window.alert(
      "El navegador ha bloqueado la ventana de validación. Permite las ventanas emergentes para RCS Cockpit y vuelve a intentarlo.",
    );

    return;
  }

  const startedAt = Date.now();

  const maxValidationMs = 5 * 60 * 1000;

  let checking = false;

  const closePopup = () => {
    try {
      if (popup && !popup.closed) {
        popup.close();
      }
    } catch (error) {
      console.debug(
        "[RCS Access] No se pudo cerrar la ventana de autorización.",
        error,
      );
    }
  };

  const finish = (monitor) => {
    window.clearInterval(monitor);

    closePopup();
  };

  const completeAuthorization = (monitor) => {
    finish(monitor);

    const screen = document.getElementById("rcsAccessScreen");

    const button = screen?.querySelector("#rcsAccessAction");

    const message = screen?.querySelector("#rcsAccessMainMessage");

    if (button) {
      button.disabled = true;

      button.textContent = "Acceso validado";
    }

    if (message) {
      message.textContent = "Acceso validado. Cargando RCS Cockpit...";
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  /*
   * =====================================================
   * VALIDACIÓN
   * =====================================================
   *
   * Hay dos tipos de Apps Script:
   *
   * 1. access-control
   *    Comprobamos de nuevo el permiso de Spreadsheet.
   *
   * 2. program-backend
   *    Comprobamos que el Web App ya puede ejecutar
   *    correctamente una llamada JSONP.
   */

  const validateAuthorization = async () => {
    if (kind === "access-control") {
      if (!spreadsheetId) {
        return {
          complete: false,

          denied: false,

          access: null,
        };
      }

      const result = await loadRcsSpreadsheetAccess(spreadsheetId, true, {
        timeoutMs: 30000,
      });

      return {
        complete: result.granted === true,

        denied: result.code === "ACCESS_DENIED",

        access: result,
      };
    }

    try {
      await loadJsonp(probeUrl, {
        timeoutMs: 30000,

        retries: 0,

        cacheBust: true,
      });

      /*
       * Si JSONP ha podido ejecutar el callback,
       * la autorización OAuth ya se ha completado.
       *
       * El contenido funcional del payload se
       * validará después durante la carga normal.
       */

      return {
        complete: true,

        denied: false,

        access: null,
      };
    } catch (error) {
      const code = String(error?.code || "").trim();

      if (code === "JSONP_SCRIPT_ERROR" || code === "JSONP_TIMEOUT") {
        return {
          complete: false,

          denied: false,

          access: null,
        };
      }

      throw error;
    }
  };

  const checkAccess = async (monitor) => {
    if (checking) {
      return;
    }

    checking = true;

    try {
      const result = await validateAuthorization();

      if (result.complete) {
        completeAuthorization(monitor);

        return;
      }

      if (result.denied) {
        finish(monitor);

        blockRcsCockpitAccess(result.access);

        return;
      }
    } catch (error) {
      console.debug("[RCS Access] Validación todavía pendiente.", error);
    } finally {
      checking = false;
    }
  };

  /*
   * =====================================================
   * MONITOR
   * =====================================================
   */

  const monitor = window.setInterval(async () => {
    if (Date.now() - startedAt > maxValidationMs) {
      finish(monitor);

      renderRcsAccessScreen({
        granted: false,

        role: "none",

        canEdit: false,

        code: "ACCESS_TIMEOUT",
      });

      return;
    }

    if (popup.closed) {
      window.clearInterval(monitor);

      try {
        const result = await validateAuthorization();

        if (result.complete) {
          completeAuthorization(monitor);

          return;
        }

        if (result.denied) {
          blockRcsCockpitAccess(result.access);

          return;
        }
      } catch (error) {
        console.debug("[RCS Access] La autorización no se completó.", error);
      }

      setRcsAccessValidationProgress(false);

      return;
    }

    await checkAccess(monitor);
  }, 5000);

  window.setTimeout(() => {
    void checkAccess(monitor);
  }, 2000);
}

function setRcsAccessValidationProgress(active) {
  const screen = document.getElementById("rcsAccessScreen");
  if (!screen) {
    return;
  }
  const button = screen.querySelector("#rcsAccessAction");
  const progress = screen.querySelector("#rcsAccessProgress");
  const message = screen.querySelector("#rcsAccessMainMessage");
  if (active) {
    if (button) {
      button.disabled = true;
      button.textContent = "Validando acceso...";
    }
    if (progress) {
      progress.classList.add("is-visible");
    }
    if (message) {
      message.textContent =
        "Google Workspace está comprobando tu identidad y tus permisos. Este proceso puede tardar unos minutos.";
    }
    return;
  }
  if (button) {
    button.disabled = false;
    button.textContent = "Validar acceso";
  }
  if (progress) {
    progress.classList.remove("is-visible");
  }
}
function installProductMapReturnNavigation() {
  const storageKey = "productMapReturnRoute";

  const supportedRoutes = new Set(["functional", "systems", "architecture"]);

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("[data-route]");

      if (!target) {
        return;
      }

      const targetRoute = String(target.dataset.route || "").trim();

      const targetParts = targetRoute.split("/");

      const targetRouteName = String(targetParts[0] || "")
        .trim()
        .toLowerCase();

      /*
       * ===============================================
       * ENTRADA DESDE UN PRODUCTO
       * ===============================================
       *
       * Si entramos en Functional, Systems o
       * Architecture desde:
       *
       * program/aixbanker/blue-buddy
       *
       * guardamos exactamente ese producto.
       */

      if (supportedRoutes.has(targetRouteName)) {
        const currentContext = getCurrentRoute();

        const currentProgramId = String(currentContext.programId || "").trim();

        const currentProductId = String(currentContext.productId || "").trim();

        const targetProgramId = String(targetParts[1] || "").trim();

        if (
          currentContext.routeName === "program" &&
          currentProgramId &&
          currentProductId &&
          currentProgramId === targetProgramId
        ) {
          sessionStorage.setItem(
            storageKey,
            `program/${currentProgramId}/${currentProductId}`,
          );
        } else {
          /*
           * Evitamos reutilizar un producto
           * anterior si la vista se abre desde
           * otro punto del Cockpit.
           */
          sessionStorage.removeItem(storageKey);
        }

        return;
      }

      /*
       * ===============================================
       * VUELTA DESDE EL MAPA
       * ===============================================
       */

      const backButton = target.classList.contains("back-to-program-btn");

      if (!backButton) {
        return;
      }

      const currentContext = getCurrentRoute();

      const currentRouteName = String(currentContext.routeName || "")
        .trim()
        .toLowerCase();

      if (!supportedRoutes.has(currentRouteName)) {
        return;
      }

      const programId = String(currentContext.programId || "").trim();

      const storedRoute = String(
        sessionStorage.getItem(storageKey) || "",
      ).trim();

      if (!programId || !storedRoute.startsWith(`program/${programId}/`)) {
        /*
         * Sin producto de origen dejamos actuar
         * al routing actual.
         */
        return;
      }

      event.preventDefault();

      event.stopImmediatePropagation();

      route(storedRoute);
    },
    true,
  );
}

installProductMapReturnNavigation();
function ensurePortfolioSidebarStyles() {
  if (document.getElementById("portfolioSidebarStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "portfolioSidebarStyles";

  style.textContent = `
    /*
     * =====================================================
     * PORTFOLIO SIDEBAR
     * =====================================================
     */

    .sidebar {
      gap: 0;
      padding:
        24px 8px
        18px;
    }

    .sidebar .brand {
      margin-bottom: 22px;
    }

    .tower-mark {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      margin:
        0 auto
        22px;
      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.34
        );
      border-radius: 18px;
      background:
        rgba(
          255,
          255,
          255,
          0.11
        );
      color: #ffffff;
      box-shadow:
        0 8px 20px
        rgba(
          0,
          0,
          0,
          0.08
        );
    }

    .tower-mark svg {
      width: 36px;
      height: 36px;
      display: block;
    }

    .side-title,
    .home-link {
      display:
        none !important;
    }

    /*
     * =====================================================
     * NAVEGACIÓN PORTFOLIO
     * =====================================================
     */

    .portfolio-sidebar-navigation {
      display: grid;
      width: 100%;
      gap: 9px;
      margin-top: 0;
    }

    /*
     * Ya no mostramos el label PORTFOLIO.
     */

    .portfolio-sidebar-navigation-label {
      display:
        none !important;
    }

    .portfolio-sidebar-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 54px;
      padding:
        9px 7px;
      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.08
        );
      border-radius: 14px;
      background:
        rgba(
          255,
          255,
          255,
          0.025
        );
      color:
        rgba(
          255,
          255,
          255,
          0.88
        );
      font-family:
        Inter,
        Arial,
        sans-serif;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        color 0.16s ease,
        transform 0.16s ease,
        box-shadow 0.16s ease;
    }

    .portfolio-sidebar-button:hover {
      border-color:
        rgba(
          255,
          255,
          255,
          0.28
        );
      background:
        rgba(
          255,
          255,
          255,
          0.1
        );
      color: #ffffff;
      transform:
        translateY(-1px);
    }

    .portfolio-sidebar-button.active {
      border-color:
        rgba(
          95,
          208,
          255,
          0.72
        );
      background:
        linear-gradient(
          135deg,
          rgba(
            255,
            255,
            255,
            0.18
          ),
          rgba(
            255,
            255,
            255,
            0.09
          )
        );
      color: #ffffff;
      box-shadow:
        inset 4px 0
        0 #49c8ff,
        0 8px 18px
        rgba(
          0,
          0,
          0,
          0.08
        );
    }

    .portfolio-sidebar-button.active::after {
      content: "";
      position: absolute;
      right: 7px;
      top: 50%;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #49c8ff;
      transform:
        translateY(-50%);
    }

    /*
     * Cuando existe contexto de programa
     * mostramos la navegación geográfica.
     */

    .sidebar.has-country-navigation
      .portfolio-sidebar-navigation {
      display: none;
    }

    /*
     * =====================================================
     * PANTALLA PRÓXIMAMENTE
     * =====================================================
     */

    .portfolio-coming-soon {
      display: grid;
      place-items: center;
      min-height:
        min(
          620px,
          calc(
            100vh -
            220px
          )
        );
      padding: 38px;
    }

    .portfolio-coming-soon-card {
      width:
        min(
          620px,
          100%
        );
      padding:
        54px 48px;
      border:
        1px solid
        var(--line);
      border-radius: 28px;
      background: #ffffff;
      box-shadow:
        0 22px 52px
        rgba(
          7,
          46,
          111,
          0.08
        );
      text-align: center;
    }

    .portfolio-coming-soon-icon {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin:
        0 auto
        24px;
      border-radius: 22px;
      background: #edf4ff;
      color: var(--blue);
      font-size: 28px;
      font-weight: 900;
    }

    .portfolio-coming-soon-card
      .eyebrow {
      margin-bottom: 8px;
    }

    .portfolio-coming-soon-card
      h2 {
      margin: 0;
      color: var(--blue);
      font-size: 42px;
      line-height: 1.05;
    }

    .portfolio-coming-soon-card
      p {
      max-width: 450px;
      margin:
        16px auto
        0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.55;
    }

    .portfolio-coming-soon-card
      .ghost-button {
      margin-top: 30px;
    }

    /*
     * =====================================================
     * AMBICIÓN RCSE
     * =====================================================
     */

    .portfolio-ambition-page {
      display: grid;
      gap: 24px;
      padding-bottom: 24px;
    }

    .portfolio-ambition-page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
    }

    .portfolio-ambition-page-header
      h2 {
      margin:
        4px 0
        8px;
      font-size: 36px;
    }

    .portfolio-ambition-page-header
      p {
      max-width: 650px;
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }

    .portfolio-ambition-page-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .portfolio-ambition-page-count {
      display: flex;
      align-items: baseline;
      gap: 7px;
      color: var(--muted);
      white-space: nowrap;
    }

    .portfolio-ambition-page-count
      strong {
      color: var(--blue);
      font-family: Georgia, serif;
      font-size: 30px;
    }

    /*
     * =====================================================
     * FOOTER LANDING
     * =====================================================
     */

    body.is-portfolio-landing
      .footer {
      width:
        calc(
          100% -
          118px
        );
      margin-left: 118px;
      padding:
        7px 16px;
      border-top: 0;
      background: transparent;
      backdrop-filter: none;
      color:
        rgba(
          0,
          19,
          145,
          0.24
        );
      font-size: 9px;
      font-weight: 500;
      letter-spacing:
        0.04em;
      text-transform: none;
    }

    @media (
      max-height: 760px
    ) {
      .portfolio-sidebar-button {
        min-height: 46px;
        font-size: 10px;
      }

      .portfolio-sidebar-navigation {
        gap: 6px;
      }

      .tower-mark {
        width: 52px;
        height: 52px;
        margin-bottom: 14px;
      }
    }
  `;

  document.head.appendChild(style);
}
function installPortfolioSidebarNavigation() {
  ensurePortfolioSidebarStyles();

  const sidebar = document.querySelector(".sidebar");

  if (!sidebar) {
    return;
  }

  /*
   * =====================================================
   * TORRE DE CONTROL
   * =====================================================
   */

  const towerMark = sidebar.querySelector(".tower-mark");

  if (towerMark) {
    towerMark.innerHTML = `
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Torre de control"
      >
        <path
          d="
            M18 13
            H46
            L50 23
            H14
            Z
          "
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linejoin="round"
        />

        <path
          d="
            M21 23
            H43
            L39 34
            H25
            Z
          "
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linejoin="round"
        />

        <path
          d="
            M28 34
            L24 54
            M36 34
            L40 54
            M21 54
            H43
          "
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <path
          d="
            M24 18
            H40
          "
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
    `;

    towerMark.setAttribute("title", "RCS Control Tower");
  }

  sidebar.querySelector(".side-title")?.remove();

  /*
   * Eliminamos el botón antiguo definido en el HTML.
   * La navegación a Inicio pasa a gestionarse junto
   * al resto de navegación dinámica del sidebar.
   */
  sidebar.querySelector(".home-link")?.remove();

  let navigation = sidebar.querySelector("#portfolioSidebarNavigation");

  if (!navigation) {
    navigation = document.createElement("nav");

    navigation.id = "portfolioSidebarNavigation";

    navigation.className = "portfolio-sidebar-navigation";

    navigation.setAttribute("aria-label", "Navegación del Portfolio");

    navigation.innerHTML = `
      <button
        type="button"
        class="portfolio-sidebar-button"
        data-route="governance"
        data-portfolio-nav="governance"
      >
        Modelo de Gobierno
      </button>

      <button
        type="button"
        class="portfolio-sidebar-button"
        data-route="kpis"
        data-portfolio-nav="kpis"
      >
        KPI's
      </button>

      <button
        type="button"
        class="portfolio-sidebar-button"
        data-route="ambition"
        data-portfolio-nav="ambition"
      >
        Ambición RCSE
      </button>

      <button
        type="button"
        class="portfolio-sidebar-button"
        data-route="landing"
        data-portfolio-nav="landing"
      >
        Programas
      </button>

      <button
        type="button"
        class="portfolio-sidebar-button"
        data-route="key-reports"
        data-portfolio-nav="key-reports"
      >
        Key Reports
      </button>
    `;

    if (towerMark) {
      towerMark.insertAdjacentElement("afterend", navigation);
    } else {
      sidebar.append(navigation);
    }
  }

  /*
   * =====================================================
   * INICIO GLOBAL
   * =====================================================
   *
   * El botón vive fuera de la navegación del Portfolio
   * para que siga disponible cuando el contexto de
   * programa sustituye esa navegación por los países.
   */
  let homeButton = sidebar.querySelector("#globalSidebarHomeButton");

  if (!homeButton) {
    homeButton = document.createElement("button");

    homeButton.id = "globalSidebarHomeButton";
    homeButton.type = "button";

    homeButton.className =
      "portfolio-sidebar-button global-sidebar-home-button";

    homeButton.dataset.route = "landing";

    homeButton.innerHTML = `
      <span aria-hidden="true">⌂</span>
      <span>Inicio</span>
    `;

    homeButton.setAttribute("aria-label", "Volver al inicio del Cockpit");

    /*
     * Siempre pegado a la parte inferior
     * de la barra lateral.
     */
    homeButton.style.marginTop = "auto";
    homeButton.style.flexDirection = "column";
    homeButton.style.gap = "3px";
    homeButton.style.minHeight = "52px";

    sidebar.append(homeButton);
  }
}
function syncPortfolioSidebarNavigation(routeName) {
  const normalizedRoute = String(routeName || "landing")
    .trim()
    .toLowerCase();

  const portfolioRoutes = new Set([
    "landing",
    "governance",
    "kpis",
    "ambition",
    "key-reports",
  ]);

  document.body.classList.toggle(
    "is-portfolio-landing",
    normalizedRoute === "landing",
  );

  document.body.classList.toggle(
    "is-portfolio-route",
    portfolioRoutes.has(normalizedRoute),
  );

  document.querySelectorAll("[data-portfolio-nav]").forEach((button) => {
    const active =
      String(button.dataset.portfolioNav || "")
        .trim()
        .toLowerCase() === normalizedRoute;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  /*
   * =====================================================
   * INICIO GLOBAL
   * =====================================================
   *
   * Visible en cualquier pantalla salvo en la landing.
   */
  const homeButton = document.querySelector("#globalSidebarHomeButton");

  if (homeButton) {
    homeButton.style.display = normalizedRoute === "landing" ? "none" : "flex";
  }
}
function renderPortfolioComingSoon(routeName) {
  const normalizedRoute = String(routeName || "")
    .trim()
    .toLowerCase();

  /*
   * =====================================================
   * AMBICIÓN RCSE
   * =====================================================
   */

  if (normalizedRoute === "ambition") {
    setHead(
      "Ambición RCSE 2026",
      "Marco estratégico de Retail Client Solutions",
      "Retail Client Solutions > Ambición RCSE",
    );

    view.innerHTML = `
      <section
        class="portfolio-home portfolio-ambition-page"
      >
        <header
          class="portfolio-ambition-page-header"
        >
          <div>
            <span
              class="portfolio-section-eyebrow"
            >
              Marco estratégico
            </span>

            <h2>
              Ambición RCSE 2026
            </h2>

            <p>
              Las ocho ambiciones forman el marco común de Retail Client
              Solutions y permiten entender cómo se conecta la ejecución
              de los programas con la estrategia.
            </p>
          </div>

          <div
            class="portfolio-ambition-page-meta"
          >
            <div
              class="portfolio-ambitions-axis-list"
              aria-label="Ejes estratégicos"
            >
              ${renderPortfolioAmbitionAxisTags()}
            </div>

            <span
              class="portfolio-ambition-page-count"
            >
              <strong>
                ${PORTFOLIO_AMBITIONS.length}
              </strong>

              <span>
                ambiciones estratégicas
              </span>
            </span>
          </div>
        </header>

        ${renderPortfolioAmbitions()}

        <div>
          <button
            type="button"
            class="ghost-button"
            data-route="landing"
          >
            ← Volver a Programas
          </button>
        </div>
      </section>
    `;

    return;
  }

  /*
   * =====================================================
   * RESTO DE SECCIONES
   * =====================================================
   */

  const sections = {
    governance: {
      title: "Modelo de Gobierno",

      subtitle:
        "Gobierno, responsabilidades y modelo operativo de Retail Client Solutions.",

      icon: "G",
    },

    kpis: {
      title: "KPI's",

      subtitle:
        "Indicadores ejecutivos y seguimiento consolidado del Portfolio.",

      icon: "K",
    },

    "key-reports": {
      title: "Key Reports",

      subtitle:
        "Reporting ejecutivo consolidado y principales vistas de seguimiento.",

      icon: "R",
    },
  };

  const section = sections[normalizedRoute];

  if (!section) {
    route("landing");

    return;
  }

  setHead(
    section.title,
    section.subtitle,
    `Retail Client Solutions > ${section.title}`,
  );

  view.innerHTML = `
    <section
      class="portfolio-coming-soon"
    >
      <article
        class="portfolio-coming-soon-card"
      >
        <div
          class="portfolio-coming-soon-icon"
          aria-hidden="true"
        >
          ${section.icon}
        </div>

        <p class="eyebrow">
          Retail Client Solutions
        </p>

        <h2>
          ${section.title}
        </h2>

        <p>
          Esta sección estará disponible próximamente.
        </p>

        <button
          type="button"
          class="ghost-button"
          data-route="landing"
        >
          ← Volver a Programas
        </button>
      </article>
    </section>
  `;
}
/* teams */
document.addEventListener("click", (event) => {
  const quarterButton = event.target.closest("[data-team-quarter]");
  if (!quarterButton) return;
  selectedTeamQuarter = quarterButton.dataset.teamQuarter;
  render();
});
document.addEventListener("click", (event) => {
  const productButton = event.target.closest("[data-executive-product]");
  if (!productButton) return;
  selectedExecutiveProduct = productButton.dataset.executiveProduct;
  render();
});
document.addEventListener("click", (event) => {
  const quarterButton = event.target.closest("[data-executive-quarter]");
  if (!quarterButton) return;
  executiveQuarter = quarterButton.dataset.executiveQuarter;
  render();
});
document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-executive-item-type]");
  if (!card) return;
  const type = card.dataset.executiveItemType;
  const id = card.dataset.executiveItemId;
  const hash = location.hash.replace("#", "");
  const [, programId] = hash.split("/");
  if (type === "project") {
    route(`projects/${programId}`);
    requestAnimationFrame(() => {
      renderProjectDetailView(programId, id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (type === "msa") {
    route(`msas/${programId}`);
    requestAnimationFrame(() => {
      renderMsaDetailView(programId, id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
document
  .getElementById("dataSourceToggle")
  ?.addEventListener("change", async (e) => {
    window.APP_CONFIG.runtime = e.target.checked
      ? "google-sheets-api"
      : "local-json";
    window.APP_CONFIG.useGoogleSheets = e.target.checked ? false : true;
    await init();
  });
document
  .getElementById("refreshDataBtn")
  ?.addEventListener("click", async () => {
    const button = document.getElementById("refreshDataBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Actualizando...";
    }
    try {
      await refreshCurrentDataSource();
    } catch (error) {
      console.error(error);
      statusEl.textContent = "⚠ No se pudieron actualizar los datos";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Actualizar datos";
      }
    }
  });
document.getElementById("backlogHeader")?.scrollIntoView({
  behavior: "smooth",
  block: "start",
});
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-route]");

  if (!target) {
    return;
  }

  const targetRoute = String(target.dataset.route || "").trim();

  if (!targetRoute) {
    return;
  }

  /*
   * =====================================================
   * ENTRADA A PROGRAMA
   * =====================================================
   */

  if (targetRoute.startsWith("program/")) {
    const routeParts = targetRoute.split("/");

    const programId = String(routeParts[1] || "")
      .trim()
      .toLowerCase();

    const source = getProgramSource(programId);

    const programLabel = source?.label || programId || "programa";

    showLoadingOverlay(`Cargando ${programLabel}...`);
  }

  route(targetRoute);
});
document.addEventListener("click", (e) => {
  const countryButton = e.target.closest("[data-country]");
  if (!countryButton) return;
  selectedCountry = countryButton.dataset.country;
  render();
});
document
  .getElementById("openDataSourceBtn")
  ?.addEventListener("click", openDataSource);
document.addEventListener("click", (e) => {
  const productButton = e.target.closest("[data-system-product]");
  if (!productButton) return;
  selectedSystemProduct = productButton.dataset.systemProduct;
  render();
});
document.addEventListener("click", (event) => {
  const feature = event.target.closest("[data-feature]");
  if (!feature) return;
  const featureKey = feature.dataset.feature;
  selectedCapability = selectedCapability === featureKey ? null : featureKey;
  selectedArchitectureGap = null;
  render();
});
document.addEventListener("click", (event) => {
  const componentButton = event.target.closest("[data-system-component]");
  if (!componentButton) return;
  const componentName = componentButton.dataset.systemComponent;
  selectedSystemComponent =
    selectedSystemComponent === componentName ? null : componentName;
  render();
});
document.addEventListener("click", (event) => {
  const gapButton = event.target.closest("[data-architecture-gap]");
  if (!gapButton) return;
  const gapKey = gapButton.dataset.architectureGap;
  selectedArchitectureGap = selectedArchitectureGap === gapKey ? null : gapKey;
  selectedCapability = null;
  render();
});
document.addEventListener("click", (event) => {
  const expandButton = event.target.closest("#expandSystemMapBtn");
  if (!expandButton) return;
  isSystemMapExpanded = !isSystemMapExpanded;
  render();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("#localismsToggleBtn");
  if (!button) return;
  showProgramLocalisms = !showProgramLocalisms;
  render();
});
document.addEventListener("click", (event) => {
  const expandButton = event.target.closest("#expandToBeMapBtn");
  if (!expandButton) return;
  isToBeMapExpanded = !isToBeMapExpanded;
  render();
});
document.addEventListener("click", (event) => {
  const productButton = event.target.closest("[data-aixbanker-product]");
  if (!productButton) return;
  const productId = productButton.dataset.aixbankerProduct;
  const currentQuarter = getCurrentQuarter();
  route(`roadmap/aixbanker/${productId}/${currentQuarter}`);
});
document.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-roadmap-detail-type]");
  if (!detailButton) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const originContext = getRoadmapDetailOriginContext();
  const programId = String(
    originContext.programId ||
      (typeof PROGRAM_ID !== "undefined" ? PROGRAM_ID : "") ||
      "",
  ).trim();
  const productId = String(
    originContext.productId || selectedExecutiveProduct || "",
  ).trim();
  const itemType = String(detailButton.dataset.roadmapDetailType || "")
    .trim()
    .toLowerCase();
  const itemId = String(detailButton.dataset.roadmapDetailId || "").trim();
  if (!programId || !productId || !itemType || !itemId) {
    return;
  }
  /*
   * Guardamos EXACTAMENTE la URL desde
   * la que se está entrando al detalle.
   *
   * Ejemplo:
   *
   * roadmap/aixbanker/timeline/
   * blue-buddy/2026/ALL/
   * knowledge-assistant/ES
   *
   * Esta URL será la utilizada por el
   * botón Volver.
   */
  saveRoadmapDetailReturnRoute();
  /*
   * Conservamos también el país actual.
   *
   * El detalle legacy no lleva toda la
   * información del nuevo workspace en
   * su propia URL, por lo que mantenemos
   * explícitamente el contexto geográfico.
   */
  if (originContext.countryId) {
    selectedCountry = originContext.countryId;
  }
  const quarter = isValidRoadmapQuarter(originContext.quarter)
    ? originContext.quarter
    : "ALL";
  route(
    ["roadmap-detail", programId, productId, quarter, itemType, itemId].join(
      "/",
    ),
  );
});
document.addEventListener("click", (event) => {
  const projectBackButton = event.target.closest("[data-project-list-back]");
  if (!projectBackButton) {
    return;
  }
  renderProjectsList(projectBackButton.dataset.projectListBack);
});
document.addEventListener("click", (event) => {
  const msaBackButton = event.target.closest("[data-msa-list-back]");
  if (!msaBackButton) {
    return;
  }
  renderMsasList(msaBackButton.dataset.msaListBack);
});
document.addEventListener("click", (event) => {
  const externalLink = event.target.closest(".document-link");
  if (!externalLink) {
    return;
  }
  event.stopPropagation();
});
document.addEventListener(
  "click",
  (event) => {
    const target = event.target.closest("[data-route]");
    if (!target) {
      return;
    }
    const targetRoute = String(target.dataset.route || "").trim();
    if (!targetRoute.startsWith("roadmap-workspace-detail/")) {
      return;
    }
    /*
     * Antes de navegar guardamos el
     * roadmap exacto de origen.
     */
    saveRoadmapDetailReturnRoute();
  },
  true,
);
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-roadmap-detail-back]");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  navigateBackFromRoadmapDetail(button.dataset.roadmapDetailBackFallback || "");
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-roadmap-functional-source]");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const programId = String(button.dataset.programId || "").trim();
  const source =
    String(button.dataset.roadmapFunctionalSource || "")
      .trim()
      .toLowerCase() === "jira"
      ? "jira"
      : "internal";
  if (!programId) {
    return;
  }
  const state = roadmapWorkspaceState(programId);
  /*
   * =====================================================
   * PLAN INTERNO
   * =====================================================
   */
  if (source === "internal") {
    state.functionalPlanSource = "internal";
    const context = roadmapWorkspaceParseRoute();
    if (context.routeName === "roadmap" && context.programId === programId) {
      renderRoadmapWorkspace(programId, context);
    }
    return;
  }
  /*
   * =====================================================
   * JIRA OFICIAL
   * =====================================================
   *
   * loadJiraFeaturesData() ya controla:
   *
   * - cache de datos
   * - petición en curso
   * - evitar llamadas duplicadas
   *
   * Por tanto NO debemos consultar aquí
   * ningún segundo cache.
   */
  button.disabled = true;
  showLoadingOverlay("Cargando Features oficiales de JIRA...");
  try {
    const jiraData = await loadJiraFeaturesData(programId);
    installJiraFeaturesData(programId, jiraData);
    state.functionalPlanSource = "jira";
  } catch (error) {
    console.error("[AIxBanker] Error cargando Features JIRA", error);
    state.functionalPlanSource = "internal";
  } finally {
    hideLoadingOverlay();
    button.disabled = false;
  }
  /*
   * =====================================================
   * RENDER SIN RECARGAR CORE
   * =====================================================
   *
   * No llamamos a render().
   *
   * Si lo hiciéramos, DATA se reconstruiría desde
   * el core y complicaría innecesariamente el flujo.
   */
  const context = roadmapWorkspaceParseRoute();
  if (context.routeName === "roadmap" && context.programId === programId) {
    renderRoadmapWorkspace(programId, context);
  }
});
document.addEventListener("change", (event) => {
  const toggle = event.target.closest("[data-management-space-toggle]");
  if (!toggle) {
    return;
  }
  showManagementSpaceVision = toggle.checked === true;
  render();
});
window.addEventListener("hashchange", () => {
  render().catch(console.error);
});
