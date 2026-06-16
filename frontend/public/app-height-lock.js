(function () {
  "use strict";

  function apply() {
    var h = window.innerHeight;
    document.documentElement.style.setProperty("--app-height", h + "px");
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 100);
    setTimeout(apply, 350);
  });
  window.addEventListener("pageshow", apply);
})();
