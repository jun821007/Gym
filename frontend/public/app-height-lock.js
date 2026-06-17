(function () {
  "use strict";

  function layoutScreenGap(viewportHeight) {
    if (!window.matchMedia("(display-mode: standalone)").matches) return 0;
    var screenH = Math.max(window.screen.width, window.screen.height);
    if (viewportHeight < screenH * 0.8) return 0;
    return Math.max(0, Math.round(screenH - viewportHeight));
  }

  function apply() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var top = vv ? vv.offsetTop : 0;
    var gap = layoutScreenGap(h);

    document.documentElement.style.setProperty("--app-vv-offset-top", top + "px");
    document.documentElement.style.setProperty("--app-layout-screen-gap", gap + "px");
    document.documentElement.style.setProperty("--app-height", h + "px");
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
