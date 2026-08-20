let PORTFOLIO_DATA = {
  portfolioKpis: [],
  programs: [],
};

let PORTFOLIO_LAST_LOADED_AT = null;

const PROGRAM_DATA_CACHE = new Map();
const PROGRAM_LAST_LOADED_AT = new Map();
const PROGRAM_SOURCES = new Map();

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
  };

  return products[productId] || null;
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
   * Un estado abierto continúa hasta ahora,
   * salvo Closed.
   *
   * Closed es terminal:
   * el tiempo termina al entrar en Closed.
   *
   * Blocked sí sigue acumulando tiempo
   * bloqueado, pero posteriormente no
   * contará como tiempo efectivo.
   */
  if (!endDate) {
    if (status === "Closed") {
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
     * Closed no forma parte de la
     * duración del ciclo porque el
     * ciclo termina justo al entrar
     * en Closed.
     */
    if (status !== "Closed") {
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

  const isBlocked = currentStatus === "Blocked";

  return {
    hasData: intervals.length > 0,

    intervalCount: intervals.length,

    currentStatus: currentStatus,

    currentStatusRaw: lastInterval?.statusRaw || currentStatus,

    currentSince: lastInterval?.startAt || "",

    startedAt: firstInterval?.startAt || "",

    completedAt: isClosed ? lastInterval?.startAt || "" : "",

    isClosed: isClosed,

    isBlocked: isBlocked,

    effectiveTimeMs: effectiveTimeMs,

    blockedTimeMs: blockedTimeMs,

    cycleTimeMs: cycleTimeMs,

    byStatus: byStatus,

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

  const jiraStartDate = hasJiraLifecycle ? jiraMetrics.startedAt : "";

  const jiraEndDate = hasJiraLifecycle
    ? jiraMetrics.isClosed
      ? jiraMetrics.completedAt
      : new Date().toISOString()
    : "";

  let effectiveStatus = rcsNormalizeStatus(item.status);

  if (hasJiraLifecycle) {
    if (jiraMetrics.currentStatus === "Blocked") {
      effectiveStatus = "blocked";
    } else if (jiraMetrics.currentStatus === "Closed") {
      effectiveStatus = "done";
    } else if (
      ["Analysis In Progress", "Analysis In Review"].includes(
        jiraMetrics.currentStatus,
      )
    ) {
      effectiveStatus = "on-track";
    } else {
      effectiveStatus = "planned";
    }
  }

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

    lastUpdate: jiraMetrics.sourceUpdatedAt || item.lastUpdate || "",

    strategicGoal: item.strategicGoal || "",

    businessValue: item.businessValue || "",

    mainRisks: item.mainRisks || "",

    dependencies: item.dependencies || "",

    documentUrl: item.documentUrl || "",

    documentLabel: item.documentLabel || "",

    jiraKey: item.jiraKey || "",

    jiraUrl: item.jiraUrl || "",

    jiraStatusHistory: normalizedJiraHistory,

    jiraMetrics: jiraMetrics,

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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
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
  const items = Array.isArray(DATA.roadmapItems) ? DATA.roadmapItems : [];

  const activities = Array.isArray(DATA.roadmapItemActivities)
    ? DATA.roadmapItemActivities
    : [];

  const jiraStatusHistory = Array.isArray(DATA.roadmapItemStatusHistory)
    ? DATA.roadmapItemStatusHistory
    : [];

  return items
    .map((item) => {
      const itemId = String(item.id || "").trim();

      const itemActivities = activities
        .filter((activity) => String(activity.itemId || "").trim() === itemId)
        .map(adaptRoadmapItemActivity)
        .sort((left, right) => left.order - right.order);

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
    .filter((item) => item.id);
}

function getRoadmapItems(programId, productId, quarter = "ALL") {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = normalizeRoadmapProduct(productId);

  const normalizedQuarter = String(quarter || "ALL")
    .trim()
    .toUpperCase();

  const roadmapItems = adaptUnifiedRoadmapCollection();

  return roadmapItems
    .filter((item) => {
      const matchesProgram = item.programId === normalizedProgramId;

      const matchesProduct = item.product === normalizedProductId;

      const matchesCountry = !item.country || item.country === selectedCountry;

      const matchesPeriod = roadmapItemMatchesPeriod(item, normalizedQuarter);

      return (
        matchesProgram && matchesProduct && matchesCountry && matchesPeriod
      );
    })
    .sort((a, b) => {
      const priorityDifference = a.priority - b.priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const datesA = getRoadmapItemDates(a);
      const datesB = getRoadmapItemDates(b);

      const dateA = datesA.startDate || datesA.targetDate || datesA.endDate;

      const dateB = datesB.startDate || datesB.targetDate || datesB.endDate;

      if (dateA && dateB) {
        const dateDifference = dateA - dateB;

        if (dateDifference !== 0) {
          return dateDifference;
        }
      }

      if (dateA) {
        return -1;
      }

      if (dateB) {
        return 1;
      }

      return a.title.localeCompare(b.title, "es");
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

      if (status === "Closed") {
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
        <h3>
          Roadmap de actividades
        </h3>

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

        <div
          id="
            roadmapItemTimeline
          "
        ></div>
      </section>
    </section>
  `;

  const timelineContainer = document.querySelector("#roadmapItemTimeline");

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

  if (!program || !product || !itemType || !itemId) {
    route(
      `roadmap/${programId}/${productId}/${quarter || getCurrentQuarter()}`,
    );

    return;
  }

  const selectedQuarter = isValidRoadmapQuarter(quarter)
    ? quarter
    : getCurrentQuarter();

  selectedExecutiveProduct = product.id;
  executiveQuarter = selectedQuarter;

  /*
   * Buscamos en ALL para que el detalle no desaparezca
   * cuando una actividad atraviesa varios trimestres
   * o la URL conserva un trimestre distinto.
   */
  const roadmapItems = getRoadmapItems(programId, productId, "ALL");

  const roadmapItem = roadmapItems.find(
    (item) =>
      String(item.type || "").trim() === String(itemType || "").trim() &&
      String(item.id || "").trim() === String(itemId || "").trim(),
  );

  const backRoute = `roadmap/${programId}/${productId}/${selectedQuarter}`;

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
          ← Volver al roadmap
        </button>

        <h3>
          Elemento no encontrado
        </h3>

        <p class="empty-state">
          El elemento solicitado no existe
          para el producto y país seleccionados.
        </p>
      </section>
    `;

    return;
  }

  const country = COUNTRIES.find((item) => item.id === selectedCountry);

  const countryLabel = country?.label || selectedCountry;

  setHead(
    roadmapItem.title,
    `${roadmapItem.typeLabel} · ${product.label} · ${countryLabel}`,
    `Retail Client Solutions > ${
      program.name || "AIxBanker"
    } > ${product.label} > Roadmap > ${getRoadmapQuarterLabel(
      selectedQuarter,
    )} > ${roadmapItem.title}`,
  );

  renderRoadmapItemDetailView(roadmapItem, {
    route: backRoute,

    label: `Volver al roadmap de ${product.label}`,

    activityRouteBase:
      `roadmap-activity/` +
      `${programId}/` +
      `${productId}/` +
      `${selectedQuarter}/` +
      `${itemType}/` +
      `${itemId}`,
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

function renderAIxBankerHome(programId) {
  const program = (DATA.programs || []).find((item) => item.id === programId);

  if (!program) {
    renderLanding();
    return;
  }

  setHead(
    program.name || "AIxBanker",
    "Productos, roadmaps e iniciativas",
    `Retail Client Solutions > ${program.name || "AIxBanker"}`,
  );

  view.innerHTML = "";
  view.append(tpl("#aixbanker-home-template"));
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
function getCurrentRoute() {
  const hash = location.hash.replace("#", "") || "landing";

  const [
    routeName,
    programId,
    productId,
    quarter,
    itemType,
    itemId,
    encodedActivityId,
  ] = hash.split("/");

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
function getActiveDataSource() {
  const { programId } = getCurrentRoute();

  if (!programId) {
    return window.APP_CONFIG.portfolio;
  }

  return getProgramSource(programId);
}

function getEmptyProgramData() {
  return {
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

    // Modelo unificado
    roadmapItems: [],
    roadmapItemActivities: [],
    roadmapItemStatusHistory: [],

    // Modelo legado
    projects: [],
    projectPhases: [],

    msas: [],
    msaPhases: [],

    teams: [],

    // Catálogo global de producto
    productCatalog: [],
    productFeatures: [],
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

  return normalized;
}

function buildProgramData(programData) {
  return {
    ...PORTFOLIO_DATA,
    ...getEmptyProgramData(),
    ...programData,
  };
}

async function loadConfiguredSource(source) {
  if (
    !source?.driveJsonUrl ||
    source.driveJsonUrl.includes("URL_APPS_SCRIPT") ||
    source.driveJsonUrl.includes("PEGA_AQUI")
  ) {
    throw new Error(`Origen no configurado: ${source?.label || "sin nombre"}`);
  }

  if (typeof loadJsonp !== "function") {
    throw new Error(
      "No está disponible la función loadJsonp. Revisa drive-json-source.js.",
    );
  }

  return loadJsonp(source.driveJsonUrl);
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

  const source = window.APP_CONFIG.portfolio;

  const rawData = await loadConfiguredSource(source);

  PORTFOLIO_DATA = normalizePortfolioData(rawData);

  buildProgramSources(PORTFOLIO_DATA.programs);

  PORTFOLIO_LAST_LOADED_AT = new Date();

  return PORTFOLIO_DATA;
}

async function loadProgramData(programId, forceRefresh = false) {
  if (!forceRefresh && PROGRAM_DATA_CACHE.has(programId)) {
    return PROGRAM_DATA_CACHE.get(programId);
  }

  const source = getProgramSource(programId);

  if (!source) {
    throw new Error(
      `No existe un origen configurado para el programa ${programId}`,
    );
  }

  if (!source.driveJsonUrl) {
    throw new Error(
      `El programa ${programId} no tiene driveJsonUrl configurado`,
    );
  }

  const rawData = await loadConfiguredSource(source);

  const programData = normalizeProgramData(programId, rawData);

  PROGRAM_DATA_CACHE.set(programId, programData);

  PROGRAM_LAST_LOADED_AT.set(programId, new Date());

  return programData;
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
  if (routeName === "program") {
    renderProgram(programId);
  } else if (routeName === "roadmap" && programId === "aixbanker") {
    renderAIxBankerRoadmap(programId, productId, quarter);
  } else if (routeName === "roadmap-detail" && programId === "aixbanker") {
    renderAIxBankerRoadmapDetail(
      programId,
      productId,
      quarter,
      itemType,
      itemId,
    );
  } else if (routeName === "roadmap-activity" && programId === "aixbanker") {
    renderAIxBankerRoadmapActivityDetail(
      programId,
      productId,
      quarter,
      itemType,
      itemId,
      activityId,
    );
  } else if (routeName === "functional") {
    renderFunctional(programId);
  } else if (routeName === "systems") {
    renderSystems(programId, "systems");
  } else if (routeName === "architecture") {
    renderSystems(programId, "architecture");
  } else if (routeName === "impediments") {
    renderImpediments(programId);
  } else if (routeName === "decisions") {
    renderDecisions(programId);
  } else if (routeName === "projects") {
    renderProjectsView(programId);
  } else if (routeName === "msas") {
    route(`projects/${programId}`);
  } else if (routeName === "teams") {
    renderTeamsView(programId);
  } else {
    renderLanding();
  }
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
async function render() {
  const context = getCurrentRoute();

  const { routeName, programId } = context;

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

  try {
    const source = getProgramSource(programId);

    showLoadingOverlay(
      `Cargando datos de ` + `${source?.label || programId}...`,
    );

    const programData = await loadProgramData(programId);

    setRcsDataMode(programId, "live");

    DATA = buildProgramData(programData);

    renderRouteContext(context);

    updateDataStatus(programId);
    clearDataFallbackBanner();
  } catch (error) {
    console.error(error);

    const activated = activateDemoProgram(
      programId,
      context,
      `No se han podido cargar ` +
        `los datos de ${programId}. ` +
        "Se ha activado automáticamente " +
        "el modo demostración con datos " +
        "100% ficticios.",
    );

    if (!activated) {
      statusEl.textContent =
        `⚠ No se pudieron cargar ` + `los datos de ${programId}`;

      DATA = {
        ...PORTFOLIO_DATA,
        ...getEmptyProgramData(),
      };

      renderRouteContext(context);

      showDataFallbackBanner(
        `No se han podido cargar ` +
          `los datos de ${programId} ` +
          "y no existe un dataset " +
          "de demostración para este programa.",
      );
    }
  } finally {
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

  isLoadingData = true;

  showLoadingOverlay("Cargando datos generales del portfolio...");

  try {
    await loadPortfolioData(true);

    setRcsDataMode("portfolio", "live");

    resetRcsProgramDataModes();

    DATA = PORTFOLIO_DATA;

    updateDataStatus();
    clearDataFallbackBanner();
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

  await render();
}

async function refreshCurrentDataSource() {
  const context = getCurrentRoute();

  const { routeName, programId } = context;

  const source = programId
    ? getProgramSource(programId)
    : window.APP_CONFIG.portfolio;

  showLoadingOverlay(
    programId
      ? `Reintentando datos de ` + `${source?.label || programId}...`
      : "Reintentando datos generales...",
  );

  try {
    if (!programId || routeName === "landing") {
      await loadPortfolioData(true);

      setRcsDataMode("portfolio", "live");

      resetRcsProgramDataModes();

      DATA = PORTFOLIO_DATA;

      updateDataStatus();
      clearDataFallbackBanner();

      await render();

      return;
    }

    if (getRcsDataMode("portfolio") === "demo") {
      await loadPortfolioData(true);

      setRcsDataMode("portfolio", "live");

      resetRcsProgramDataModes();
    }

    const programData = await loadProgramData(programId, true);

    setRcsDataMode(programId, "live");

    DATA = buildProgramData(programData);

    updateDataStatus(programId);
    clearDataFallbackBanner();

    await render();
  } catch (error) {
    console.error(error);

    if (!programId || routeName === "landing") {
      activateDemoPortfolio(
        "El origen general sigue sin responder. " +
          "Se mantiene el modo demostración " +
          "con datos ficticios.",
      );

      renderLanding();

      return;
    }

    const activated = activateDemoProgram(
      programId,
      context,
      `El origen de ${programId} ` +
        "sigue sin responder. " +
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

  const productSelector = renderExecutiveProductSelector(programId);

  const quarterSelector = renderExecutiveQuarterSelector(programId);

  view.innerHTML = "";
  view.append(tpl("#projects-template"));

  view.insertAdjacentHTML(
    "afterbegin",
    `
      ${renderCountrySelector()}
      ${productSelector}
      ${quarterSelector}
    `,
  );

  setHead(
    `${program?.name || "Programa"} · Seguimiento`,
    `Iniciativas, Proyectos, MSAs y otros elementos · ${selectedCountry}`,
    `Retail Client Solutions > ${program?.name || programId} > Seguimiento`,
  );

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${program?.name || "programa"}`;
  }

  const container = document.querySelector("#projects");

  if (!container) {
    return;
  }

  const oldDetail = document.querySelector("#projectDetail");

  if (oldDetail) {
    oldDetail.remove();
  }

  renderRoadmapItemsTrackingList(programId, container);
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

  if (!overlay) return;

  const text = overlay.querySelector("p");
  if (text) text.textContent = message;

  overlay.hidden = false;
}

function hideLoadingOverlay() {
  const overlay = document.querySelector("#loadingOverlay");

  if (!overlay) return;

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
  const p = DATA.programs.find((x) => x.id === programId);
  const country = COUNTRIES.find((c) => c.id === selectedCountry);

  view.innerHTML = "";
  view.append(tpl("#teams-template"));

  view.insertAdjacentHTML(
    "afterbegin",
    `
    ${renderCountrySelector()}
    ${renderTeamsQuarterSelector()}
  `,
  );
  setHead(
    `${p?.name || "Programa"} · Teams`,
    `Scrums y staffing · ${country?.label || selectedCountry} · ${selectedTeamQuarter === "ALL" ? "Todo el año" : selectedTeamQuarter}`,
    `Retail Client Solutions > ${p?.name || programId} > ${country?.label || selectedCountry} > Teams`,
  );

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }

  renderTeamsDashboard(programId);
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
    { id: "ALL", label: "Todo" },
    { id: "Q1", label: "Q1" },
    { id: "Q2", label: "Q2" },
    { id: "Q3", label: "Q3" },
    { id: "Q4", label: "Q4" },
  ];

  return `
    <div class="executive-filter-row">
      ${quarters
        .map(
          (q) => `
            <button
              class="quarter-btn ${selectedTeamQuarter === q.id ? "active" : ""}"
              type="button"
              data-team-quarter="${q.id}"
            >
              ${q.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
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

  const { programId, productId, quarter } = getCurrentRoute();

  const itemType = detailButton.dataset.roadmapDetailType;

  const itemId = detailButton.dataset.roadmapDetailId;

  route(
    `roadmap-detail/${programId}/${productId}/${quarter}/${itemType}/${itemId}`,
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
window.addEventListener("hashchange", () => {
  render().catch(console.error);
});

init();
