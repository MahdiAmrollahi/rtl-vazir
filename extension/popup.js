(() => {
  "use strict";
  const api = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
  const area = api.sync || api.local;
  const DEFAULTS = { enabled: true, fontOn: true };

  const $ = (id) => document.getElementById(id);

  const apply = (v) => {
    $("enabled").checked = v.enabled !== false;
    $("fontOn").checked  = v.fontOn  !== false;
    $("status").textContent =
      "rtl=" + ($("enabled").checked ? "on" : "off") +
      "  font=" + ($("fontOn").checked ? "on" : "off");
  };

  const save = () => {
    const v = {
      enabled: $("enabled").checked,
      fontOn:  $("fontOn").checked,
    };
    area.set(v, () => {
      $("status").textContent = "saved: rtl=" + (v.enabled ? "on" : "off") + ", font=" + (v.fontOn ? "on" : "off");
    });
  };

  area.get(DEFAULTS, (v) => apply(v || DEFAULTS));

  for (const id of ["enabled", "fontOn"]) {
    $(id).addEventListener("change", save);
  }

  $("reset").addEventListener("click", () => {
    area.set(DEFAULTS, () => {
      apply(DEFAULTS);
      $("status").textContent = "reset to defaults";
    });
  });
})();
