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

// function getRoadmapItemPhases(adapter, itemId) {
//   const phases = Array.isArray(DATA[adapter.phaseCollection])
//     ? DATA[adapter.phaseCollection]
//     : [];

//   return phases
//     .filter(
//       (phase) =>
//         String(phase[adapter.phaseForeignKey] || "").trim() ===
//         String(itemId || "").trim(),
//     )
//     .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
// }

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

  return features.filter((item) => {
    const itemProgramId = String(item.programId || normalizedProgramId).trim();

    const itemProductId = normalizeRoadmapProduct(
      item.product || item.productId || item.product_id || "",
    );

    return (
      itemProgramId === normalizedProgramId &&
      itemProductId === normalizedProductId
    );
  }).length;
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

function clearFlightDeckReturnRoute() {
  sessionStorage.removeItem("flightDeckReturnRoute");
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
    const programId = String(program.id || "").trim();

    if (!programId) {
      return;
    }

    PROGRAM_SOURCES.set(programId, {
      id: programId,

      label: program.sourceLabel || program.name || programId,

      spreadsheetId: String(program.spreadsheetId || "").trim(),

      driveJsonUrl: String(program.driveJsonUrl || "").trim(),
    });
  });
}

function getProgramSource(programId) {
  return PROGRAM_SOURCES.get(String(programId || "").trim()) || null;
}
function getProgramRestrictedSource(programId) {
  const normalizedProgramId = String(programId || "").trim();

  if (!normalizedProgramId) {
    return null;
  }

  return window.APP_CONFIG?.programs?.[normalizedProgramId]?.restricted || null;
}

function getEmptyRestrictedProgramData() {
  return {
    available: false,

    sdaFinancials: [],
    sdaResources: [],
  };
}

function normalizeRestrictedProgramData(rawData) {
  /*
   * El Apps Script restricted devuelve:
   *
   * {
   *   ok: true,
   *   restricted: true,
   *   data: {
   *     sdaFinancials: [],
   *     sdaResources: []
   *   }
   * }
   *
   * Mantenemos también compatibilidad con un payload
   * directo por si en el futuro simplificamos el endpoint.
   */
  const payload =
    rawData &&
    typeof rawData === "object" &&
    rawData.data &&
    typeof rawData.data === "object"
      ? rawData.data
      : rawData || {};

  return {
    available: true,

    sdaFinancials: Array.isArray(payload.sdaFinancials)
      ? payload.sdaFinancials
      : [],

    sdaResources: Array.isArray(payload.sdaResources)
      ? payload.sdaResources
      : [],
  };
}

