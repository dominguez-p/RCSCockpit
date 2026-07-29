const ROADMAP_AMBITION_ALL = "ALL";
const ROADMAP_AMBITION_UNASSIGNED = "UNASSIGNED";

const ROADMAP_RCS_AMBITIONS = (
  typeof PORTFOLIO_AMBITIONS !== "undefined" ? PORTFOLIO_AMBITIONS : []
)
  .map((ambition) => ({
    id: String(ambition.id || "").trim(),
    order: Number(ambition.order) || 999,
    axis: String(ambition.axis || "").trim(),
    title: String(ambition.title || ambition.id || "Ambición").trim(),
    ambition: String(ambition.ambition || "").trim(),
  }))
  .filter((ambition) => ambition.id)
  .sort((left, right) => left.order - right.order);

const ROADMAP_AMBITION_BY_ID = new Map(
  ROADMAP_RCS_AMBITIONS.map((ambition) => [ambition.id, ambition]),
);

function roadmapAmbitionNormalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+[.)\-:\s]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ROADMAP_AMBITION_ALIAS_TO_ID = (() => {
  const aliases = new Map();

  ROADMAP_RCS_AMBITIONS.forEach((ambition) => {
    const values = [
      ambition.id,
      ambition.title,
      String(ambition.order),
      String(ambition.order).padStart(2, "0"),
      `${ambition.order}. ${ambition.title}`,
    ];

    values.forEach((value) => {
      const normalized = roadmapAmbitionNormalizeText(value);

      if (normalized) {
        aliases.set(normalized, ambition.id);
      }
    });
  });

  const explicitAliases = {
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
    "technical leader cio": "tl-cio",
    cultura: "culture-talent",
    talento: "culture-talent",
    "cultura talento": "culture-talent",
  };

  Object.entries(explicitAliases).forEach(([alias, ambitionId]) => {
    aliases.set(roadmapAmbitionNormalizeText(alias), ambitionId);
  });

  return aliases;
})();

