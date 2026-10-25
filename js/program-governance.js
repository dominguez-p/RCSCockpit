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
  /*
   * El selector geográfico de Key Issues
   * está centralizado en la cabecera global.
   *
   * No renderizamos un segundo selector
   * dentro de la pantalla.
   *
   * El resto de filtros y funcionalidades
   * de Key Issues permanecen intactos.
   */
  return "";
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
  const esc = programGovernanceEscape;

  const title = item.title || item.name || "Impedimento sin título";

  const impact = item.impact || item.description || "Sin impacto informado.";

  const ownerRaw = String(item.owner || "").trim();

  const owner = ownerRaw || "-";

  const targetDate =
    item.targetResolutionDate || item.targetDate || item.dueDate || "";

  const mitigationRaw = String(item.mitigation || item.action || "").trim();

  const mitigation = mitigationRaw || "No informada.";

  const countryLabel = programGovernanceImpedimentCountryLabel(item);

  const solved = keyIssuesIsSolved(item);

  // =====================================================
  // PRIORIDAD
  // =====================================================

  const rawSeverity = String(item.severity || item.priority || "").trim();

  const normalizedSeverity = rawSeverity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const validPriority = [
    "high",
    "critical",
    "alta",
    "critica",
    "medium",
    "media",
    "moderate",
    "moderada",
    "low",
    "baja",
  ].includes(normalizedSeverity);

  const priorityBadge = validPriority
    ? `
      <span class="pill ${programGovernanceSeverityClass(rawSeverity)}">
        ${esc(programGovernanceSeverityLabel(rawSeverity))}
      </span>
    `
    : `
      <span class="pill" style="
        background:#eaf1ff;
        color:#001391;
      ">
        Sin prioridad definida
      </span>
    `;

  const statusBadge = solved
    ? `
      <span class="pill" style="
        background:#def7ec;
        color:#08744f;
      ">
        Resuelto
      </span>
    `
    : "";

  // =====================================================
  // FECHA OBJETIVO Y VENCIMIENTO
  // =====================================================

  const parseTargetDate = (value) => {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const text = String(value || "").trim();

    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);

    const spanish = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

    if (!iso && !spanish) return null;

    const year = Number(iso ? iso[1] : spanish[3]);
    const month = Number(iso ? iso[2] : spanish[2]);
    const day = Number(iso ? iso[3] : spanish[1]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const deadline = parseTargetDate(targetDate);

  const today = new Date();

  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const deadlineUTC = deadline
    ? Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
    : null;

  const daysRemaining =
    deadlineUTC === null
      ? null
      : Math.round((deadlineUTC - todayUTC) / 86400000);

  let deadlineBadge = "";

  if (!solved && daysRemaining !== null) {
    if (daysRemaining < 0) {
      const days = Math.abs(daysRemaining);

      deadlineBadge = `
        <span class="pill" style="
          background:#ffe3e3;
          color:#a1192e;
          font-weight:700;
        ">
          Vencido · ${days}
          ${days === 1 ? "día" : "días"}
        </span>
      `;
    } else if (daysRemaining === 0) {
      deadlineBadge = `
        <span class="pill" style="
          background:#fff2d6;
          color:#865000;
          font-weight:700;
        ">
          Vence hoy
        </span>
      `;
    } else if (daysRemaining <= 7) {
      deadlineBadge = `
        <span class="pill" style="
          background:#fff2d6;
          color:#865000;
          font-weight:700;
        ">
          Vence en ${daysRemaining}
          ${daysRemaining === 1 ? "día" : "días"}
        </span>
      `;
    }
  }

  // =====================================================
  // NUEVO: DETECTAR INFORMACIÓN PENDIENTE
  // =====================================================

  const normalizeValue = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ");

  const missingValues = [
    "",
    "-",
    "n/a",
    "na",
    "none",
    "null",
    "unknown",
    "who knows",
    "tbd",
    "tbc",
    "pendiente",
    "por definir",
    "sin asignar",
    "sin responsable",
    "sin informar",
    "sin informacion",
    "no informado",
    "no informada",
  ];

  const missingOwner = missingValues.includes(normalizeValue(ownerRaw));

  const missingMitigation = missingValues.includes(
    normalizeValue(mitigationRaw),
  );

  // Las advertencias se muestran solamente
  // en impedimentos que siguen activos.

  const managementWarnings = [];

  if (!solved && missingOwner) {
    managementWarnings.push(`
      <span class="pill" style="
        background:#ffe3e3;
        color:#a1192e;
        font-weight:600;
      ">
        Responsable por definir
      </span>
    `);
  }

  if (!solved && missingMitigation) {
    managementWarnings.push(`
      <span class="pill" style="
        background:#fff2d6;
        color:#865000;
        font-weight:600;
      ">
        Mitigación pendiente
      </span>
    `);
  }

  const warningsHtml = managementWarnings.length
    ? `
      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin:8px 0;
      ">
        ${managementWarnings.join("")}
      </div>
    `
    : "";

  // =====================================================
  // ENLACES DE MITIGACIÓN (PASO 5)
  // =====================================================

  const renderMitigation = (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return "No informada.";
    }

    const urlPattern = /https?:\/\/[^\s<>"']+/gi;

    let result = "";
    let cursor = 0;

    for (const match of text.matchAll(urlPattern)) {
      const position = match.index;

      let urlText = match[0];

      const punctuation = urlText.match(/[.,;!?)]*$/)?.[0] || "";

      if (punctuation) {
        urlText = urlText.slice(0, -punctuation.length);
      }

      result += esc(text.slice(cursor, position));

      let safeUrl = "";

      try {
        const parsed = new URL(urlText);

        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeUrl = parsed.href;
        }
      } catch {
        safeUrl = "";
      }

      if (safeUrl) {
        const onlyUrl = text.trim() === match[0];

        const linkLabel = onlyUrl ? "Abrir documento de mitigación ↗" : urlText;

        result += `
          <a
            href="${esc(safeUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir enlace de mitigación"
            style="
              color:#001391;
              font-weight:600;
              text-decoration:underline;
              text-underline-offset:2px;
              overflow-wrap:anywhere;
            "
          >
            ${esc(linkLabel)}
          </a>
        `;
      } else {
        result += esc(urlText);
      }

      result += esc(punctuation);

      cursor = position + match[0].length;
    }

    result += esc(text.slice(cursor));

    return result || esc(text);
  };

  // =====================================================
  // RENDERIZAR TARJETA
  // =====================================================

  return `
    <article class="management-card ${solved ? "done" : ""}">

      <div class="management-card-top">

        <strong>${esc(title)}</strong>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        ">
          ${priorityBadge}
          ${deadlineBadge}
          ${statusBadge}
        </div>

      </div>

      <p>${esc(impact)}</p>

      ${warningsHtml}

      <small>
        <b>País:</b> ${esc(countryLabel)}
        ·
        <b>Owner:</b> ${esc(owner)}
        ·
        <b>Objetivo:</b>
        ${esc(programGovernanceDate(targetDate))}
      </small>

      <small>
        <b>Mitigación:</b>
        ${renderMitigation(mitigation)}
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

/* =========================================================
 * KEY ISSUES · ADMINISTRACIÓN
 * ========================================================= */

const KEY_ISSUES_STATUSES = {
  active: "Activo",
  solved: "Resuelto",
};

let keyIssuesStatusFilter = "active";

function keyIssuesIsSolved(item) {
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const solvedStatuses = [
    "solved",
    "resolved",
    "closed",
    "done",
    "completed",
    "complete",
    "resuelto",
    "resuelta",
    "solucionado",
    "solucionada",
    "finalizado",
    "finalizada",
  ];

  const status = normalize(item?.status || item?.statusKey || item?.state);

  // Modelo nuevo: el estado tiene su propia columna.
  if (status) {
    return solvedStatuses.includes(status);
  }

  // Modelo histórico: "Solved" estaba en severity.
  const legacySeverity = normalize(item?.severity || item?.priority);

  return solvedStatuses.includes(legacySeverity);
}

function keyIssuesCanEdit(programId) {
  const access = getRcsEffectiveAccess(programId);

  return (
    access?.granted === true &&
    access?.role === "editor" &&
    access?.canEdit === true
  );
}

function keyIssuesRenderCard(item, programId) {
  const baseCard = renderProgramImpedimentCard(item);

  if (!keyIssuesCanEdit(programId)) {
    return baseCard;
  }

  const rowIndex = DATA.impediments.indexOf(item);
  const solved = keyIssuesIsSolved(item);

  const actions = `
    <div class="section-actions" style="
      display:flex;
      justify-content:flex-end;
      flex-wrap:wrap;
      margin-top:12px;
      gap:8px;
    ">
      <button
        type="button"
        class="toolbar-btn"
        data-key-issue-edit="${rowIndex}"
      >Editar</button>

      <button
        type="button"
        class="toolbar-btn"
        data-key-issue-toggle="${rowIndex}"
      >${solved ? "Reabrir" : "Resolver"}</button>
    </div>
  `;

  return baseCard.replace("</article>", `${actions}</article>`);
}

function keyIssuesOpenEditor(programId, item = null) {
  if (!keyIssuesCanEdit(programId)) {
    return;
  }

  document.querySelector("#keyIssuesEditorOverlay")?.remove();

  const context = programGovernanceImpedimentRouteContext(programId);
  const originalIssue = item ? { ...item } : null;

  const rawCountry = item
    ? item.country || item["RtC Anchor Country"] || "ALL"
    : context.countryScope;

  const country = programGovernanceNormalizeCountryScope(rawCountry);
  const rowIndex = item ? DATA.impediments.indexOf(item) : -1;
  const draftId = String(item?.id || "").trim() || keyIssuesGenerateId();
  const esc = programGovernanceEscape;

  const countryOptions = [
    { id: "ALL", label: "Global" },
    ...COUNTRIES.filter((c) => c.id !== "HL"),
  ];

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ");

  const missingValues = new Set([
    "",
    "-",
    "n/a",
    "na",
    "none",
    "null",
    "unknown",
    "who knows",
    "tbd",
    "tbc",
    "pendiente",
    "por definir",
    "sin asignar",
    "sin responsable",
    "sin informar",
    "sin informacion",
    "no informado",
    "no informada",
  ]);

  const rawSeverity = normalize(item?.severity || item?.priority || "");

  const severityMapping = {
    alta: "high",
    high: "high",
    critical: "high",
    critica: "high",
    media: "medium",
    medium: "medium",
    moderate: "medium",
    moderada: "medium",
    baja: "low",
    low: "low",
  };

  const severity = item ? severityMapping[rawSeverity] || "" : "medium";

  const dateSource = String(
    item?.targetResolutionDate || item?.targetDate || item?.dueDate || "",
  );

  const dateMatch = dateSource.match(/^\d{4}-\d{2}-\d{2}/);
  const dateValue = dateMatch ? dateMatch[0] : "";

  const currentStatus = item && keyIssuesIsSolved(item) ? "solved" : "active";

  // =====================================================
  // ESTILOS COMPARTIDOS
  // =====================================================

  const inputStyle = `
    width:100%;
    padding:11px;
    border:1px solid #d7e2f2;
    border-radius:9px;
    box-sizing:border-box;
    background:#ffffff;
    color:#001391;
    font-family:inherit;
    font-size:13px;
  `;

  const labelStyle = `
    display:grid;
    gap:6px;
    color:#001391;
    font-size:13px;
  `;

  // =====================================================
  // VENTANA MODAL
  // =====================================================

  const overlay = document.createElement("div");

  overlay.id = "keyIssuesEditorOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "keyIssuesEditorTitle");

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10001",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box",
    background: "rgba(7,27,77,.55)",
  });

  // El formulario tiene tres zonas:
  // 1. Cabecera fija
  // 2. Contenido desplazable
  // 3. Pie fijo con acciones

  overlay.innerHTML = `
    <form
      id="keyIssuesEditorForm"
      style="
        width:min(650px,100%);
        height:min(760px,calc(100vh - 32px));
        max-height:calc(100vh - 32px);
        display:flex;
        flex-direction:column;
        background:#ffffff;
        border-radius:22px;
        overflow:hidden;
        box-sizing:border-box;
        box-shadow:0 20px 60px rgba(0,0,0,.2);
        font-family:inherit;
      "
    >

      <!-- ============================================
           CABECERA FIJA
           ============================================ -->

      <header style="
        flex:0 0 auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:20px 24px;
        border-bottom:1px solid #e5edf7;
        background:#ffffff;
      ">

        <h2
          id="keyIssuesEditorTitle"
          style="
            margin:0;
            color:#001391;
            font-size:23px;
            line-height:1.2;
          "
        >
          ${item ? "Editar Key Issue" : "Nuevo Key Issue"}
        </h2>

        <span style="
          flex-shrink:0;
          padding:6px 12px;
          border-radius:20px;
          background:${currentStatus === "solved" ? "#def7ec" : "#eaf1ff"};
          color:${currentStatus === "solved" ? "#08744f" : "#001391"};
          font-size:12px;
          font-weight:700;
        ">
          ${currentStatus === "solved" ? "Resuelto" : "Activo"}
        </span>

      </header>

      <!-- ============================================
           ZONA CENTRAL DESPLAZABLE
           ============================================ -->

      <div
        id="keyIssuesFormBody"
        style="
          flex:1 1 auto;
          min-height:0;
          overflow-y:auto;
          overscroll-behavior:contain;
          padding:20px 24px 28px;
          box-sizing:border-box;
        "
      >

        <!-- RESUMEN DE GESTIÓN -->

        <div
          id="keyIssuesManagementSummary"
          role="status"
          aria-live="polite"
          style="
            padding:13px 16px;
            border-radius:12px;
            margin-bottom:20px;
            font-size:13px;
            line-height:1.5;
          "
        ></div>

        <div style="display:grid;gap:17px">

          <!-- TÍTULO -->

          <label style="${labelStyle}">
            <strong>Título *</strong>

            <input
              name="title"
              required
              maxlength="250"
              value="${esc(item?.title || item?.name || "")}"
              placeholder="Nombre del impedimento"
              style="${inputStyle}"
            >
          </label>

          <!-- PAÍS -->

          <label style="${labelStyle}">
            <strong>País</strong>

            <select
              name="country"
              style="${inputStyle}"
            >
              ${countryOptions
                .map(
                  (c) => `
                <option
                  value="${esc(c.id)}"
                  ${c.id === country ? "selected" : ""}
                >
                  ${esc(c.label)}
                </option>
              `,
                )
                .join("")}
            </select>
          </label>

          <!-- IMPACTO -->

          <label style="${labelStyle}">
            <strong>Impacto</strong>

            <textarea
              name="impact"
              rows="3"
              placeholder="Describe el impacto en el programa..."
              style="
                ${inputStyle}
                resize:vertical;
              "
            >${esc(item?.impact || item?.description || "")}</textarea>
          </label>

          <!-- RESPONSABLE -->

          <div style="display:grid;gap:6px">

            <label
              for="keyIssuesOwnerInput"
              style="
                color:#001391;
                font-size:13px;
              "
            >
              <strong>Responsable</strong>
            </label>

            <input
              id="keyIssuesOwnerInput"
              name="owner"
              value="${esc(item?.owner || "")}"
              placeholder="Responsable del impedimento"
              aria-describedby="keyIssuesOwnerHint"
              style="${inputStyle}"
            >

            <small
              id="keyIssuesOwnerHint"
              style="
                font-size:12px;
                line-height:1.4;
              "
            ></small>

          </div>

          <!-- PRIORIDAD -->

          <label style="${labelStyle}">
            <strong>Prioridad</strong>

            <select
              name="severity"
              style="${inputStyle}"
            >
              <option
                value=""
                ${severity === "" ? "selected" : ""}
              >
                Sin prioridad definida
              </option>

              <option
                value="high"
                ${severity === "high" ? "selected" : ""}
              >
                Alta
              </option>

              <option
                value="medium"
                ${severity === "medium" ? "selected" : ""}
              >
                Media
              </option>

              <option
                value="low"
                ${severity === "low" ? "selected" : ""}
              >
                Baja
              </option>
            </select>
          </label>

          <!-- FECHA OBJETIVO -->

          <label style="${labelStyle}">
            <strong>Fecha objetivo</strong>

            <input
              name="targetResolutionDate"
              type="date"
              value="${esc(dateValue)}"
              style="${inputStyle}"
            >
          </label>

          <!-- MITIGACIÓN -->

          <div style="display:grid;gap:6px">

            <label
              for="keyIssuesMitigationInput"
              style="
                color:#001391;
                font-size:13px;
              "
            >
              <strong>Mitigación</strong>
            </label>

            <textarea
              id="keyIssuesMitigationInput"
              name="mitigation"
              rows="4"
              placeholder="Describe la acción necesaria para resolver el impedimento..."
              aria-describedby="keyIssuesMitigationHint"
              style="
                ${inputStyle}
                resize:vertical;
              "
            >${esc(item?.mitigation || item?.action || "")}</textarea>

            <small
              id="keyIssuesMitigationHint"
              style="
                font-size:12px;
                line-height:1.4;
              "
            ></small>

          </div>

        </div>

      </div>

      <!-- ============================================
           PIE FIJO CON ACCIONES
           ============================================ -->

      <footer style="
        flex:0 0 auto;
        display:flex;
        flex-direction:column;
        gap:10px;
        padding:14px 24px;
        background:#ffffff;
        border-top:1px solid #e5edf7;
        box-shadow:0 -4px 14px rgba(0,19,145,.04);
      ">

        <p
          id="keyIssuesEditorMessage"
          role="status"
          aria-live="polite"
          style="
            color:#60708f;
            margin:0;
            font-size:12px;
          "
        ></p>

        <div class="section-actions" style="
          display:flex;
          justify-content:flex-end;
          align-items:center;
          flex-wrap:wrap;
          gap:10px;
        ">

          <button
            type="button"
            class="toolbar-btn"
            id="keyIssuesCancel"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="toolbar-btn primary"
            id="keyIssuesSave"
          >
            Guardar cambios
          </button>

        </div>

      </footer>

    </form>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector("#keyIssuesEditorForm");

  const ownerInput = form.querySelector('[name="owner"]');

  const mitigationInput = form.querySelector('[name="mitigation"]');

  const ownerHint = form.querySelector("#keyIssuesOwnerHint");

  const mitigationHint = form.querySelector("#keyIssuesMitigationHint");

  const managementSummary = form.querySelector("#keyIssuesManagementSummary");

  const cancelButton = overlay.querySelector("#keyIssuesCancel");

  const saveButton = overlay.querySelector("#keyIssuesSave");

  const message = overlay.querySelector("#keyIssuesEditorMessage");

  // =====================================================
  // VALIDACIÓN VISUAL EN TIEMPO REAL
  // =====================================================

  const updateManagementGuidance = () => {
    const missingOwner = missingValues.has(normalize(ownerInput.value));

    const missingMitigation = missingValues.has(
      normalize(mitigationInput.value),
    );

    const highlightOwner = currentStatus !== "solved" && missingOwner;

    const highlightMitigation = currentStatus !== "solved" && missingMitigation;

    ownerInput.style.borderColor = highlightOwner ? "#d93040" : "#d7e2f2";

    ownerInput.style.background = highlightOwner ? "#fff8f8" : "#ffffff";

    ownerInput.setAttribute("aria-invalid", String(highlightOwner));

    ownerHint.textContent = highlightOwner
      ? "Responsable por definir. Indica quién debe gestionar este impedimento."
      : "";

    ownerHint.style.color = "#b42332";

    mitigationInput.style.borderColor = highlightMitigation
      ? "#c88912"
      : "#d7e2f2";

    mitigationInput.style.background = highlightMitigation
      ? "#fffcf4"
      : "#ffffff";

    mitigationInput.setAttribute("aria-invalid", String(highlightMitigation));

    mitigationHint.textContent = highlightMitigation
      ? "Mitigación pendiente. Describe la acción para resolver el impedimento."
      : "";

    mitigationHint.style.color = "#946200";

    if (currentStatus === "solved") {
      managementSummary.style.background = "#def7ec";
      managementSummary.style.color = "#08744f";

      managementSummary.textContent =
        "Este impedimento está resuelto. Puedes consultar o actualizar su información.";

      return;
    }

    const pending = [];

    if (missingOwner) {
      pending.push("responsable");
    }

    if (missingMitigation) {
      pending.push("mitigación");
    }

    if (pending.length === 0) {
      managementSummary.style.background = "#def7ec";
      managementSummary.style.color = "#08744f";

      managementSummary.textContent =
        "✓ Información de gestión completa: responsable y mitigación informados.";

      return;
    }

    managementSummary.style.background = "#fff2d6";
    managementSummary.style.color = "#865000";

    managementSummary.textContent =
      "Información pendiente: " +
      pending.join(" y ") +
      ". Completa estos campos para mejorar el seguimiento.";
  };

  ownerInput.addEventListener("input", updateManagementGuidance);

  mitigationInput.addEventListener("input", updateManagementGuidance);

  updateManagementGuidance();

  // =====================================================
  // CERRAR FORMULARIO
  // =====================================================

  const closeEditor = () => {
    if (!saveButton.disabled) {
      overlay.remove();
    }
  };

  cancelButton.addEventListener("click", closeEditor);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeEditor();
    }
  });

  // NUEVO: cerrar con Escape.
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !saveButton.disabled) {
      event.preventDefault();
      event.stopPropagation();
      closeEditor();
    }
  });

  // Situar el foco dentro del formulario al abrirlo.
  form.querySelector('[name="title"]')?.focus({
    preventScroll: true,
  });

  // =====================================================
  // GUARDAR CAMBIOS
  // =====================================================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton.disabled) {
      return;
    }

    if (!form.reportValidity()) {
      return;
    }

    const values = new FormData(form);

    const issue = {
      id: draftId,
      programId,

      title: String(values.get("title") || "").trim(),

      country:
        values.get("country") === "ALL"
          ? ""
          : String(values.get("country") || ""),

      impact: String(values.get("impact") || "").trim(),

      owner: String(values.get("owner") || "").trim(),

      severity: String(values.get("severity") ?? ""),

      mitigation: String(values.get("mitigation") || "").trim(),

      targetResolutionDate: String(values.get("targetResolutionDate") || ""),

      status: currentStatus,
    };

    saveButton.disabled = true;
    cancelButton.disabled = true;

    saveButton.textContent = "Verificando...";

    message.textContent = "Guardando y verificando cambios en el origen...";

    try {
      const result = await keyIssuesPersist(programId, {
        operation: item ? "update" : "create",
        rowIndex,
        originalIssue,
        issue,
      });

      await keyIssuesReload(programId, result.rows);

      overlay.remove();
    } catch (error) {
      message.textContent =
        error?.message || "No se pudo verificar el guardado.";

      saveButton.disabled = false;
      cancelButton.disabled = false;

      saveButton.textContent = "Guardar cambios";
    }
  });
}

