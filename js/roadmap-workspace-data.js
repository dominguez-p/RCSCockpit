const ROADMAP_WORKSPACE_VIEWS = new Set(["summary", "timeline", "backlog"]);
const ROADMAP_WORKSPACE_ALL = "ALL";
const ROADMAP_WORKSPACE_STATE = new Map();

function roadmapWorkspaceEscape(value) {
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

function roadmapWorkspaceEncode(value) {
  return encodeURIComponent(String(value ?? ""));
}

function roadmapWorkspaceDecode(value, fallback = "") {
  if (!value) {
    return fallback;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function roadmapWorkspaceNormalizeProduct(value) {
  if (String(value || "").toUpperCase() === ROADMAP_WORKSPACE_ALL) {
    return ROADMAP_WORKSPACE_ALL;
  }

  if (typeof normalizeRoadmapProduct === "function") {
    return normalizeRoadmapProduct(value);
  }

  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}

function roadmapWorkspaceProductLabel(productId) {
  if (!productId || productId === ROADMAP_WORKSPACE_ALL) {
    return "Todos los productos";
  }

  if (typeof getAIxBankerProduct === "function") {
    const product = getAIxBankerProduct(productId);

    if (product?.label) {
      return product.label;
    }
  }

  return String(productId)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function roadmapWorkspaceCountryLabel() {
  const country = Array.isArray(COUNTRIES)
    ? COUNTRIES.find((item) => item.id === selectedCountry)
    : null;

  return country?.label || selectedCountry || "Sin país";
}

function roadmapWorkspaceGetProgram(programId) {
  const programs = Array.isArray(DATA?.programs) ? DATA.programs : [];

  return programs.find(
    (program) =>
      String(program.id || "").trim() === String(programId || "").trim(),
  );
}

function roadmapWorkspaceParseRoute() {
  const parts = String(location.hash || "")
    .replace(/^#/, "")
    .split("/")
    .filter((part, index) => index < 2 || part !== "");

  return {
    routeName: parts[0] || "landing",
    programId: roadmapWorkspaceDecode(parts[1], ""),
    viewName: roadmapWorkspaceDecode(parts[2], "summary"),
    productId: roadmapWorkspaceDecode(parts[3], ROADMAP_WORKSPACE_ALL),
    quarter: roadmapWorkspaceDecode(parts[4], ROADMAP_WORKSPACE_ALL),
    itemType: roadmapWorkspaceDecode(parts[5], ""),
    itemId: roadmapWorkspaceDecode(parts[6], ""),
    activityId: roadmapWorkspaceDecode(parts[7], ""),
    extraActivityId: roadmapWorkspaceDecode(parts[8], ""),
  };
}

function roadmapWorkspaceState(programId) {
  const key = String(programId || "").trim();

  if (!ROADMAP_WORKSPACE_STATE.has(key)) {
    ROADMAP_WORKSPACE_STATE.set(key, {
      view: "summary",
      productId: ROADMAP_WORKSPACE_ALL,
      quarter: ROADMAP_WORKSPACE_ALL,
      summaryMetric: "functional:all",
    });
  }

  return ROADMAP_WORKSPACE_STATE.get(key);
}

function roadmapWorkspaceValidQuarter(value) {
  const quarter = String(value || ROADMAP_WORKSPACE_ALL).toUpperCase();

  return ["ALL", "Q1", "Q2", "Q3", "Q4"].includes(quarter)
    ? quarter
    : ROADMAP_WORKSPACE_ALL;
}

function roadmapWorkspaceApplyRouteState(programId, routeContext) {
  const state = roadmapWorkspaceState(programId);
  const requestedView = String(
    routeContext.viewName || "summary",
  ).toLowerCase();

  state.view = ROADMAP_WORKSPACE_VIEWS.has(requestedView)
    ? requestedView
    : "summary";
  state.productId = roadmapWorkspaceNormalizeProduct(
    routeContext.productId || ROADMAP_WORKSPACE_ALL,
  );
  state.quarter = roadmapWorkspaceValidQuarter(routeContext.quarter);

  return state;
}

function roadmapWorkspaceLegacyActivity(row, itemId, index) {
  const activity = {
    ...row,
    itemId,
    activityId:
      row.activityId ||
      row.phaseId ||
      row.id ||
      row.phaseName ||
      row.activityName ||
      `Actividad ${index + 1}`,
    activityName:
      row.activityName || row.phaseName || row.name || `Actividad ${index + 1}`,
  };

  if (typeof adaptRoadmapItemActivity === "function") {
    return adaptRoadmapItemActivity(activity);
  }

  return activity;
}

function roadmapWorkspaceLegacyItems() {
  const legacyDefinitions = [
    {
      type: "project",
      label: "Proyecto",
      collection: "projects",
      phaseCollection: "projectPhases",
      foreignKey: "projectId",
    },
    {
      type: "msa",
      label: "MSA",
      collection: "msas",
      phaseCollection: "msaPhases",
      foreignKey: "msaId",
    },
  ];

  return legacyDefinitions.flatMap((definition) => {
    const rows = Array.isArray(DATA?.[definition.collection])
      ? DATA[definition.collection]
      : [];
    const phases = Array.isArray(DATA?.[definition.phaseCollection])
      ? DATA[definition.phaseCollection]
      : [];

    return rows
      .map((row) => {
        const id = String(row.id || "").trim();

        if (!id) {
          return null;
        }

        const activities = phases
          .filter(
            (phase) => String(phase[definition.foreignKey] || "").trim() === id,
          )
          .map((phase, index) =>
            roadmapWorkspaceLegacyActivity(phase, id, index),
          );

        return {
          id,
          type: definition.type,
          typeLabel: definition.label,
          programId: String(row.programId || "").trim(),
          product: roadmapWorkspaceNormalizeProduct(row.product),
          country: String(row.country || "").trim(),
          initiative: String(row.initiative || row.name || "").trim(),
          title: row.name || row.title || `${definition.label} sin nombre`,
          summary: row.summary || row.description || "",
          description: row.description || row.summary || "",
          status:
            typeof rcsNormalizeStatus === "function"
              ? rcsNormalizeStatus(row.status)
              : row.status || "pending",
          progress:
            typeof normalizeRoadmapProgress === "function"
              ? normalizeRoadmapProgress(row.progress)
              : Number(row.progress || 0),
          priority: Number(row.priority) || 999,
          roadmapOrder: Number(row.roadmapOrder || row.laneOrder) || 999,
          owner: row.owner || "",
          nextMilestoneTitle: row.nextMilestoneTitle || "",
          nextMilestoneDate: row.nextMilestoneDate || "",
          startDate:
            row.startDate ||
            (typeof getFirstRoadmapPhaseDate === "function"
              ? getFirstRoadmapPhaseDate(activities, "startDate")
              : ""),
          endDate:
            row.endDate ||
            (typeof getLastRoadmapPhaseDate === "function"
              ? getLastRoadmapPhaseDate(activities, "endDate")
              : ""),
          targetDate:
            row.targetDate ||
            row.nextMilestoneDate ||
            (typeof getLastRoadmapPhaseDate === "function"
              ? getLastRoadmapPhaseDate(activities, "targetDate") ||
                getLastRoadmapPhaseDate(activities, "endDate")
              : ""),
          lastUpdate: row.lastUpdate || "",
          strategicGoal: row.strategicGoal || "",
          businessValue: row.businessValue || "",
          mainRisks: row.mainRisks || "",
          dependencies: row.dependencies || "",
          documentUrl: row.documentUrl || "",
          documentLabel: row.documentLabel || "",
          activities,
          phases: activities,
          source: row,
        };
      })
      .filter(Boolean);
  });
}

function roadmapWorkspaceAllItems() {
  const unified =
    typeof adaptUnifiedRoadmapCollection === "function"
      ? adaptUnifiedRoadmapCollection()
      : [];
  const legacy = roadmapWorkspaceLegacyItems();
  const itemsByKey = new Map();

  legacy.forEach((item) => {
    itemsByKey.set(`${item.programId}::${item.type}::${item.id}`, item);
  });

  unified.forEach((item) => {
    itemsByKey.set(`${item.programId}::${item.type}::${item.id}`, item);
  });

  return [...itemsByKey.values()];
}

function roadmapWorkspaceItemsForProgram(programId) {
  const normalizedProgramId = String(programId || "").trim();

  return roadmapWorkspaceAllItems().filter((item) => {
    const matchesProgram =
      String(item.programId || "").trim() === normalizedProgramId;
    const matchesCountry = !item.country || item.country === selectedCountry;

    return matchesProgram && matchesCountry;
  });
}

function roadmapWorkspaceTrack(item) {
  const source = item?.source || {};
  const rawTrack = String(
    item?.track ||
      source.track ||
      source.roadmapTrack ||
      source.roadmap_track ||
      source.lane ||
      source.carril ||
      source.workstreamType ||
      "",
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["technical", "tecnico", "tech", "technology"].includes(rawTrack)) {
    return "technical";
  }

  if (["functional", "funcional", "business", "negocio"].includes(rawTrack)) {
    return "functional";
  }

  return String(item?.type || "").toLowerCase() === "msa"
    ? "technical"
    : "functional";
}

function roadmapWorkspaceHasPlanning(item) {
  return [item?.startDate, item?.endDate, item?.targetDate].some((value) => {
    if (value instanceof Date) {
      return !Number.isNaN(value.getTime());
    }

    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

function roadmapWorkspaceStatus(item) {
  return typeof rcsNormalizeStatus === "function"
    ? rcsNormalizeStatus(item?.status)
    : String(item?.status || "pending");
}

function roadmapWorkspaceIsRisk(item) {
  return ["at-risk", "blocked"].includes(roadmapWorkspaceStatus(item));
}

function roadmapWorkspaceIsDone(item) {
  return roadmapWorkspaceStatus(item) === "done";
}

function roadmapWorkspaceProducts(items) {
  const products = new Map();

  items.forEach((item) => {
    const id = roadmapWorkspaceNormalizeProduct(item.product);

    if (!id || id === ROADMAP_WORKSPACE_ALL) {
      return;
    }

    products.set(id, roadmapWorkspaceProductLabel(id));
  });

  return [...products.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));
}

function roadmapWorkspaceFilteredItems(items, state, options = {}) {
  let result = [...items];

  if (state.productId && state.productId !== ROADMAP_WORKSPACE_ALL) {
    result = result.filter(
      (item) =>
        roadmapWorkspaceNormalizeProduct(item.product) === state.productId,
    );
  }

  if (
    options.applyPeriod !== false &&
    state.quarter !== ROADMAP_WORKSPACE_ALL
  ) {
    result = result.filter((item) =>
      typeof roadmapItemMatchesPeriod === "function"
        ? roadmapItemMatchesPeriod(item, state.quarter)
        : true,
    );
  }

  return result;
}

function roadmapWorkspaceSort(items) {
  return [...items].sort((left, right) => {
    const priorityDifference =
      Number(left.priority || 999) - Number(right.priority || 999);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (roadmapWorkspaceIsRisk(left) !== roadmapWorkspaceIsRisk(right)) {
      return roadmapWorkspaceIsRisk(left) ? -1 : 1;
    }

    return String(left.title || "").localeCompare(
      String(right.title || ""),
      "es",
    );
  });
}

function roadmapWorkspaceRoute(programId, view, productId, quarter) {
  return [
    "roadmap",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(view),
    roadmapWorkspaceEncode(productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(quarter || ROADMAP_WORKSPACE_ALL),
  ].join("/");
}

function roadmapWorkspaceDetailRoute(programId, state, item) {
  return [
    "roadmap-workspace-detail",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(state.view),
    roadmapWorkspaceEncode(state.productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.quarter || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(item.type),
    roadmapWorkspaceEncode(item.id),
  ].join("/");
}

function roadmapWorkspaceActivityRouteBase(programId, state, item) {
  return [
    "roadmap-workspace-activity",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(state.view),
    roadmapWorkspaceEncode(state.productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.quarter || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(item.type),
    roadmapWorkspaceEncode(item.id),
  ].join("/");
}
function roadmapWorkspacePlanningSource(item) {
  const source = item?.source || {};

  return String(
    item?.planningSource ||
      source.planningSource ||
      source.planning_source ||
      "internal",
  )
    .trim()
    .toLowerCase() === "jira"
    ? "jira"
    : "internal";
}

function roadmapWorkspaceJiraFeatureStatus(value) {
  const status = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["deployed", "accepted", "done", "closed"].includes(status)) {
    return "done";
  }

  if (status === "blocked") {
    return "blocked";
  }

  if (
    [
      "in progress",
      "analysing",
      "analysis in progress",
      "analysis in review",
      "ready to verify",
    ].includes(status)
  ) {
    return "on-track";
  }

  if (["new", "backlog", "to do"].includes(status)) {
    return "planned";
  }

  return "pending";
}

function roadmapWorkspaceJiraFeatureItems(programId) {
  const normalizedProgramId = String(programId || "").trim();

  const rows = Array.isArray(DATA?.jiraWorkspaceFeatures)
    ? DATA.jiraWorkspaceFeatures
    : [];

  return rows
    .map((row, index) => {
      const jiraKey = String(
        row.jiraKey || row.key || row.issueKey || row.id || "",
      ).trim();

      const product = roadmapWorkspaceNormalizeProduct(
        row.product || row.productId || "",
      );

      const country = String(row.country || row.countryId || "")
        .trim()
        .toUpperCase();

      const capabilityIds = [
        ...new Set(
          (Array.isArray(row.capabilityIds)
            ? row.capabilityIds
            : String(row.capabilityIds || row.capabilityId || "").split(
                /[|,;\n]+/,
              )
          )
            .map((value) =>
              String(value || "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        ),
      ];

      const statusRaw = String(
        row.statusRaw || row.status || row.currentStatus || "",
      ).trim();

      const trackRaw = String(row.track || row.roadmapTrack || "functional")
        .trim()
        .toLowerCase();

      const track = ["technical", "tecnico", "técnico", "tech"].includes(
        trackRaw,
      )
        ? "technical"
        : "functional";

      const title = String(
        row.featureName ||
          row.name ||
          row.summary ||
          row.title ||
          jiraKey ||
          `Feature JIRA ${index + 1}`,
      ).trim();

      const discarded =
        row.jiraDiscarded === true ||
        row.discarded === true ||
        ["true", "1", "yes", "si", "sí"].includes(
          String(row.jiraDiscarded ?? row.discarded ?? "")
            .trim()
            .toLowerCase(),
        );

      /*
       * ===================================================
       * PROGRAM INCREMENT -> VENTANA TEMPORAL
       * ===================================================
       *
       * El XLSX no informa fechas exactas de calendario,
       * pero sí el Program Increment.
       *
       * Para el cronograma utilizamos el PI como ventana
       * oficial de planificación:
       *
       * Q1 -> enero   - marzo
       * Q2 -> abril   - junio
       * Q3 -> julio   - septiembre
       * Q4 -> octubre - diciembre
       *
       * No estamos inventando una fecha de entrega:
       * representamos gráficamente la ventana del PI.
       */

      const programIncrement = String(
        row.programIncrement || row.pi || row.PI || "",
      ).trim();

      const piToken = programIncrement.toUpperCase().replace(/\s+/g, "");

      let startDate = String(row.startDate || row.start_date || "").trim();

      let endDate = String(row.endDate || row.end_date || "").trim();

      if (!startDate && !endDate && programIncrement) {
        const match =
          piToken.match(/(?:20)?(\d{2})[-_/]?(?:Q|PI)?([1-4])/) ||
          piToken.match(/(?:Q|PI)([1-4])[-_/]?(?:20)?(\d{2})/);

        let year = null;
        let quarter = null;

        if (match) {
          if (/^Q|^PI/.test(piToken)) {
            quarter = Number(match[1]);

            year = 2000 + Number(match[2]);
          } else {
            year = 2000 + Number(match[1]);

            quarter = Number(match[2]);
          }
        }

        if (Number.isFinite(year) && Number.isFinite(quarter)) {
          const windows = {
            1: {
              start: `${year}-01-01`,
              end: `${year}-03-31`,
            },

            2: {
              start: `${year}-04-01`,
              end: `${year}-06-30`,
            },

            3: {
              start: `${year}-07-01`,
              end: `${year}-09-30`,
            },

            4: {
              start: `${year}-10-01`,
              end: `${year}-12-31`,
            },
          };

          startDate = windows[quarter]?.start || "";

          endDate = windows[quarter]?.end || "";
        }
      }

      return {
        ...row,

        id:
          jiraKey ||
          ["jira-feature", normalizedProgramId, product, country, index].join(
            "::",
          ),

        programId: String(row.programId || "").trim() || normalizedProgramId,

        product,

        country,

        capabilityIds,

        type: "feature",

        typeLabel: "Feature JIRA",

        track,

        planningSource: "jira",

        title,

        initiative: title,

        summary: String(
          row.summary || row.featureName || row.name || "",
        ).trim(),

        description: String(
          row.description || row.summary || row.featureName || "",
        ).trim(),

        status: roadmapWorkspaceJiraFeatureStatus(statusRaw),

        statusRaw,

        progress: Number.isFinite(Number(row.progress))
          ? Math.max(0, Math.min(100, Number(row.progress)))
          : 0,

        priority: row.priority || "",

        blockedIssues: Number(row.blockedIssues) || 0,

        totalStories: Number(row.totalStories) || 0,

        startDate,

        endDate,

        targetDate: endDate,

        programIncrement,

        jiraKey,

        jiraUrl: String(row.jiraUrl || row.url || "").trim(),

        jiraDiscarded: discarded,

        source: row,
      };
    })
    .filter((item) => {
      if (!item.id || item.jiraDiscarded) {
        return false;
      }

      if (
        normalizedProgramId &&
        item.programId &&
        item.programId !== normalizedProgramId
      ) {
        return false;
      }

      return true;
    });
}
