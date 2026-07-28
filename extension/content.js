/* ============================================================
   RTL Vazir — content script
   Detects Persian/Arabic/other RTL text in chat messages and
   sets dir="rtl" on the block so the WHOLE block flows RTL.
   The browser's Unicode Bidi algorithm then renders inline
   English words, numbers and LTR runs (e.g. math) in their
   natural LTR order, embedded in the correct position within
   the RTL flow. So a sentence like "من به Google رفتم" reads
   as RTL with "Google" appearing LTR inline.

   Code, math and tables are explicitly excluded and forced
   back to LTR via CSS. The prompt composer (contenteditable /
   textarea / [role=textbox]) IS processed so typed Persian
   renders RTL.
   ============================================================ */
(() => {
  "use strict";

  if (window.__rtlVazirLoaded) return;
  window.__rtlVazirLoaded = true;

  // --- 1. RTL detection -----------------------------------------
  // Covers Hebrew, Arabic, Persian, Kurdish (Sorani), Urdu,
  // Sindhi, plus Arabic Presentation Forms-B.
  const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  const hasRTL = (s) => s && RTL_RE.test(s);

  // --- 2. Selectors ---------------------------------------------
  // Block-level elements that should get dir=auto when they
  // contain any RTL character.
  const TEXT_BLOCKS =
    "p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, summary, dt, dd, label, " +
    "[role=listitem], [role=heading], [role=blockquote]";

  // Leaf-ish elements where we only flip if the element's OWN
  // direct text contains an RTL character.
  const LEAF_TEXT = "div, span, a, bdi, output, label, em, strong, b, i, u, small, " +
    "[role=textbox]";

  // The composer and other editable elements are now INCLUDED in
  // processing so dir=auto applies to them too.
  const EDITABLES = "textarea, [contenteditable], [contenteditable=true], [contenteditable=\"\"]";

  // Truly off-limits: things that would render incorrectly if we
  // touched them, or that are already correctly LTR.
  const EXCLUDE =
    "pre, code, kbd, samp, tt, " +
    "table, thead, tbody, tfoot, tr, td, th, caption, " +
    "script, style, noscript, template, option, " +
    "input, select, button, " +
    ".katex, mjx-container, math, .MathJax, " +
    "[class*='katex'], [class*='mathjax'], [class*='MathJax'], " +
    "[role='math'], svg, formula";

  // --- 3. State --------------------------------------------------
  const state = { enabled: true, fontOn: true };
  const doc = document;
  const root = doc.documentElement;

  const isExcluded = (el) => !!el.closest(EXCLUDE);
  const isFlex = (el) => {
    const d = el.ownerDocument.defaultView
      .getComputedStyle(el).display || "";
    return d.includes("flex") || d.includes("grid");
  };
  const hasDirectRTLGlyph = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && hasRTL(n.nodeValue)) return true;
    }
    return false;
  };

  // --- 4. Core: process one element ------------------------------
  const process = (el) => {
    if (state.enabled === false) return;
    if (el.nodeType !== 1) return;
    if (el.closest && isExcluded(el)) return;
    if (el.dataset && el.dataset.rvDone === "1") return;

    const isEditable = el.matches(EDITABLES);
    const isBlock    = !isEditable && el.matches(TEXT_BLOCKS);
    const isLeaf     = !isEditable && !isBlock && el.matches(LEAF_TEXT);

    if (!isEditable && !isBlock && !isLeaf) return;

    // For block & editable: any RTL char anywhere is enough.
    // For leaf: only flip if a DIRECT text node is RTL.
    const rtl = isLeaf
      ? hasDirectRTLGlyph(el)
      : hasRTL(el.textContent || "");

    if (!rtl) {
      if (el.dataset) el.dataset.rvDone = "1";
      return;
    }

    // Don't flip flex/grid leaves — would reverse children.
    if (isLeaf && isFlex(el)) {
      if (el.dataset) el.dataset.rvDone = "1";
      return;
    }

    if (el.getAttribute("dir") !== "rtl") el.setAttribute("dir", "rtl");
    el.classList.add("rv-text");
    if (el.dataset) el.dataset.rvDone = "1";

    // After the browser has resolved the direction, mark the
    // element with .rv-rtl if it ended up RTL. CSS uses this
    // to decide whether to apply Vazir (only to RTL text, never
    // to LTR). We re-resolve on every call because the element's
    // text can change (token streaming) and the direction may
    // flip.
    const rtlProbe = () => {
      if (!el.isConnected) return;
      const dir = el.ownerDocument.defaultView
        .getComputedStyle(el).direction;
      el.classList.toggle("rv-rtl", dir === "rtl");
    };
    (el.ownerDocument.defaultView.requestAnimationFrame ||
     ((cb) => setTimeout(cb, 16)))(rtlProbe);
  };

  // --- 5. Walk a subtree (added nodes / document) ----------------
  // We use a single recursive walk rather than a TreeWalker, so
  // that we always visit BOTH a container AND its children. A
  // TreeWalker that returns FILTER_ACCEPT skips the subtree, so
  // a contenteditable parent (ProseMirror) would never be
  // followed into its <p> children — which is exactly the bug
  // that left typed Persian un-RTL'd in the ChatGPT composer.
  const walk = (root) => {
    if (!root) return;
    if (root.nodeType === 1) {
      process(root);
      // If the root itself matches EXCLUDE, don't recurse into it.
      if (root.matches && root.matches(EXCLUDE)) return;
      // Recurse into all element children.
      for (const child of root.children) walk(child);
    }
  };

  // --- 6. Mutation observer (streaming tokens, SPA updates) -----
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    (window.requestIdleCallback || window.requestAnimationFrame || ((cb) => setTimeout(cb, 50)))(() => {
      scheduled = false;
      if (pendingNodes.length) {
        const seen = new Set();
        for (const r of pendingNodes) {
          if (r && !seen.has(r)) { seen.add(r); walk(r); }
        }
        pendingNodes.length = 0;
      }
    });
  };
  const pendingNodes = [];

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData") {
        if (m.target && m.target.parentNode) pendingNodes.push(m.target.parentNode);
      } else if (m.type === "childList") {
        for (const a of m.addedNodes) {
          if (a.nodeType === 1) pendingNodes.push(a);
        }
      }
    }
    schedule();
  });

  // --- 7. Apply settings to <html> -------------------------------
  const applySettings = (s) => {
    state.enabled = s.enabled !== false;
    state.fontOn  = s.fontOn  !== false;
    root.classList.toggle("rv-rtl-off",   !state.enabled);
    root.classList.toggle("rv-font-off",  !state.fontOn);
    if (state.enabled) {
      pendingNodes.push(doc.body);
      schedule();
    }
  };

  // --- 8. Init ---------------------------------------------------
  const init = () => {
    const api = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
    const area = api.sync || api.local;

    const load = () => {
      try {
        area.get({ enabled: true, fontOn: true }, (v) => {
          applySettings(v || { enabled: true, fontOn: true });
        });
      } catch {
        applySettings({ enabled: true, fontOn: true });
      }
    };

    if (api.onChanged && api.onChanged.addListener) {
      api.onChanged.addListener((changes, ns) => {
        if (ns !== "sync" && ns !== "local") return;
        area.get({ enabled: true, fontOn: true }, (v) => applySettings(v || {}));
      });
    }

    load();
    walk(doc.body);
    obs.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
