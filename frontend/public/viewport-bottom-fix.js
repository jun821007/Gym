(function () {
  "use strict";

  function updateViewportBottom() {
    var vv = window.visualViewport;
    var gap = 0;
    if (vv) {
      gap = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
    }
    document.documentElement.style.setProperty("--vv-bottom-gap", gap + "px");
  }

  updateViewportBottom();
  window.addEventListener("resize", updateViewportBottom);
  window.addEventListener("orientationchange", function () {
    setTimeout(updateViewportBottom, 100);
    setTimeout(updateViewportBottom, 320);
  });
  window.addEventListener("pageshow", updateViewportBottom);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportBottom);
    window.visualViewport.addEventListener("scroll", updateViewportBottom);
  }
})();
