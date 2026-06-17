(function () {
  "use strict";

  function apply() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var top = vv ? vv.offsetTop : 0;

    document.documentElement.style.setProperty("--app-vvh", h + "px");
    document.documentElement.style.setProperty("--app-vv-offset-top", top + "px");
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
