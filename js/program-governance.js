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
      "crítica": "Crítica",
      high: "Alta",
      alta: "Alta",
      medium: "Media",
      media: "Media",
      moderate: "Media",
      moderada: "Media",
      low: "Baja",
      baja: "Baja",
    }[severity] || value || "Baja"
  );
}

function programGovernanceConfigureBackButton(programId, programName) {
  const backButton = document.querySelector(".back-to-program-btn");

  if (!backButton) {
    return;
  }

  backButton.dataset.route = `program/${programId}`;
  backButton.textContent = `← Volver a ${programName || "programa"}`;
}

function renderProgramImpedimentCard(item) {
  const title = item.title || item.name || "Impedimento sin título";
  const impact = item.impact || item.description || "Sin impacto informado.";
  const owner = item.owner || "-";
  const targetDate =
    item.targetResolutionDate || item.targetDate || item.dueDate || "";
  const mitigation = item.mitigation || item.action || "No informada.";
  const severity = item.severity || item.priority || "low";

  return `
    <article class="management-card">
      <div class="management-card-top">
        <strong>${programGovernanceEscape(title)}</strong>

        <span class="pill ${programGovernanceSeverityClass(severity)}">
          ${programGovernanceEscape(programGovernanceSeverityLabel(severity))}
        </span>
      </div>

      <p>${programGovernanceEscape(impact)}</p>

      <small>
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

  const countryLabel = programGovernanceCountryLabel();
  const impediments = programGovernanceRows("impediments", programId);

  setHead(
    `${program.name || "Programa"} · Impedimentos`,
    `Bloqueos, riesgos y mitigaciones · ${countryLabel}`,
    `Retail Client Solutions > ${program.name || programId} > ${countryLabel} > Impedimentos`,
  );

  view.innerHTML = "";
  view.append(tpl("#impediments-template"));
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());

  programGovernanceConfigureBackButton(programId, program.name);

  const container = document.querySelector("#impedimentsList");

  if (!container) {
    console.error("No se ha encontrado #impedimentsList en la plantilla.");
    return;
  }

  container.innerHTML = impediments.length
    ? impediments.map(renderProgramImpedimentCard).join("")
    : `
        <section class="panel">
          <p class="empty-state">
            No hay impedimentos registrados para ${programGovernanceEscape(
              countryLabel,
            )}.
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
    ? rows
        .map((item) => renderProgramDecisionCard(item, decisionType))
        .join("")
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
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());

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
