(function () {
  "use strict";

  function apply() {
    document.documentElement.style.setProperty(
      "--app-height",
      window.innerHeight + "px",
    );
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 100);
  });
  window.addEventListener("pageshow", apply);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", apply);
  }
})();
