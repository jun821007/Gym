(function () {
  "use strict";

  var IOS_MIN_BOTTOM = 34;

  function isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function readSafeBottomPx() {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:-9999px;padding-bottom:env(safe-area-inset-bottom,0px);";
    document.body.appendChild(probe);
    var px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    return px;
  }

  function measureBottomGap() {
    var gap = 0;
    var vv = window.visualViewport;
    var innerH = window.innerHeight;
    var docH = document.documentElement.clientHeight;

    if (vv) {
      gap = Math.max(gap, innerH - vv.offsetTop - vv.height);
      gap = Math.max(gap, docH - vv.offsetTop - vv.height);
    }

    gap = Math.max(gap, innerH - docH);

    if (isIOS()) {
      var safe = readSafeBottomPx();
      if (safe > 0) {
        gap = Math.max(gap, safe);
      } else if (isStandalone() || gap > 0) {
        gap = Math.max(gap, IOS_MIN_BOTTOM);
      } else {
        gap = IOS_MIN_BOTTOM;
      }
    }

    return Math.round(gap);
  }

  function apply() {
    var innerH = window.innerHeight;
    var gap = measureBottomGap();
    var safe = readSafeBottomPx();
    var padBottom = Math.max(safe, gap, isIOS() ? IOS_MIN_BOTTOM : 0);

    document.documentElement.style.setProperty("--app-height", innerH + "px");
    document.documentElement.style.setProperty("--vv-bottom-gap", gap + "px");
    document.documentElement.style.setProperty(
      "--safe-bottom-effective",
      padBottom + "px",
    );
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 80);
    setTimeout(apply, 320);
  });
  window.addEventListener("pageshow", apply);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", apply);
    window.visualViewport.addEventListener("scroll", apply);
  }
})();
