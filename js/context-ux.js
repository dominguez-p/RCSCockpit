/*
 * Consolidated UX layer.
 *
 * Sustituye:
 * - portfolio-ux-polish.js
 * - navigation-ux-fixes.js
 *
 * Mantiene únicamente el comportamiento
 * que sigue activo en la aplicación.
 */

const PROGRAM_UX_HOLDING_PRODUCT_COPY =
  "Productos, capacidades y casos funcionales a nivel global.";

function portfolioUxEscape(value) {
  if (typeof portfolioEscape === "function") {
    return portfolioEscape(value);
  }

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function portfolioUxProgramEnabled(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return !["false", "0", "no", "off", "disabled", "inactivo"].includes(
    String(value).trim().toLowerCase(),
  );
}

renderPortfolioProgramCard = function renderProgramCardWithoutContribution(
  program,
) {
  const enabled = portfolioUxProgramEnabled(program.enabled);

  const status = program.status || "Sin estado";

  const programId = String(program.id || "").trim();

  /*
   * =====================================================
   * MODO DEMO
   * =====================================================
   *
   * Conservamos exclusivamente la señal visual
   * de que un programa está utilizando datos
   * sintéticos.
   *
   * No calculamos contribuciones ni cargamos
   * ningún origen adicional para hacerlo.
   */
  const portfolioIsDemo =
    typeof getRcsDataMode === "function" &&
    getRcsDataMode("portfolio") === "demo";

  const demoProgramData =
    portfolioIsDemo && typeof getDemoProgramData === "function"
      ? getDemoProgramData(programId)
      : null;

  const isDemo = Boolean(enabled && demoProgramData);

  return `
    <article
      class="
        portfolio-program-card
        ${enabled ? "" : "disabled"}
        ${isDemo ? "is-demo" : ""}
      "
    >
      <header
        class="
          portfolio-program-heading
        "
      >
        <span
          class="
            portfolio-program-icon
          "
          aria-hidden="true"
        >
          ${portfolioUxEscape(program.icon || "●")}
        </span>

        <div>
          <h3>
            ${portfolioUxEscape(program.name || "Programa")}
          </h3>

          <p>
            ${portfolioUxEscape(program.description || "")}
          </p>
        </div>
      </header>

      <span
        class="
          pill
          ${portfolioStatusClass(status)}
        "
      >
        ${portfolioUxEscape(status)}
      </span>

      ${
        isDemo
          ? `
              <section
                class="
                  portfolio-program-demo-message
                "
                aria-label="
                  Programa en modo demo
                "
              >
                <span
                  class="
                    portfolio-program-demo-badge
                  "
                >
                  DEMO
                </span>

                <div>
                  <strong>
                    Datos sintéticos
                  </strong>

                  <small>
                    No representan información
                    operativa real
                  </small>
                </div>
              </section>
            `
          : ""
      }

      ${
        !enabled
          ? `
              <section
                class="
                  portfolio-program-contribution
                "
                data-state="disabled"
              >
                <div
                  class="
                    portfolio-program-contribution-empty
                  "
                >
                  <strong>
                    Sin datos disponibles
                  </strong>

                  <span>
                    El programa todavía no está
                    habilitado.
                  </span>
                </div>
              </section>
            `
          : ""
      }

      <button
        class="
          portfolio-program-action
        "
        type="button"
        ${
          enabled
            ? `data-route="program/${portfolioUxEscape(programId)}"`
            : "disabled"
        }
      >
        ${
          enabled
            ? isDemo
              ? "Entrar en modo demo →"
              : "Entrar en el programa →"
            : "Programa próximamente disponible"
        }
      </button>
    </article>
  `;
};

const portfolioUxBaseRenderLanding = renderLanding;

renderLanding = function renderLandingWithoutProgramContributions(...args) {
  const result = portfolioUxBaseRenderLanding(...args);

  /*
   * =====================================================
   * PROGRAMAS RCS
   * =====================================================
   *
   * La landing es únicamente una puerta
   * de entrada al portfolio.
   *
   * No cargamos datasets de cada programa
   * para calcular contribuciones a
   * ambiciones.
   */
  const programsSection = [
    ...document.querySelectorAll(".portfolio-home-section"),
  ].find(
    (section) =>
      section
        .querySelector(".portfolio-home-section-header h2")
        ?.textContent?.trim() === "Programas RCS",
  );

  const description = programsSection?.querySelector(
    ".portfolio-home-section-header > p",
  );

  if (description) {
    description.textContent =
      "Acceso a los programas de Retail Client Solutions.";
  }

  /*
   * =====================================================
   * AMBICIONES RCS
   * =====================================================
   *
   * Conservamos el marco estratégico,
   * pero ya no indicamos que las tarjetas
   * calculan una contribución agregada.
   */
  const ambitionsSection = [
    ...document.querySelectorAll(".portfolio-home-section"),
  ].find(
    (section) =>
      section
        .querySelector(".portfolio-home-section-header h2")
        ?.textContent?.trim() === "Ambiciones RCS",
  );

  const ambitionsDescription = ambitionsSection?.querySelector(
    ".portfolio-home-section-header > p",
  );

  if (ambitionsDescription) {
    ambitionsDescription.textContent =
      "Las ocho ambiciones forman el marco estratégico común de Retail Client Solutions.";
  }

  /*
   * IMPORTANTE:
   *
   * Antes:
   *
   * portfolioUxRefreshContributions(...)
   *
   * recorría todos los programas habilitados
   * y lanzaba peticiones Apps Script.
   *
   * Ya no se realiza ninguna carga adicional
   * desde la landing.
   */
  return result;
};

function programUxFindSection(home, eyebrow) {
  return [...home.querySelectorAll(":scope > .program-home-section")].find(
    (section) =>
      section
        .querySelector(":scope > .program-home-section-header span")
        ?.textContent?.trim() === eyebrow,
  );
}

function programUxBuildMetricsSection(home) {
  const existing = home.querySelector(":scope > .program-home-metrics-section");

  if (existing) {
    return existing;
  }

  const snapshot = home.querySelector(":scope > .program-home-snapshot");

  if (!snapshot) {
    return null;
  }

  const section = document.createElement("section");

  section.className = "program-home-section program-home-metrics-section";

  section.innerHTML = `
    <header
      class="
        program-home-section-header
      "
    >
      <div>
        <span>Resumen</span>
        <h2>Métricas principales</h2>
      </div>

      <p>
        Indicadores básicos de alcance, riesgo, productos y equipos.
      </p>
    </header>
  `;

  snapshot.before(section);
  section.append(snapshot);

  return section;
}

function programUxIsAIxBankerLanding(programId) {
  return String(programId || "").trim() === "aixbanker";
}

function programUxIsHoldingProductLanding(programId) {
  return (
    programUxIsAIxBankerLanding(programId) &&
    String(selectedCountry || "").trim() === "HL"
  );
}

function programUxPolishHoldingProductIntro(programId) {
  if (!programUxIsHoldingProductLanding(programId)) {
    return;
  }

  const home = view.querySelector(".program-home");

  if (!home) {
    return;
  }

  const products = programUxFindSection(home, "Productos");

  if (!products) {
    return;
  }

  const heading = products.querySelector(
    ":scope > .program-home-section-header h2",
  );

  if (heading && heading.textContent.trim() !== "Visión global de producto") {
    heading.textContent = "Visión global de producto";
  }

  const description = products.querySelector(
    ":scope > .program-home-section-header > p",
  );

  if (
    description &&
    description.textContent.trim() !== PROGRAM_UX_HOLDING_PRODUCT_COPY
  ) {
    description.textContent = PROGRAM_UX_HOLDING_PRODUCT_COPY;
  }
}

function programUxReorderLanding(programId) {
  const home = view.querySelector(".program-home");

  if (!home) {
    return;
  }

  const hero = home.querySelector(":scope > .program-home-hero");

  if (!hero) {
    return;
  }

  const adaptive = home.querySelector(
    `:scope > [data-program-adaptive-cards="${CSS.escape(programId)}"]`,
  );

  const programView = programUxFindSection(home, "Vista del programa");

  const products = programUxFindSection(home, "Productos");

  const governance = programUxFindSection(home, "Gobierno");

  const configuredModules = programUxFindSection(
    home,
    "Configuración del programa",
  );

  const ambitions = programUxFindSection(home, "Ambiciones RCS");

  const metrics = programUxBuildMetricsSection(home);

  /*
   * AIxBanker utiliza producto como primer nivel
   * tanto en Holding como en cualquier país.
   *
   * La definición del producto es global.
   * La ejecución geográfica se presenta después.
   */
  const productFirst = programUxIsAIxBankerLanding(programId);

  const orderedSections = (
    productFirst
      ? [
          adaptive,
          products,
          programView,
          governance,
          configuredModules,
          ambitions,
          metrics,
        ]
      : [
          adaptive,
          programView,
          products,
          governance,
          configuredModules,
          ambitions,
          metrics,
        ]
  ).filter(Boolean);

  let cursor = hero;

  orderedSections.forEach((section) => {
    cursor.insertAdjacentElement("afterend", section);

    cursor = section;
  });
}

const programUxBaseRenderProgram = renderProgram;

renderProgram = function renderProgramWithRequestedOrder(programId) {
  const normalizedProgramId = String(programId || "").trim();

  const result = programUxBaseRenderProgram(programId);

  programUxReorderLanding(normalizedProgramId);

  /*
   * product-experience.js termina de enriquecer
   * el bloque de productos mediante MutationObserver.
   * Ejecutamos el copy definitivo en el siguiente frame
   * para evitar que vuelva a aparecer el texto anterior.
   */
  requestAnimationFrame(() => {
    programUxPolishHoldingProductIntro(normalizedProgramId);
  });

  return result;
};

let navigationUxPendingTarget = "top";

function navigationUxRouteParts(value) {
  return String(value || "")
    .replace(/^#\/?/, "")
    .split("/")
    .map((part) => part.trim());
}

function navigationUxPageKey(value) {
  const [routeName = "landing", programId = "", viewName = ""] =
    navigationUxRouteParts(value);

  if (routeName === "roadmap") {
    return [routeName, programId, viewName || "summary"].join("/");
  }

  return [routeName, programId].filter(Boolean).join("/") || "landing";
}

function navigationUxTargetFromControl(control) {
  const selector = String(control?.dataset?.scrollTarget || "").trim();

  return selector || "top";
}

function navigationUxScroll(target = "top") {
  if (!target) {
    return;
  }

  if (target !== "top") {
    try {
      const element = document.querySelector(target);

      if (element) {
        element.scrollIntoView({
          block: "start",
          behavior: "auto",
        });

        return;
      }
    } catch (error) {
      console.warn("Destino de navegación no válido", target, error);
    }
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
}

function navigationUxScheduleScroll() {
  const target = navigationUxPendingTarget;

  if (!target) {
    return;
  }

  navigationUxPendingTarget = null;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => navigationUxScroll(target));
  });
}