async function keyIssuesPersist(programId, payload) {
  if (!keyIssuesCanEdit(programId)) {
    throw new Error("No tienes permisos de edición.");
  }

  const source = getProgramSource(programId);

  if (!source?.driveJsonUrl) {
    throw new Error("No existe origen de escritura configurado.");
  }

  const operation = String(payload?.operation || "").trim();

  if (!["create", "update"].includes(operation)) {
    throw new Error("Operación no válida.");
  }

  if (operation === "update" && !payload.originalIssue) {
    throw new Error(
      "No se dispone del registro original. Actualiza la pantalla.",
    );
  }

  const issue = {
    ...payload.issue,
    id: String(payload.issue?.id || "").trim() || keyIssuesGenerateId(),
    programId,
  };

  const endpoint = new URL(source.driveJsonUrl, window.location.href);

  ["callback", "_", "dataset", "action"].forEach((param) =>
    endpoint.searchParams.delete(param),
  );

  await fetch(endpoint.toString(), {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify({
      action: "manage-key-issue",
      programId,
      operation,
      rowIndex: payload.rowIndex,
      originalIssue: payload.originalIssue || null,
      issue,
    }),
  });

  const verificationUrl = new URL(source.driveJsonUrl, window.location.href);

  ["callback", "_", "dataset"].forEach((param) =>
    verificationUrl.searchParams.delete(param),
  );

  verificationUrl.searchParams.set("action", "snapshot");

  const text = (value) => String(value ?? "").trim();

  const normalized = (value) =>
    text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const severity = (value) => {
    const key = normalized(value);

    if (
      [
        "",
        "solved",
        "resolved",
        "closed",
        "done",
        "completed",
        "complete",
        "resuelto",
        "resuelta",
        "solucionado",
        "solucionada",
        "finalizado",
        "finalizada",
      ].includes(key)
    ) {
      return "";
    }

    if (["high", "critical", "alta", "critica"].includes(key)) {
      return "high";
    }

    if (["medium", "media", "moderate", "moderada"].includes(key)) {
      return "medium";
    }

    if (["low", "baja"].includes(key)) {
      return "low";
    }

    return `invalid:${key}`;
  };

  const status = (value) => {
    const key = normalized(value);

    return [
      "solved",
      "resolved",
      "closed",
      "done",
      "completed",
      "complete",
      "resuelto",
      "resuelta",
      "solucionado",
      "solucionada",
      "finalizado",
      "finalizada",
    ].includes(key)
      ? "solved"
      : "active";
  };

  const date = (value) => {
    const match = text(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : "";
  };

  const matchesIssue = (row) => {
    if (text(row.id) !== text(issue.id)) {
      return false;
    }

    return (
      text(row.title || row.name) === text(issue.title) &&
      text(row.country || row["RtC Anchor Country"]).toUpperCase() ===
        text(issue.country).toUpperCase() &&
      text(row.impact || row.description) === text(issue.impact) &&
      text(row.owner) === text(issue.owner) &&
      severity(row.severity || row.priority) === severity(issue.severity) &&
      status(row.status) === status(issue.status) &&
      text(row.mitigation || row.action) === text(issue.mitigation) &&
      date(row.targetResolutionDate || row.targetDate || row.dueDate) ===
        date(issue.targetResolutionDate)
    );
  };

  const maxAttempts = 10;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1400);
      });
    }

    try {
      const response = await loadJsonp(verificationUrl.toString(), {
        timeoutMs: 30000,
        retries: 0,
        cacheBust: true,
      });

      if (response?.ok !== true) {
        throw new Error(response?.error || "Error al consultar el snapshot.");
      }

      if (!Array.isArray(response.impediments)) {
        throw new Error(
          "El snapshot no contiene la colección de impedimentos.",
        );
      }

      const matches = response.impediments.filter(matchesIssue);

      if (matches.length === 1) {
        return {
          verified: true,
          issue: matches[0],
          rows: response.impediments,
        };
      }

      lastError = new Error("El snapshot todavía no refleja los cambios.");
    } catch (error) {
      lastError = error;

      console.warn(
        `[Key Issues] Verificación ${attempt}/${maxAttempts}`,
        error,
      );
    }
  }

  throw new Error(
    "No se ha podido confirmar el guardado. " +
      "La operación podría haberse completado. " +
      "Actualiza los datos antes de volver a intentarlo." +
      (lastError?.message ? ` Detalle: ${lastError.message}` : ""),
  );
}

