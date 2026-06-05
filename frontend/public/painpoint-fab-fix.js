(function () {
  "use strict";
  var STORAGE_PREFIX = "pp-fab-pos:";
  var TAB_OFFSET = "calc(var(--tab-total-h, 4rem) + 10px)";
  var MIN_TOP = 80;

  function placeDefault(fab) {
    fab.style.left = "";
    fab.style.top = "";
    fab.style.right = "12px";
    fab.style.bottom = TAB_OFFSET;
  }

  function isBadPos(saved, width, height) {
    if (!saved || typeof saved.top !== "number" || typeof saved.left !== "number") {
      return false;
    }
    if (saved.top < MIN_TOP) return true;
    if (saved.left > width * 0.55 && saved.top < height * 0.35) return true;
    if (saved.top + 48 > height - 56) return true;
    return false;
  }

  function clampSaved(saved, fab, width, height) {
    var maxL = width - fab.offsetWidth - 8;
    var maxT = height - fab.offsetHeight - 8;
    return {
      left: Math.max(8, Math.min(saved.left, maxL)),
      top: Math.max(MIN_TOP, Math.min(saved.top, maxT)),
    };
  }

  function apply() {
    var fab = document.getElementById("pp-fab");
    if (!fab) return;

    var key = STORAGE_PREFIX + location.host;
    var width = window.innerWidth;
    var height = window.innerHeight;

    try {
      var raw = localStorage.getItem(key);
      var saved = raw ? JSON.parse(raw) : null;

      if (isBadPos(saved, width, height)) {
        localStorage.removeItem(key);
        placeDefault(fab);
        return;
      }

      if (!saved) {
        placeDefault(fab);
        return;
      }

      var next = clampSaved(saved, fab, width, height);
      fab.style.right = "auto";
      fab.style.bottom = "auto";
      fab.style.left = next.left + "px";
      fab.style.top = next.top + "px";
      if (next.left !== saved.left || next.top !== saved.top) {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch (_) {
      localStorage.removeItem(key);
      placeDefault(fab);
    }
  }

  apply();
  window.addEventListener("resize", function () {
    setTimeout(apply, 120);
  });
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 220);
  });
  window.addEventListener("pageshow", function () {
    setTimeout(apply, 80);
  });
})();
