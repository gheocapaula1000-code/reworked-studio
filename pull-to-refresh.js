/* Trascina in giù per aggiornare: hard refresh (cache svuotata, service worker aggiornato, ricarica). Le note salvate restano. Generato da hardPullToRefresh.ts */
(() => {
  // hardPullToRefresh.ts
  var PTR_THRESHOLD_PX = 72;
  var PTR_MAX_PX = 120;
  var PTR_RESISTANCE = 0.5;
  var REFRESH_PARAM = "_aggiorna";
  var INSTALLED_FLAG = "__pigiHardPullToRefresh";
  var LABELS_IT = {
    pull: "Trascina per aggiornare",
    release: "Rilascia per aggiornare",
    refreshing: "Aggiorno…",
    unsaved: "Hai scritto qualcosa: salvalo prima di aggiornare"
  };
  var BLOCKED_SELECTOR = [
    "[data-no-pull-refresh]",
    "[role='dialog']",
    "[role='alertdialog']",
    "[aria-modal='true']",
    "[data-vaul-drawer]",
    "[data-radix-popper-content-wrapper]",
    "[role='listbox']",
    "[role='menu']",
    "dialog",
    ".leaflet-container",
    ".maplibregl-map",
    ".mapboxgl-map",
    ".gm-style",
    "canvas",
    "video",
    "input",
    "textarea",
    "select",
    "[contenteditable='']",
    "[contenteditable='true']"
  ].join(",");
  var OPEN_OVERLAY_SELECTOR = [
    "[role='dialog'][data-state='open']",
    "[role='alertdialog'][data-state='open']",
    "[aria-modal='true']",
    "[data-vaul-drawer][data-state='open']",
    "dialog[open]"
  ].join(",");
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((r) => setTimeout(() => r(undefined), ms))]);
  }
  function postSkipWaiting(sw) {
    if (!sw)
      return;
    try {
      sw.postMessage({ type: "SKIP_WAITING" });
    } catch {}
    try {
      sw.postMessage("SKIP_WAITING");
    } catch {}
  }
  function waitInstalled(sw, ms) {
    if (sw.state !== "installing")
      return Promise.resolve();
    return withTimeout(new Promise((resolve) => {
      sw.addEventListener("statechange", () => {
        if (sw.state !== "installing")
          resolve();
      });
    }), ms).then(() => {
      return;
    });
  }
  async function reinstall(reg) {
    try {
      const script = new URL(reg.active.scriptURL);
      script.searchParams.set(REFRESH_PARAM, Date.now().toString(36));
      await withTimeout(navigator.serviceWorker.register(script.pathname + script.search, { scope: reg.scope }), 2000);
    } catch {}
  }
  async function serverReachable() {
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return false;
    if (typeof fetch !== "function")
      return true;
    try {
      const res = await withTimeout(fetch(window.location.href, { method: "HEAD", cache: "no-store", credentials: "same-origin" }), 3000);
      return !!res;
    } catch {
      return false;
    }
  }
  async function hardRefresh(reload = () => window.location.reload()) {
    if (!await serverReachable()) {
      reload();
      return;
    }
    try {
      if (typeof caches !== "undefined") {
        const keys = await withTimeout(caches.keys(), 2000);
        if (keys)
          await withTimeout(Promise.all(keys.map((k) => caches.delete(k))), 2000);
      }
    } catch {}
    try {
      if ("serviceWorker" in navigator) {
        const regs = await withTimeout(navigator.serviceWorker.getRegistrations(), 1500) ?? [];
        let activating = false;
        await withTimeout(Promise.all(regs.map(async (reg) => {
          try {
            await reg.update();
          } catch {}
          if (reg.installing)
            await waitInstalled(reg.installing, 3000);
          if (!reg.waiting && reg.active) {
            await reinstall(reg);
          }
          if (reg.waiting) {
            activating = true;
            postSkipWaiting(reg.waiting);
          }
        })), 4000);
        if (activating && navigator.serviceWorker.controller) {
          await withTimeout(new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true })), 1500);
        }
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set(REFRESH_PARAM, Date.now().toString(36));
    try {
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      reload();
    } catch {
      window.location.replace(url.toString());
    }
  }
  function stripRefreshParam() {
    if (typeof window === "undefined")
      return;
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has(REFRESH_PARAM))
        return;
      url.searchParams.delete(REFRESH_PARAM);
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch {}
  }
  function isTyping() {
    const el = document.activeElement;
    if (el && el !== document.body) {
      if (el.isContentEditable)
        return true;
      const tag = el.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT")
        return true;
      if (tag === "INPUT") {
        const type = (el.type || "text").toLowerCase();
        if (!["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(type))
          return true;
      }
    }
    const vv = window.visualViewport;
    if (vv && vv.height < window.innerHeight * 0.7)
      return true;
    return false;
  }
  var TEXT_INPUT_TYPES = ["", "text", "email", "tel", "url", "number", "password", "date", "datetime-local", "month", "time", "week"];
  function isDataField(el) {
    if (!(el instanceof HTMLElement))
      return false;
    if (el.closest("[data-no-unsaved-guard]"))
      return false;
    if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT")
      return true;
    if (el.tagName !== "INPUT")
      return false;
    const input = el;
    const type = (input.getAttribute("type") || "").toLowerCase();
    if (!TEXT_INPUT_TYPES.includes(type))
      return false;
    const hint = `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") ?? ""} ${input.getAttribute("role") ?? ""}`.toLowerCase();
    return !/search|cerca|ricerca|filtra|filter/.test(hint);
  }
  function fieldHasNewText(el) {
    if (el.isContentEditable)
      return (el.textContent ?? "").trim() !== "";
    if (el.tagName === "SELECT") {
      const select = el;
      return Array.from(select.options).some((o) => o.selected !== o.defaultSelected);
    }
    const field = el;
    return field.value.trim() !== "" && field.value !== field.defaultValue;
  }
  function isBlocked(target) {
    if (document.body?.hasAttribute("data-scroll-locked"))
      return true;
    for (const o of Array.from(document.querySelectorAll(OPEN_OVERLAY_SELECTOR))) {
      if (o.getClientRects().length > 0 && getComputedStyle(o).visibility !== "hidden")
        return true;
    }
    const el = target instanceof Element ? target : null;
    return !!el?.closest(BLOCKED_SELECTOR);
  }
  function isAtTop(target) {
    const se = document.scrollingElement || document.documentElement;
    if ((window.scrollY || 0) > 0 || se && se.scrollTop > 0)
      return false;
    let el = target instanceof Element ? target : null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop > 0) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay")
          return false;
      }
      el = el.parentElement;
    }
    return true;
  }
  var ARROW_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  function createIndicator() {
    const root = document.createElement("div");
    root.setAttribute("data-ptr-indicator", "");
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    root.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:calc(env(safe-area-inset-top, 0px) + 10px)",
      "z-index:2147483000",
      "display:flex",
      "align-items:center",
      "gap:8px",
      "padding:9px 16px",
      "border-radius:999px",
      "background:#ffffff",
      "color:#111827",
      "font:600 14px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
      "box-shadow:0 6px 20px rgba(0,0,0,.18)",
      "border:1px solid rgba(0,0,0,.08)",
      "pointer-events:none",
      "white-space:nowrap",
      "max-width:calc(100vw - 24px)",
      "opacity:0",
      "transform:translate(-50%,-80px)",
      "will-change:transform,opacity"
    ].join(";");
    const icon = document.createElement("span");
    icon.style.cssText = "display:inline-flex;transition:transform .12s linear";
    icon.innerHTML = ARROW_SVG;
    const text = document.createElement("span");
    root.append(icon, text);
    return { root, icon, text };
  }
  var spinStyleAdded = false;
  function ensureSpinStyle() {
    if (spinStyleAdded)
      return;
    spinStyleAdded = true;
    const s = document.createElement("style");
    s.textContent = "@keyframes pigi-ptr-spin{to{transform:rotate(360deg)}}" + "html,body{overscroll-behavior-y:none}";
    document.head.appendChild(s);
  }
  function installHardPullToRefresh(options = {}) {
    if (typeof window === "undefined" || typeof document === "undefined")
      return () => {};
    stripRefreshParam();
    const w = window;
    if (w[INSTALLED_FLAG])
      return () => {};
    const touchCapable = "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
    if (!touchCapable)
      return () => {};
    w[INSTALLED_FLAG] = true;
    ensureSpinStyle();
    const threshold = options.threshold ?? PTR_THRESHOLD_PX;
    const getLabels = () => typeof options.labels === "function" ? options.labels() : options.labels ?? LABELS_IT;
    const doRefresh = options.onRefresh ?? (() => hardRefresh());
    let dirtyPath = null;
    const edited = new Set;
    const onInput = (e) => {
      if (!isDataField(e.target))
        return;
      if (dirtyPath !== window.location.pathname)
        edited.clear();
      dirtyPath = window.location.pathname;
      edited.add(e.target);
    };
    const onSubmit = () => {
      dirtyPath = null;
      edited.clear();
    };
    const hasUnsaved = () => {
      if (dirtyPath === null || dirtyPath !== window.location.pathname)
        return false;
      for (const el of edited) {
        if (!el.isConnected)
          edited.delete(el);
        else if (fieldHasNewText(el))
          return true;
        else
          edited.delete(el);
      }
      return false;
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    const ui = createIndicator();
    let mounted = false;
    const mount = () => {
      if (!mounted) {
        document.body.appendChild(ui.root);
        mounted = true;
      }
    };
    let startX = 0;
    let startY = 0;
    let armed = false;
    let pulling = false;
    let distance = 0;
    let busy = false;
    let passed = false;
    const render = () => {
      mount();
      const labels = getLabels();
      const ready = distance >= threshold;
      const y = Math.min(distance, PTR_MAX_PX) - 60;
      ui.root.style.transition = "none";
      ui.root.style.opacity = String(Math.min(1, distance / (threshold * 0.6)));
      ui.root.style.transform = `translate(-50%, ${y}px)`;
      ui.icon.style.animation = "";
      ui.icon.style.transform = `rotate(${Math.round(distance / threshold * 270)}deg)`;
      if (hasUnsaved()) {
        ui.text.textContent = labels.unsaved;
        return;
      }
      ui.text.textContent = ready ? labels.release : labels.pull;
      if (ready && !passed) {
        passed = true;
        try {
          navigator.vibrate?.(8);
        } catch {}
      } else if (!ready)
        passed = false;
    };
    const hide = () => {
      ui.root.style.transition = "transform .2s ease-out, opacity .2s ease-out";
      ui.root.style.opacity = "0";
      ui.root.style.transform = "translate(-50%,-80px)";
    };
    const reset = () => {
      armed = false;
      pulling = false;
      distance = 0;
      passed = false;
    };
    const onStart = (e) => {
      reset();
      if (busy || e.touches.length !== 1)
        return;
      if (isTyping() || isBlocked(e.target) || !isAtTop(e.target))
        return;
      try {
        if (options.blocked?.())
          return;
      } catch {}
      const t = e.touches[0];
      if (!t)
        return;
      startX = t.clientX;
      startY = t.clientY;
      armed = true;
    };
    const onMove = (e) => {
      if (!armed || busy)
        return;
      if (e.touches.length !== 1) {
        reset();
        hide();
        return;
      }
      const t = e.touches[0];
      if (!t)
        return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!pulling) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          reset();
          return;
        }
        if (dy < 0) {
          reset();
          return;
        }
        if (dy < 12)
          return;
        if (!isAtTop(e.target)) {
          reset();
          return;
        }
        pulling = true;
      }
      if (e.cancelable)
        e.preventDefault();
      distance = Math.max(0, dy * PTR_RESISTANCE);
      if (distance === 0) {
        hide();
        return;
      }
      render();
    };
    const onEnd = () => {
      if (!pulling) {
        reset();
        return;
      }
      const fire = distance >= threshold && !busy && !hasUnsaved();
      reset();
      if (!fire) {
        hide();
        return;
      }
      busy = true;
      mount();
      ui.root.style.transition = "transform .15s ease-out";
      ui.root.style.opacity = "1";
      ui.root.style.transform = "translate(-50%, 6px)";
      ui.icon.style.transform = "";
      ui.icon.style.animation = "pigi-ptr-spin .8s linear infinite";
      ui.text.textContent = getLabels().refreshing;
      Promise.resolve().then(() => doRefresh()).catch(() => window.location.reload()).finally(() => {
        if (options.onRefresh) {
          busy = false;
          ui.icon.style.animation = "";
          hide();
        }
      });
    };
    const onCancel = () => {
      reset();
      hide();
    };
    const opts = { capture: true, passive: false };
    window.addEventListener("touchstart", onStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onMove, opts);
    window.addEventListener("touchend", onEnd, { capture: true });
    window.addEventListener("touchcancel", onCancel, { capture: true });
    return () => {
      window.removeEventListener("touchstart", onStart, { capture: true });
      window.removeEventListener("touchmove", onMove, { capture: true });
      window.removeEventListener("touchend", onEnd, { capture: true });
      window.removeEventListener("touchcancel", onCancel, { capture: true });
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
      ui.root.remove();
      w[INSTALLED_FLAG] = false;
    };
  }

  // iife-entry.ts
  window.pigiHardRefresh = hardRefresh;
  installHardPullToRefresh();
})();