async function keyIssuesReload(programId, persistedRows) {
  if (!Array.isArray(persistedRows)) {
    throw new Error("No hay datos verificados para actualizar Key Issues.");
  }

  const normalizedProgramId = String(programId || "")
    .trim()
    .toLowerCase();

  const rows = persistedRows.map((row) => ({
    ...row,
    programId: row.programId || normalizedProgramId,
  }));

  DATA.impediments = rows;

  if (PROGRAM_DATA_CACHE.has(normalizedProgramId)) {
    const cached = PROGRAM_DATA_CACHE.get(normalizedProgramId);

    const updated = {
      ...cached,
      impediments: rows,
    };

    PROGRAM_DATA_CACHE.set(normalizedProgramId, updated);

    try {
      if (typeof writeRcsSessionCache === "function") {
        writeRcsSessionCache(
          "program",
          normalizedProgramId,
          updated,
          PROGRAM_LAST_LOADED_AT.get(normalizedProgramId) || new Date(),
        );
      }
    } catch (error) {
      console.warn(
        "[Key Issues] No se pudo actualizar la caché de sesión.",
        error,
      );
    }
  }

  if (typeof updateFlightDeckKeyIssueMetrics === "function") {
    updateFlightDeckKeyIssueMetrics(normalizedProgramId);
  }

  renderImpediments(normalizedProgramId);
}

