(function () {
  "use strict";

  var safeProbe;

  function measureSafeBottom() {
    if (!safeProbe) {
      safeProbe = document.createElement("div");
      safeProbe.setAttribute("aria-hidden", "true");
      safeProbe.style.cssText =
        "position:fixed;left:-9999px;bottom:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)";
      document.documentElement.appendChild(safeProbe);
    }
    return parseFloat(getComputedStyle(safeProbe).paddingBottom) || 0;
  }

  function fallbackHomeInset() {
    if (!window.matchMedia("(display-mode: standalone)").matches) return 0;
    if (!/iPhone|iPod/.test(navigator.userAgent)) return 0;
    var longEdge = Math.max(window.screen.height, window.screen.width);
    if (longEdge <= 736) return 0;
    return 34;
  }

  function apply() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var top = vv ? vv.offsetTop : 0;
    var layoutH = window.innerHeight;
    var bottomGap = Math.max(0, Math.round(layoutH - top - h));

    var clientH = document.documentElement.clientHeight;
    var clientGap = Math.max(0, Math.round(clientH - top - h));
    bottomGap = Math.max(bottomGap, clientGap);

    var safeBottom = measureSafeBottom();
    if (safeBottom < 1) {
      safeBottom = fallbackHomeInset();
    }

    document.documentElement.style.setProperty("--app-vvh", h + "px");
    document.documentElement.style.setProperty("--app-vv-offset-top", top + "px");
    document.documentElement.style.setProperty("--app-vv-bottom-gap", bottomGap + "px");
    document.documentElement.style.setProperty("--app-height", h + "px");
    document.documentElement.style.setProperty("--safe-bottom-effective", safeBottom + "px");
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 100);
    setTimeout(apply, 350);
  });
  window.addEventListener("pageshow", apply);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", apply);
    window.visualViewport.addEventListener("scroll", apply);
  }
})();
