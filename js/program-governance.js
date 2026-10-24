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

  const owner = item.owner || "-";

  const targetDate =
    item.targetResolutionDate || item.targetDate || item.dueDate || "";

  const mitigation = item.mitigation || item.action || "No informada.";

  const countryLabel = programGovernanceImpedimentCountryLabel(item);

  const solved = keyIssuesIsSolved(item);

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
          ${statusBadge}
        </div>
      </div>

      <p>${esc(impact)}</p>

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
        ${esc(mitigation)}
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
      .toLowerCase();

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

  const overlay = document.createElement("div");
  overlay.id = "keyIssuesEditorOverlay";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10001",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    background: "rgba(7,27,77,.55)",
  });

  overlay.innerHTML = `
    <form id="keyIssuesEditorForm" style="
      background:white;
      border-radius:22px;
      padding:26px;
      width:min(650px,100%);
      max-height:90vh;
      overflow:auto;
      box-shadow:0 20px 60px rgba(0,0,0,.2);
    ">
      <h2 style="margin-top:0">
        ${item ? "Editar Key Issue" : "Nuevo Key Issue"}
      </h2>

      <div style="display:grid;gap:14px">

        <label>
          Título *
          <input name="title" required maxlength="250"
            value="${esc(item?.title || item?.name || "")}"
            style="width:100%;padding:10px">
        </label>

        <label>
          País
          <select name="country" style="width:100%;padding:10px">
            ${countryOptions
              .map(
                (c) => `
              <option value="${esc(c.id)}"
                ${c.id === country ? "selected" : ""}>
                ${esc(c.label)}
              </option>
            `,
              )
              .join("")}
          </select>
        </label>

        <label>
          Impacto
          <textarea name="impact" rows="3"
            style="width:100%;padding:10px"
          >${esc(item?.impact || item?.description || "")}</textarea>
        </label>

        <label>
          Responsable
          <input name="owner"
            value="${esc(item?.owner || "")}"
            style="width:100%;padding:10px">
        </label>

        <label>
          Prioridad
          <select name="severity" style="width:100%;padding:10px">
            <option value=""
              ${severity === "" ? "selected" : ""}>
              Sin prioridad definida
            </option>
            <option value="high"
              ${severity === "high" ? "selected" : ""}>
              Alta
            </option>
            <option value="medium"
              ${severity === "medium" ? "selected" : ""}>
              Media
            </option>
            <option value="low"
              ${severity === "low" ? "selected" : ""}>
              Baja
            </option>
          </select>
        </label>

        <label>
          Fecha objetivo
          <input name="targetResolutionDate" type="date"
            value="${esc(dateValue)}"
            style="width:100%;padding:10px">
        </label>

        <label>
          Mitigación
          <textarea name="mitigation" rows="3"
            style="width:100%;padding:10px"
          >${esc(item?.mitigation || item?.action || "")}</textarea>
        </label>

        <p id="keyIssuesEditorMessage"
          role="status"
          style="color:#60708f;margin:0"></p>

        <div class="section-actions"
          style="justify-content:flex-end">
          <button type="button" class="toolbar-btn"
            id="keyIssuesCancel">Cancelar</button>
          <button type="submit" class="toolbar-btn primary"
            id="keyIssuesSave">Guardar cambios</button>
        </div>
      </div>
    </form>
  `;

  document.body.appendChild(overlay);

  const cancelButton = overlay.querySelector("#keyIssuesCancel");
  const saveButton = overlay.querySelector("#keyIssuesSave");

  cancelButton.addEventListener("click", () => overlay.remove());

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && !saveButton.disabled) {
      overlay.remove();
    }
  });

  overlay
    .querySelector("#keyIssuesEditorForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      if (saveButton.disabled) {
        return;
      }

      const form = event.currentTarget;

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

      const message = overlay.querySelector("#keyIssuesEditorMessage");

      saveButton.disabled = true;
      saveButton.textContent = "Verificando...";
      message.textContent = "Guardando cambios en el origen...";

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

  const visibleIssues =
    keyIssuesStatusFilter === "active"
      ? active
      : keyIssuesStatusFilter === "solved"
        ? solved
        : allIssues;

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
    return;
  }

  container.insertAdjacentHTML(
    "beforebegin",
    programGovernanceRenderCountrySelector(
      programId,
      context.productId,
      countryScope,
    ),
  );

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
      <button class="toolbar-btn"
        data-issue-filter="active">
        Activos (${active.length})
      </button>
      <button class="toolbar-btn"
        data-issue-filter="solved">
        Resueltos (${solved.length})
      </button>
      <button class="toolbar-btn"
        data-issue-filter="all">
        Todos (${allIssues.length})
      </button>
    </div>

    ${
      keyIssuesCanEdit(programId)
        ? `
      <button class="toolbar-btn primary"
        id="keyIssuesCreate">
        + Nuevo Key Issue
      </button>
    `
        : ""
    }
  `;

  container.parentElement.insertBefore(toolbar, container);

  toolbar.querySelectorAll("[data-issue-filter]").forEach((button) => {
    if (button.dataset.issueFilter === keyIssuesStatusFilter) {
      button.classList.add("primary");
    }

    button.addEventListener("click", () => {
      keyIssuesStatusFilter = button.dataset.issueFilter;
      renderImpediments(programId);
    });
  });

  toolbar.querySelector("#keyIssuesCreate")?.addEventListener("click", () => {
    keyIssuesOpenEditor(programId);
  });

  container.innerHTML = visibleIssues.length
    ? visibleIssues.map((item) => keyIssuesRenderCard(item, programId)).join("")
    : `<section class="panel">
         <p class="empty-state">
           No hay Key Issues en esta selección.
         </p>
       </section>`;

  container.querySelectorAll("[data-key-issue-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = DATA.impediments[Number(button.dataset.keyIssueEdit)];

      if (item) {
        keyIssuesOpenEditor(programId, item);
      }
    });
  });

  container.querySelectorAll("[data-key-issue-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = DATA.impediments[Number(button.dataset.keyIssueToggle)];

      if (item) {
        keyIssuesToggleSolved(programId, item);
      }
    });
  });
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