async function keyIssuesToggleSolved(programId, item) {
  if (!keyIssuesCanEdit(programId)) {
    return;
  }

  if (document.querySelector("#keyIssuesActionFeedback[data-busy]")) {
    return;
  }

  const solved = keyIssuesIsSolved(item);
  const nextStatus = solved ? "active" : "solved";

  const confirmed = window.confirm(
    solved
      ? "¿Quieres reabrir este Key Issue?"
      : "¿Quieres marcar este Key Issue como resuelto?",
  );

  if (!confirmed) {
    return;
  }

  const rowIndex = DATA.impediments.indexOf(item);

  const actionButton = document.querySelector(
    `[data-key-issue-toggle="${rowIndex}"]`,
  );

  const actionButtons = [
    ...document.querySelectorAll(
      "[data-key-issue-toggle], [data-key-issue-edit]",
    ),
  ];

  actionButtons.forEach((button) => {
    button.disabled = true;
    button.style.opacity = "0.55";
    button.style.cursor = "wait";
  });

  if (actionButton) {
    actionButton.textContent = solved ? "Reabriendo..." : "Resolviendo...";

    actionButton.setAttribute("aria-busy", "true");
  }

  const feedback = document.createElement("div");

  feedback.id = "keyIssuesActionFeedback";
  feedback.dataset.busy = "true";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  Object.assign(feedback.style, {
    position: "fixed",
    bottom: "28px",
    right: "28px",
    zIndex: "10002",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 22px",
    borderRadius: "16px",
    background: "#001391",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "0 12px 36px rgba(0,19,145,.25)",
    maxWidth: "420px",
  });

  feedback.innerHTML = `
    <span style="
      width:20px;
      height:20px;
      border:3px solid rgba(255,255,255,.3);
      border-top-color:#ffffff;
      border-radius:50%;
      animation:keyIssuesSpin .8s linear infinite;
      flex-shrink:0;
    "></span>

    <span>
      <strong>
        ${solved ? "Reabriendo" : "Resolviendo"} Key Issue...
      </strong>
      <small style="
        display:block;
        margin-top:4px;
        font-weight:400;
        opacity:.85;
      ">
        Guardando y verificando cambios.
        Espera unos segundos...
      </small>
    </span>
  `;

  if (!document.querySelector("#keyIssuesSpinnerStyle")) {
    const style = document.createElement("style");
    style.id = "keyIssuesSpinnerStyle";
    style.textContent = `
      @keyframes keyIssuesSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(feedback);

  const normalized = String(item.severity || item.priority || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const priorityMap = {
    high: "high",
    alta: "high",
    critical: "high",
    critica: "high",
    medium: "medium",
    media: "medium",
    moderate: "medium",
    moderada: "medium",
    low: "low",
    baja: "low",
  };

  const severity = priorityMap[normalized] || "";

  const originalIssue = { ...item };

  const issue = {
    ...item,
    id: String(item.id || "").trim() || keyIssuesGenerateId(),
    programId,
    title: item.title || item.name || "",
    country: item.country || item["RtC Anchor Country"] || "",
    impact: item.impact || item.description || "",
    owner: item.owner || "",
    severity,
    mitigation: item.mitigation || item.action || "",
    targetResolutionDate:
      item.targetResolutionDate || item.targetDate || item.dueDate || "",
    status: nextStatus,
  };

  let completed = false;

  try {
    const result = await keyIssuesPersist(programId, {
      operation: "update",
      rowIndex,
      originalIssue,
      issue,
    });

    await keyIssuesReload(programId, result.rows);

    completed = true;

    feedback.removeAttribute("data-busy");
    feedback.style.background = "#08744f";

    feedback.innerHTML = `
      <span style="font-size:22px">✓</span>
      <span>
        <strong>
          Key Issue ${solved ? "reabierto" : "resuelto"}
          correctamente
        </strong>
        <small style="
          display:block;
          margin-top:4px;
          font-weight:400;
          opacity:.85;
        ">
          Los cambios se han guardado y verificado.
        </small>
      </span>
    `;

    window.setTimeout(() => {
      feedback.remove();
    }, 2500);
  } catch (error) {
    feedback.removeAttribute("data-busy");
    feedback.style.background = "#a92b2b";

    const message = document.createElement("span");
    message.textContent =
      error?.message || "No se pudo verificar la operación.";

    feedback.replaceChildren(message);

    window.setTimeout(() => {
      feedback.remove();
    }, 8000);
  } finally {
    if (!completed) {
      actionButtons.forEach((button) => {
        if (!button.isConnected) {
          return;
        }

        button.disabled = false;
        button.style.opacity = "";
        button.style.cursor = "";
      });

      if (actionButton?.isConnected) {
        actionButton.textContent = solved ? "Reabrir" : "Resolver";

        actionButton.removeAttribute("aria-busy");
      }
    }
  }
}

renderImpediments = function renderManagedKeyIssues(programId) {
  const program = programGovernanceProgram(programId);

  if (!program) {
    renderLanding();
    return;
  }

  const context = programGovernanceImpedimentRouteContext(programId);
  const countryScope = context.countryScope;
  const countryMeta = programGovernanceCountryMeta(countryScope);

  const allIssues = programGovernanceImpedimentRows(programId, countryScope);

  const active = allIssues.filter((item) => !keyIssuesIsSolved(item));

  const solved = allIssues.filter(keyIssuesIsSolved);

  // =====================================================
  // FECHAS
  // =====================================================

  const now = new Date();

  const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const getTargetDay = (item) => {
    const value =
      item.targetResolutionDate || item.targetDate || item.dueDate || "";

    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const text = String(value).trim();

    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);

    const spanish = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

    if (!iso && !spanish) return null;

    const year = Number(iso ? iso[1] : spanish[3]);
    const month = Number(iso ? iso[2] : spanish[2]);
    const day = Number(iso ? iso[3] : spanish[1]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return Date.UTC(year, month - 1, day);
  };

  // =====================================================
  // PRIORIDAD
  // =====================================================

  const getSeverityRank = (item) => {
    const severity = String(item.severity || item.priority || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (["critical", "critica", "high", "alta"].includes(severity)) {
      return 0;
    }

    if (["medium", "media", "moderate", "moderada"].includes(severity)) {
      return 1;
    }

    if (["low", "baja"].includes(severity)) {
      return 2;
    }

    return 3;
  };

  // =====================================================
  // GESTIÓN PENDIENTE
  // =====================================================

  const normalizeValue = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ");

  const missingValues = new Set([
    "",
    "-",
    "n/a",
    "na",
    "none",
    "null",
    "unknown",
    "who knows",
    "tbd",
    "tbc",
    "pendiente",
    "por definir",
    "sin asignar",
    "sin responsable",
    "sin informar",
    "sin informacion",
    "no informado",
    "no informada",
  ]);

  const getManagementAlerts = (item) => {
    const alerts = [];

    if (missingValues.has(normalizeValue(item.owner))) {
      alerts.push("Responsable por definir");
    }

    if (
      missingValues.has(normalizeValue(item.mitigation || item.action || ""))
    ) {
      alerts.push("Mitigación pendiente");
    }

    return alerts;
  };

  // =====================================================
  // CLASIFICACIÓN Y ORDEN
  // =====================================================

  const activeEntries = active.map((item, index) => {
    const target = getTargetDay(item);

    const daysRemaining =
      target === null ? null : Math.round((target - todayDay) / 86400000);

    const urgency =
      daysRemaining === null
        ? 3
        : daysRemaining < 0
          ? 0
          : daysRemaining <= 7
            ? 1
            : 2;

    return {
      item,
      index,
      target,
      daysRemaining,
      urgency,
      severity: getSeverityRank(item),
      managementPending: getManagementAlerts(item).length > 0,
    };
  });

  // Orden validado:
  // 1. Grupo de vencimiento
  // 2. Prioridad Alta, Media, Baja
  // 3. Fecha objetivo
  // 4. Orden original

  const sortedEntries = [...activeEntries].sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return a.urgency - b.urgency;
    }

    if (a.severity !== b.severity) {
      return a.severity - b.severity;
    }

    if (a.target !== null && b.target !== null && a.target !== b.target) {
      return a.target - b.target;
    }

    return a.index - b.index;
  });

  const sortedActive = sortedEntries.map((entry) => entry.item);

  // =====================================================
  // INDICADORES
  // =====================================================

  const overdueCount = activeEntries.filter(
    (entry) => entry.daysRemaining !== null && entry.daysRemaining < 0,
  ).length;

  const dueSoonCount = activeEntries.filter(
    (entry) =>
      entry.daysRemaining !== null &&
      entry.daysRemaining >= 0 &&
      entry.daysRemaining <= 7,
  ).length;

  const highPriorityCount = activeEntries.filter(
    (entry) => entry.severity === 0,
  ).length;

  const managementPendingCount = activeEntries.filter(
    (entry) => entry.managementPending,
  ).length;

  // =====================================================
  // ESTADO DE FILTROS Y BÚSQUEDA
  // =====================================================

  const validQuickFilters = ["active", "overdue", "soon", "high", "management"];

  const scopeKey = [programId, context.productId, countryScope].join("|");

  if (renderImpediments.keyIssuesQuickScope !== scopeKey) {
    renderImpediments.keyIssuesQuickScope = scopeKey;
    renderImpediments.keyIssuesQuickFilter = "active";
    renderImpediments.keyIssuesSearchQuery = "";
  }

  const quickFilter = validQuickFilters.includes(
    renderImpediments.keyIssuesQuickFilter,
  )
    ? renderImpediments.keyIssuesQuickFilter
    : "active";

  const filteredActive = sortedEntries
    .filter((entry) => {
      switch (quickFilter) {
        case "overdue":
          return entry.daysRemaining !== null && entry.daysRemaining < 0;

        case "soon":
          return (
            entry.daysRemaining !== null &&
            entry.daysRemaining >= 0 &&
            entry.daysRemaining <= 7
          );

        case "high":
          return entry.severity === 0;

        case "management":
          return entry.managementPending;

        default:
          return true;
      }
    })
    .map((entry) => entry.item);

  const visibleIssues =
    keyIssuesStatusFilter === "active"
      ? filteredActive
      : keyIssuesStatusFilter === "solved"
        ? solved
        : [...sortedActive, ...solved];

  // =====================================================
  // CABECERA
  // =====================================================

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

  if (!container) return;

  const parent = container.parentElement;

  container.insertAdjacentHTML(
    "beforebegin",
    programGovernanceRenderCountrySelector(
      programId,
      context.productId,
      countryScope,
    ),
  );

  // =====================================================
  // KPI INTERACTIVOS
  // =====================================================

  const summary = document.createElement("section");

  summary.setAttribute("aria-label", "Resumen de impedimentos activos");

  summary.style.cssText = `
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
    gap:12px;
    margin:18px 0 8px;
  `;

  const metrics = [
    {
      key: "active",
      label: "Activos",
      value: active.length,
      color: "#001391",
    },
    {
      key: "overdue",
      label: "Vencidos",
      value: overdueCount,
      color: "#b42332",
    },
    {
      key: "soon",
      label: "Vencen en 7 días",
      value: dueSoonCount,
      color: "#946200",
    },
    {
      key: "high",
      label: "Prioridad alta",
      value: highPriorityCount,
      color: "#001391",
    },
    {
      key: "management",
      label: "Gestión pendiente",
      value: managementPendingCount,
      color: "#a04e00",
    },
  ];

  summary.innerHTML = metrics
    .map(({ key, label, value, color }) => {
      const selected =
        keyIssuesStatusFilter === "active" && quickFilter === key;

      return `
        <button
          type="button"
          data-issue-quick-filter="${key}"
          aria-pressed="${selected}"
          aria-label="${label}: ${value}. Filtrar impedimentos"
          style="
            display:block;
            width:100%;
            min-height:94px;
            padding:16px 18px;
            text-align:left;
            font-family:inherit;
            background:${selected ? "#f1f5ff" : "#fff"};
            border:2px solid ${selected ? "#001391" : "#d7e2f2"};
            border-radius:16px;
            box-sizing:border-box;
            cursor:pointer;
            transition:border-color .15s,background .15s;
          "
        >
          <div style="
            font-size:13px;
            color:#53688c;
            margin-bottom:6px;
          ">
            ${label}
          </div>

          <strong style="
            font-size:30px;
            line-height:1;
            color:${color};
          ">
            ${value}
          </strong>
        </button>
      `;
    })
    .join("");

  parent.insertBefore(summary, container);

  // =====================================================
  // BARRA DE FILTROS Y EXPORTACIÓN
  // =====================================================

  const toolbar = document.createElement("div");

  toolbar.className = "section-header";

  toolbar.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
    margin:16px 0;
  `;

  toolbar.innerHTML = `
    <div class="section-actions" style="flex-wrap:wrap">

      <button
        type="button"
        class="toolbar-btn"
        data-issue-filter="active"
      >
        Activos (${active.length})
      </button>

      <button
        type="button"
        class="toolbar-btn"
        data-issue-filter="solved"
      >
        Resueltos (${solved.length})
      </button>

      <button
        type="button"
        class="toolbar-btn"
        data-issue-filter="all"
      >
        Todos (${allIssues.length})
      </button>

    </div>

    <div class="section-actions" style="
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    ">

      <button
        type="button"
        class="toolbar-btn"
        id="keyIssuesExport"
        title="Exportar los impedimentos visibles a CSV"
      >
        Exportar CSV
      </button>

      ${
        keyIssuesCanEdit(programId)
          ? `
            <button
              type="button"
              class="toolbar-btn primary"
              id="keyIssuesCreate"
            >
              + Nuevo Key Issue
            </button>
          `
          : ""
      }

    </div>
  `;

  parent.insertBefore(toolbar, container);

  // =====================================================
  // BUSCADOR
  // =====================================================

  const searchBar = document.createElement("div");

  searchBar.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    flex-wrap:wrap;
    margin:4px 0 14px;
  `;

  const searchInput = document.createElement("input");

  searchInput.type = "search";

  searchInput.placeholder =
    "Buscar por título, responsable, país, impacto o mitigación...";

  searchInput.setAttribute("aria-label", "Buscar impedimentos");

  searchInput.autocomplete = "off";

  searchInput.value = String(renderImpediments.keyIssuesSearchQuery || "");

  searchInput.style.cssText = `
    flex:1 1 340px;
    max-width:620px;
    min-width:0;
    height:42px;
    padding:10px 14px;
    background:#fff;
    border:1px solid #d7e2f2;
    border-radius:12px;
    color:#001391;
    font-family:inherit;
    font-size:13px;
    outline-offset:2px;
    box-sizing:border-box;
  `;

  const searchCounter = document.createElement("span");

  searchCounter.setAttribute("role", "status");
  searchCounter.setAttribute("aria-live", "polite");

  searchCounter.style.cssText = `
    color:#53688c;
    font-size:12px;
    white-space:nowrap;
  `;

  searchBar.append(searchInput, searchCounter);

  parent.insertBefore(searchBar, container);

  // =====================================================
  // FILTRADO POR TEXTO
  // =====================================================

  const normalizeSearch = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const matchesSearch = (item, query) => {
    if (!query) return true;

    const searchableText = normalizeSearch(
      [
        item.title,
        item.name,
        item.owner,
        item.impact,
        item.description,
        item.mitigation,
        item.action,
        item.country,
        item["RtC Anchor Country"],
        programGovernanceImpedimentCountryLabel(item),
        programGovernanceSeverityLabel(item.severity || item.priority || ""),
        item.targetResolutionDate,
        item.targetDate,
        item.dueDate,
      ]
        .filter(Boolean)
        .join(" "),
    );

    return query.split(" ").every((word) => searchableText.includes(word));
  };

  // =====================================================
  // RENDERIZADO DEL LISTADO
  // =====================================================

  // Esta variable contiene exactamente las filas visibles.
  // Se utilizará también para generar el CSV.

  let displayedIssues = [];

  const exportButton = toolbar.querySelector("#keyIssuesExport");

  const renderIssueList = () => {
    const query = normalizeSearch(renderImpediments.keyIssuesSearchQuery || "");

    displayedIssues = visibleIssues.filter((item) =>
      matchesSearch(item, query),
    );

    searchCounter.textContent =
      `Mostrando ${displayedIssues.length} de ` +
      `${visibleIssues.length} impedimentos`;

    exportButton.disabled = displayedIssues.length === 0;

    exportButton.title = displayedIssues.length
      ? `Exportar ${displayedIssues.length} impedimentos`
      : "No hay impedimentos para exportar";

    container.innerHTML = displayedIssues.length
      ? displayedIssues
          .map((item) => keyIssuesRenderCard(item, programId))
          .join("")
      : `
        <section class="panel">
          <p class="empty-state">
            ${
              visibleIssues.length === 0 && !query
                ? "No hay Key Issues en esta selección."
                : "No se encontraron impedimentos con estos filtros."
            }
          </p>
        </section>
      `;

    // Mantener Editar con los índices originales.
    container.querySelectorAll("[data-key-issue-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const rowIndex = Number(button.dataset.keyIssueEdit);

        const item = DATA.impediments[rowIndex];

        if (item) {
          keyIssuesOpenEditor(programId, item);
        }
      });
    });

    // Mantener Resolver y Reabrir.
    container.querySelectorAll("[data-key-issue-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const rowIndex = Number(button.dataset.keyIssueToggle);

        const item = DATA.impediments[rowIndex];

        if (item) {
          keyIssuesToggleSolved(programId, item);
        }
      });
    });
  };

  // Buscar sin reconstruir toda la pantalla.
  searchInput.addEventListener("input", () => {
    renderImpediments.keyIssuesSearchQuery = searchInput.value;

    renderIssueList();
  });

  // =====================================================
  // NUEVO: EXPORTAR CSV
  // =====================================================

  const exportVisibleIssues = () => {
    if (!displayedIssues.length) return;

    // Excel español: separador punto y coma.
    // UTF-8 con BOM para conservar tildes y eñes.

    const headers = [
      "ID",
      "Título",
      "País",
      "Estado",
      "Prioridad",
      "Responsable",
      "Fecha objetivo",
      "Situación del plazo",
      "Impacto",
      "Mitigación",
      "Gestión pendiente",
    ];

    const getDeadlineStatus = (item) => {
      if (keyIssuesIsSolved(item)) {
        return "Resuelto";
      }

      const target = getTargetDay(item);

      if (target === null) {
        return "Sin fecha objetivo";
      }

      const days = Math.round((target - todayDay) / 86400000);

      if (days < 0) {
        return `Vencido (${Math.abs(days)} días)`;
      }

      if (days === 0) {
        return "Vence hoy";
      }

      if (days <= 7) {
        return `Vence en ${days} días`;
      }

      return "En plazo";
    };

    const getPriorityLabel = (item) => {
      const rank = getSeverityRank(item);

      return ["Alta", "Media", "Baja", "Sin prioridad definida"][rank];
    };

    const getExportDate = (item) => {
      const value =
        item.targetResolutionDate || item.targetDate || item.dueDate || "";

      if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
          return "";
        }

        const year = value.getFullYear();

        const month = String(value.getMonth() + 1).padStart(2, "0");

        const day = String(value.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      }

      return String(value).trim();
    };

    // Evitar que Excel interprete como fórmulas
    // los valores de texto procedentes del origen.
    const csvCell = (value) => {
      const raw = String(value ?? "").replace(/\0/g, "");

      const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

      return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = displayedIssues.map((item) => [
      item.id || "",
      item.title || item.name || "",
      programGovernanceImpedimentCountryLabel(item),
      keyIssuesIsSolved(item) ? "Resuelto" : "Activo",
      getPriorityLabel(item),
      item.owner || "",
      getExportDate(item),
      getDeadlineStatus(item),
      item.impact || item.description || "",
      item.mitigation || item.action || "",
      keyIssuesIsSolved(item) ? "" : getManagementAlerts(item).join("; "),
    ]);

    const csv = [
      headers.map(csvCell).join(";"),
      ...rows.map((row) => row.map(csvCell).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const objectUrl = URL.createObjectURL(blob);

    const pad = (value) => String(value).padStart(2, "0");

    const exportDate = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("-");

    const safeProgram = String(programId).replace(/[^a-z0-9_-]/gi, "-");

    const safeCountry = String(countryScope).replace(/[^a-z0-9_-]/gi, "-");

    const fileName =
      `key-issues-${safeProgram}-` + `${safeCountry}-${exportDate}.csv`;

    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  };

  exportButton.addEventListener("click", exportVisibleIssues);

  // =====================================================
  // EVENTOS KPI
  // =====================================================

  summary.querySelectorAll("[data-issue-quick-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.issueQuickFilter;

      const shouldReset =
        keyIssuesStatusFilter === "active" &&
        quickFilter === nextFilter &&
        nextFilter !== "active";

      renderImpediments.keyIssuesQuickFilter = shouldReset
        ? "active"
        : nextFilter;

      keyIssuesStatusFilter = "active";

      renderImpediments(programId);
    });
  });

  // =====================================================
  // EVENTOS ESTADO
  // =====================================================

  toolbar.querySelectorAll("[data-issue-filter]").forEach((button) => {
    if (button.dataset.issueFilter === keyIssuesStatusFilter) {
      button.classList.add("primary");
    }

    button.addEventListener("click", () => {
      keyIssuesStatusFilter = button.dataset.issueFilter;

      renderImpediments.keyIssuesQuickFilter = "active";

      renderImpediments(programId);
    });
  });

  // =====================================================
  // CREAR KEY ISSUE
  // =====================================================

  toolbar.querySelector("#keyIssuesCreate")?.addEventListener("click", () => {
    keyIssuesOpenEditor(programId);
  });

  // =====================================================
  // RENDERIZADO INICIAL
  // =====================================================

  renderIssueList();
};

function keyIssuesGenerateId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return [
    "issue",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 12),
  ].join("-");
}
