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
        element.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }
    } catch (error) {
      console.warn("Destino de navegación no válido", target, error);
    }
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  const backButton = home.querySelector(
    ':scope > .ghost-button[data-route="landing"]',
  );

  if (backButton) {
    backButton.classList.add("program-home-back-button");
    backButton.textContent = "← Portfolio";
    backButton.setAttribute("aria-label", "Volver al portfolio");
  }
}

const navigationUxBaseRoute = route;

route = function routeWithConsistentScroll(routeValue) {
  const currentKey = navigationUxPageKey(location.hash);
  const nextKey = navigationUxPageKey(routeValue);

  if (navigationUxPendingTarget === null || navigationUxPendingTarget === undefined) {
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

  if (navigationUxPendingTarget === null || navigationUxPendingTarget === undefined) {
    navigationUxPendingTarget = previousKey === nextKey ? null : "top";
  }
});

const navigationUxBaseRenderCurrentRoute = renderCurrentRoute;

renderCurrentRoute = function renderRouteWithNavigationUx(...args) {
  const result = navigationUxBaseRenderCurrentRoute(...args);

  navigationUxCompactProgramLanding();
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
navigationUxScheduleScroll();