function navigationUxCompactProgramLanding() {
  const home = view.querySelector(".program-home");

  if (!home) {
    return;
  }

  home.querySelector(":scope > .program-home-hero")?.remove();

  const staticAmbitionsSection = [
    ...home.querySelectorAll(":scope > .program-home-section"),
  ].find(
    (section) =>
      section
        .querySelector(":scope > .program-home-section-header span")
        ?.textContent?.trim() === "Ambiciones RCS",
  );

  staticAmbitionsSection?.remove();

  const backButton = home.querySelector(
    ':scope > .ghost-button[data-route="landing"]',
  );

  if (backButton) {
    backButton.classList.add(
      "program-home-back-button",
      "navigation-back-button",
    );

    backButton.textContent = "← Portfolio";

    backButton.setAttribute("aria-label", "Volver al portfolio");
  }
}

function navigationUxProgramLabel(programId) {
  const normalizedProgramId = String(programId || "").trim();

  const program = (Array.isArray(DATA?.programs) ? DATA.programs : []).find(
    (item) => String(item.id || "").trim() === normalizedProgramId,
  );

  return String(program?.name || normalizedProgramId || "Programa").trim();
}

function navigationUxCompactProgramBackButtons() {
  const controls = [
    ...view.querySelectorAll('[data-route^="program/"]'),
  ].filter(
    (control) =>
      control.classList.contains("back-to-program-btn") ||
      control.classList.contains("ghost-button") ||
      /volver/i.test(control.textContent || ""),
  );

  controls.forEach((control) => {
    const [routeName, programId] = navigationUxRouteParts(
      control.dataset.route,
    );

    if (routeName !== "program" || !programId) {
      return;
    }

    const programLabel = navigationUxProgramLabel(programId);

    control.classList.add("navigation-back-button");

    control.textContent = `← ${programLabel}`;

    control.setAttribute("aria-label", `Volver a ${programLabel}`);
  });
}

