(function portfolioLandingModesFeature() {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getLandingMode() {
    const hash = String(window.location.hash || "")
      .replace(/^#\/?/, "")
      .trim();

    const [routeName, queryString = ""] = hash.split("?");

    if (routeName !== "landing") {
      return "tower";
    }

    const params = new URLSearchParams(queryString);

    return params.get("mode") === "airport" ? "airport" : "tower";
  }

  function getProgramRoute(program) {
    const explicitRoute = String(program?.route || "").trim();

    if (explicitRoute) {
      return explicitRoute;
    }

    const id = String(program?.id || "").trim();

    if (!id) {
      return "";
    }

    return `program/${id}`;
  }
  function isProgramEnabled(program) {
    if (!program) {
      return false;
    }

    const enabled = program.enabled;

    if (enabled === null || enabled === undefined || enabled === "") {
      return false;
    }

    if (typeof enabled === "boolean") {
      return enabled;
    }

    return !new Set(["false", "0", "no", "off", "disabled", "inactivo"]).has(
      String(enabled).trim().toLowerCase(),
    );
  }
  function getProgramStatusLabel(program) {
    const rawStatus = String(
      program?.statusLabel || program?.status || program?.state || "",
    )
      .trim()
      .toLowerCase();

    /*
     * El enabled del portfolio tiene prioridad
     * sobre estados heredados del origen.
     *
     * Un programa no habilitado no debe aparecer
     * visualmente como "En curso" aunque el dato
     * original todavía contenga in_progress.
     */
    if (!isProgramEnabled(program)) {
      if (rawStatus.includes("blocked") || rawStatus.includes("bloqueado")) {
        return "Bloqueado";
      }

      if (rawStatus.includes("discarded") || rawStatus.includes("descartado")) {
        return "No operativo";
      }

      return "Próximamente";
    }

    if (
      rawStatus === "in_progress" ||
      rawStatus === "in progress" ||
      rawStatus === "active" ||
      rawStatus === "activo" ||
      rawStatus.includes("en curso")
    ) {
      return "En curso";
    }

    if (
      rawStatus.includes("planned") ||
      rawStatus.includes("soon") ||
      rawStatus.includes("próxim")
    ) {
      return "Próximamente";
    }

    if (rawStatus.includes("blocked") || rawStatus.includes("bloqueado")) {
      return "Bloqueado";
    }

    if (rawStatus.includes("discarded") || rawStatus.includes("descartado")) {
      return "No operativo";
    }

    return String(
      program?.statusLabel || program?.status || program?.state || "Disponible",
    ).trim();
  }

  function getProgramStatusTone(program) {
    if (!isProgramEnabled(program)) {
      return "inactive";
    }

    const status = getProgramStatusLabel(program).toLowerCase();

    if (status.includes("en curso") || status.includes("activo")) {
      return "live";
    }

    if (status.includes("próxim") || status.includes("plan")) {
      return "planned";
    }

    if (status.includes("bloqueado") || status.includes("no operativo")) {
      return "inactive";
    }

    return "standby";
  }

  function isProgramNavigable(program) {
    return isProgramEnabled(program) && Boolean(getProgramRoute(program));
  }

  function getProgramAction(program) {
    if (!isProgramNavigable(program)) {
      return `
        <div class="portfolio-program-card__idle">
          Programa próximamente disponible
        </div>
      `;
    }

    return `
      <button
        class="portfolio-program-card__action"
        type="button"
        data-route="${escapeHtml(getProgramRoute(program))}"
      >
        Entrar en el programa →
      </button>
    `;
  }

  function renderAircraft747() {
    return `
      <div class="portfolio-747" aria-hidden="true">
        <span class="portfolio-747__body"></span>
        <span class="portfolio-747__nose"></span>
        <span class="portfolio-747__tail"></span>
        <span class="portfolio-747__wing portfolio-747__wing--left"></span>
        <span class="portfolio-747__wing portfolio-747__wing--right"></span>
        <span class="portfolio-747__stab portfolio-747__stab--left"></span>
        <span class="portfolio-747__stab portfolio-747__stab--right"></span>
        <span class="portfolio-747__engine portfolio-747__engine--1"></span>
        <span class="portfolio-747__engine portfolio-747__engine--2"></span>
        <span class="portfolio-747__engine portfolio-747__engine--3"></span>
        <span class="portfolio-747__engine portfolio-747__engine--4"></span>
      </div>
    `;
  }

  function getProgramAircraftImage(program) {
    const defaultImage = "assets/program-aircraft/bbva-747-default.png";

    const rawId = String(
      program?.id || program?.programId || program?.slug || program?.name || "",
    )
      .trim()
      .toLowerCase();

    if (rawId.includes("aixbanker")) {
      return "assets/program-aircraft/bbva-falcon-8x.png";
    }

    if (rawId.includes("interaction") || rawId.includes("orchestration")) {
      return "assets/program-aircraft/bbva-a350.png";
    }

    if (rawId.includes("open") || rawId.includes("market")) {
      return "assets/program-aircraft/bbva-747.png";
    }

    if (rawId.includes("blue")) {
      return "assets/program-aircraft/bbva-747.png";
    }

    return defaultImage;
  }

  function renderTowerCard(program, index) {
    const enabled = isProgramEnabled(program);
    const navigable = isProgramNavigable(program);

    const tone = getProgramStatusTone(program);
    const statusLabel = getProgramStatusLabel(program);

    const flightCode = `RCS-${String(index + 1).padStart(2, "0")}`;

    const gateCode = `GATE ${String(index + 1).padStart(2, "0")}`;

    const routeValue = navigable ? getProgramRoute(program) : "";

    const programName = String(program?.name || "Programa").trim();

    const aircraftImage = getProgramAircraftImage(program);

    return `
    <article
      class="
        portfolio-program-card
        portfolio-program-card--tower
        ${enabled ? "is-operational" : "is-inactive"}
        ${navigable ? "is-navigable" : ""}
        tone-${escapeHtml(tone)}
      "
      ${
        navigable
          ? `
            data-route="${escapeHtml(routeValue)}"
            title="${escapeHtml(`Entrar en ${programName}`)}"
          `
          : ""
      }
    >
      <header
        class="
          portfolio-program-card__strip
        "
      >
        <div
          class="
            portfolio-program-card__meta
          "
        >
          <span
            class="
              portfolio-program-card__eyebrow
            "
          >
            Flight ${escapeHtml(flightCode)}
          </span>

          <span
            class="
              portfolio-program-card__gate
            "
          >
            ${escapeHtml(gateCode)}
          </span>
        </div>

        <span
          class="
            portfolio-program-card__status
            tone-${escapeHtml(tone)}
          "
        >
          <span
            class="
              portfolio-program-card__status-dot
            "
          ></span>

          ${escapeHtml(statusLabel)}
        </span>
      </header>

      <div
        class="
          portfolio-program-card__runway
        "
        aria-hidden="true"
      ></div>

      <div
        class="
          portfolio-program-card__aircraft-shell
          portfolio-program-card__aircraft-shell--image
        "
      >
        <img
          class="
            portfolio-program-card__aircraft-image
          "
          src="${escapeHtml(aircraftImage)}"
          alt=""
          loading="lazy"
        />
      </div>

      <div
        class="
          portfolio-program-card__content
        "
      >
        <h3
          class="
            portfolio-program-card__title
          "
        >
          ${escapeHtml(programName)}
        </h3>

        <p
          class="
            portfolio-program-card__description
          "
        >
          ${escapeHtml(program?.description || "")}
        </p>

        ${
          !enabled
            ? `
              <span
                class="
                  portfolio-program-card__inactive-note
                "
              >
                Gate reservado · sin operación asignada
              </span>
            `
            : ""
        }
      </div>

      <footer
        class="
          portfolio-program-card__footer
        "
      >
        ${
          navigable
            ? getProgramAction(program)
            : `
              <div
                class="
                  portfolio-program-card__idle
                "
              >
                Programa próximamente disponible
              </div>
            `
        }
      </footer>
    </article>
  `;
  }
  function renderAirportTerminal(terminalName, leftSlots, rightSlots) {
    const gateMarker = (slot, side) => `
    <span
      class="
        portfolio-airport-terminal__gate
        portfolio-airport-terminal__gate--${side}
      "
      style="--gate-row: ${slot.row};"
    >
      ${String(slot.gateNumber).padStart(2, "0")}
    </span>
  `;

    return `
    <div
      class="
        portfolio-airport-terminal
        portfolio-airport-terminal--${terminalName.toLowerCase()}
      "
    >
      <span class="portfolio-airport-terminal__name">
        TERMINAL ${escapeHtml(terminalName)}
      </span>

      ${leftSlots.map((slot) => gateMarker(slot, "left")).join("")}

      ${rightSlots.map((slot) => gateMarker(slot, "right")).join("")}
    </div>
  `;
  }
  function renderAirportAircraftColumn(slots, columnClass, rowCount) {
    return `
    <div
      class="
        portfolio-airport-aircraft-column
        ${columnClass}
      "
      style="--airport-row-count: ${rowCount};"
    >
      ${slots.map(renderAirportCard).join("")}
    </div>
  `;
  }
  function renderAirportLayout(programs) {
    const assignments = buildAirportAssignments(programs);

    const rowCount = Math.max(1, Math.ceil(assignments.length / 4));

    const terminalALeft = assignments.filter(
      (slot) => slot.key === "terminal-a-left",
    );

    const terminalARight = assignments.filter(
      (slot) => slot.key === "terminal-a-right",
    );

    const terminalBLeft = assignments.filter(
      (slot) => slot.key === "terminal-b-left",
    );

    const terminalBRight = assignments.filter(
      (slot) => slot.key === "terminal-b-right",
    );

    return `
    <div
      class="portfolio-airport-layout"
      style="--airport-row-count: ${rowCount};"
    >
      ${renderAirportAircraftColumn(
        terminalALeft,
        "portfolio-airport-aircraft-column--a-left",
        rowCount,
      )}

      ${renderAirportTerminal("A", terminalALeft, terminalARight)}

      ${renderAirportAircraftColumn(
        terminalARight,
        "portfolio-airport-aircraft-column--a-right",
        rowCount,
      )}

      ${renderAirportAircraftColumn(
        terminalBLeft,
        "portfolio-airport-aircraft-column--b-left",
        rowCount,
      )}

      ${renderAirportTerminal("B", terminalBLeft, terminalBRight)}

      ${renderAirportAircraftColumn(
        terminalBRight,
        "portfolio-airport-aircraft-column--b-right",
        rowCount,
      )}
    </div>
  `;
  }
  function renderAirportCard(slot) {
    const { program, index, row, connectorDirection } = slot;

    return `
    <div
      class="
        portfolio-airport-aircraft-slot
        portfolio-airport-aircraft-slot--${escapeHtml(connectorDirection)}
        ${isProgramEnabled(program) ? "is-operational" : "is-inactive"}
      "
      style="grid-row: ${row};"
    >
      <div class="portfolio-airport-aircraft-slot__card">
        ${renderTowerCard(program, index)}
      </div>
    </div>
  `;
  }
  function buildAirportAssignments(programs) {
    const positions = [
      {
        key: "terminal-a-left",
        terminal: "A",
        terminalSide: "left",
        connectorDirection: "right",
      },
      {
        key: "terminal-a-right",
        terminal: "A",
        terminalSide: "right",
        connectorDirection: "left",
      },
      {
        key: "terminal-b-left",
        terminal: "B",
        terminalSide: "left",
        connectorDirection: "right",
      },
      {
        key: "terminal-b-right",
        terminal: "B",
        terminalSide: "right",
        connectorDirection: "left",
      },
    ];

    return programs.map((program, index) => {
      const position = positions[index % positions.length];

      return {
        program,
        index,
        gateNumber: index + 1,
        gateCode: `GATE ${String(index + 1).padStart(2, "0")}`,
        row: Math.floor(index / positions.length) + 1,
        ...position,
      };
    });
  }
  function renderProgramsStage(programs) {
    const landingMode = getLandingMode();
    const isAirport = landingMode === "airport";

    return `
    <section
      class="
        portfolio-program-stage
        portfolio-program-stage--${escapeHtml(landingMode)}
      "
      aria-label="${
        isAirport
          ? "Airport de programas RCS"
          : "Control Tower de programas RCS"
      }"
    >
      <div class="portfolio-program-stage__header">

        <div class="portfolio-program-stage__legend">
          ${
            isAirport
              ? "RCS Airport · Gates"
              : "RCS Control Tower · Flight Board"
          }
        </div>

        <div class="portfolio-program-stage__chips">
          ${
            isAirport
              ? `
                <span class="portfolio-program-stage__chip">
                  Terminal A
                </span>

                <span class="portfolio-program-stage__chip">
                  Terminal B
                </span>

                <span class="portfolio-program-stage__chip">
                  Gates
                </span>
              `
              : `
                <span class="portfolio-program-stage__chip">
                  Flight Strips
                </span>

                <span class="portfolio-program-stage__chip">
                  Boeing 747
                </span>

                <span class="portfolio-program-stage__chip">
                  Control Tower
                </span>
              `
          }
        </div>

      </div>

      ${
        isAirport
          ? renderAirportLayout(programs)
          : `
            <div
              class="
                portfolio-program-stage__grid
                portfolio-program-stage__grid--tower
              "
            >
              ${programs
                .map((program, index) => renderTowerCard(program, index))
                .join("")}
            </div>
          `
      }
    </section>
  `;
  }

  window.RCS_PORTFOLIO_LANDING_MODES = Object.freeze({
    renderProgramsStage,
  });
})();
