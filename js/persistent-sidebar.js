/**
 * RCS Cockpit · navegación lateral persistente y país contextual.
 * Se carga después de context-ux.js, antes de init().
 * No modifica DATA ni las rutas existentes salvo el país explícitamente elegido.
 */
(function installPersistentSidebarFeature() {
  "use strict";

  const STORAGE_KEY = "rcs-cockpit-sidebar-collapsed";
  const FILTERED_ROUTES = new Set([
    "product",
    "capability",
    "roadmap",
    "functional",
    "systems",
    "architecture",
    "teams",
    "impediments",
    "decisions",
  ]);

  const ICONS = {
    governance: "◇",
    kpis: "◉",
    ambition: "✦",
    landing: "✈",
    "key-reports": "▤",
  };

  function getContext() {
    if (typeof contextToolbarRoute === "function") {
      return contextToolbarRoute();
    }

    const parts = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("/");

    return {
      routeName: parts[0] || "landing",
      programId: parts[1] || "",
      parts,
    };
  }

  function availableCountries() {
    if (typeof COUNTRIES === "undefined" || !Array.isArray(COUNTRIES)) {
      return [];
    }

    const countries = COUNTRIES.filter((country) => country && country.id);

    return [
      ...countries.filter((country) => country.id === "HL"),
      ...countries.filter((country) => country.id !== "HL"),
    ];
  }

  function getCurrentCountry(context, countries) {
    const routeName = String(context?.routeName || "").trim();

    let routeCountry = "";

    /*
     * Pantallas con país en el contexto
     * de navegación habitual.
     */
    if (["product", "capability", "roadmap"].includes(routeName)) {
      routeCountry = String(context.countryId || "").trim();
    }

    /*
     * Key Issues:
     *
     * impediments/program/product/country
     *
     * ALL equivale a Holding en el
     * selector global.
     */
    if (routeName === "impediments") {
      const scope = String(context.parts?.[3] || "ALL")
        .trim()
        .toUpperCase();

      routeCountry = ["ALL", "HL", "HOLDING"].includes(scope) ? "HL" : scope;
    }

    const value = String(routeCountry || selectedCountry || "HL")
      .trim()
      .toUpperCase();

    return (
      countries.find(
        (country) =>
          String(country.id || "")
            .trim()
            .toUpperCase() === value,
      ) ||
      countries.find((country) => country.id === "HL") ||
      countries[0]
    );
  }

  function needsCountryFilter(context) {
    if (!context.programId) {
      return false;
    }

    if (FILTERED_ROUTES.has(context.routeName)) {
      return true;
    }

    if (context.routeName !== "program") {
      return false;
    }

    return (
      Boolean(context.parts?.[2]) ||
      (!["aixbanker", "blue", "rosetta"].includes(context.programId) &&
        Boolean(document.querySelector("#view .program-home")))
    );
  }

  function readCollapsedPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored !== null) {
        return stored === "true";
      }
    } catch (_) {
      // La navegación funciona aunque el almacenamiento esté bloqueado.
    }

    return window.matchMedia("(max-width: 760px)").matches;
  }

  function setCollapsed(collapsed, persist = false) {
    const isCollapsed = Boolean(collapsed);

    document.body.classList.toggle("rcs-sidebar-collapsed", isCollapsed);

    const toggle = document.getElementById("rcsSidebarToggle");

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
      toggle.setAttribute(
        "aria-label",
        isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral",
      );

      toggle.title = isCollapsed ? "Expandir menú" : "Contraer menú";

      const icon = toggle.querySelector(".rcs-sidebar-toggle-icon");
      const label = toggle.querySelector(".rcs-sidebar-toggle-label");

      if (icon) {
        icon.textContent = isCollapsed ? "❯" : "❮";
      }

      if (label) {
        label.textContent = isCollapsed ? "Expandir" : "Contraer";
      }
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed));
      } catch (_) {
        // Preferencia opcional.
      }
    }
  }

  function decorateNavigation(nav) {
    nav.querySelectorAll("[data-portfolio-nav]").forEach((button) => {
      const key = button.dataset.portfolioNav;

      if (button.querySelector(".rcs-sidebar-link-label")) {
        return;
      }

      const label = button.textContent.trim();

      const icon = document.createElement("span");
      icon.className = "rcs-sidebar-link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ICONS[key] || "•";

      const text = document.createElement("span");
      text.className = "rcs-sidebar-link-label";
      text.textContent = label;

      button.replaceChildren(icon, text);
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }

  function ensureSidebar() {
    if (
      !document.getElementById("portfolioSidebarNavigation") &&
      typeof installPortfolioSidebarNavigation === "function"
    ) {
      installPortfolioSidebarNavigation();
    }

    const sidebar = document.querySelector(".app-shell > .sidebar");
    const navigation = document.getElementById("portfolioSidebarNavigation");

    if (!sidebar || !navigation) {
      return;
    }

    sidebar.classList.remove("has-country-navigation");
    sidebar.querySelector("#sidebarCountryNavigation")?.remove();

    document.body.classList.add("rcs-sidebar-ready");

    decorateNavigation(navigation);

    if (!document.getElementById("rcsSidebarToggle")) {
      const toggle = document.createElement("button");

      toggle.id = "rcsSidebarToggle";
      toggle.type = "button";
      toggle.className = "rcs-sidebar-toggle";
      toggle.setAttribute("aria-controls", "portfolioSidebarNavigation");

      toggle.innerHTML =
        '<span class="rcs-sidebar-toggle-icon" aria-hidden="true">❮</span>' +
        '<span class="rcs-sidebar-toggle-label">Contraer</span>';

      toggle.addEventListener("click", () => {
        setCollapsed(
          !document.body.classList.contains("rcs-sidebar-collapsed"),
          true,
        );
      });

      sidebar.insertBefore(toggle, navigation);
      setCollapsed(readCollapsedPreference());
    }

    const home = document.getElementById("globalSidebarHomeButton");

    if (home) {
      home.title = "Volver a Inicio";
    }
  }

  function syncActiveNavigation(context) {
    const button = document.querySelector('[data-portfolio-nav="landing"]');

    if (!button) {
      return;
    }

    const isProgramScreen =
      Boolean(context.programId) &&
      !new Set([
        "landing",
        "governance",
        "kpis",
        "ambition",
        "key-reports",
      ]).has(context.routeName);

    const active = isProgramScreen || context.routeName === "landing";

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }

  function renderContextCountryFilter() {
    ensureSidebar();

    const container = document.getElementById("globalContextFilters");

    const topbar = document.querySelector(".app-shell > .main > .topbar");

    if (!container || !topbar) {
      return;
    }

    const context = getContext();

    syncActiveNavigation(context);

    /*
     * =====================================================
     * ELIMINAR SELECTOR DENTRO DE DATA-STATUS
     * =====================================================
     *
     * El contenedor globalContextFilters permanece
     * disponible para compatibilidad, pero vacío.
     *
     * De este modo la cápsula de actualización
     * recupera su tamaño original.
     */

    container.replaceChildren();
    container.hidden = true;

    const countries = availableCountries();

    let toolbar = document.getElementById("flightPlanCountryToolbar");

    /*
     * =====================================================
     * PANTALLAS SIN FILTRO GEOGRÁFICO
     * =====================================================
     */

    if (!needsCountryFilter(context) || !countries.length) {
      if (toolbar) {
        toolbar.remove();
      }

      return;
    }

    /*
     * =====================================================
     * CONTENEDOR GLOBAL
     * =====================================================
     *
     * Situado inmediatamente debajo de topbar.
     *
     * Es independiente de data-status y
     * se reutiliza en todas las pantallas.
     */

    if (!toolbar) {
      toolbar = document.createElement("section");

      toolbar.id = "flightPlanCountryToolbar";
      toolbar.className = "flight-plan-country-toolbar";

      toolbar.setAttribute("aria-label", "Selección geográfica del Cockpit");
    }

    toolbar.style.width = "100%";
    toolbar.style.margin = "0 0 22px";

    /*
     * insertAdjacentElement también permite
     * recolocar el elemento si ya existe.
     */

    topbar.insertAdjacentElement("afterend", toolbar);

    toolbar.hidden = false;

    /*
     * =====================================================
     * FLIGHT PLAN
     * =====================================================
     *
     * Mantiene su selector especial:
     *
     * - multiselección en Holding;
     * - botón Todos;
     * - filtros por año y entregable;
     * - mismos eventos originales.
     *
     * Se traslada el elemento real, sin clonarlo.
     */

    const flightPlan = document.querySelector("#view .product-plan-comparison");

    const isFlightPlan = context.routeName === "roadmap" && Boolean(flightPlan);

    if (isFlightPlan) {
      const geographyControl = flightPlan.querySelector(
        ".product-plan-geography",
      );

      if (geographyControl) {
        toolbar.replaceChildren(geographyControl);
      }

      return;
    }

    /*
     * =====================================================
     * RESTO DEL COCKPIT
     * =====================================================
     *
     * Utilizamos el mismo diseño visual
     * que el Flight Plan:
     *
     * product-plan-geography
     * product-plan-country-toggles
     * product-plan-country-toggle
     *
     * No necesitamos CSS nuevo.
     */

    const active = getCurrentCountry(context, countries);

    const activeCountryId = String(active?.id || "HL")
      .trim()
      .toUpperCase();

    const geographyControl = document.createElement("section");

    geographyControl.className = "product-plan-geography is-holding";

    geographyControl.setAttribute("aria-label", "Ámbito geográfico");

    /*
     * Información de la selección actual.
     */

    const copy = document.createElement("div");

    copy.className = "product-plan-geography-copy";

    const eyebrow = document.createElement("span");

    eyebrow.textContent = "ÁMBITO GEOGRÁFICO";

    const title = document.createElement("strong");

    title.textContent = String(active?.label || "Holding");

    const description = document.createElement("small");

    description.textContent =
      "Selecciona una geografía para consultar " +
      "la información correspondiente.";

    copy.append(eyebrow, title, description);

    /*
     * =====================================================
     * BOTONES DE PAÍS
     * =====================================================
     */

    const buttons = document.createElement("div");

    buttons.className = "product-plan-country-toggles";

    countries.forEach((country) => {
      const countryId = String(country?.id || "")
        .trim()
        .toUpperCase();

      if (!countryId) {
        return;
      }

      const label = String(country?.label || countryId);

      const isActive = countryId === activeCountryId;

      const button = document.createElement("button");

      button.type = "button";

      button.className = [
        "product-plan-country-toggle",
        isActive ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" ");

      button.dataset.rcsCountryButton = countryId;

      button.setAttribute("aria-pressed", String(isActive));

      button.setAttribute("aria-label", `Seleccionar ${label}`);

      button.title = label;

      /*
       * Bandera o código de país.
       */

      const flagSrc = String(country?.flagSrc || "").trim();

      if (flagSrc) {
        const flag = document.createElement("img");

        flag.src = flagSrc;
        flag.alt = "";
        flag.loading = "lazy";

        flag.setAttribute("aria-hidden", "true");

        button.append(flag);
      } else {
        const icon = document.createElement("span");

        icon.textContent = countryId;

        icon.setAttribute("aria-hidden", "true");

        button.append(icon);
      }

      const name = document.createElement("strong");

      name.textContent = label;

      button.append(name);

      /*
       * Navegación geográfica existente.
       *
       * Conserva producto, programa y
       * contexto según changeCountry().
       */

      button.addEventListener("click", () => {
        if (isActive) {
          return;
        }

        changeCountry(countryId);
      });

      buttons.append(button);
    });

    geographyControl.append(copy, buttons);

    toolbar.replaceChildren(geographyControl);
  }

  function changeCountry(nextId) {
    const countries = availableCountries();

    const normalizedId = String(nextId || "")
      .trim()
      .toUpperCase();

    const next = countries.find(
      (country) =>
        String(country.id || "")
          .trim()
          .toUpperCase() === normalizedId,
    );

    if (!next) {
      return;
    }

    const context = getContext();

    selectedCountry = next.id;

    selectedCapability = null;
    selectedSystemComponent = null;
    selectedArchitectureGap = null;

    /*
     * =====================================================
     * KEY ISSUES
     * =====================================================
     *
     * Conservamos programa y producto.
     *
     * Holding corresponde a ALL para mostrar
     * todos los issues, incluidos los globales.
     */

    if (context.routeName === "impediments") {
      const productId = String(context.parts?.[2] || "ALL").trim() || "ALL";

      const countryScope = normalizedId === "HL" ? "ALL" : normalizedId;

      const targetRoute =
        typeof programGovernanceImpedimentCountryRoute === "function"
          ? programGovernanceImpedimentCountryRoute(
              context.programId,
              productId,
              countryScope,
            )
          : [
              "impediments",
              encodeURIComponent(context.programId),
              encodeURIComponent(productId),
              encodeURIComponent(countryScope),
            ].join("/");

      const currentRoute = String(location.hash || "")
        .replace(/^#\/?/, "")
        .trim();

      if (currentRoute !== targetRoute) {
        route(targetRoute);
      } else {
        Promise.resolve(render()).catch(console.error);
      }

      return;
    }

    /*
     * =====================================================
     * PRODUCTO
     * =====================================================
     */

    if (context.routeName === "product" && context.parts?.[2]) {
      route(
        `product/${encodeURIComponent(context.programId)}/` +
          `${encodeURIComponent(context.parts[2])}/` +
          `${encodeURIComponent(next.id)}`,
      );

      return;
    }

    /*
     * =====================================================
     * CAPABILITY
     * =====================================================
     */

    if (context.routeName === "capability" && context.parts?.[3]) {
      route(
        `capability/${encodeURIComponent(context.programId)}/` +
          `${encodeURIComponent(context.parts[2])}/` +
          `${encodeURIComponent(context.parts[3])}/` +
          `${encodeURIComponent(next.id)}`,
      );

      return;
    }

    /*
     * =====================================================
     * ROADMAP / FLIGHT PLAN
     * =====================================================
     */

    if (context.routeName === "roadmap") {
      if (typeof roadmapWorkspaceRoute === "function") {
        const target = roadmapWorkspaceRoute(
          context.programId,
          context.viewName || "summary",
          context.productId || "ALL",
          context.period || "ALL",
          context.ambitionId || "ALL",
          context.capabilityId || "ALL",
          next.id,
        );

        if (target) {
          const currentRoute = String(location.hash || "").replace(/^#\/?/, "");

          if (currentRoute !== target) {
            route(target);
          } else {
            Promise.resolve(render()).catch(console.error);
          }

          return;
        }
      }
    }

    /*
     * =====================================================
     * RESTO DEL COCKPIT
     * =====================================================
     */

    Promise.resolve(render()).catch(console.error);
  }

  if (typeof renderGlobalContextFilters === "function") {
    renderGlobalContextFilters =
      function renderGlobalContextFiltersWithoutLegacyCountry() {};
  }

  if (typeof renderSidebarCountryNavigation === "function") {
    renderSidebarCountryNavigation = function renderCountryInCurrentView() {
      renderContextCountryFilter();
    };
  }

  document.addEventListener("change", (event) => {
    if (event.target?.id !== "rcsContextCountry") {
      return;
    }

    changeCountry(String(event.target.value || ""));
  });

  window.addEventListener("hashchange", () => {
    requestAnimationFrame(renderContextCountryFilter);
  });

  ensureSidebar();
  requestAnimationFrame(renderContextCountryFilter);
})();