function navigationUxEnhanceFlightGateBoards() {
  const boards = [...view.querySelectorAll(".flight-gate-board")];

  boards.forEach((board) => {
    const openButton = board.querySelector(".flight-gate-open[data-route]");

    if (!openButton) {
      return;
    }

    const routeValue = String(openButton.dataset.route || "").trim();

    if (!routeValue) {
      return;
    }

    /*
     * La navegación global de app.js ya procesa
     * cualquier elemento con data-route.
     *
     * Reutilizamos exactamente la misma ruta del
     * botón "Abrir producto" en toda la tarjeta.
     *
     * El botón se conserva para que siga existiendo
     * un control nativo accesible por teclado.
     */
    board.dataset.route = routeValue;

    board.classList.add("flight-gate-board-clickable");

    const productLabel = String(
      openButton.getAttribute("aria-label") || "Abrir producto",
    ).trim();

    board.setAttribute("title", productLabel);
  });
}

const navigationUxBaseRoute = route;

route = function routeWithConsistentScroll(routeValue) {
  const currentKey = navigationUxPageKey(location.hash);

  const nextKey = navigationUxPageKey(routeValue);

  if (
    navigationUxPendingTarget === null ||
    navigationUxPendingTarget === undefined
  ) {
    navigationUxPendingTarget = currentKey === nextKey ? null : "top";
  }

  return navigationUxBaseRoute(routeValue);
};

