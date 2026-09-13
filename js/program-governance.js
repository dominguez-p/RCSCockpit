function programGovernanceEscape(value) {
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

function programGovernanceRows(collectionName, programId) {
  const rows = Array.isArray(DATA?.[collectionName])
    ? DATA[collectionName]
    : [];

  return rows.filter((row) => {
    const rowProgramId = String(row.programId || programId).trim();
    const selectedProgramId = String(programId || "").trim();

    if (rowProgramId !== selectedProgramId) {
      return false;
    }

    const country = String(
      row.country || row["RtC Anchor Country"] || "",
    ).trim();

    return !country || country === selectedCountry;
  });
}

function programGovernanceProgram(programId) {
  const programs = Array.isArray(DATA?.programs) ? DATA.programs : [];

  return programs.find(
    (program) =>
      String(program.id || "").trim() === String(programId || "").trim(),
  );
}

function programGovernanceCountryLabel() {
  const country = Array.isArray(COUNTRIES)
    ? COUNTRIES.find((item) => item.id === selectedCountry)
    : null;

  return country?.label || selectedCountry || "Sin país";
}
function programGovernanceProgramRows(collectionName, programId) {
  const rows = Array.isArray(DATA?.[collectionName])
    ? DATA[collectionName]
    : [];

  const normalizedProgramId = String(programId || "").trim();

  return rows.filter((row) => {
    const rowProgramId = String(row.programId || normalizedProgramId).trim();

    return rowProgramId === normalizedProgramId;
  });
}

function programGovernanceNormalizeCountryScope(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (
    !normalized ||
    normalized === "ALL" ||
    normalized === "HL" ||
    normalized === "HOLDING"
  ) {
    return "ALL";
  }

  const countries = Array.isArray(COUNTRIES) ? COUNTRIES : [];

  const exists = countries.some(
    (country) =>
      String(country?.id || "")
        .trim()
        .toUpperCase() === normalized && normalized !== "HL",
  );

  return exists ? normalized : "ALL";
}

function programGovernanceCountryMeta(countryScope) {
  const normalizedScope = programGovernanceNormalizeCountryScope(countryScope);

  const countries = Array.isArray(COUNTRIES) ? COUNTRIES : [];

  if (normalizedScope === "ALL") {
    const holding = countries.find(
      (country) =>
        String(country?.id || "")
          .trim()
          .toUpperCase() === "HL",
    );

    return {
      id: "ALL",
      label: "Todos",
      scopeLabel: "Todos los países",
      flagSrc: holding?.flagSrc || "assets/flags/world.png",
    };
  }

  const country = countries.find(
    (item) =>
      String(item?.id || "")
        .trim()
        .toUpperCase() === normalizedScope,
  );

  return {
    id: normalizedScope,
    label: country?.label || normalizedScope,
    scopeLabel: country?.label || normalizedScope,
    flagSrc: country?.flagSrc || "",
  };
}

function programGovernanceImpedimentRouteContext(programId) {
  const parts = String(location.hash || "")
    .replace(/^#\/?/, "")
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

  const routeName = String(parts[0] || "").trim();

  const routeProgramId = String(parts[1] || "").trim();

  const productId = String(parts[2] || "").trim();

  const countryScope = programGovernanceNormalizeCountryScope(
    parts[3] || "ALL",
  );

  return {
    routeName,
    programId: routeProgramId || String(programId || "").trim(),
    productId,
    countryScope,
  };
}

function programGovernanceImpedimentRows(programId, countryScope = "ALL") {
  const rows = programGovernanceProgramRows("impediments", programId);

  const normalizedScope = programGovernanceNormalizeCountryScope(countryScope);

  /*
   * ALL representa la visión global.
   */
  if (normalizedScope === "ALL") {
    return rows;
  }

  return rows.filter((row) => {
    const rowCountry = String(row.country || row["RtC Anchor Country"] || "")
      .trim()
      .toUpperCase();

    /*
     * Mantenemos los impedimentos globales
     * también dentro de una vista de país.
     */
    return !rowCountry || rowCountry === normalizedScope;
  });
}

function programGovernanceImpedimentCountryRoute(
  programId,
  productId,
  countryScope,
) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedProductId = String(productId || "ALL").trim();

  const normalizedCountryScope =
    programGovernanceNormalizeCountryScope(countryScope);

  return [
    "impediments",
    encodeURIComponent(normalizedProgramId),
    encodeURIComponent(normalizedProductId),
    encodeURIComponent(normalizedCountryScope),
  ].join("/");
}

function programGovernanceRenderCountrySelector(
  programId,
  productId,
  activeCountryScope,
) {
  const normalizedScope =
    programGovernanceNormalizeCountryScope(activeCountryScope);

  const countries = Array.isArray(COUNTRIES)
    ? COUNTRIES.filter(
        (country) =>
          String(country?.id || "")
            .trim()
            .toUpperCase() !== "HL",
      )
    : [];

  const options = [
    programGovernanceCountryMeta("ALL"),
    ...countries.map((country) => programGovernanceCountryMeta(country.id)),
  ];

  return `
    <section
      class="aixbanker-roadmap-filters"
      aria-label="Filtro geográfico de Key Issues"
    >
      <div
        class="aixbanker-roadmap-filter-group"
      >
        <span
          class="aixbanker-roadmap-filter-label"
        >
          País
        </span>

        <div
          class="country-selector"
          aria-label="Seleccionar país"
        >
          ${options
            .map((country) => {
              const active = normalizedScope === country.id;

              const routeValue = programGovernanceImpedimentCountryRoute(
                programId,
                productId,
                country.id,
              );

              return `
                <button
                  class="
                    country-flag
                    ${active ? "active" : ""}
                  "
                  type="button"
                  data-route="${programGovernanceEscape(routeValue)}"
                  title="${programGovernanceEscape(country.scopeLabel)}"
                  aria-label="${programGovernanceEscape(country.scopeLabel)}"
                  aria-pressed="${active ? "true" : "false"}"
                >
                  ${
                    country.flagSrc
                      ? `
                        <img
                          src="${programGovernanceEscape(country.flagSrc)}"
                          alt=""
                          aria-hidden="true"
                        />
                      `
                      : `
                        <span
                          aria-hidden="true"
                        >
                          ${programGovernanceEscape(country.id)}
                        </span>
                      `
                  }
                </button>

                <span>
                  ${programGovernanceEscape(country.label)}
                </span>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function programGovernanceImpedimentCountryLabel(item) {
  const rowCountry = String(item?.country || item?.["RtC Anchor Country"] || "")
    .trim()
    .toUpperCase();

  if (!rowCountry) {
    return "Global";
  }

  const country = Array.isArray(COUNTRIES)
    ? COUNTRIES.find(
        (itemCountry) =>
          String(itemCountry?.id || "")
            .trim()
            .toUpperCase() === rowCountry,
      )
    : null;

  return country?.label || rowCountry;
}
function programGovernanceDate(value) {
  if (!value) {
    return "-";
  }

  if (typeof formatDate === "function") {
    const formatted = formatDate(value);

    if (formatted && formatted !== "-") {
      return formatted;
    }
  }

  return String(value);
}

function programGovernanceStatus(value) {
  if (typeof rcsNormalizeStatus === "function") {
    return rcsNormalizeStatus(value);
  }

  return String(value || "pending")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
}

function programGovernanceStatusLabel(value) {
  const status = programGovernanceStatus(value);

  if (typeof rcsStatusLabel === "function") {
    return rcsStatusLabel(status);
  }

  return String(value || "Pendiente");
}

function programGovernanceSeverityClass(value) {
  const severity = String(value || "")
    .trim()
    .toLowerCase();

  if (["high", "critical", "alta", "crítica", "critica"].includes(severity)) {
    return "red";
  }

  if (["medium", "media", "moderate", "moderada"].includes(severity)) {
    return "yellow";
  }

  return "";
}

function programGovernanceSeverityLabel(value) {
  const severity = String(value || "low")
    .trim()
    .toLowerCase();

  return (
    {
      critical: "Crítica",
      critica: "Crítica",
      crítica: "Crítica",
      high: "Alta",
      alta: "Alta",
      medium: "Media",
      media: "Media",
      moderate: "Media",
      moderada: "Media",
      low: "Baja",
      baja: "Baja",
    }[severity] ||
    value ||
    "Baja"
  );
}

function programGovernanceConfigureBackButton(programId, programName) {
  const backButton = document.querySelector(".back-to-program-btn");

  if (!backButton) {
    return;
  }

  const normalizedProgramId = String(programId || "").trim();

  const storedGovernanceRoute = sessionStorage.getItem(
    "programGovernanceReturnRoute",
  );

  const storedFlightDeckRoute = sessionStorage.getItem("flightDeckReturnRoute");

  const validPrefix = `program/${normalizedProgramId}/`;

  let returnRoute = "";

  if (storedGovernanceRoute && storedGovernanceRoute.startsWith(validPrefix)) {
    returnRoute = storedGovernanceRoute;
  } else if (
    storedFlightDeckRoute &&
    storedFlightDeckRoute.startsWith(validPrefix)
  ) {
    returnRoute = storedFlightDeckRoute;
  } else {
    returnRoute = `program/${normalizedProgramId}`;
  }

  backButton.dataset.route = returnRoute;

  backButton.textContent = `← Volver a ${programName || "programa"}`;

  backButton.addEventListener(
    "click",
    () => {
      sessionStorage.removeItem("programGovernanceReturnRoute");

      sessionStorage.removeItem("flightDeckReturnRoute");
    },
    {
      once: true,
    },
  );
}

function renderProgramImpedimentCard(item) {
  const title = item.title || item.name || "Impedimento sin título";

  const impact = item.impact || item.description || "Sin impacto informado.";

  const owner = item.owner || "-";

  const targetDate =
    item.targetResolutionDate || item.targetDate || item.dueDate || "";

  const mitigation = item.mitigation || item.action || "No informada.";

  const severity = item.severity || item.priority || "low";

  const countryLabel = programGovernanceImpedimentCountryLabel(item);

  return `
    <article class="management-card">
      <div class="management-card-top">
        <strong>
          ${programGovernanceEscape(title)}
        </strong>

        <span
          class="
            pill
            ${programGovernanceSeverityClass(severity)}
          "
        >
          ${programGovernanceEscape(programGovernanceSeverityLabel(severity))}
        </span>
      </div>

      <p>
        ${programGovernanceEscape(impact)}
      </p>

      <small>
        <b>País:</b>
        ${programGovernanceEscape(countryLabel)}
        ·
        <b>Owner:</b>
        ${programGovernanceEscape(owner)}
        ·
        <b>Objetivo:</b>
        ${programGovernanceEscape(programGovernanceDate(targetDate))}
      </small>

      <small>
        <b>Mitigación:</b>
        ${programGovernanceEscape(mitigation)}
      </small>
    </article>
  `;
}

renderImpediments = function renderProgramImpediments(programId) {
  const program = programGovernanceProgram(programId);

  if (!program) {
    renderLanding();
    return;
  }

  const routeContext = programGovernanceImpedimentRouteContext(programId);

  const countryScope = routeContext.countryScope;

  const countryMeta = programGovernanceCountryMeta(countryScope);

  const impediments = programGovernanceImpedimentRows(programId, countryScope);

  setHead(
    `${program.name || "Programa"} · Key Issues`,

    `Bloqueos, riesgos y mitigaciones · ${countryMeta.scopeLabel}`,

    [
      "Retail Client Solutions",
      program.name || programId,
      "Key Issues",
      countryMeta.scopeLabel,
    ].join(" > "),
  );

  view.innerHTML = "";

  view.append(tpl("#impediments-template"));

  programGovernanceConfigureBackButton(programId, program.name);

  const container = document.querySelector("#impedimentsList");

  if (!container) {
    console.error("No se ha encontrado #impedimentsList en la plantilla.");

    return;
  }

  container.insertAdjacentHTML(
    "beforebegin",
    programGovernanceRenderCountrySelector(
      programId,
      routeContext.productId,
      countryScope,
    ),
  );

  container.innerHTML = impediments.length
    ? impediments.map(renderProgramImpedimentCard).join("")
    : `
            <section class="panel">
              <p class="empty-state">
                No hay impedimentos registrados para
                ${programGovernanceEscape(countryMeta.scopeLabel)}.
              </p>
            </section>
          `;
};

function renderProgramDecisionCard(item, decisionType) {
  const title =
    item.title || item.name || item.decision || "Decisión sin título";
  const impact = item.impact || item.description || "Sin impacto informado.";
  const owner = item.owner || "-";
  const dueDate =
    item.dueDate || item.decisionDate || item.targetDate || item.date || "";
  const status = programGovernanceStatus(
    item.status || (decisionType === "done" ? "done" : "pending"),
  );

  return `
    <article class="management-card ${decisionType === "done" ? "done" : ""}">
      <div class="management-card-top">
        <strong>${programGovernanceEscape(title)}</strong>

        <span class="status-pill status-${programGovernanceEscape(status)}">
          ${programGovernanceEscape(programGovernanceStatusLabel(status))}
        </span>
      </div>

      <small>
        <b>Owner:</b>
        ${programGovernanceEscape(owner)}
        ·
        <b>Fecha:</b>
        ${programGovernanceEscape(programGovernanceDate(dueDate))}
      </small>

      <p>${programGovernanceEscape(impact)}</p>
    </article>
  `;
}

function programGovernanceRenderDecisionList(container, rows, decisionType) {
  if (!container) {
    return;
  }

  const emptyMessage =
    decisionType === "done"
      ? "No hay decisiones tomadas."
      : "No hay decisiones pendientes.";

  container.innerHTML = rows.length
    ? rows.map((item) => renderProgramDecisionCard(item, decisionType)).join("")
    : `<p class="empty-state">${emptyMessage}</p>`;
}

renderDecisions = function renderProgramDecisions(programId) {
  const program = programGovernanceProgram(programId);

  if (!program) {
    renderLanding();
    return;
  }

  const countryLabel = programGovernanceCountryLabel();
  const pending = programGovernanceRows("decisionsPending", programId);
  const done = programGovernanceRows("decisionsDone", programId);

  setHead(
    `${program.name || "Programa"} · Decisiones`,
    `Decisiones pendientes y tomadas · ${countryLabel}`,
    `Retail Client Solutions > ${program.name || programId} > ${countryLabel} > Decisiones`,
  );

  view.innerHTML = "";
  view.append(tpl("#decisions-template"));

  programGovernanceConfigureBackButton(programId, program.name);

  programGovernanceRenderDecisionList(
    document.querySelector("#decisionsPendingList"),
    pending,
    "pending",
  );

  programGovernanceRenderDecisionList(
    document.querySelector("#decisionsDoneList"),
    done,
    "done",
  );
};