async function loadProgramRestrictedData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "").trim();

  if (!normalizedProgramId) {
    return getEmptyRestrictedProgramData();
  }

  if (!forceRefresh && PROGRAM_RESTRICTED_DATA_CACHE.has(normalizedProgramId)) {
    return PROGRAM_RESTRICTED_DATA_CACHE.get(normalizedProgramId);
  }

  const source = getProgramRestrictedSource(normalizedProgramId);

  /*
   * Un programa puede no tener origen restringido.
   *
   * Esto no es un error.
   */
  if (!source?.driveJsonUrl) {
    return getEmptyRestrictedProgramData();
  }

  try {
    const rawData = await loadConfiguredSource(source);

    /*
     * El endpoint puede responder correctamente
     * pero indicar que el dataset restringido
     * no está disponible para este usuario.
     */
    if (rawData?.ok === false) {
      console.info(
        `[RCS Cockpit] El usuario no dispone de datos restringidos para ${normalizedProgramId}.`,
      );

      return getEmptyRestrictedProgramData();
    }

    const restrictedData = normalizeRestrictedProgramData(rawData);

    /*
     * Los datos restringidos sólo se mantienen
     * en memoria durante la sesión actual.
     *
     * No se persisten en localStorage,
     * sessionStorage ni IndexedDB.
     */
    PROGRAM_RESTRICTED_DATA_CACHE.set(normalizedProgramId, restrictedData);

    return restrictedData;
  } catch (error) {
    /*
     * =====================================================
     * RESTRICTED ES OPCIONAL
     * =====================================================
     *
     * Un error de permisos, autorización, timeout,
     * indisponibilidad o cualquier otro problema
     * de este origen nunca debe impedir cargar
     * el programa general.
     *
     * El frontend recibe simplemente:
     *
     * {
     *   available: false,
     *   sdaFinancials: [],
     *   sdaResources: []
     * }
     * =====================================================
     */
    console.info(
      `[RCS Cockpit] No se ha podido cargar el origen restringido de ${normalizedProgramId}.`,
      error,
    );

    return getEmptyRestrictedProgramData();
  }
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
     * Índice ligero JIRA.
     *
     * Sí pertenece al core.
     */
    jiraMsaIndex: [],

    /*
     * Histórico pesado JIRA.
     *
     * Sólo se carga on-demand.
     */
    roadmapItemStatusHistory: [],

    /*
     * Features JIRA.
     *
     * Sólo se cargan on-demand.
     */
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
     *
     * Fuente:
     * Spreadsheet general AIxBanker.
     *
     * Nunca contiene información sensible.
     */

    sdaFlights: [],

    sdaDeliverables: [],

    /*
     * =====================================================
     * SDA RESTRICTED
     * =====================================================
     *
     * Se carga desde un origen independiente.
     *
     * Si el usuario no puede acceder:
     *
     * available = false
     *
     * y el resto del Cockpit continúa funcionando.
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

async function loadConfiguredSource(source, options = {}) {
  if (
    !source?.driveJsonUrl ||
    source.driveJsonUrl.includes("URL_APPS_SCRIPT") ||
    source.driveJsonUrl.includes("PEGA_AQUI")
  ) {
    throw new Error(`Origen no configurado: ${source?.label || "sin nombre"}`);
  }

  if (typeof loadJsonp !== "function") {
    throw new Error("No está disponible la función loadJsonp");
  }

  const url = new URL(source.driveJsonUrl, window.location.href);

  /*
   * El endpoint principal trabaja por defecto
   * contra el dataset core.
   */
  if (!url.searchParams.has("dataset")) {
    url.searchParams.set("dataset", "core");
  }

  const payload = await loadJsonp(url.toString(), options);

  /*
   * Apps Script puede responder correctamente a nivel HTTP
   * pero devolver:
   *
   * {
   *   ok: false,
   *   error: "..."
   * }
   *
   * Eso debe considerarse un fallo de datos,
   * no una respuesta válida vacía.
   */
  if (payload?.ok === false) {
    throw new Error(
      payload.error ||
        `El origen ${source?.label || "configurado"} ha devuelto un error.`,
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
function jiraMsaCacheKey(programId, itemId) {
  return [String(programId || "").trim(), String(itemId || "").trim()].join(
    "::",
  );
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

  const programData = normalizeProgramData(normalizedProgramId, cached.data);

  const completeProgramData = {
    ...programData,

    restricted: getEmptyRestrictedProgramData(),
  };

  /*
   * Sólo recuperamos el CORE general.
   *
   * Restricted, JIRA diferido y otros datasets sensibles
   * no se persisten en sessionStorage.
   */
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

async function revalidatePortfolioDataInBackground() {
  try {
    await loadPortfolioData(true);

    setRcsDataMode("portfolio", "live");

    const currentContext = getCurrentRoute();

    if (!currentContext.programId || currentContext.routeName === "landing") {
      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();

      renderLanding();
    }
  } catch (error) {
    console.warn(
      "[RCS Cockpit] No se ha podido revalidar Portfolio en background.",
      error,
    );

    const currentContext = getCurrentRoute();

    if (
      (!currentContext.programId || currentContext.routeName === "landing") &&
      Array.isArray(PORTFOLIO_DATA.programs) &&
      PORTFOLIO_DATA.programs.length
    ) {
      showDataFallbackBanner(
        "No se ha podido actualizar el origen general. " +
          "Se mantiene la última fotografía válida disponible.",
      );
    }
  }
}

async function revalidateProgramDataInBackground(programId) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!normalizedProgramId) {
    return;
  }

  try {
    const programData = await loadProgramData(normalizedProgramId, true);

    setRcsDataMode(normalizedProgramId, "live");

    const currentContext = getCurrentRoute();

    /*
     * Actualizamos visualmente sólo la Flight Deck principal.
     *
     * En vistas profundas dejamos el nuevo CORE en caché
     * para no destruir datasets on-demand ya instalados.
     */
    if (
      currentContext.programId === normalizedProgramId &&
      currentContext.routeName === "program"
    ) {
      DATA = buildProgramData(programData);

      renderRouteContext(currentContext);

      updateDataStatus(normalizedProgramId);

      clearDataFallbackBanner();
    }
  } catch (error) {
    console.warn(
      `[RCS Cockpit] No se ha podido revalidar ${normalizedProgramId} en background.`,
      error,
    );

    const currentContext = getCurrentRoute();

    if (currentContext.programId === normalizedProgramId) {
      showDataFallbackBanner(
        `No se ha podido actualizar ${normalizedProgramId}. ` +
          "Se mantiene la última fotografía válida disponible.",
      );
    }
  }
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

  /*
   * =====================================================
   * CACHE DE SESIÓN
   * =====================================================
   *
   * Un F5 debe recuperar inmediatamente la última
   * fotografía válida de esta sesión.
   */
  if (!forceRefresh) {
    const cachedPortfolio = hydratePortfolioFromSessionCache();

    if (cachedPortfolio) {
      return cachedPortfolio;
    }
  }

  const source = window.APP_CONFIG.portfolio;

  const requestRegistry = getRcsCoreRequestRegistry();

  /*
   * Evitamos varias peticiones simultáneas al mismo
   * Apps Script si coinciden render, hashchange, etc.
   */
  if (requestRegistry.portfolio) {
    return requestRegistry.portfolio;
  }

  requestRegistry.portfolio = (async () => {
    const rawData = await loadConfiguredSource(source, {
      /*
       * Permitimos cold start de Apps Script,
       * pero no hacemos retries automáticos.
       *
       * Una petición puede tardar como máximo 25 s,
       * no 25 s x varios intentos.
       */
      timeoutMs: 25000,

      retries: 0,

      cacheBust: forceRefresh,
    });

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
  })();

  try {
    return await requestRegistry.portfolio;
  } finally {
    requestRegistry.portfolio = null;
  }
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

function readProgramDatasetSessionCache(programId, dataset, params = {}) {
  const key = getProgramDatasetCacheKey(programId, dataset, params);

  return readRcsSessionCache("dataset", key);
}

function writeProgramDatasetSessionCache(
  programId,
  dataset,
  params,
  data,
  loadedAt = new Date(),
) {
  const normalizedDataset = String(dataset || "")
    .trim()
    .toLowerCase();

  /*
   * Los datasets restringidos nunca
   * pueden persistirse en navegador.
   */
  if (
    normalizedDataset === "restricted" ||
    normalizedDataset.startsWith("restricted-")
  ) {
    return;
  }

  const key = getProgramDatasetCacheKey(programId, dataset, params);

  writeRcsSessionCache("dataset", key, data, loadedAt);
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
function buildProgramDatasetUrl(programId, dataset, params = {}) {
  const normalizedProgramId = String(programId || "").trim();

  const source = getProgramSource(normalizedProgramId);

  if (
    !source?.driveJsonUrl ||
    source.driveJsonUrl.includes("URL_APPS_SCRIPT") ||
    source.driveJsonUrl.includes("PEGA_AQUI")
  ) {
    throw new Error(`Origen no configurado para ${normalizedProgramId}`);
  }

  const url = new URL(source.driveJsonUrl, window.location.href);

  /*
   * Eliminamos parámetros propios
   * de peticiones JSONP anteriores.
   */
  url.searchParams.delete("callback");

  url.searchParams.delete("_");

  url.searchParams.delete("dataset");

  url.searchParams.delete("itemId");

  url.searchParams.set(
    "dataset",
    String(dataset || "core")
      .trim()
      .toLowerCase(),
  );

  Object.entries(params || {}).forEach(([key, value]) => {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      return;
    }

    url.searchParams.set(key, normalizedValue);
  });

  return url.toString();
}

async function loadProgramDataset(
  programId,
  dataset,
  params = {},
  { forceRefresh = false, persist = true } = {},
) {
  if (typeof loadJsonpOnDemand !== "function") {
    throw new Error("No está disponible la carga JSONP on-demand.");
  }

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedDataset = String(dataset || "core")
    .trim()
    .toLowerCase();

  const cacheKey = getProgramDatasetCacheKey(
    normalizedProgramId,
    normalizedDataset,
    params,
  );

  /*
   * =====================================================
   * MEMORIA
   * =====================================================
   */
  if (!forceRefresh && PROGRAM_DATASET_CACHE.has(cacheKey)) {
    return PROGRAM_DATASET_CACHE.get(cacheKey);
  }

  /*
   * =====================================================
   * SESSION STORAGE
   * =====================================================
   */
  if (!forceRefresh && persist) {
    const cached = readProgramDatasetSessionCache(
      normalizedProgramId,
      normalizedDataset,
      params,
    );

    if (cached?.data) {
      PROGRAM_DATASET_CACHE.set(cacheKey, cached.data);

      /*
       * Revalidamos sin bloquear.
       */
      if (!PROGRAM_DATASET_REQUESTS.has(cacheKey)) {
        const backgroundRequest = loadProgramDataset(
          normalizedProgramId,
          normalizedDataset,
          params,
          {
            forceRefresh: true,
            persist,
          },
        ).catch((error) => {
          console.warn(
            "[RCS Cockpit] " +
              `No se ha podido revalidar ` +
              `${normalizedProgramId}/${normalizedDataset}. ` +
              "Se mantiene la última fotografía válida.",
            error,
          );

          return cached.data;
        });

        /*
         * loadProgramDataset(forceRefresh)
         * registra internamente la Promise.
         *
         * No esperamos aquí.
         */
        void backgroundRequest;
      }

      return cached.data;
    }
  }

  /*
   * =====================================================
   * PETICIÓN YA EN CURSO
   * =====================================================
   */
  if (PROGRAM_DATASET_REQUESTS.has(cacheKey)) {
    return PROGRAM_DATASET_REQUESTS.get(cacheKey);
  }

  const request = (async () => {
    const url = buildProgramDatasetUrl(
      normalizedProgramId,
      normalizedDataset,
      params,
    );

    const payload = await loadJsonpOnDemand(url, {
      timeoutMs: 45000,

      /*
       * Una única petición.
       *
       * No encadenamos dos timeouts
       * consecutivos.
       */
      retries: 0,

      cacheBust: forceRefresh,
    });

    if (!payload || payload.ok === false) {
      throw new Error(
        payload?.error || `El dataset ${normalizedDataset} no está disponible.`,
      );
    }

    PROGRAM_DATASET_CACHE.set(cacheKey, payload);

    if (persist) {
      writeProgramDatasetSessionCache(
        normalizedProgramId,
        normalizedDataset,
        params,
        payload,
        new Date(),
      );
    }

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

      if (!staffingData) {
        throw new Error("Staffing no disponible.");
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
      console.error("[Flight Deck] Error cargando Staffing", error);

      elements.forEach((element) => {
        element.textContent = "—";
        element.classList.remove("is-loading");
        element.classList.add("is-unavailable");
      });
    });
}
async function loadProgramData(programId, forceRefresh = false) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  if (!forceRefresh && PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    return PROGRAM_DATA_CACHE.get(normalizedProgramId);
  }

  /*
   * =====================================================
   * CACHE DE SESIÓN
   * =====================================================
   */
  if (!forceRefresh) {
    const cachedProgram = hydrateProgramFromSessionCache(normalizedProgramId);

    if (cachedProgram) {
      return cachedProgram;
    }
  }

  const source = getProgramSource(normalizedProgramId);

  if (!source) {
    throw new Error(
      `No existe un origen configurado para el programa ${normalizedProgramId}`,
    );
  }

  if (!source.driveJsonUrl) {
    throw new Error(
      `El programa ${normalizedProgramId} no tiene driveJsonUrl configurado`,
    );
  }

  const requestRegistry = getRcsCoreRequestRegistry();

  if (requestRegistry.programs.has(normalizedProgramId)) {
    return requestRegistry.programs.get(normalizedProgramId);
  }

  const request = (async () => {
    /*
     * =====================================================
     * CORE
     * =====================================================
     *
     * El core sólo realiza un intento.
     *
     * Los datasets on-demand mantienen su política
     * independiente.
     */
    const rawData = await loadConfiguredSource(source, {
      timeoutMs: 25000,

      retries: 0,

      cacheBust: forceRefresh,
    });

    const programData = normalizeProgramData(normalizedProgramId, rawData);

    const restrictedData = getEmptyRestrictedProgramData();

    const completeProgramData = {
      ...programData,

      restricted: restrictedData,
    };

    PROGRAM_DATA_CACHE.set(normalizedProgramId, completeProgramData);

    const loadedAt = new Date();

    PROGRAM_LAST_LOADED_AT.set(normalizedProgramId, loadedAt);

    /*
     * Persistimos exclusivamente el CORE general.
     *
     * Nunca restricted.
     */
    writeRcsSessionCache("program", normalizedProgramId, programData, loadedAt);

    return completeProgramData;
  })();

  requestRegistry.programs.set(normalizedProgramId, request);

  try {
    return await request;
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

function getRcsDataMode(scope = "portfolio") {
  const state = getRcsDataState();

  return scope === "portfolio"
    ? state.portfolio || "live"
    : state.programs[scope] || "live";
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

function getDemoPortfolioData() {
  const rawData =
    typeof window.getSamplePortfolioData === "function"
      ? window.getSamplePortfolioData()
      : window.SAMPLE_DATA || {};

  return normalizePortfolioData(rawData);
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

function activateDemoPortfolio(message) {
  PORTFOLIO_DATA = getDemoPortfolioData();

  buildProgramSources(PORTFOLIO_DATA.programs);

  setRcsDataMode("portfolio", "demo");

  resetRcsProgramDataModes();

  DATA = PORTFOLIO_DATA;

  updateDataStatus();

  showDataFallbackBanner(message);
}

function activateDemoProgram(programId, routeContext, message) {
  const demoProgramData = getDemoProgramData(programId);

  if (!demoProgramData) {
    return false;
  }

  setRcsDataMode(programId, "demo");

  DATA = buildProgramData(demoProgramData);

  renderRouteContext(routeContext);

  updateDataStatus(programId);

  showDataFallbackBanner(message);

  return true;
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
    if (getRcsDataMode("portfolio") === "demo") {
      statusEl.textContent =
        "Modo demostración · " + "Portfolio General · " + "datos ficticios";

      return;
    }

    statusEl.textContent =
      `Últimos datos cargados: ` +
      `Portfolio General ` +
      `(${formatLastLoadedDate(PORTFOLIO_LAST_LOADED_AT)})`;

    return;
  }

  if (getRcsDataMode(programId) === "demo") {
    statusEl.textContent =
      `Modo demostración · ` + `${programId} · ` + `datos ficticios`;

    return;
  }

  const source = getProgramSource(programId);

  const lastLoadedAt = PROGRAM_LAST_LOADED_AT.get(programId);

  statusEl.textContent =
    `Últimos datos cargados: ` +
    `${source?.label || programId} ` +
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

function hasInstalledJiraMsaData(itemId) {
  const normalizedItemId = String(itemId || "").trim();

  if (!normalizedItemId) {
    return false;
  }

  return (
    Array.isArray(DATA?.roadmapItemStatusHistory) &&
    DATA.roadmapItemStatusHistory.some(
      (row) => String(row.itemId || "").trim() === normalizedItemId,
    )
  );
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

function clearRoadmapDetailReturnRoute() {
  sessionStorage.removeItem(ROADMAP_DETAIL_RETURN_ROUTE_KEY);
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

  return routeName === "management-roadmap" && supportedPrograms.has(programId);
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
  if (!routeRequiresJiraFeaturesData(context)) {
    return;
  }

  const programId = String(context.programId || "")
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

  /*
   * =====================================================
   * PORTFOLIO
   * =====================================================
   */
  if (!programId || routeName === "landing") {
    DATA = PORTFOLIO_DATA;

    renderLanding();

    updateDataStatus();

    if (getRcsDataMode("portfolio") === "demo") {
      showDataFallbackBanner(
        "Modo demostración activo: " +
          "el origen general no está disponible. " +
          "Todos los datos mostrados son ficticios " +
          "y sirven únicamente para demostrar " +
          "la funcionalidad del cockpit.",
      );
    } else {
      clearDataFallbackBanner();
    }

    return;
  }

  /*
   * =====================================================
   * DEMO
   * =====================================================
   */
  if (
    getRcsDataMode("portfolio") === "demo" ||
    getRcsDataMode(programId) === "demo"
  ) {
    const activated = activateDemoProgram(
      programId,
      context,
      "Modo demostración activo: " +
        "no se están utilizando datos operativos reales. " +
        "Pulsa “Actualizar datos” para volver a intentar " +
        "la conexión con el origen corporativo.",
    );

    if (activated) {
      return;
    }
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
  } catch (error) {
    console.error(error);

    const activated = activateDemoProgram(
      normalizedProgramId,
      context,
      `No se han podido cargar ` +
        `los datos de ${normalizedProgramId}. ` +
        "Se ha activado automáticamente " +
        "el modo demostración con datos " +
        "100% ficticios.",
    );

    if (!activated) {
      statusEl.textContent =
        `⚠ No se pudieron cargar ` + `los datos de ${normalizedProgramId}`;

      DATA = {
        ...PORTFOLIO_DATA,
        ...getEmptyProgramData(),
      };

      renderRouteContext(context);

      showDataFallbackBanner(
        `No se han podido cargar ` +
          `los datos de ${normalizedProgramId} ` +
          "y no existe un dataset " +
          "de demostración para este programa.",
      );
    }
  } finally {
    if (requiresBlockingLoad) {
      hideLoadingOverlay();
    }
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

  isLoadingData = true;

  const initialContext = getCurrentRoute();

  const cachedPortfolio = readRcsSessionCache("portfolio");

  const cachedProgram = initialContext.programId
    ? readRcsSessionCache("program", initialContext.programId)
    : null;

  let bootstrappedFromPortfolioCache = false;

  try {
    /*
     * =====================================================
     * FAST BOOT
     * =====================================================
     *
     * Si existe una última fotografía válida,
     * la mostramos inmediatamente.
     */
    const restoredPortfolio = hydratePortfolioFromSessionCache();

    if (restoredPortfolio) {
      bootstrappedFromPortfolioCache = true;

      setRcsDataMode("portfolio", "live");

      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();
    } else {
      /*
       * ===================================================
       * COLD BOOT
       * ===================================================
       *
       * Sólo una sesión sin fotografía previa
       * bloquea esperando al origen.
       */
      showLoadingOverlay("Cargando datos generales del portfolio...");

      await loadPortfolioData(true);

      setRcsDataMode("portfolio", "live");

      resetRcsProgramDataModes();

      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();
    }
  } catch (error) {
    console.error(error);

    activateDemoPortfolio(
      "No se puede acceder temporalmente " +
        "al origen general. " +
        "Se ha activado el modo demostración " +
        "con datos 100% ficticios. " +
        "Pulsa “Actualizar datos” para " +
        "reintentar la conexión.",
    );
  } finally {
    isLoadingData = false;

    hideLoadingOverlay();
  }

  syncDataSourceToggle();

  /*
   * Pintamos primero.
   */
  await render();

  /*
   * =====================================================
   * STALE-WHILE-REVALIDATE
   * =====================================================
   *
   * Si hemos arrancado desde cache:
   *
   * 1. el usuario ya está viendo el cockpit;
   * 2. Apps Script se consulta después;
   * 3. un timeout ya no bloquea la experiencia.
   */
  if (bootstrappedFromPortfolioCache) {
    void revalidatePortfolioDataInBackground();
  }

  if (initialContext.programId && cachedProgram?.data) {
    void revalidateProgramDataInBackground(initialContext.programId);
  }

  /*
   * cachedPortfolio sólo se lee antes del bootstrap
   * para dejar explícita la intención del flujo.
   */
  void cachedPortfolio;
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
      : "Actualizando datos generales...",
  );

  try {
    /*
     * =====================================================
     * PORTFOLIO
     * =====================================================
     */
    if (!normalizedProgramId || routeName === "landing") {
      await loadPortfolioData(true);

      setRcsDataMode("portfolio", "live");

      /*
       * Los orígenes pueden haber cambiado.
       * Limpiamos únicamente cachés en memoria.
       *
       * Las fotografías sessionStorage continúan
       * disponibles como fallback.
       */
      resetRcsProgramDataModes();

      DATA = PORTFOLIO_DATA;

      updateDataStatus();

      clearDataFallbackBanner();

      await render();

      return;
    }

    /*
     * Si Portfolio estaba en DEMO intentamos recuperar
     * primero el catálogo real de programas.
     */
    if (getRcsDataMode("portfolio") === "demo") {
      await loadPortfolioData(true);

      setRcsDataMode("portfolio", "live");

      resetRcsProgramDataModes();
    }

    invalidateProgramDeferredData(normalizedProgramId);

    const programData = await loadProgramData(normalizedProgramId, true);

    setRcsDataMode(normalizedProgramId, "live");

    DATA = buildProgramData(programData);

    updateDataStatus(normalizedProgramId);

    clearDataFallbackBanner();

    await render();
  } catch (error) {
    console.error(error);

    /*
     * =====================================================
     * PORTFOLIO · FALLBACK A ÚLTIMA FOTO
     * =====================================================
     */
    if (!normalizedProgramId || routeName === "landing") {
      const cachedPortfolio = hydratePortfolioFromSessionCache();

      if (
        cachedPortfolio ||
        (Array.isArray(PORTFOLIO_DATA.programs) &&
          PORTFOLIO_DATA.programs.length)
      ) {
        setRcsDataMode("portfolio", "live");

        DATA = PORTFOLIO_DATA;

        renderLanding();

        updateDataStatus();

        showDataFallbackBanner(
          "No se ha podido actualizar el origen general. " +
            "Se mantiene la última fotografía válida disponible.",
        );

        return;
      }

      activateDemoPortfolio(
        "El origen general sigue sin responder " +
          "y no existe una fotografía válida anterior. " +
          "Se mantiene el modo demostración " +
          "con datos ficticios.",
      );

      renderLanding();

      return;
    }

    /*
     * =====================================================
     * PROGRAMA · FALLBACK A ÚLTIMA FOTO
     * =====================================================
     */
    let fallbackProgram = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    if (!fallbackProgram) {
      fallbackProgram = hydrateProgramFromSessionCache(normalizedProgramId);
    }

    if (fallbackProgram) {
      setRcsDataMode(normalizedProgramId, "live");

      DATA = buildProgramData(fallbackProgram);

      renderRouteContext(context);

      updateDataStatus(normalizedProgramId);

      showDataFallbackBanner(
        `No se ha podido actualizar ${normalizedProgramId}. ` +
          "Se mantiene la última fotografía válida disponible.",
      );

      return;
    }

    const activated = activateDemoProgram(
      normalizedProgramId,
      context,
      `El origen de ${normalizedProgramId} ` +
        "sigue sin responder y no existe " +
        "una fotografía válida anterior. " +
        "Se mantiene el modo demostración " +
        "con datos ficticios.",
    );

    if (!activated) {
      throw error;
    }
  } finally {
    hideLoadingOverlay();
  }
}

function openDataSource() {
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

  const cardsContainer = document.querySelector("#managementReportsCards");

  if (!cardsContainer) {
    return;
  }

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

      <article class="management-report-card">
        <div class="management-report-card-top">
          <div>
            <h3>RCS KPIs Heatmap</h3>

            <p>
              Executive Performance Dashboard para el seguimiento
              de KPIs estratégicos y de programa por dominio
              y geografía.
            </p>
          </div>

          <span class="management-report-badge">
            KPI Performance
          </span>
        </div>

        <div class="management-report-card-kpis">
          <span>Strategic KPIs</span>
          <span>Program KPIs</span>
          <span>Geographies</span>
        </div>

        <div class="management-report-card-footer">
          <span class="management-report-caption">
            Heatmap comparativo de cumplimiento de objetivos
            y performance por país.
          </span>

          <a
            class="management-report-card-link"
            href="https://script.google.com/a/macros/bbva.com/s/AKfycbwB4Pe197DmvUW8j1x_YTA_j96CDkeKp3hH5GCSJGYNnlEinJbCS8Awm8RfJgy30BLj/exec"
            target="_blank"
            rel="noopener noreferrer"
            style="text-decoration: none;"
          >
            Abrir KPI Heatmap ↗
          </a>
        </div>
      </article>
    `;

    return;
  }

  cardsContainer.innerHTML = `
    <article class="management-report-card is-disabled">
      <div class="management-report-card-top">
        <div>
          <h3>Executive Summary</h3>

          <p>
            Resumen ejecutivo generado automáticamente
            a partir del estado actual del programa.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Roadmap</span>
        <span>Ejecución</span>
        <span>Highlights</span>
      </div>

      <div class="management-report-card-footer">
        <span class="management-report-caption">
          Síntesis ejecutiva generada con IA.
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
            Identificación de riesgos, desviaciones
            y elementos que requieren atención.
          </p>
        </div>

        <span class="management-report-badge is-soon">
          Próximamente
        </span>
      </div>

      <div class="management-report-card-kpis">
        <span>Riesgos</span>
        <span>Bloqueos</span>
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

function ensureManagementContrastStyles() {
  if (document.querySelector("#managementContrastStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementContrastStyles";

  style.textContent = `
    .management-contrast-view {
      display: grid;
      gap: 20px;
      margin-top: 18px;
    }

    .management-contrast-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
    }

    .management-contrast-quarter-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 8px 20px rgba(7, 46, 111, 0.06);
    }

    .management-contrast-quarter-btn {
      border: 0;
      border-radius: 999px;
      padding: 9px 16px;
      background: transparent;
      color: var(--blue);
      font-weight: 900;
      cursor: pointer;
    }

    .management-contrast-quarter-btn:hover {
      background: #eef4ff;
    }

    .management-contrast-quarter-btn.is-active {
      background: var(--blue);
      color: #ffffff;
    }

    .management-contrast-snapshot {
      display: grid;
      gap: 20px;
    }

    .management-contrast-hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding: 22px 26px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background:
        linear-gradient(
          180deg,
          rgba(255, 255, 255, 1) 0%,
          rgba(247, 250, 255, 1) 100%
        );
      box-shadow: var(--shadow);
    }

    .management-contrast-quarter-label {
      display: inline-block;
      margin-right: 10px;
      color: var(--blue);
      font-family: Georgia, serif;
      font-size: 34px;
      font-weight: 400;
    }

    .management-contrast-hero h2 {
      display: inline;
      margin: 0;
      color: var(--blue);
      font-size: 38px;
      line-height: 1.05;
    }

    .management-contrast-cycle {
      margin-top: 10px;
      color: #49aef3;
      font-family: Georgia, serif;
      font-size: 20px;
      font-weight: 900;
    }

    .management-contrast-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid #d8e2f2;
      border-radius: 999px;
      background: #ffffff;
      color: var(--blue);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }

    .management-contrast-main {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(760px, 1fr);
      gap: 20px;
      align-items: start;
    }

    .management-contrast-side,
    .management-contrast-table-panel {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: #ffffff;
      box-shadow: var(--shadow);
    }

    .management-contrast-side {
      padding: 22px;
    }

    .management-contrast-side h3 {
      margin: 0;
      color: var(--blue);
      font-size: 17px;
      line-height: 1.35;
    }

    .management-contrast-side-subtitle {
      margin: 6px 0 0;
      color: var(--blue);
      font-size: 14px;
      line-height: 1.45;
    }

    .management-contrast-donut-shell {
      display: grid;
      place-items: center;
      margin: 28px 0 22px;
    }

    .management-contrast-donut {
      position: relative;
      width: 285px;
      height: 285px;
      border-radius: 50%;
      background: var(--management-priority-gradient);
      display: grid;
      place-items: center;
    }

    .management-contrast-donut::before {
      content: "";
      position: absolute;
      inset: 30px;
      border-radius: 50%;
      background: #ffffff;
    }

    .management-contrast-donut-inner-ring {
      position: absolute;
      inset: 42px;
      border-radius: 50%;
      background:
        conic-gradient(
          #7ad9e5 0 calc(var(--management-rcp) * 1%),
          #eef1f5 calc(var(--management-rcp) * 1%) 100%
        );
      z-index: 1;
    }

    .management-contrast-donut-inner-ring::before {
      content: "";
      position: absolute;
      inset: 18px;
      border-radius: 50%;
      background: #ffffff;
    }

    .management-contrast-donut-center {
      position: relative;
      z-index: 2;
      display: grid;
      place-items: center;
      text-align: center;
    }

    .management-contrast-donut-center strong {
      color: #75dbe6;
      font-size: 30px;
      line-height: 1;
    }

    .management-contrast-donut-center span {
      margin-top: 2px;
      color: #243da8;
      font-size: 24px;
      font-weight: 800;
    }

    .management-contrast-legend {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }

    .management-contrast-legend-item {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      color: var(--blue);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.35;
    }

    .management-contrast-legend-dot {
      flex: 0 0 auto;
      width: 11px;
      height: 11px;
      margin-top: 2px;
      border-radius: 50%;
    }

    .management-contrast-legend-value {
      margin-left: auto;
      color: var(--muted);
      font-weight: 900;
    }

    .management-contrast-note {
      display: flex;
      gap: 10px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      color: #55709e;
      font-size: 13px;
      line-height: 1.45;
    }

    .management-contrast-footnote {
      margin-top: 14px;
      color: #49aef3;
      font-size: 12px;
      line-height: 1.4;
    }

    .management-contrast-table-panel {
      min-width: 0;
      overflow: hidden;
    }

    .management-contrast-table-top {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto;
      align-items: end;
      gap: 18px;
      padding: 18px 20px 12px;
      border-bottom: 3px solid var(--blue);
    }

    .management-contrast-table-top h3 {
      margin: 0;
      color: #4fb2f4;
      font-size: 24px;
    }

    .management-contrast-invoice-label {
      margin-top: 6px;
      color: #4fb2f4;
      font-family: Georgia, serif;
      font-size: 20px;
      font-weight: 900;
      text-align: right;
    }

    .management-contrast-country-head {
      display: grid;
      grid-template-columns: repeat(7, minmax(78px, 1fr));
      min-width: 620px;
    }

    .management-contrast-country {
      display: grid;
      place-items: center;
      gap: 4px;
      min-height: 74px;
      padding: 6px;
      border-left: 1px solid #e4e9f2;
    }

    .management-contrast-country-flag {
      font-size: 30px;
      line-height: 1;
    }

    .management-contrast-country strong {
      color: var(--blue);
      font-family: Georgia, serif;
      font-size: 17px;
    }

    .management-contrast-table-scroll {
      overflow-x: auto;
    }

    .management-contrast-table {
      width: 100%;
      min-width: 990px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .management-contrast-table col.management-contrast-name-col {
      width: 38%;
    }

    .management-contrast-table col.management-contrast-icon-col {
      width: 48px;
    }

    .management-contrast-table col.management-contrast-status-col {
      width: 48px;
    }

    .management-contrast-table th,
    .management-contrast-table td {
      border-bottom: 1px solid #e8edf5;
      border-right: 1px solid #e8edf5;
      padding: 10px 9px;
      vertical-align: middle;
      text-align: center;
    }

    .management-contrast-table td:first-child {
      text-align: left;
    }

    .management-contrast-headline-row th {
      padding: 9px 16px;
      background: #f1f2f4;
      color: #092d68;
      font-family: Georgia, serif;
      font-size: 16px;
      text-align: left;
    }

    .management-contrast-group-row th {
      padding: 9px 16px;
      background: #f5f5f5;
      color: #183d72;
      font-family: Georgia, serif;
      font-size: 16px;
      text-align: left;
    }

    .management-contrast-group-experience {
      color: #756af0;
      font-weight: 900;
    }

    .management-contrast-deliverable {
      color: #52729f;
      font-family: Georgia, serif;
      font-size: 15px;
      line-height: 1.25;
    }

    .management-contrast-experience {
      color: #766bf2;
      font-weight: 900;
    }

    .management-contrast-global {
      font-size: 23px;
    }

    .management-contrast-status {
      display: inline-block;
      width: 15px;
      height: 15px;
      border-radius: 50%;
    }

    .management-contrast-status.is-green {
      background:
        radial-gradient(
          circle at 35% 30%,
          #a9efbd 0%,
          #53cc7c 58%,
          #2ea85a 100%
        );
    }

    .management-contrast-status.is-amber {
      background:
        radial-gradient(
          circle at 35% 30%,
          #ffe897 0%,
          #eab844 58%,
          #cf9321 100%
        );
    }

    .management-contrast-country-cell {
      color: #3c659b;
      font-family: Georgia, serif;
      font-size: 12px;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .management-contrast-country-cell.is-na,
    .management-contrast-country-cell.is-tbd,
    .management-contrast-country-cell.is-future {
      color: #8a94a8;
      font-style: italic;
    }

    .management-contrast-country-cell.is-risk {
      color: #a47b28;
    }

    .management-contrast-empty {
      display: grid;
      place-items: center;
      min-height: 390px;
      padding: 40px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: #ffffff;
      box-shadow: var(--shadow);
      text-align: center;
    }

    .management-contrast-empty strong {
      display: block;
      color: var(--blue);
      font-family: Georgia, serif;
      font-size: 28px;
    }

    .management-contrast-empty p {
      max-width: 520px;
      margin: 10px 0 0;
      color: var(--muted);
      line-height: 1.5;
    }

    @media (max-width: 1300px) {
      .management-contrast-main {
        grid-template-columns: 1fr;
      }

      .management-contrast-side {
        display: grid;
        grid-template-columns: minmax(240px, 0.7fr) minmax(300px, 1fr);
        column-gap: 28px;
      }

      .management-contrast-side-copy {
        grid-column: 1;
      }

      .management-contrast-donut-shell {
        grid-column: 2;
        grid-row: 1 / span 3;
        margin: 0;
      }
    }

    @media (max-width: 850px) {
      .management-contrast-hero,
      .management-contrast-toolbar,
      .management-contrast-table-top {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .management-contrast-side {
        display: block;
      }

      .management-contrast-donut {
        width: 240px;
        height: 240px;
      }

      .management-contrast-invoice-label {
        text-align: left;
      }
    }
  `;

  document.head.appendChild(style);
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
  ensureManagementContrastStyles();

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

function normalizeManagementReportKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
function getManagementReportConfiguredLines(
  programId,
  productId = null,
  countryId = null,
  { spaceVision = false } = {},
) {
  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const normalizedCountryId = String(countryId || "")
    .trim()
    .toUpperCase();

  return getManagementExecutiveLines()
    .filter((line) => {
      if (
        String(line.programId || "")
          .trim()
          .toLowerCase() !== normalizedProgramId
      ) {
        return false;
      }

      if (
        normalizedProductId &&
        normalizeRoadmapProduct(line.productId) !== normalizedProductId
      ) {
        return false;
      }

      if (
        normalizedCountryId &&
        String(line.country || "")
          .trim()
          .toUpperCase() !== normalizedCountryId
      ) {
        return false;
      }

      return (line.spaceVision === true) === (spaceVision === true);
    })
    .sort(
      (left, right) => Number(left.order || 999) - Number(right.order || 999),
    );
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

function renderManagementReportProductSelector(programId) {
  const configuredProducts = getManagementExecutiveLines()
    .filter(
      (line) =>
        String(line.programId || "")
          .trim()
          .toLowerCase() ===
        String(programId || "")
          .trim()
          .toLowerCase(),
    )
    .map((line) => normalizeRoadmapProduct(line.productId))
    .filter(Boolean);

  const dataProducts = getManagementReportSourceItems(programId)
    .map((item) => normalizeRoadmapProduct(item.product))
    .filter(Boolean);

  const products = [...new Set([...configuredProducts, ...dataProducts])];

  if (!products.length) {
    selectedExecutiveProduct = null;

    return "";
  }

  const normalizedSelectedProduct = normalizeRoadmapProduct(
    selectedExecutiveProduct,
  );

  if (!products.includes(normalizedSelectedProduct)) {
    selectedExecutiveProduct = products[0];
  } else {
    selectedExecutiveProduct = normalizedSelectedProduct;
  }

  return `
    <div
      class="
        systems-product-selector
      "
    >
      ${products
        .map(
          (product) => `
            <button
              class="
                systems-product-btn
                ${
                  normalizeRoadmapProduct(selectedExecutiveProduct) === product
                    ? "active"
                    : ""
                }
              "
              type="button"
              data-executive-product="${rcsEsc(product)}"
            >
              ${rcsEsc(formatManagementReportProductLabel(product))}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function resolveManagementRoadmapYear(items) {
  const currentYear = new Date().getFullYear();

  const years = [
    ...new Set(
      (items || [])
        .flatMap((item) => {
          const dates = getRoadmapItemDates(item);

          return [dates.startDate, dates.endDate, dates.targetDate]
            .filter(Boolean)
            .map((date) => date.getFullYear());
        })
        .filter((year) => Number.isFinite(year)),
    ),
  ].sort((left, right) => left - right);

  if (!years.length) {
    return currentYear;
  }

  if (years.includes(currentYear)) {
    return currentYear;
  }

  return years.at(-1);
}

function isManagementSpaceVisionItem(item) {
  const source = item?.source || {};

  const markers = [
    source.spaceVision,
    source.space_vision,
    source.reportSection,
    source.report_section,
    source.managementView,
    source.management_view,
    source.executiveView,
    source.executive_view,
    source.slideGroup,
    source.slide_group,
    source.section,
    source.sectionName,
    source.experienceId,
    source.experience_id,
    source.experienceName,
    source.experience_name,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
    );

  return markers.some(
    (value) =>
      value.includes("space") ||
      value.includes("experiencia") ||
      value.includes("experience"),
  );
}

function getManagementItemCandidateKeys(item) {
  const source = item?.source || {};

  return [
    item.id,
    item.initiative,
    item.title,
    source.sdaCode,
    source.sda_code,
    source.deliverableId,
    source.deliverable_id,
    source.deliverableName,
    source.deliverable_name,
    source.executiveLineId,
    source.executive_line_id,
    source.executiveLine,
    source.executive_line,
    source.summaryLineId,
    source.summary_line_id,
    source.summaryLine,
    source.summary_line,
    source.projectId,
    source.project_id,
    source.projectName,
    source.project_name,
    source.itemId,
    source.item_id,
  ]
    .map(normalizeManagementReportKey)
    .filter(Boolean);
}

function getManagementFeatureCandidateKeys(feature) {
  return [
    feature.id,
    feature.featureId,
    feature.feature_id,
    feature.parentId,
    feature.parent_id,
    feature.epicId,
    feature.epic_id,
    feature.initiative,
    feature.initiativeId,
    feature.initiative_id,
    feature.deliverableId,
    feature.deliverable_id,
    feature.deliverableName,
    feature.deliverable_name,
    feature.projectId,
    feature.project_id,
    feature.projectName,
    feature.project_name,
    feature.sdaCode,
    feature.sda_code,
    feature.itemId,
    feature.item_id,
    feature.summaryLineId,
    feature.summary_line_id,
    feature.summaryLine,
    feature.summary_line,
  ]
    .map(normalizeManagementReportKey)
    .filter(Boolean);
}

function findManagementReportRowByKeys(rows, candidateKeys) {
  const keys = Array.isArray(candidateKeys) ? candidateKeys : [];

  if (!keys.length) {
    return null;
  }

  for (const row of rows.values()) {
    const hasMatch = keys.some((key) => row.candidateKeys.has(key));

    if (hasMatch) {
      return row;
    }
  }

  return null;
}

function isManagementFeatureDeployed(feature) {
  if (!feature || typeof feature !== "object") {
    return false;
  }

  if (feature.deployed === true || feature.isDeployed === true) {
    return true;
  }

  const rawStatus =
    [
      feature.deploymentStatus,
      feature.deployment_status,
      feature.releaseStatus,
      feature.release_status,
      feature.status,
      feature.currentStatus,
      feature.current_status,
      feature.state,
      feature.lifecycleStatus,
      feature.lifecycle_status,
    ].find((value) => String(value || "").trim()) || "";

  const normalizedStatus = String(rawStatus)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (
    normalizedStatus.includes("deploy") ||
    normalizedStatus.includes("released") ||
    normalizedStatus.includes("release") ||
    normalizedStatus.includes("production") ||
    normalizedStatus.includes("prod") ||
    normalizedStatus.includes("live")
  ) {
    return true;
  }

  return rcsNormalizeStatus(normalizedStatus) === "done";
}

function getManagementRowQuarterCoverage(items, year) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  const coverage = {
    Q1: false,
    Q2: false,
    Q3: false,
    Q4: false,
  };

  (items || []).forEach((item) => {
    quarters.forEach((quarter) => {
      if (roadmapItemMatchesPeriod(item, quarter, year)) {
        coverage[quarter] = true;
      }
    });

    const explicitQuarter = String(
      item?.source?.quarter ||
        item?.source?.reportQuarter ||
        item?.source?.report_quarter ||
        "",
    )
      .trim()
      .toUpperCase();

    if (Object.prototype.hasOwnProperty.call(coverage, explicitQuarter)) {
      coverage[explicitQuarter] = true;
    }
  });

  return coverage;
}

function getManagementCountryLabel(countryId) {
  const normalizedCountryId = String(countryId || "")
    .trim()
    .toUpperCase();

  if (!normalizedCountryId) {
    return "Global";
  }

  if (normalizedCountryId === "HL") {
    return "Holding";
  }

  return (
    COUNTRIES.find((country) => country.id === normalizedCountryId)?.label ||
    normalizedCountryId
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

function getManagementRoadmapLinksForLine(executiveLineId) {
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

    /*
     * Para considerar una relación
     * operativa necesitamos:
     *
     * - SDA
     * - Deliverable
     */
    return Boolean(
      normalizeManagementSdaId(link.sdaId) &&
      normalizeManagementDeliverableId(link.deliverableId),
    );
  });
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
  const links = getManagementRoadmapLinksForLine(executiveLineId);

  if (!links.length) {
    return [];
  }

  const features = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  const result = new Map();

  links.forEach((link) => {
    features.forEach((feature) => {
      if (!managementFeatureMatchesDeliverable(feature, link)) {
        return;
      }

      const featureKey = String(
        feature.jiraKey || feature.sourceFeatureKey || feature.id || "",
      )
        .trim()
        .toUpperCase();

      if (!featureKey) {
        return;
      }

      /*
       * Una Feature se cuenta
       * una única vez aunque
       * encuentre varias relaciones.
       */
      if (!result.has(featureKey)) {
        result.set(featureKey, feature);
      }
    });
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

function getManagementRoadmapLinkSummary(executiveLineId) {
  const links = getManagementRoadmapLinksForLine(executiveLineId);

  const sdaIds = [
    ...new Set(
      links.map((link) => String(link.sdaId || "").trim()).filter(Boolean),
    ),
  ];

  const deliverableIds = [
    ...new Set(
      links
        .map((link) => normalizeManagementDeliverableId(link.deliverableId))
        .filter(Boolean),
    ),
  ];

  return {
    links,

    sdaIds,

    deliverableIds,

    hasAssociation: links.length > 0,
  };
}
function buildManagementReportRows(
  programId,
  productId,
  countryId,
  { spaceVision = false } = {},
) {
  const configuredLines = getManagementReportConfiguredLines(
    programId,
    productId,
    countryId,
    {
      spaceVision,
    },
  );

  return configuredLines.map((line) => {
    const linkSummary = getManagementRoadmapLinkSummary(line.id);

    const features = linkSummary.hasAssociation
      ? getManagementFeaturesForLine(line.id)
      : [];

    const featureCount = features.length;

    const deployedFeatures = features.filter(isManagementFeatureDeployed);

    const featureDeployedCount = deployedFeatures.length;

    /*
     * Sólo existe porcentaje cuando:
     *
     * 1. existe una relación
     *    Línea → SDA → Deliverable;
     *
     * 2. hemos encontrado al menos
     *    una Feature.
     *
     * Evitamos mostrar 0% cuando
     * simplemente falta asociación.
     */
    const progress =
      linkSummary.hasAssociation && featureCount > 0
        ? Math.round((featureDeployedCount / featureCount) * 100)
        : null;

    return {
      id: line.id,

      title: line.title,

      category: line.category || "",

      comments: line.comments || "",

      attentionLabel: line.attentionLabel || "",

      status: line.status || "planned",

      statusLabel: line.statusLabel || rcsStatusLabel(line.status || "planned"),

      quarterCoverage: {
        Q1: line.quarterCoverage?.Q1 === true,

        Q2: line.quarterCoverage?.Q2 === true,

        Q3: line.quarterCoverage?.Q3 === true,

        Q4: line.quarterCoverage?.Q4 === true,
      },

      /*
       * =================================================
       * RELACIÓN EJECUTIVA
       * =================================================
       */

      hasAssociation: linkSummary.hasAssociation,

      sdaIds: linkSummary.sdaIds,

      deliverableIds: linkSummary.deliverableIds,

      /*
       * =================================================
       * FEATURES
       * =================================================
       */

      features,

      featureCount,

      featureDeployedCount,

      progress,

      /*
       * =================================================
       * MSA
       * =================================================
       *
       * Lo añadiremos después.
       */

      msaAssociated: false,

      msaCount: null,

      msaDoneCount: null,

      year: Number(line.year) || new Date().getFullYear(),

      order: Number(line.order) || 999,
    };
  });
}
function getManagementRoadmapTimelineLayout(row) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  const activeIndexes = quarters
    .map((quarter, index) =>
      row?.quarterCoverage?.[quarter] === true ? index : null,
    )
    .filter((index) => index !== null);

  /*
   * Sin planificación dentro del año.
   *
   * Ejemplo:
   * elemento reprogramado fuera de 2026.
   */
  if (!activeIndexes.length) {
    return {
      hasPlanning: false,

      left: 0,

      width: 0,
    };
  }

  const firstQuarter = Math.min(...activeIndexes);

  const lastQuarter = Math.max(...activeIndexes);

  /*
   * Cada trimestre ocupa el 25%
   * del cronograma anual.
   */
  const left = firstQuarter * 25;

  const width = (lastQuarter - firstQuarter + 1) * 25;

  return {
    hasPlanning: true,

    left,

    width,
  };
}
function renderManagementRoadmapCountrySections(
  sections,
  programId,
  productId,
  year,
  sectionTitle = "",
  sectionDescription = "",
) {
  if (!sections.length) {
    return `
      <div class="management-roadmap-empty">
        No hay líneas configuradas
        para esta selección.
      </div>
    `;
  }

  return `
    ${
      sectionTitle
        ? `
          <section class="panel">
            <div class="management-roadmap-space-title">
              <div>
                <h3>
                  ${rcsEsc(sectionTitle)}
                </h3>

                <p>
                  ${rcsEsc(sectionDescription)}
                </p>
              </div>

              <span class="status-pill status-pending">
                ${sections.reduce(
                  (total, section) => total + section.rows.length,
                  0,
                )}
              </span>
            </div>
          </section>
        `
        : ""
    }

    ${sections
      .map(
        (section) => `
          <section class="management-roadmap-country">
            <div class="management-roadmap-country-header">
              <div>
                <h3>
                  ${rcsEsc(section.countryLabel)}
                </h3>

                <p>
                  ${section.rows.length}
                  ${section.rows.length === 1 ? "línea" : "líneas"}
                  de seguimiento
                  · ${year}
                </p>
              </div>

              <span class="status-pill status-pending">
                ${section.rows.length}
              </span>
            </div>

            <div class="management-timeline-wrap">
              <div class="management-timeline">

                <!-- =========================
                     CABECERA
                     ========================= -->

                <div class="management-timeline-header">

                  <div class="management-timeline-header-deliverable">
                    Deliverables
                  </div>

                  <div class="management-timeline-header-period">

                    <div>
                      <strong>Q1</strong>
                      <span>Ene · Mar</span>
                    </div>

                    <div>
                      <strong>Q2</strong>
                      <span>Abr · Jun</span>
                    </div>

                    <div>
                      <strong>Q3</strong>
                      <span>Jul · Sep</span>
                    </div>

                    <div>
                      <strong>Q4</strong>
                      <span>Oct · Dic</span>
                    </div>

                  </div>

                  <div class="management-timeline-header-status">
                    Estado
                  </div>

                  <div class="management-timeline-header-execution">
                    Ejecución
                  </div>

                </div>

                <!-- =========================
                     FILAS
                     ========================= -->

                ${section.rows
                  .map((row) => {
                    const timeline = getManagementRoadmapTimelineLayout(row);

                    const progressAvailable =
                      row.progress !== null &&
                      row.progress !== undefined &&
                      Number.isFinite(Number(row.progress));

                    const progress = progressAvailable
                      ? Math.max(0, Math.min(100, Number(row.progress)))
                      : 0;

                    let progressLabel = "Por asociar";

                    if (row.hasAssociation && row.featureCount > 0) {
                      progressLabel = `${row.featureDeployedCount}/${row.featureCount} deployed`;
                    } else if (row.hasAssociation) {
                      progressLabel = "Sin Features";
                    }

                    return `
                      <article
                        class="management-timeline-row"
                        data-management-line="${rcsEsc(row.id)}"
                      >

                        <!-- =====================
                             DELIVERABLE
                             ===================== -->

                        <div class="management-timeline-deliverable">

                          ${
                            row.category
                              ? `
                                <span class="management-timeline-category">
                                  ${rcsEsc(row.category)}
                                </span>
                              `
                              : ""
                          }

                          <strong class="management-timeline-title">
                            ${rcsEsc(row.title)}
                          </strong>

                          ${
                            row.hasAssociation
                              ? `
                                <div class="management-timeline-links">

                                  ${row.sdaIds
                                    .map(
                                      (sdaId) => `
                                        <span>
                                          ${rcsEsc(sdaId)}
                                        </span>
                                      `,
                                    )
                                    .join("")}

                                  ${row.deliverableIds
                                    .map(
                                      (deliverableId) => `
                                        <span>
                                          ${rcsEsc(deliverableId)}
                                        </span>
                                      `,
                                    )
                                    .join("")}

                                </div>
                              `
                              : ""
                          }

                        </div>

                        <!-- =====================
                             CRONOGRAMA
                             ===================== -->

                        <div class="management-timeline-track">

                          <div class="management-timeline-quarter-grid">

                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>

                          </div>

                          ${
                            timeline.hasPlanning
                              ? `
                                <div
                                  class="
                                    management-timeline-bar
                                    management-timeline-status-${rcsEsc(
                                      row.status,
                                    )}
                                  "
                                  style="
                                    left:${timeline.left}%;
                                    width:${timeline.width}%;
                                  "
                                >

                                  <div
                                    class="management-timeline-bar-progress"
                                    style="
                                      width:${progress}%;
                                    "
                                  ></div>

                                  <span class="management-timeline-bar-label">
                                    ${
                                      progressAvailable
                                        ? `${progress}%`
                                        : progressLabel
                                    }
                                  </span>

                                </div>
                              `
                              : `
                                <div class="management-timeline-unplanned">
                                  Fuera del periodo
                                </div>
                              `
                          }

                          <div class="management-timeline-feature-meta">

                            <span>
                              ${rcsEsc(progressLabel)}
                            </span>

                            ${
                              row.featureCount > 0
                                ? `
                                  <strong>
                                    ${progress}%
                                  </strong>
                                `
                                : ""
                            }

                          </div>

                        </div>

                        <!-- =====================
                             ESTADO
                             ===================== -->

                        <div class="management-timeline-status">

                          <span
                            class="
                              status-pill
                              status-${rcsEsc(row.status)}
                            "
                          >
                            ${rcsEsc(row.statusLabel)}
                          </span>

                        </div>

                        <!-- =====================
                             EJECUCIÓN
                             ===================== -->

                        <div class="management-timeline-execution">

                          ${
                            row.attentionLabel
                              ? `
                                <strong>
                                  ${rcsEsc(row.attentionLabel)}
                                </strong>
                              `
                              : ""
                          }

                          ${
                            row.comments
                              ? `
                                <p>
                                  ${rcsEsc(row.comments)}
                                </p>
                              `
                              : ""
                          }

                          ${
                            row.hasAssociation
                              ? `
                                <div class="management-timeline-execution-meta">

                                  <span>
                                    SDA:
                                    ${rcsEsc(row.sdaIds.join(", "))}
                                  </span>

                                  <span>
                                    Deliverable:
                                    ${rcsEsc(row.deliverableIds.join(", "))}
                                  </span>

                                  <span>
                                    Features:
                                    ${row.featureDeployedCount}
                                    deployed de
                                    ${row.featureCount}
                                  </span>

                                </div>
                              `
                              : `
                                <span class="management-timeline-pending">
                                  SDA / Deliverable:
                                  pendiente de asociación
                                </span>
                              `
                          }

                        </div>

                      </article>
                    `;
                  })
                  .join("")}

              </div>
            </div>

          </section>
        `,
      )
      .join("")}
  `;
}
function getManagementRoadmapSnapshotState() {
  if (!window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT) {
    window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT = {
      productId: "blue-buddy",
      countryId: "ES",
    };
  }

  return window.RCS_MANAGEMENT_ROADMAP_SNAPSHOT;
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

function normalizeManagementRoadmapLine(line, fallbackOrder = 999) {
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

    category: String(line?.category || "").trim(),

    categoryTone: String(line?.categoryTone || "").trim(),

    title: String(line?.title || "").trim(),

    status: String(line?.status || "on-track").trim(),

    statusLabel: String(line?.statusLabel || "En curso").trim(),

    statusTone: String(line?.statusTone || "").trim(),

    comments: String(line?.comments || "").trim(),

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
    .filter(
      (line) =>
        String(line.programId || "")
          .trim()
          .toLowerCase() === normalizedProgramId &&
        normalizeRoadmapProduct(line.productId) === normalizedProductId &&
        String(line.country || "")
          .trim()
          .toUpperCase() === normalizedCountryId,
    )
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

function ensureManagementRoadmapFeatureQuarterStyles() {
  if (document.querySelector("#managementRoadmapFeatureQuarterStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementRoadmapFeatureQuarterStyles";

  style.textContent = `
    /*
     * =====================================================
     * MANAGEMENT ROADMAP · QUARTERS DESDE SDA + FEATURES
     * =====================================================
     */

    .management-deliverables-col-quarter {
      width: 7.5%;
    }

    .management-deliverables-quarter {
      height: 54px;
      padding: 6px !important;
      background: #ffffff;
      text-align: center;
    }

    .management-deliverables-quarter.is-complete {
      background: #e8f7ee;
    }

    .management-deliverables-quarter.is-progress {
      background: #e8f2fc;
    }

    .management-deliverables-quarter.is-planned {
      background: #f0f5fb;
    }

    .management-deliverables-quarter.is-sda {
      background: #f6f8fb;
    }

    .management-deliverables-quarter.is-empty,
    .management-deliverables-quarter.is-unmapped {
      background: #ffffff;
    }

    .management-deliverables-quarter-content {
      display: grid;
      place-items: center;
      gap: 3px;
      min-height: 40px;
    }

    .management-deliverables-quarter-value {
      color: #053f93;
      font-size: 13px;
      font-weight: 900;
      line-height: 1;
    }

    .management-deliverables-quarter-label {
      color: #6f83a5;
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }

    .management-deliverables-quarter-progress {
      width: 34px;
      height: 4px;
      overflow: hidden;
      border-radius: 999px;
      background: #d7e2ef;
    }

    .management-deliverables-quarter-progress span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #2fc274;
    }

    .management-deliverables-quarter.is-planned
      .management-deliverables-quarter-progress span {
      background: #8aa7ce;
    }

    .management-deliverables-quarter-sda {
      color: #60789d;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .management-deliverables-quarter-empty {
      color: #b1bccb;
      font-size: 15px;
      font-weight: 700;
    }

    /*
     * Dejamos fuera de uso los markers
     * antiguos de riesgo / atención.
     *
     * No se representan iconos ni emojis
     * en las columnas trimestrales.
     */
    .management-deliverables-quarter-marker {
      display: none !important;
    }
  `;

  document.head.appendChild(style);
}
function renderManagementRoadmapQuarterCell(row, quarter) {
  ensureManagementRoadmapFeatureQuarterStyles();

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
      progress: null,
    };
  }

  const features = getManagementFeaturesForLine(executiveLineId);

  const deployedFeatures = features.filter(isManagementFeatureDeployed);

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
    <div class="management-deliverables-progress">

      <div class="management-deliverables-progress-head">
        <strong>
          ${progress.deployedCount}/${progress.featureCount}
        </strong>

        <span>
          ${progress.progress}%
        </span>
      </div>

      <div
        class="management-deliverables-progress-bar"
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
        deployed
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
function ensureManagementRoadmapMappingEditorStyles() {
  if (document.querySelector("#managementRoadmapMappingEditorStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementRoadmapMappingEditorStyles";

  style.textContent = `
    .management-roadmap-editor-block {
      display: grid;
      gap: 12px;
      margin-top: 14px;
      padding: 14px;
      border: 1px solid #dbe4f1;
      border-radius: 14px;
      background: #f8faff;
    }

    .management-roadmap-editor-field {
      display: grid;
      gap: 6px;
    }

    .management-roadmap-editor-field label {
      color: #526b94;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .management-roadmap-editor-select {
      width: 100%;
      min-height: 42px;
      padding: 0 12px;
      border: 1px solid #cdd9eb;
      border-radius: 10px;
      background: #ffffff;
      color: #153b76;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
    }

    .management-roadmap-editor-deliverables {
      display: grid;
      gap: 7px;
      max-height: 250px;
      overflow-y: auto;
    }

    .management-roadmap-editor-deliverable {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 9px;
      align-items: flex-start;
      padding: 9px 10px;
      border: 1px solid #dde6f2;
      border-radius: 9px;
      background: #ffffff;
      cursor: pointer;
    }

    .management-roadmap-editor-deliverable:hover {
      border-color: #9cb6dd;
      background: #f7faff;
    }

    .management-roadmap-editor-deliverable input {
      margin-top: 2px;
    }

    .management-roadmap-editor-deliverable strong {
      display: block;
      color: #254a80;
      font-size: 11px;
      line-height: 1.3;
    }

    .management-roadmap-link-card {
      position: relative;
    }

    .management-roadmap-link-remove {
      position: absolute;
      top: 8px;
      right: 8px;
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 1px solid #e6ccd0;
      border-radius: 50%;
      background: #ffffff;
      color: #ac3a4a;
      font-size: 16px;
      cursor: pointer;
    }

    .management-roadmap-link-name {
      grid-column: 2 / -1;
      padding-top: 6px;
      border-top: 1px solid #e9eef5;
    }

    .management-roadmap-link-name span {
      margin-bottom: 2px;
    }

    .management-roadmap-editor-help {
      margin: 0;
      color: #7385a2;
      font-size: 11px;
      line-height: 1.4;
    }

    .management-roadmap-editor-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #eef4fd;
    }

    .management-roadmap-editor-preview span {
      color: #647b9f;
      font-size: 10px;
      font-weight: 800;
    }

    .management-roadmap-editor-preview strong {
      color: var(--blue);
      font-size: 14px;
    }

    .management-roadmap-mapping-save {
      min-height: 38px;
      padding: 0 17px;
      border: 0;
      border-radius: 999px;
      background: var(--blue);
      color: #ffffff;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .management-roadmap-mapping-save:disabled {
      background: #c5cfdd;
      cursor: default;
    }

    .management-roadmap-mapping-footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .management-roadmap-mapping-session-note {
      color: #986c10;
    }

    .management-roadmap-mapping-session-note strong {
      color: #7b570b;
    }

    .management-deliverables-table.is-mapping-mode
      .management-deliverables-col-name {
      width: 32%;
    }

    @media (max-width: 760px) {
      .management-roadmap-mapping-footer {
        align-items: stretch;
        flex-direction: column;
      }

      .management-roadmap-mapping-footer-actions {
        justify-content: flex-end;
      }
    }
  `;

  document.head.appendChild(style);
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

  (Array.isArray(links) ? links : []).forEach((link) => {
    features.forEach((feature, index) => {
      if (!managementFeatureMatchesDeliverable(feature, link)) {
        return;
      }

      const key = String(
        feature?.id ||
          feature?.featureId ||
          feature?.feature_id ||
          feature?.key ||
          feature?.jiraKey ||
          `${link.sdaId}-${link.deliverableId}-${index}`,
      ).trim();

      result.set(key, feature);
    });
  });

  return [...result.values()];
}

function getManagementRoadmapDraftProgress(links) {
  const features = getManagementRoadmapFeaturesForLinks(links);

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

async function saveManagementRoadmapDraftLinks(programId, executiveLineId) {
  const state = getManagementRoadmapMappingEditorState();

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const normalizedLineId = String(executiveLineId || "")
    .trim()
    .toLowerCase();

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
        Actualizando Management Roadmap Links...
      </span>
    `;
  }

  try {
    const currentLinks = Array.isArray(DATA?.managementRoadmapLinks)
      ? DATA.managementRoadmapLinks
      : [];

    /*
     * Quitamos las relaciones actuales
     * de la línea que se está editando.
     */
    const unrelatedLinks = currentLinks.filter(
      (link) =>
        String(link.executiveLineId || "")
          .trim()
          .toLowerCase() !== normalizedLineId,
    );

    /*
     * Incorporamos el draft actual.
     *
     * Después saneamos la fotografía
     * completa para eliminar:
     *
     * - relaciones incompletas;
     * - duplicados;
     * - residuos antiguos.
     */
    const nextLinks = buildManagementRoadmapPersistableLinks([
      ...unrelatedLinks,

      ...cloneManagementRoadmapLinks(state.draftLinks),
    ]);

    const payload = {
      action: "save-management-roadmap-links",

      links: nextLinks,
    };

    /*
     * Limpiamos la URL antes del POST.
     */
    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

    await fetch(endpoint.toString(), {
      method: "POST",

      mode: "no-cors",

      credentials: "include",

      cache: "no-store",

      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },

      body: JSON.stringify(payload),
    });

    /*
     * Damos tiempo a Sheets para
     * hacer visible la escritura.
     */
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    /*
     * Volvemos a cargar el CORE.
     *
     * managementRoadmapLinks ya forma
     * parte de SHEETS, por lo que
     * getCoreAppData_() lo devolverá.
     */
    const rawData = await loadConfiguredSource(source, {
      timeoutMs: 25000,

      retries: 0,

      cacheBust: true,
    });

    const normalizedData = normalizeProgramData(normalizedProgramId, rawData);

    const persistedLinks = buildManagementRoadmapPersistableLinks(
      normalizedData?.managementRoadmapLinks,
    );

    const expectedSignature =
      getManagementRoadmapPersistenceSignature(nextLinks);

    const persistedSignature =
      getManagementRoadmapPersistenceSignature(persistedLinks);

    if (expectedSignature !== persistedSignature) {
      throw new Error(
        "La Spreadsheet no devuelve las relaciones que se acaban de guardar.",
      );
    }

    /*
     * Actualizamos el dataset vivo.
     */
    DATA.managementRoadmapLinks = persistedLinks;

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLinks: persistedLinks,
      });
    }

    state.originalLinks = cloneManagementRoadmapLinks(state.draftLinks);

    closeManagementRoadmapMappingPanel();

    renderManagementRoadmapView(normalizedProgramId);
  } catch (error) {
    console.error("[Management Roadmap] Error guardando relaciones", error);

    if (saveButton) {
      saveButton.disabled = false;

      saveButton.textContent = "Guardar";
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

    const sdaId = normalizeManagementSdaId(link?.sdaId);

    const deliverableId = normalizeManagementDeliverableId(link?.deliverableId);

    /*
     * No publicamos mappings incompletos.
     */
    if (!executiveLineId || !sdaId || !deliverableId) {
      return;
    }

    const normalizedLink = {
      executiveLineId,

      sdaId,

      deliverableId,

      active: true,
    };

    const key = [
      executiveLineId.toLowerCase(),

      String(sdaId).toUpperCase(),

      String(deliverableId).toUpperCase(),
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
function getManagementRoadmapPersistenceSignature(links) {
  return [
    ...new Set(
      (Array.isArray(links) ? links : [])
        .filter((link) => isManagementRoadmapLinkActive(link))
        .map((link) => {
          const executiveLineId = String(link.executiveLineId || "")
            .trim()
            .toLowerCase();

          const sdaId = normalizeManagementSdaId(link.sdaId);

          const deliverableId = normalizeManagementDeliverableId(
            link.deliverableId,
          );

          if (!executiveLineId || !sdaId || !deliverableId) {
            return "";
          }

          return [executiveLineId, sdaId, deliverableId].join("::");
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
function renderManagementRoadmapMappingPanel(
  programId,
  executiveLineId,
  options = {},
) {
  ensureManagementRoadmapMappingEditorStyles();

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

function ensureManagementRoadmapMappingStyles() {
  if (document.querySelector("#managementRoadmapMappingStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementRoadmapMappingStyles";

  style.textContent = `
    .management-roadmap-config-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 38px;
      padding: 0 15px;
      border: 1px solid #cbd9ef;
      border-radius: 999px;
      background: #ffffff;
      color: var(--blue);
      font: inherit;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      transition:
        background 0.18s ease,
        color 0.18s ease,
        border-color 0.18s ease;
    }

    .management-roadmap-config-toggle:hover {
      border-color: var(--blue);
      background: #f2f6ff;
    }

    .management-roadmap-config-toggle.is-active {
      border-color: var(--blue);
      background: var(--blue);
      color: #ffffff;
    }

    .management-deliverables-progress {
      display: grid;
      gap: 4px;
      padding: 7px 9px;
      color: #143e7c;
      font-size: 11px;
      text-align: left;
    }

    .management-deliverables-progress-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .management-deliverables-progress-head strong {
      color: #002f78;
      font-size: 13px;
    }

    .management-deliverables-progress-head span {
      color: #526e9d;
      font-weight: 900;
    }

    .management-deliverables-progress-bar {
      position: relative;
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: #dce7f4;
    }

    .management-deliverables-progress-bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #2fc274;
    }

    .management-deliverables-progress small {
      color: #7285a5;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .management-deliverables-progress.is-unmapped,
    .management-deliverables-progress.is-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      text-align: center;
    }

    .management-deliverables-progress.is-unmapped span {
      color: #8a94a6;
      font-weight: 800;
    }

    .management-deliverables-progress.is-empty {
      flex-direction: column;
      gap: 1px;
    }

    .management-deliverables-progress.is-empty strong {
      color: #61769a;
    }

    .management-deliverables-progress.is-empty span {
      color: #8a94a6;
    }

    .management-roadmap-mapping-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: calc(100% - 12px);
      min-height: 32px;
      margin: 6px;
      padding: 5px 9px;
      border: 1px solid;
      border-radius: 8px;
      background: #ffffff;
      font: inherit;
      font-size: 10px;
      font-weight: 900;
      cursor: pointer;
    }

    .management-roadmap-mapping-btn.is-mapped {
      border-color: #b8e5ca;
      background: #edf9f2;
      color: #17814b;
    }

    .management-roadmap-mapping-btn.is-unmapped {
      border-color: #ead9b0;
      background: #fff8e8;
      color: #916715;
    }

    .management-deliverables-col-progress {
      width: 12%;
    }

    .management-deliverables-col-mapping {
      width: 10%;
    }

    .management-deliverables-table.is-mapping-mode
      .management-deliverables-col-name {
      width: 28%;
    }

    .management-deliverables-table.is-mapping-mode
      .management-deliverables-col-progress {
      width: 11%;
    }

    .management-deliverables-table.is-mapping-mode
      .management-deliverables-col-status {
      width: 10%;
    }

    .management-deliverables-table.is-mapping-mode
      .management-deliverables-col-comments {
      width: 26%;
    }

    .management-roadmap-mapping-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      justify-content: flex-end;
      background: rgba(11, 31, 69, 0.28);
      backdrop-filter: blur(2px);
    }

    .management-roadmap-mapping-panel {
      display: grid;
      grid-template-rows: auto 1fr auto;
      width: min(620px, 94vw);
      height: 100%;
      background: #f6f9fe;
      box-shadow:
        -20px 0 50px
        rgba(18, 45, 92, 0.2);
      animation:
        managementRoadmapMappingIn
        0.2s ease-out;
    }

    @keyframes managementRoadmapMappingIn {
      from {
        transform: translateX(28px);
        opacity: 0;
      }

      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .management-roadmap-mapping-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      padding: 24px;
      border-bottom: 1px solid #dce5f2;
      background: #ffffff;
    }

    .management-roadmap-mapping-eyebrow {
      display: block;
      margin-bottom: 6px;
      color: #55709d;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .management-roadmap-mapping-header h2 {
      margin: 0;
      color: var(--blue);
      font-family: Georgia, serif;
      font-size: 24px;
      line-height: 1.1;
    }

    .management-roadmap-mapping-header p {
      margin: 7px 0 0;
      color: #657ba1;
      font-size: 13px;
    }

    .management-roadmap-mapping-close {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 38px;
      height: 38px;
      border: 1px solid #d6e0ef;
      border-radius: 50%;
      background: #ffffff;
      color: #37527f;
      font-size: 25px;
      line-height: 1;
      cursor: pointer;
    }

    .management-roadmap-mapping-body {
      display: grid;
      align-content: start;
      gap: 18px;
      padding: 20px;
      overflow-y: auto;
    }

    .management-roadmap-mapping-section {
      padding: 18px;
      border: 1px solid #dae4f2;
      border-radius: 18px;
      background: #ffffff;
    }

    .management-roadmap-mapping-section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 15px;
    }

    .management-roadmap-mapping-section-head h3 {
      margin: 0;
      color: var(--blue);
      font-size: 16px;
    }

    .management-roadmap-mapping-section-head p {
      margin: 4px 0 0;
      color: #6f82a3;
      font-size: 12px;
      line-height: 1.35;
    }

    .management-roadmap-mapping-count {
      display: grid;
      place-items: center;
      min-width: 30px;
      height: 30px;
      padding: 0 8px;
      border-radius: 999px;
      background: #edf3ff;
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
    }

    .management-roadmap-link-list {
      display: grid;
      gap: 10px;
    }

    .management-roadmap-link-card {
      display: grid;
      grid-template-columns: 30px 1fr 1fr;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid #dfe7f3;
      border-radius: 12px;
      background: #fafcff;
    }

    .management-roadmap-link-number {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #eaf1ff;
      color: var(--blue);
      font-size: 11px;
      font-weight: 900;
    }

    .management-roadmap-link-card span {
      display: block;
      margin-bottom: 3px;
      color: #7c8daa;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .management-roadmap-link-card strong {
      display: block;
      color: #163b74;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .management-roadmap-feature-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .management-roadmap-feature-summary article {
      padding: 12px;
      border-radius: 12px;
      background: #f2f6fc;
      text-align: center;
    }

    .management-roadmap-feature-summary span {
      display: block;
      color: #7789a6;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .management-roadmap-feature-summary strong {
      display: block;
      margin-top: 3px;
      color: var(--blue);
      font-size: 21px;
    }

    .management-roadmap-feature-list {
      display: grid;
      gap: 7px;
      max-height: 360px;
      overflow-y: auto;
    }

    .management-roadmap-feature-row {
      display: grid;
      grid-template-columns: 10px 1fr;
      gap: 10px;
      align-items: center;
      padding: 10px 11px;
      border: 1px solid #e2e8f2;
      border-radius: 10px;
    }

    .management-roadmap-feature-row.is-deployed {
      border-color: #caead7;
      background: #f3fbf6;
    }

    .management-roadmap-feature-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ba9bf;
    }

    .management-roadmap-feature-row.is-deployed
      .management-roadmap-feature-dot {
      background: #2fc274;
    }

    .management-roadmap-feature-main {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .management-roadmap-feature-main > div {
      min-width: 0;
    }

    .management-roadmap-feature-id {
      display: block;
      margin-bottom: 2px;
      color: #798cab;
      font-size: 9px;
      font-weight: 900;
    }

    .management-roadmap-feature-main strong {
      display: block;
      color: #244a82;
      font-size: 11px;
      line-height: 1.25;
    }

    .management-roadmap-feature-status {
      flex: 0 0 auto;
      color: #6e819f;
      font-size: 9px;
      font-weight: 800;
      text-align: right;
    }

    .management-roadmap-mapping-empty {
      padding: 22px 16px;
      border: 1px dashed #ccd8e9;
      border-radius: 12px;
      background: #fafcff;
      text-align: center;
    }

    .management-roadmap-mapping-empty strong {
      color: #385983;
      font-size: 13px;
    }

    .management-roadmap-mapping-empty p {
      margin: 5px auto 0;
      max-width: 360px;
      color: #7b8ba5;
      font-size: 11px;
      line-height: 1.4;
    }

    .management-roadmap-mapping-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      border-top: 1px solid #dce5f2;
      background: #ffffff;
    }

    .management-roadmap-mapping-footer div {
      display: grid;
      gap: 2px;
    }

    .management-roadmap-mapping-footer strong {
      color: #34557f;
      font-size: 11px;
    }

    .management-roadmap-mapping-footer span {
      color: #8190aa;
      font-size: 10px;
    }

    @media (max-width: 760px) {
      .management-roadmap-mapping-panel {
        width: 100%;
      }

      .management-roadmap-link-card {
        grid-template-columns: 30px 1fr;
      }

      .management-roadmap-link-card > div:last-child {
        grid-column: 2;
      }

      .management-roadmap-feature-main {
        display: grid;
      }
    }
  `;

  document.head.appendChild(style);
}
function renderManagementRoadmapSnapshotTable(programId, productId, countryId) {
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

function ensureManagementRoadmapSnapshotStyles() {
  if (document.querySelector("#managementRoadmapSnapshotStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementRoadmapSnapshotStyles";

  style.textContent = `
    .management-deliverables-view {
      display: grid;
      gap: 20px;
    }

    .management-deliverables-toolbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: #ffffff;
      box-shadow: var(--shadow);
    }

    .management-deliverables-filter-group {
      display: grid;
      gap: 8px;
    }

    .management-deliverables-filter-label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .management-deliverables-selector {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .management-deliverables-selector-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 38px;
      padding: 0 15px;
      border: 1px solid #d7e1f2;
      border-radius: 999px;
      background: #ffffff;
      color: var(--blue);
      font-family: inherit;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      transition:
        background 0.18s ease,
        color 0.18s ease,
        border-color 0.18s ease,
        transform 0.18s ease;
    }

    .management-deliverables-selector-btn:hover {
      transform: translateY(-1px);
      border-color: #84a7e9;
    }

    .management-deliverables-selector-btn.is-active {
      border-color: var(--blue);
      background: var(--blue);
      color: #ffffff;
    }

    .management-deliverables-content {
      border: 1px solid var(--line);
      border-radius: 22px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: var(--shadow);
    }

    .management-deliverables-content-header {
      padding: 20px 22px 14px;
      background: #ffffff;
    }

    .management-deliverables-content-header h3 {
      margin: 0;
      color: var(--blue);
      font-size: 28px;
    }

    .management-deliverables-content-header p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .management-deliverables-country-strip {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 14px;
      color: #4e6c9c;
      font-size: 14px;
      font-weight: 800;
    }

    .management-deliverables-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .management-deliverables-table {
      width: 100%;
      min-width: 980px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .management-deliverables-col-name {
      width: 43%;
    }

    .management-deliverables-col-quarter {
      width: 5.6%;
    }

    .management-deliverables-col-status {
      width: 12%;
    }

    .management-deliverables-col-comments {
      width: 28%;
    }

    .management-deliverables-table th {
      height: 58px;
      padding: 12px 14px;
      border-right: 1px solid #ffffff;
      border-bottom: 1px solid #ffffff;
      background: #073a9b;
      color: #ffffff;
      font-family: Georgia, serif;
      font-size: 18px;
      text-align: center;
    }

    .management-deliverables-table th:first-child {
      text-align: left;
    }

    .management-deliverables-table td {
      min-height: 52px;
      padding: 0;
      border-right: 1px solid #eef1f5;
      border-bottom: 1px solid #eef1f5;
      vertical-align: middle;
      background: #ffffff;
    }

    .management-deliverables-name {
      display: grid;
      grid-template-columns:
        minmax(112px, 150px)
        minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      min-height: 54px;
      padding: 8px 14px;
    }

    .management-deliverables-title {
      color: #0061b2;
      font-size: 16px;
      line-height: 1.25;
    }

    .management-deliverables-category {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 22px;
      padding: 3px 10px;
      border-radius: 4px;
      color: #ffffff;
      font-size: 10px;
      line-height: 1.1;
      text-align: center;
    }

    .management-deliverables-category.is-knowledge {
      background: #23c1c6;
    }

    .management-deliverables-category.is-sales {
      background: #6eb7ed;
    }

    .management-deliverables-category.is-sales-agent,
    .management-deliverables-category.is-best-practices {
      background: #79dd79;
    }

    .management-deliverables-category.is-visits {
      background: #f7ab59;
    }

    .management-deliverables-category.is-experience {
      background: #0099a7;
    }

    .management-deliverables-category.is-audience {
      background: #8b82f1;
    }

    .management-deliverables-category.is-deployment {
      background: #00519a;
    }

    .management-deliverables-category.is-default {
      background: #6884a9;
    }

    .management-deliverables-quarter {
      position: relative;
      height: 54px;
      background: #ffffff;
      text-align: center;
    }

    .management-deliverables-quarter.is-active {
      background: #cce8f8;
    }

    .management-deliverables-quarter.is-focus {
      background: #7cb9ef;
    }

    .management-deliverables-quarter.is-attention {
      background: #7cb9ef;
    }

    .management-deliverables-quarter-marker {
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      font-size: 31px;
      line-height: 1;
    }

    .management-deliverables-quarter-marker.is-risk {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #ff3b3b;
      color: #ffffff;
      font-family: Arial, sans-serif;
      font-size: 24px;
      font-weight: 900;
      box-shadow: 0 4px 10px rgba(255, 59, 59, 0.25);
    }

    .management-deliverables-quarter-marker.is-attention {
      font-size: 34px;
    }

    .management-deliverables-status {
      padding: 10px 12px !important;
      color: #001391;
      font-size: 16px;
      text-align: center;
    }

    .management-deliverables-status.is-on-track {
      background: #cce8f8;
    }

    .management-deliverables-status.is-at-risk {
      background: #ed9296;
    }

    .management-deliverables-status.is-replanned {
      background: #5a5a5a;
      color: #ffffff;
    }

    .management-deliverables-status.is-delayed {
      background: #ffb465;
    }

    .management-deliverables-status.is-cancelled {
      background: #ffffff;
    }

    .management-deliverables-status.is-done {
      background: #7be173;
    }

    .management-deliverables-comments {
      padding: 8px 14px !important;
      color: #004391;
      font-size: 13px;
      line-height: 1.25;
      text-align: center;
    }

    .management-deliverables-empty {
      padding: 60px 30px;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 900px) {
      .management-deliverables-toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .management-deliverables-name {
        grid-template-columns: 1fr;
        gap: 7px;
      }
    }
  `;

  document.head.appendChild(style);
}
function bindManagementRoadmapLineEditors(programId) {
  ensureManagementRoadmapLineEditorStyles();

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

function bindManagementRoadmapLineCreateButton(
  programId,
  productId,
  countryId,
) {
  ensureManagementRoadmapLineEditorStyles();

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
function renderManagementRoadmapView(programId) {
  ensureManagementRoadmapSnapshotStyles();
  ensureManagementRoadmapMappingStyles();
  ensureManagementRoadmapLineEditorStyles();

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
function renderRoadmapTrackingGroup(group, programId, productId) {
  const groupStatus = getRoadmapGroupStatus(group);

  const averageProgress = group.items.length
    ? Math.round(
        group.items.reduce(
          (total, item) => total + Number(item.progress || 0),
          0,
        ) / group.items.length,
      )
    : 0;

  return `
    <section
      class="panel roadmap-tracking-group"
      data-roadmap-initiative="${rcsEsc(group.key)}"
    >
      <div class="section-header">
        <div>
          <div class="aixbanker-roadmap-item-top">
            <span
              class="status-pill status-${groupStatus}"
            >
              ${rcsEsc(rcsStatusLabel(groupStatus))}
            </span>

            <span class="aixbanker-roadmap-type">
              ${group.items.length}
              ${group.items.length === 1 ? "elemento" : "elementos"}
            </span>
          </div>

          <h3>
            ${rcsEsc(group.title)}
          </h3>

          <p class="empty-state">
            Avance medio:
            ${averageProgress}%
          </p>
        </div>
      </div>

      <div class="project-list">
        ${group.items
          .map((item) => renderRoadmapTrackingItem(item, programId, productId))
          .join("")}
      </div>
    </section>
  `;
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
function renderRoadmapItemsTrackingList(programId, container) {
  if (!container) {
    return;
  }

  const productId = normalizeRoadmapProduct(selectedExecutiveProduct);

  const items = productId
    ? getRoadmapItems(programId, productId, executiveQuarter)
    : [];

  const groupedItems = groupRoadmapItemsByInitiative(items);

  container.hidden = false;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>
          Seguimiento de iniciativas
        </h3>

        <p class="empty-state">
          Proyectos, MSAs y otros elementos
          agrupados por iniciativa.
        </p>
      </div>

      <span class="status-pill status-pending">
        ${items.length}
      </span>
    </div>

    ${
      groupedItems.length
        ? `
          <div class="project-list">
            ${groupedItems
              .map((group) =>
                renderRoadmapTrackingGroup(group, programId, productId),
              )
              .join("")}
          </div>
        `
        : `
          <p class="empty-state">
            No hay elementos informados para
            el país, producto y periodo seleccionados.
          </p>
        `
    }
  `;
}
// function getProgramProjects(programId) {
//   return (DATA.projects || []).filter(
//     (project) =>
//       project.programId === programId &&
//       (!project.country || project.country === selectedCountry) &&
//       (!selectedExecutiveProduct ||
//         !project.product ||
//         project.product === selectedExecutiveProduct) &&
//       (executiveQuarter === "ALL" || project.quarter === executiveQuarter),
//   );
// }

// function getProjectPhases(projectId) {
//   return (DATA.projectPhases || [])
//     .filter(
//       (phase) =>
//         phase.projectId === projectId &&
//         (!phase.country || phase.country === selectedCountry) &&
//         (!selectedExecutiveProduct ||
//           !phase.product ||
//           phase.product === selectedExecutiveProduct),
//     )
//     .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
// }

// function renderProjectsList(programId) {
//   const container = document.querySelector("#projects");
//   const detail = document.querySelector("#projectDetail");
//   if (!container) return;

//   if (detail) {
//     detail.hidden = true;
//     detail.innerHTML = "";
//   }

//   container.hidden = false;

//   const projects = getProgramProjects(programId);

//   container.innerHTML = `
//     <h3>Proyectos</h3>

//     <div class="project-list">
//       ${
//         projects.length
//           ? projects
//               .map((p) => {
//                 const status = rcsNormalizeStatus(p.status);

//                 return `
//                   <article
//                     class="project-card clickable-card"
//                     data-project-id="${rcsEsc(p.id)}"
//                     tabindex="0"
//                     role="button"
//                   >
//                     <div class="project-card-main">
//                       <div>
//                         <div class="project-name">${rcsEsc(p.name)}</div>
//                         <div class="project-summary">${rcsEsc(p.summary)}</div>
//                       </div>

//                       <div class="project-progress">${rcsEsc(p.progress || 0)}%</div>
//                     </div>

//                     <div class="project-meta">
//                       <span class="status-pill status-${status}">
//                         ${rcsStatusLabel(status)}
//                       </span>
//                       <span>Owner: ${rcsEsc(p.owner || "-")}</span>
//                       <span>
//                         Hito: ${rcsEsc(p.nextMilestoneTitle || "-")}
//                         · ${rcsEsc(formatDate(p.nextMilestoneDate) || "-")}
//                       </span>
//                     </div>

//                     <div class="project-card-action">Ver detalle →</div>
//                   </article>
//                 `;
//               })
//               .join("")
//           : `<p class="empty-state">No hay proyectos informados para este país.</p>`
//       }
//     </div>
//   `;

//   document
//     .querySelectorAll(".project-card.clickable-card[data-project-id]")
//     .forEach((card) => {
//       const open = () =>
//         renderProjectDetailView(programId, card.dataset.projectId);

//       card.addEventListener("click", open);
//       card.addEventListener("keydown", (event) => {
//         if (event.key === "Enter" || event.key === " ") {
//           event.preventDefault();
//           open();
//         }
//       });
//     });
// }

// function renderProjectDetailView(programId, projectId, navigation = null) {
//   const list = document.querySelector("#projects");

//   const detail = document.querySelector("#projectDetail");

//   if (!detail) return;

//   const project = (DATA.projects || []).find(
//     (item) =>
//       item.programId === programId && String(item.id) === String(projectId),
//   );

//   const backRoute = navigation?.route || null;

//   const backLabel = navigation?.label || "Volver a proyectos";

//   const backButton = backRoute
//     ? `
//       <button
//         class="ghost-button"
//         type="button"
//         data-route="${rcsEsc(backRoute)}"
//       >
//         ← ${rcsEsc(backLabel)}
//       </button>
//     `
//     : `
//       <button
//         class="ghost-button"
//         type="button"
//         data-project-list-back="${rcsEsc(programId)}"
//       >
//         ← Volver a proyectos
//       </button>
//     `;

//   if (!project) {
//     if (list) {
//       list.hidden = true;
//     }

//     detail.hidden = false;

//     detail.innerHTML = `
//       ${backButton}

//       <h3>
//         Proyecto no encontrado
//       </h3>
//     `;

//     return;
//   }

//   const phases = getProjectPhases(project.id);

//   const status = rcsNormalizeStatus(project.status);

//   if (list) {
//     list.hidden = true;
//   }

//   detail.hidden = false;

//   detail.innerHTML = `
//     <div class="project-detail-header">
//       ${backButton}

//       <div>
//         <h3>
//           ${rcsEsc(project.name)}
//         </h3>

//         <p>
//           ${rcsEsc(project.description || project.summary)}
//         </p>
//       </div>

//       <span
//         class="status-pill status-${status}"
//       >
//         ${rcsStatusLabel(status)}
//       </span>
//     </div>

//     <div class="project-detail-grid">
//       <article class="detail-card">
//         <span>
//           Owner
//         </span>

//         <strong>
//           ${rcsEsc(project.owner || "-")}
//         </strong>
//       </article>

//       <article class="detail-card">
//         <span>
//           Avance global
//         </span>

//         <strong>
//           ${rcsEsc(project.progress || 0)}%
//         </strong>
//       </article>

//       <article class="detail-card">
//         <span>
//           Siguiente hito
//         </span>

//         <strong>
//           ${rcsEsc(project.nextMilestoneTitle || "-")}
//         </strong>

//         <small>
//           ${rcsEsc(formatDate(project.nextMilestoneDate) || "")}
//         </small>
//       </article>

//       <article class="detail-card">
//         <span>
//           Última actualización
//         </span>

//         <strong>
//           ${rcsEsc(formatDate(project.lastUpdate) || "-")}
//         </strong>
//       </article>
//     </div>

//     <section class="phase-section">
//       <h3>
//         Actividades y grado de avance
//       </h3>

//       <div class="phase-roadmap">
//         ${
//           phases.length
//             ? phases
//                 .map((phase) => {
//                   const phaseStatus = rcsNormalizeStatus(phase.status);

//                   const progress = Math.max(
//                     0,
//                     Math.min(100, Number(phase.progress || 0)),
//                   );

//                   return `
//                     <article class="phase-card">
//                       <div class="phase-card-head">
//                         <h4>
//                           ${rcsEsc(
//                             phase.phaseName || phase.name || "Actividad",
//                           )}
//                         </h4>

//                         <span
//                           class="status-pill status-${phaseStatus}"
//                         >
//                           ${rcsStatusLabel(phaseStatus)}
//                         </span>
//                       </div>

//                       <div class="phase-bar">
//                         <span
//                           style="width:${progress}%"
//                         ></span>
//                       </div>

//                       <div class="phase-meta">
//                         <strong>
//                           ${progress}%
//                         </strong>

//                         <span>
//                           ${rcsEsc(formatDate(phase.startDate))}
//                           →
//                           ${rcsEsc(formatDate(phase.endDate))}
//                         </span>
//                       </div>

//                       <div class="phase-delivery">
//                         🚩 Entrega:
//                         ${rcsEsc(formatDate(phase.targetDate))}
//                       </div>

//                       <p>
//                         ${rcsEsc(phase.comments || "")}
//                       </p>
//                     </article>
//                   `;
//                 })
//                 .join("")
//             : `
//               <p class="empty-state">
//                 No hay actividades informadas
//                 para este proyecto.
//               </p>
//             `
//         }
//       </div>

//       <div id="phaseTimeline"></div>
//       <section
//         class="phase-status-legend"
//         aria-label="Leyenda de estados"
//       >
//         <span class="phase-status-legend-item">
//           <i class="phase-status-dot phase-status-done"></i>
//           Hecho
//         </span>

//         <span class="phase-status-legend-item">
//           <i class="phase-status-dot phase-status-on-track"></i>
//           En curso
//         </span>

//         <span class="phase-status-legend-item">
//           <i class="phase-status-dot phase-status-pending"></i>
//           Planeado
//         </span>

//         <span class="phase-status-legend-item">
//           <i class="phase-status-dot phase-status-risk"></i>
//           Riesgo
//         </span>

//         <span class="phase-status-legend-item">
//           <i class="phase-status-dot phase-status-blocked"></i>
//           Bloqueado
//         </span>
//       </section>
//       <div id="phaseTimeline"></div>
//     </section>
//     </section>

//     <section class="project-detail-notes">
//       <article>
//         <h3>
//           Objetivo estratégico
//         </h3>

//         <p>
//           ${rcsEsc(project.strategicGoal || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Valor de negocio
//         </h3>

//         <p>
//           ${rcsEsc(project.businessValue || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Riesgos principales
//         </h3>

//         <p>
//           ${rcsEsc(project.mainRisks || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Dependencias
//         </h3>

//         <p>
//           ${rcsEsc(project.dependencies || "No informado.")}
//         </p>
//       </article>
//     </section>
//   `;

//   const timelineContainer = document.getElementById("phaseTimeline");

//   renderPhaseTimeline(phases, timelineContainer);
// }
/* dashboard inspired*/
/*MSAs*/
// function getProgramMsas(programId) {
//   return (DATA.msas || []).filter(
//     (msa) =>
//       msa.programId === programId &&
//       (!msa.country || msa.country === selectedCountry) &&
//       (!selectedExecutiveProduct ||
//         !msa.product ||
//         msa.product === selectedExecutiveProduct) &&
//       (executiveQuarter === "ALL" || msa.quarter === executiveQuarter),
//   );
// }

// function getMsaPhases(msaId) {
//   return (DATA.msaPhases || [])
//     .filter((p) => p.msaId === msaId)
//     .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
// }

// function renderMsasView(programId) {
//   const p = DATA.programs.find((x) => x.id === programId);

//   view.innerHTML = "";
//   view.append(tpl("#msas-template"));
//   view.insertAdjacentHTML("afterbegin", renderCountrySelector());

//   setHead(
//     `${p?.name || "Programa"} · MSAs`,
//     `Acuerdos y aprobaciones · ${selectedCountry}`,
//     `Retail Client Solutions > ${p?.name || programId} > MSAs`,
//   );

//   const backButton = document.querySelector(".back-to-program-btn");

//   if (backButton) {
//     backButton.dataset.route = `program/${programId}`;
//     backButton.textContent = `← Volver a ${p?.name || "programa"}`;
//   }

//   renderMsasList(programId);
// }

// function renderMsasList(programId) {
//   const container = document.querySelector("#msas");
//   const detail = document.querySelector("#msaDetail");

//   if (!container) return;

//   if (detail) {
//     detail.hidden = true;
//     detail.innerHTML = "";
//   }

//   container.hidden = false;

//   const msas = getProgramMsas(programId);

//   container.innerHTML = `
//     <div class="section-header">
//       <h3>MSAs (En construcción)</h3>
//     </div>

//     <div class="project-list">
//       ${
//         msas.length
//           ? msas
//               .map((msa) => {
//                 const status = rcsNormalizeStatus(msa.status);

//                 return `
//                   <article
//                     class="project-card msa-clickable-card"
//                     data-msa-id="${rcsEsc(msa.id)}"
//                     tabindex="0"
//                     role="button"
//                   >
//                    <div class="project-card-main">
//                       <div>
//                         <div class="project-name">${rcsEsc(msa.name)}</div>
//                         <div class="project-summary">${rcsEsc(msa.summary)}</div>
//                       </div>

//                       <div class="project-progress">
//                         ${rcsEsc(msa.progress || 0)}%
//                       </div>
//                     </div>

//                     <div class="project-meta">
//                       <span class="status-pill status-${status}">
//                         ${rcsStatusLabel(status)}
//                       </span>
//                       <span>Owner: ${rcsEsc(msa.owner || "-")}</span>
//                       <span>
//                         Hito: ${rcsEsc(msa.nextMilestoneTitle || "-")}
//                         · ${rcsEsc(msa.nextMilestoneDate || "-")}
//                       </span>
//                     </div>

//                     <div class="project-card-actions">
//                       <span class="project-card-action">Ver detalle →</span>
//                       ${rcsExternalLink(msa, "Abrir MSA")}
//                     </div>
//                   </article>
//                 `;
//               })
//               .join("")
//           : `<p class="empty-state">No hay MSAs informados para este país.</p>`
//       }
//     </div>
//   `;

//   document
//     .querySelectorAll(".msa-clickable-card[data-msa-id]")
//     .forEach((card) => {
//       card.addEventListener("click", () => {
//         renderMsaDetailView(programId, card.dataset.msaId);
//       });
//     });
// }
// function renderMsaDetailView(programId, msaId, navigation = null) {
//   const list = document.querySelector("#msas");

//   const detail = document.querySelector("#msaDetail");

//   if (!detail) return;

//   const msa = (DATA.msas || []).find(
//     (item) => item.programId === programId && String(item.id) === String(msaId),
//   );

//   const backRoute = navigation?.route || null;

//   const backLabel = navigation?.label || "Volver a MSAs";

//   const backButton = backRoute
//     ? `
//       <button
//         class="ghost-button"
//         type="button"
//         data-route="${rcsEsc(backRoute)}"
//       >
//         ← ${rcsEsc(backLabel)}
//       </button>
//     `
//     : `
//       <button
//         class="ghost-button"
//         type="button"
//         data-msa-list-back="${rcsEsc(programId)}"
//       >
//         ← Volver a MSAs
//       </button>
//     `;

//   if (!msa) {
//     if (list) {
//       list.hidden = true;
//     }

//     detail.hidden = false;

//     detail.innerHTML = `
//       ${backButton}

//       <h3>
//         MSA no encontrado
//       </h3>
//     `;

//     return;
//   }

//   const phases = getMsaPhases(msa.id);

//   const status = rcsNormalizeStatus(msa.status);

//   if (list) {
//     list.hidden = true;
//   }

//   detail.hidden = false;

//   detail.innerHTML = `
//     <div class="project-detail-header">
//       ${backButton}

//       <div>
//         <h3>
//           ${rcsEsc(msa.name)}
//         </h3>

//         <p>
//           ${rcsEsc(msa.description || msa.summary)}
//         </p>
//       </div>

//       <div class="project-detail-actions">
//         <span
//           class="status-pill status-${status}"
//         >
//           ${rcsStatusLabel(status)}
//         </span>

//         ${rcsExternalLink(msa, "Abrir MSA")}
//       </div>
//     </div>

//     <div class="project-detail-grid">
//       <article class="detail-card">
//         <span>
//           Owner
//         </span>

//         <strong>
//           ${rcsEsc(msa.owner || "-")}
//         </strong>
//       </article>

//       <article class="detail-card">
//         <span>
//           Avance global
//         </span>

//         <strong>
//           ${rcsEsc(msa.progress || 0)}%
//         </strong>
//       </article>

//       <article class="detail-card">
//         <span>
//           Siguiente hito
//         </span>

//         <strong>
//           ${rcsEsc(msa.nextMilestoneTitle || "-")}
//         </strong>

//         <small>
//           ${rcsEsc(formatDate(msa.nextMilestoneDate))}
//         </small>
//       </article>

//       <article class="detail-card">
//         <span>
//           Última actualización
//         </span>

//         <strong>
//           ${rcsEsc(formatDate(msa.lastUpdate))}
//         </strong>
//       </article>
//     </div>

//     <section class="phase-section">
//       <h3>
//         Actividades y grado de avance
//       </h3>

//       <div class="phase-roadmap">
//         ${
//           phases.length
//             ? phases
//                 .map((phase) => {
//                   const phaseStatus = rcsNormalizeStatus(phase.status);

//                   const progress = Math.max(
//                     0,
//                     Math.min(100, Number(phase.progress || 0)),
//                   );

//                   return `
//                     <article class="phase-card">
//                       <div class="phase-card-head">
//                         <h4>
//                           ${rcsEsc(
//                             phase.phaseName || phase.name || "Actividad",
//                           )}
//                         </h4>

//                         <span
//                           class="status-pill status-${phaseStatus}"
//                         >
//                           ${rcsStatusLabel(phaseStatus)}
//                         </span>
//                       </div>

//                       <div class="phase-bar">
//                         <span
//                           style="width:${progress}%"
//                         ></span>
//                       </div>

//                       <div class="phase-meta">
//                         <strong>
//                           ${progress}%
//                         </strong>

//                         <span>
//                           ${rcsEsc(formatDate(phase.startDate))}
//                           →
//                           ${rcsEsc(
//                             formatDate(phase.targetDate || phase.endDate),
//                           )}
//                         </span>
//                       </div>

//                       <p>
//                         ${rcsEsc(phase.comments || "")}
//                       </p>
//                     </article>
//                   `;
//                 })
//                 .join("")
//             : `
//               <p class="empty-state">
//                 No hay actividades informadas
//                 para este MSA.
//               </p>
//             `
//         }
//       </div>
//     </section>

//     <section class="project-detail-notes">
//       <article>
//         <h3>
//           Objetivo estratégico
//         </h3>

//         <p>
//           ${rcsEsc(msa.strategicGoal || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Valor de negocio
//         </h3>

//         <p>
//           ${rcsEsc(msa.businessValue || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Riesgos principales
//         </h3>

//         <p>
//           ${rcsEsc(msa.mainRisks || "No informado.")}
//         </p>
//       </article>

//       <article>
//         <h3>
//           Dependencias
//         </h3>

//         <p>
//           ${rcsEsc(msa.dependencies || "No informado.")}
//         </p>
//       </article>
//     </section>
//   `;
// }
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
function getExecutiveSourceItems(programId) {
  return adaptUnifiedRoadmapCollection().filter(
    (item) =>
      item.programId === programId &&
      (!item.country || item.country === selectedCountry),
  );
}

function renderExecutiveProductSelector(programId) {
  const products = [
    ...new Set(
      getExecutiveSourceItems(programId)
        .map((item) => String(item.product || "").trim())
        .filter(Boolean),
    ),
  ];

  if (!products.length) {
    selectedExecutiveProduct = null;
    return "";
  }

  if (!products.includes(selectedExecutiveProduct)) {
    selectedExecutiveProduct = products[0];
  }

  return `
    <div class="systems-product-selector">
      ${products
        .map(
          (product) => `
            <button
              class="systems-product-btn ${
                selectedExecutiveProduct === product ? "active" : ""
              }"
              type="button"
              data-executive-product="${rcsEsc(product)}"
            >
              ${rcsEsc(
                product
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" "),
              )}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}
function renderExecutiveQuarterSelector(programId) {
  const availableItems = getExecutiveSourceItems(programId).filter(
    (item) =>
      !selectedExecutiveProduct ||
      item.product === normalizeRoadmapProduct(selectedExecutiveProduct),
  );

  if (!availableItems.length) {
    executiveQuarter = "ALL";
    return "";
  }

  if (!isValidRoadmapQuarter(executiveQuarter)) {
    executiveQuarter = "ALL";
  }

  const quarters = [
    {
      id: "ALL",
      label: "Todo",
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
                executiveQuarter === quarter.id ? "active" : ""
              }"
              type="button"
              data-executive-quarter="${quarter.id}"
            >
              ${quarter.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
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
function getProgramTeamMembers(programId) {
  return (DATA.teams || []).filter((person) => {
    const isSameProgram =
      String(person.programId || "").trim() === String(programId || "").trim();

    const isSameCountry =
      String(person.country || "").trim() ===
      String(selectedCountry || "").trim();

    const isSameQuarter =
      selectedTeamQuarter === "ALL" ||
      String(person.quarter || "").trim() ===
        String(selectedTeamQuarter).trim();

    const isActive =
      person.active === true ||
      String(person.active || "true")
        .toLowerCase()
        .trim() === "true";

    return isSameProgram && isSameCountry && isSameQuarter && isActive;
  });
}
function renderTeamsDashboard(programId) {
  const people = getProgramTeamMembers(programId);

  renderTeamsKpis(people);
  renderTeamsByProduct(people);
  renderTeamsProductCountryMatrix(programId);
  renderTeamsScrumCards(people);
}

function groupByField(rows, field) {
  return rows.reduce((acc, row) => {
    const key = String(row[field] || "Sin asignar").trim();

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(row);
    return acc;
  }, {});
}
function sumFte(rows) {
  return rows.reduce((sum, row) => sum + Number(row.fte || 0), 0);
}
function sumCost(rows) {
  return rows.reduce((sum, row) => {
    return sum + Number(row.cost || 0);
  }, 0);
}
function formatFte(value) {
  return Number(value || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
function formatCurrency(value) {
  return Number(value).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}
function renderTeamsKpis(people) {
  const totalFte = sumFte(people);
  const roles = groupByField(people, "role");

  const baseKpis = [
    { label: "Personas", value: people.length, icon: "👥" },
    { label: "FTEs", value: formatFte(totalFte), icon: "⏱️" },
  ];

  const roleKpis = Object.entries(roles)
    .map(([role, members]) => ({
      label: role,
      rawValue: sumFte(members),
      value: formatFte(sumFte(members)),
      icon: getRoleIcon(role),
    }))
    .sort((a, b) => b.rawValue - a.rawValue);

  const container = document.querySelector("#teamsKpis");
  if (!container) return;

  const kpis = [...baseKpis, ...roleKpis];

  container.innerHTML = kpis
    .map(
      (kpi) => `
      <article class="kpi-card">
        <div class="kpi-icon">${kpi.icon}</div>
        <div>
          <h3>${rcsEsc(kpi.label)}</h3>
          <strong>${kpi.value}</strong>
        </div>
      </article>
    `,
    )
    .join("");
}
function renderTeamsByProduct(people) {
  const container = document.querySelector("#teamsByProduct");
  if (!container) return;

  const grouped = groupByField(people, "product");
  const total = people.length || 1;

  container.innerHTML = Object.entries(grouped).length
    ? Object.entries(grouped)
        .map(([product, members]) => {
          const percentage = Math.round((members.length / total) * 100);

          return `
            <div class="team-bar-row">
              <div class="team-bar-head">
                <strong>${rcsEsc(product)}</strong>
                <span>${members.length}</span>
              </div>
              <div class="team-bar">
                <span style="width:${percentage}%"></span>
              </div>
            </div>
          `;
        })
        .join("")
    : `<p class="empty-state">No hay personas informadas para este país.</p>`;
}
function renderTeamsProductCountryMatrix(programId) {
  const table = document.querySelector("#teamsProductCountryMatrix");
  if (!table) return;

  const allPeople = (DATA.teams || []).filter((person) => {
    const isSameQuarter =
      selectedTeamQuarter === "ALL" ||
      String(person.quarter || "").trim() ===
        String(selectedTeamQuarter).trim();
    const isSameProgram =
      String(person.programId || "").trim() === String(programId || "").trim();

    const isActive =
      person.active === true ||
      String(person.active || "true")
        .toLowerCase()
        .trim() === "true";

    return isSameProgram && isActive && isSameQuarter;
  });

  const products = [
    ...new Set(
      allPeople.map((p) => String(p.product || "").trim()).filter(Boolean),
    ),
  ];

  const countries = COUNTRIES.map((c) => c.id);

  table.innerHTML = `
    <thead>
      <tr>
        <th>Producto</th>
        ${countries.map((country) => `<th>${rcsEsc(country)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${
        products.length
          ? products
              .map(
                (product) => `
                  <tr>
                    <td><strong>${rcsEsc(product)}</strong></td>
                    ${countries
                      .map((country) => {
                        const value = allPeople.filter(
                          (p) =>
                            String(p.product || "").trim() === product &&
                            String(p.country || "").trim() === country,
                        ).length;

                        const activeClass =
                          country === selectedCountry
                            ? "matrix-active-cell"
                            : "";

                        return `<td class="${activeClass}">${value}</td>`;
                      })
                      .join("")}
                  </tr>
                `,
              )
              .join("")
          : `<tr><td colspan="${countries.length + 1}">No hay datos de equipo.</td></tr>`
      }
    </tbody>
  `;
}
function renderTeamsScrumCards(people) {
  const container = document.querySelector("#teamsScrumCards");
  if (!container) return;

  const grouped = groupByField(people, "scrum");

  container.innerHTML = Object.entries(grouped).length
    ? Object.entries(grouped)
        .map(([scrum, members]) => {
          const first = members[0];
          const profiles = groupByField(members, "profile");
          const productColor = getProductColor(first.product);
          return `
              <article
                class="scrum-card"
                style="--product-color:${productColor}"
              >
              <div class="scrum-product-band"></div>
              <div class="scrum-card-header">
                <div>
                  <h3>${rcsEsc(scrum)}</h3>
                  ${renderProductPill(first.product)}
                </div>
                <span class="status-pill">
                  ${formatFte(sumFte(members).toFixed(2))} FTE
                </span>
              </div>

              <div class="scrum-kpis">
                <div class="scrum-kpi">
                  <span class="scrum-kpi-label">👥 Personas</span>
                  <strong>${members.length}</strong>
                </div>

                <div class="scrum-kpi">
                  <span class="scrum-kpi-label">⏱ FTE</span>
                  <strong>${formatFte(sumFte(members))}</strong>
                </div>

                <div class="scrum-kpi">
                  <span class="scrum-kpi-label">💰 Coste</span>
                  <strong>${formatCurrency(sumCost(members))}</strong>
                </div>
              </div>        
             <div class="scrum-meta">
                <span><b>PO:</b> ${rcsEsc(first.po || "-")}</span>
                <span><b>TL:</b> ${rcsEsc(first.tl || "-")}</span>
              </div>
              <div class="scrum-role-list">
                ${Object.entries(profiles)
                  .map(
                    ([profile, profileMembers]) => `
                      <div class="scrum-role-row">
                        <span>${rcsEsc(profile)}</span>
                        <strong>${formatFte(sumFte(profileMembers).toFixed(2))}</strong>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="empty-state">No hay scrums informados para este país.</p>`;
}
function getRoleIcon(role) {
  const key = String(role || "")
    .toLowerCase()
    .trim();

  const icons = {
    engineering: "⚙️",
    data: "📊",
    design: "🎨",
    business: "💼",
    architecture: "🏛️",
    security: "🔐",
  };

  return icons[key] || "👤";
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

function ensureManagementRoadmapLineEditorStyles() {
  if (document.querySelector("#managementRoadmapLineEditorStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "managementRoadmapLineEditorStyles";

  style.textContent = `
    .management-roadmap-table-actions {
      display: flex;
      justify-content: flex-end;
      padding: 0 14px 12px;
    }

    .management-roadmap-line-edit-button,
    .management-roadmap-line-create-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cdd9eb;
      border-radius: 999px;
      background: #ffffff;
      color: #003b8f;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
      transition:
        background 0.18s ease,
        border-color 0.18s ease,
        transform 0.18s ease;
    }

    .management-roadmap-line-edit-button {
      flex: 0 0 auto;
      min-height: 28px;
      padding: 0 10px;
      font-size: 9px;
    }

    .management-roadmap-line-create-button {
      min-height: 36px;
      padding: 0 16px;
      font-size: 11px;
    }

    .management-roadmap-line-edit-button:hover,
    .management-roadmap-line-create-button:hover {
      transform: translateY(-1px);
      border-color: #003b8f;
      background: #f3f7ff;
    }

    .management-roadmap-line-delete-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid #efc1c7;
      border-radius: 999px;
      background: #fff7f8;
      color: #b42318;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .management-roadmap-line-delete-button:hover {
      border-color: #d92d20;
      background: #fff0f1;
    }

    .management-roadmap-mapping-save {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 92px;
      min-height: 40px;
      padding: 0 18px;
      border: 1px solid var(--blue);
      border-radius: 999px;
      background: var(--blue);
      color: #ffffff;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
      transition:
        background 0.18s ease,
        opacity 0.18s ease,
        transform 0.18s ease;
    }

    .management-roadmap-mapping-save:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(0.95);
    }

    .management-roadmap-mapping-save:disabled {
      border-color: #cbd5e4;
      background: #cbd5e4;
      color: #ffffff;
      cursor: default;
      opacity: 0.8;
    }

    .management-roadmap-mapping-footer-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .management-deliverables-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      width: 100%;
    }

    .management-deliverables-title-wrapper
      .management-deliverables-title {
      min-width: 0;
    }

    .management-roadmap-line-form {
      display: grid;
      gap: 18px;
      padding: 6px 0;
    }

    .management-roadmap-line-field {
      display: grid;
      gap: 7px;
    }

    .management-roadmap-line-field label {
      color: #526b94;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .management-roadmap-line-input,
    .management-roadmap-line-select,
    .management-roadmap-line-textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #ccd9eb;
      border-radius: 10px;
      background: #ffffff;
      color: #173d76;
      font: inherit;
      font-size: 13px;
      outline: none;
    }

    .management-roadmap-line-input,
    .management-roadmap-line-select {
      min-height: 44px;
      padding: 0 12px;
    }

    .management-roadmap-line-textarea {
      min-height: 150px;
      padding: 12px;
      resize: vertical;
      line-height: 1.45;
    }

    .management-roadmap-line-input:focus,
    .management-roadmap-line-select:focus,
    .management-roadmap-line-textarea:focus {
      border-color: #477cc8;
      box-shadow:
        0 0 0 3px
        rgba(71, 124, 200, 0.1);
    }

    .management-roadmap-line-meta {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 4px;
    }

    .management-roadmap-line-meta article {
      padding: 10px 12px;
      border-radius: 10px;
      background: #f3f6fb;
    }

    .management-roadmap-line-meta span {
      display: block;
      color: #7a8ba8;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .management-roadmap-line-meta strong {
      display: block;
      margin-top: 3px;
      color: #173d76;
      font-size: 11px;
      overflow-wrap: anywhere;
    }

    @media (max-width: 760px) {
      .management-roadmap-line-meta {
        grid-template-columns: 1fr;
      }

      .management-roadmap-mapping-footer-actions {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}
function renderManagementRoadmapLineEditorPanelFromRecord(
  programId,
  line,
  { isCreate = false } = {},
) {
  ensureManagementRoadmapLineEditorStyles();

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

      category: normalized.category,

      categoryTone: normalized.categoryTone,

      title: normalized.title,

      status: normalized.status,

      statusLabel: normalized.statusLabel,

      statusTone: normalized.statusTone,

      comments: normalized.comments,

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

        title: line.title,

        status: line.status,

        statusLabel: line.statusLabel,

        statusTone: line.statusTone,

        comments: line.comments,

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

    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

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

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const rawData = await loadConfiguredSource(source, {
      timeoutMs: 25000,

      retries: 0,

      cacheBust: true,
    });

    const normalizedData = normalizeProgramData(normalizedProgramId, rawData);

    const persistedLines = buildManagementRoadmapPersistableLines(
      normalizedData?.managementRoadmapLines,
    );

    const expectedSignature =
      getManagementRoadmapLinesPersistenceSignature(nextLines);

    const persistedSignature =
      getManagementRoadmapLinesPersistenceSignature(persistedLines);

    if (expectedSignature !== persistedSignature) {
      throw new Error(
        "La Spreadsheet no devuelve la configuración que se acaba de guardar.",
      );
    }

    DATA.managementRoadmapLines = persistedLines;

    if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
      const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

      PROGRAM_DATA_CACHE.set(normalizedProgramId, {
        ...cached,

        managementRoadmapLines: persistedLines,
      });
    }

    closeManagementRoadmapLineEditorPanel();

    renderManagementRoadmapView(normalizedProgramId);
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

  const deleteButton = document.querySelector(
    "[data-management-roadmap-line-editor-delete]",
  );

  if (deleteButton) {
    deleteButton.disabled = true;

    deleteButton.textContent = "Eliminando...";
  }

  try {
    const endpoint = new URL(source.driveJsonUrl, window.location.href);

    endpoint.searchParams.delete("callback");

    endpoint.searchParams.delete("_");

    endpoint.searchParams.delete("dataset");

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

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    /*
     * =====================================================
     * VERIFICACIÓN
     * =====================================================
     */

    const rawData = await loadConfiguredSource(source, {
      timeoutMs: 25000,

      retries: 0,

      cacheBust: true,
    });

    const normalizedData = normalizeProgramData(normalizedProgramId, rawData);

    const persistedLines = buildManagementRoadmapPersistableLines(
      normalizedData?.managementRoadmapLines,
    );

    const stillExists = persistedLines.some(
      (line) =>
        String(line.id || "")
          .trim()
          .toLowerCase() === normalizedLineId.toLowerCase(),
    );

    if (stillExists) {
      throw new Error(
        "El deliverable sigue apareciendo en Management Roadmap Lines.",
      );
    }

    const persistedLinks = buildManagementRoadmapPersistableLinks(
      normalizedData?.managementRoadmapLinks,
    );

    const orphanLinks = persistedLinks.filter(
      (link) =>
        String(link.executiveLineId || "")
          .trim()
          .toLowerCase() === normalizedLineId.toLowerCase(),
    );

    if (orphanLinks.length) {
      throw new Error(
        "El deliverable se ha eliminado, pero todavía existen relaciones SDA asociadas.",
      );
    }

    /*
     * =====================================================
     * ACTUALIZACIÓN LOCAL
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

    renderManagementRoadmapView(normalizedProgramId);
  } catch (error) {
    console.error("[Management Roadmap] Error eliminando deliverable", error);

    if (deleteButton) {
      deleteButton.disabled = false;

      deleteButton.textContent = "Eliminar deliverable";
    }

    window.alert(error?.message || "No se ha podido eliminar el deliverable.");
  }
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
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-route]");
  if (b) route(b.dataset.route);
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

init();