document.addEventListener(
  "click",
  (event) => {
    const control = event.target.closest(
      "[data-route], [data-program-adaptive-route]",
    );

    if (!control) {
      return;
    }

    const routeValue =
      control.dataset.route || control.dataset.programAdaptiveRoute || "";

    const currentKey = navigationUxPageKey(location.hash);

    const nextKey = navigationUxPageKey(routeValue);

    navigationUxPendingTarget =
      currentKey === nextKey && !control.dataset.scrollTarget
        ? null
        : navigationUxTargetFromControl(control);
  },
  true,
);

window.addEventListener("hashchange", (event) => {
  const previousKey = navigationUxPageKey(event.oldURL.split("#")[1] || "");

  const nextKey = navigationUxPageKey(event.newURL.split("#")[1] || "");

  if (
    navigationUxPendingTarget === null ||
    navigationUxPendingTarget === undefined
  ) {
    navigationUxPendingTarget = previousKey === nextKey ? null : "top";
  }
});

const navigationUxBaseRenderCurrentRoute = renderCurrentRoute;

renderCurrentRoute = function renderRouteWithNavigationUx(...args) {
  const result = navigationUxBaseRenderCurrentRoute(...args);

  navigationUxCompactProgramLanding();

  navigationUxCompactProgramBackButtons();

  navigationUxEnhanceFlightGateBoards();

  navigationUxScheduleScroll();

  return result;
};

const navigationUxBaseRenderLanding = renderLanding;

renderLanding = function renderLandingWithNavigationUx(...args) {
  const result = navigationUxBaseRenderLanding(...args);

  navigationUxScheduleScroll();

  return result;
};

navigationUxCompactProgramLanding();

navigationUxCompactProgramBackButtons();

navigationUxEnhanceFlightGateBoards();

navigationUxScheduleScroll();

function contextUxRefreshCurrentHome() {
  const context =
    typeof contextToolbarRoute === "function"
      ? contextToolbarRoute()
      : {
          routeName: String(location.hash || "")
            .replace(/^#\/?/, "")
            .split("/")[0] || "landing",
          programId: String(location.hash || "")
            .replace(/^#\/?/, "")
            .split("/")[1] || "",
        };

  if (
    typeof view !== "undefined" &&
    view?.querySelector(".portfolio-home")
  ) {
    renderLanding();
    return;
  }

  if (
    context.routeName === "program" &&
    context.programId &&
    typeof view !== "undefined" &&
    view?.querySelector(".program-home")
  ) {
    renderProgram(context.programId);

    navigationUxCompactProgramLanding();
    navigationUxCompactProgramBackButtons();
    navigationUxEnhanceFlightGateBoards();

    requestAnimationFrame(() => {
      if (
        typeof renderSidebarCountryNavigation === "function"
      ) {
        renderSidebarCountryNavigation();
      }
    });
  }
}

contextUxRefreshCurrentHome();