function roadmapAmbitionSplit(value) {
  if (Array.isArray(value)) {
    return value.flatMap(roadmapAmbitionSplit);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return String(value)
    .split(/[|,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function roadmapAmbitionResolveId(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  if (ROADMAP_AMBITION_BY_ID.has(rawValue)) {
    return rawValue;
  }

  const normalized = roadmapAmbitionNormalizeText(rawValue);

  if (ROADMAP_AMBITION_ALIAS_TO_ID.has(normalized)) {
    return ROADMAP_AMBITION_ALIAS_TO_ID.get(normalized);
  }

  const numericOrder = Number(rawValue.replace(/[^0-9]/g, ""));

  if (Number.isFinite(numericOrder) && numericOrder > 0) {
    const ambition = ROADMAP_RCS_AMBITIONS.find(
      (candidate) => candidate.order === numericOrder,
    );

    if (ambition) {
      return ambition.id;
    }
  }

  return "";
}

function roadmapAmbitionValidFilter(value) {
  const rawValue = String(value || ROADMAP_AMBITION_ALL).trim();
  const upperValue = rawValue.toUpperCase();

  if (upperValue === ROADMAP_AMBITION_ALL) {
    return ROADMAP_AMBITION_ALL;
  }

  if (upperValue === ROADMAP_AMBITION_UNASSIGNED) {
    return ROADMAP_AMBITION_UNASSIGNED;
  }

  return roadmapAmbitionResolveId(rawValue) || ROADMAP_AMBITION_ALL;
}

function roadmapAmbitionSource(item) {
  return item?.source || item || {};
}

function roadmapAmbitionFirstValue(item, fields) {
  const source = roadmapAmbitionSource(item);

  for (const field of fields) {
    const value = item?.[field] ?? source?.[field];

    if (
      value !== null &&
      value !== undefined &&
      (Array.isArray(value) || String(value).trim() !== "")
    ) {
      return value;
    }
  }

  return "";
}

function roadmapAmbitionPrimaryId(item) {
  const value = roadmapAmbitionFirstValue(item, [
    "primaryAmbition",
    "primaryAmbitionId",
    "primary_ambition",
    "primary_ambition_id",
    "ambition",
    "ambitionId",
    "ambition_id",
    "rcsAmbition",
    "rcsAmbitionId",
  ]);

  const primaryId = roadmapAmbitionSplit(value)
    .map(roadmapAmbitionResolveId)
    .find(Boolean);

  if (primaryId) {
    return primaryId;
  }

  const allAmbitions = roadmapAmbitionAllIds(item);

  return allAmbitions[0] || "";
}

function roadmapAmbitionAllIds(item) {
  const primaryValue = roadmapAmbitionFirstValue(item, [
    "primaryAmbition",
    "primaryAmbitionId",
    "primary_ambition",
    "primary_ambition_id",
    "ambition",
    "ambitionId",
    "ambition_id",
    "rcsAmbition",
    "rcsAmbitionId",
  ]);
  const secondaryValue = roadmapAmbitionFirstValue(item, [
    "secondaryAmbitions",
    "secondaryAmbitionIds",
    "secondary_ambitions",
    "secondary_ambition_ids",
  ]);
  const generalValue = roadmapAmbitionFirstValue(item, [
    "ambitions",
    "ambitionIds",
    "ambition_ids",
    "rcsAmbitions",
    "rcsAmbitionIds",
  ]);
  const ids = [primaryValue, secondaryValue, generalValue]
    .flatMap(roadmapAmbitionSplit)
    .map(roadmapAmbitionResolveId)
    .filter(Boolean);

  return [...new Set(ids)];
}

function roadmapAmbitionSecondaryIds(item) {
  const primaryId = roadmapAmbitionPrimaryId(item);

  return roadmapAmbitionAllIds(item).filter(
    (ambitionId) => ambitionId !== primaryId,
  );
}

function roadmapAmbitionGet(ambitionId) {
  return ROADMAP_AMBITION_BY_ID.get(String(ambitionId || "").trim()) || null;
}

function roadmapAmbitionHas(item, ambitionId) {
  const validAmbitionId = roadmapAmbitionValidFilter(ambitionId);
  const itemAmbitions = roadmapAmbitionAllIds(item);

  if (validAmbitionId === ROADMAP_AMBITION_ALL) {
    return true;
  }

  if (validAmbitionId === ROADMAP_AMBITION_UNASSIGNED) {
    return itemAmbitions.length === 0;
  }

  return itemAmbitions.includes(validAmbitionId);
}

function roadmapAmbitionExpectedContribution(item) {
  return String(
    roadmapAmbitionFirstValue(item, [
      "expectedContribution",
      "expected_contribution",
      "ambitionContribution",
      "ambition_contribution",
      "strategicContribution",
      "strategic_contribution",
    ]) || "",
  ).trim();
}

function roadmapAmbitionStrategicOutcome(item) {
  return String(
    roadmapAmbitionFirstValue(item, [
      "strategicOutcome",
      "strategic_outcome",
      "expectedOutcome",
      "expected_outcome",
      "outcome",
    ]) || "",
  ).trim();
}

function roadmapAmbitionEvidence(item) {
  return String(
    roadmapAmbitionFirstValue(item, [
      "evidence",
      "evidences",
      "ambitionEvidence",
      "ambition_evidence",
      "strategicEvidence",
      "strategic_evidence",
    ]) || "",
  ).trim();
}

function roadmapAmbitionCoverage(items) {
  const rows = Array.isArray(items) ? items : [];
  const byAmbition = new Map(
    ROADMAP_RCS_AMBITIONS.map((ambition) => [ambition.id, 0]),
  );
  let linked = 0;

  rows.forEach((item) => {
    const ambitionIds = roadmapAmbitionAllIds(item);

    if (ambitionIds.length) {
      linked += 1;
    }

    ambitionIds.forEach((ambitionId) => {
      byAmbition.set(ambitionId, (byAmbition.get(ambitionId) || 0) + 1);
    });
  });

  return {
    total: rows.length,
    linked,
    unassigned: rows.length - linked,
    percentage: rows.length ? Math.round((linked / rows.length) * 100) : 0,
    byAmbition,
  };
}

const roadmapAmbitionsBaseWorkspaceState = roadmapWorkspaceState;
roadmapWorkspaceState = function roadmapWorkspaceStateWithAmbition(programId) {
  const state = roadmapAmbitionsBaseWorkspaceState(programId);

  if (!state.ambitionId) {
    state.ambitionId = ROADMAP_AMBITION_ALL;
  }

  state.ambitionId = roadmapAmbitionValidFilter(state.ambitionId);

  return state;
};

const roadmapAmbitionsBaseParseRoute = roadmapWorkspaceParseRoute;
roadmapWorkspaceParseRoute = function roadmapWorkspaceParseRouteWithAmbition() {
  const parts = String(location.hash || "")
    .replace(/^#/, "")
    .split("/");
  const routeName = parts[0] || "landing";

  if (routeName === "roadmap") {
    return {
      routeName,
      programId: roadmapWorkspaceDecode(parts[1], ""),
      viewName: roadmapWorkspaceDecode(parts[2], "summary"),
      productId: roadmapWorkspaceDecode(parts[3], ROADMAP_WORKSPACE_ALL),
      quarter: roadmapWorkspaceDecode(parts[4], ROADMAP_WORKSPACE_ALL),
      ambitionId: roadmapAmbitionValidFilter(
        roadmapWorkspaceDecode(parts[5], ROADMAP_AMBITION_ALL),
      ),
      itemType: "",
      itemId: "",
      activityId: "",
      extraActivityId: "",
    };
  }

  if (
    routeName === "roadmap-workspace-detail" ||
    routeName === "roadmap-workspace-activity"
  ) {
    const hasAmbitionSegment =
      parts.length >= (routeName === "roadmap-workspace-detail" ? 8 : 9) &&
      roadmapAmbitionValidFilter(parts[5]) !== ROADMAP_AMBITION_ALL
        ? true
        : [ROADMAP_AMBITION_ALL, ROADMAP_AMBITION_UNASSIGNED].includes(
            String(parts[5] || "").toUpperCase(),
          );
    const ambitionOffset = hasAmbitionSegment ? 1 : 0;

    return {
      routeName,
      programId: roadmapWorkspaceDecode(parts[1], ""),
      viewName: roadmapWorkspaceDecode(parts[2], "summary"),
      productId: roadmapWorkspaceDecode(parts[3], ROADMAP_WORKSPACE_ALL),
      quarter: roadmapWorkspaceDecode(parts[4], ROADMAP_WORKSPACE_ALL),
      ambitionId: hasAmbitionSegment
        ? roadmapAmbitionValidFilter(roadmapWorkspaceDecode(parts[5], "ALL"))
        : ROADMAP_AMBITION_ALL,
      itemType: roadmapWorkspaceDecode(parts[5 + ambitionOffset], ""),
      itemId: roadmapWorkspaceDecode(parts[6 + ambitionOffset], ""),
      activityId: roadmapWorkspaceDecode(parts[7 + ambitionOffset], ""),
      extraActivityId: roadmapWorkspaceDecode(parts[8 + ambitionOffset], ""),
    };
  }

  return {
    ...roadmapAmbitionsBaseParseRoute(),
    ambitionId: ROADMAP_AMBITION_ALL,
  };
};

const roadmapAmbitionsBaseApplyRouteState = roadmapWorkspaceApplyRouteState;
roadmapWorkspaceApplyRouteState = function applyRouteStateWithAmbition(
  programId,
  routeContext,
) {
  const state = roadmapAmbitionsBaseApplyRouteState(programId, routeContext);

  state.ambitionId = roadmapAmbitionValidFilter(
    routeContext?.ambitionId || state.ambitionId || ROADMAP_AMBITION_ALL,
  );

  return state;
};

const roadmapAmbitionsBaseFilteredItems = roadmapWorkspaceFilteredItems;

function roadmapAmbitionScopeItems(items, state, options = {}) {
  const scopeState = {
    ...state,
    ambitionId: ROADMAP_AMBITION_ALL,
  };

  return roadmapAmbitionsBaseFilteredItems(items, scopeState, options);
}

roadmapWorkspaceFilteredItems = function filterWorkspaceItemsByAmbition(
  items,
  state,
  options = {},
) {
  const filtered = roadmapAmbitionsBaseFilteredItems(items, state, options);
  const ambitionId = roadmapAmbitionValidFilter(
    state?.ambitionId || ROADMAP_AMBITION_ALL,
  );

  return filtered.filter((item) => roadmapAmbitionHas(item, ambitionId));
};

roadmapWorkspaceRoute = function roadmapWorkspaceRouteWithAmbition(
  programId,
  view,
  productId,
  quarter,
  ambitionId = null,
) {
  const state = roadmapWorkspaceState(programId);
  const selectedAmbition = roadmapAmbitionValidFilter(
    ambitionId || state.ambitionId || ROADMAP_AMBITION_ALL,
  );

  return [
    "roadmap",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(view),
    roadmapWorkspaceEncode(productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(quarter || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(selectedAmbition),
  ].join("/");
};

roadmapWorkspaceDetailRoute = function roadmapWorkspaceDetailRouteWithAmbition(
  programId,
  state,
  item,
) {
  return [
    "roadmap-workspace-detail",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(state.view),
    roadmapWorkspaceEncode(state.productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.quarter || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.ambitionId || ROADMAP_AMBITION_ALL),
    roadmapWorkspaceEncode(item.type),
    roadmapWorkspaceEncode(item.id),
  ].join("/");
};

roadmapWorkspaceActivityRouteBase = function roadmapWorkspaceActivityRouteBaseWithAmbition(
  programId,
  state,
  item,
) {
  return [
    "roadmap-workspace-activity",
    roadmapWorkspaceEncode(programId),
    roadmapWorkspaceEncode(state.view),
    roadmapWorkspaceEncode(state.productId || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.quarter || ROADMAP_WORKSPACE_ALL),
    roadmapWorkspaceEncode(state.ambitionId || ROADMAP_AMBITION_ALL),
    roadmapWorkspaceEncode(item.type),
    roadmapWorkspaceEncode(item.id),
  ].join("/");
};

window.ROADMAP_RCS_AMBITIONS = ROADMAP_RCS_AMBITIONS;
window.roadmapAmbitionAllIds = roadmapAmbitionAllIds;
window.roadmapAmbitionPrimaryId = roadmapAmbitionPrimaryId;
window.roadmapAmbitionSecondaryIds = roadmapAmbitionSecondaryIds;
