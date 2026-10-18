/* Banner «C'è una nuova versione dell'app»: uno per pubblicazione, «Aggiorna ora» = hard refresh (dati salvati restano). Generato da updateBanner.ts */
(() => {
  // hardPullToRefresh.ts
  var REFRESH_PARAM = "_aggiorna";
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
    return Promise.race([p, new Promise((r) => setTimeout(() => r(void 0), ms))]);
  }
  function postSkipWaiting(sw) {
    if (!sw) return;
    try {
      sw.postMessage({ type: "SKIP_WAITING" });
    } catch (e) {
    }
    try {
      sw.postMessage("SKIP_WAITING");
    } catch (e) {
    }
  }
  function waitInstalled(sw, ms) {
    if (sw.state !== "installing") return Promise.resolve();
    return withTimeout(
      new Promise((resolve) => {
        sw.addEventListener("statechange", () => {
          if (sw.state !== "installing") resolve();
        });
      }),
      ms
    ).then(() => void 0);
  }
  async function reinstall(reg) {
    try {
      const script2 = new URL(reg.active.scriptURL);
      script2.searchParams.set(REFRESH_PARAM, Date.now().toString(36));
      await withTimeout(
        navigator.serviceWorker.register(script2.pathname + script2.search, { scope: reg.scope }),
        2e3
      );
    } catch (e) {
    }
  }
  async function serverReachable() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    if (typeof fetch !== "function") return true;
    try {
      const res = await withTimeout(
        fetch(window.location.href, { method: "HEAD", cache: "no-store", credentials: "same-origin" }),
        3e3
      );
      return !!res;
    } catch (e) {
      return false;
    }
  }
  async function hardRefresh(reload = () => window.location.reload()) {
    var _a;
    if (!await serverReachable()) {
      reload();
      return;
    }
    try {
      if (typeof caches !== "undefined") {
        const keys = await withTimeout(caches.keys(), 2e3);
        if (keys) await withTimeout(Promise.all(keys.map((k) => caches.delete(k))), 2e3);
      }
    } catch (e) {
    }
    try {
      if ("serviceWorker" in navigator) {
        const regs = (_a = await withTimeout(navigator.serviceWorker.getRegistrations(), 1500)) != null ? _a : [];
        let activating = false;
        await withTimeout(
          Promise.all(
            regs.map(async (reg) => {
              try {
                await reg.update();
              } catch (e) {
              }
              if (reg.installing) await waitInstalled(reg.installing, 3e3);
              if (!reg.waiting && reg.active) {
                await reinstall(reg);
              }
              if (reg.waiting) {
                activating = true;
                postSkipWaiting(reg.waiting);
              }
            })
          ),
          4e3
        );
        if (activating && navigator.serviceWorker.controller) {
          await withTimeout(
            new Promise(
              (resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true })
            ),
            1500
          );
        }
      }
    } catch (e) {
    }
    const url = new URL(window.location.href);
    url.searchParams.set(REFRESH_PARAM, Date.now().toString(36));
    try {
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      reload();
    } catch (e) {
      window.location.replace(url.toString());
    }
  }

  // updateBanner.ts
  var STORE_KEY = "pigi-app-version";
  var ROOT_ID = "pigi-update-banner";
  var FLAG = "__pigiUpdateBanner";
  var DEFAULT_BLOCKED = /(check-?out|pagament|payment|abbonati\/|\/paga)/i;
  var OPEN_OVERLAY = [
    "[role='dialog'][data-state='open']",
    "[role='alertdialog'][data-state='open']",
    "[aria-modal='true']",
    "[data-vaul-drawer][data-state='open']",
    "dialog[open]"
  ].join(",");
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function save(s) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch (e) {
    }
  }
  function embeddedBuildId() {
    try {
      return typeof __PIGI_BUILD_ID__ === "string" && __PIGI_BUILD_ID__ ? __PIGI_BUILD_ID__ : null;
    } catch (e) {
      return null;
    }
  }
  function isTyping() {
    var _a;
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    if ((_a = el.closest) == null ? void 0 : _a.call(el, "#" + ROOT_ID)) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    if (el.tagName === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(t);
    }
    return false;
  }
  function overlayOpen() {
    for (const o of Array.from(document.querySelectorAll(OPEN_OVERLAY))) {
      if (o.closest("#" + ROOT_ID)) continue;
      const r = o.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return true;
    }
    return false;
  }
  function cssColor(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (!v) return fallback;
      if (/^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(v)) return `var(${name})`;
      if (/^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%/.test(v)) return `hsl(var(${name}))`;
    } catch (e) {
    }
    return fallback;
  }
  function installUpdateBanner(options = {}) {
    var _a, _b;
    if (typeof window === "undefined" || typeof document === "undefined") return () => {
    };
    const w = window;
    if (w[FLAG]) return () => {
    };
    w[FLAG] = true;
    const current = options.currentBuildId === void 0 ? embeddedBuildId() : options.currentBuildId;
    const versionUrl = options.versionUrl || "/version.json";
    const interval = (_a = options.intervalMs) != null ? _a : 5 * 60 * 1e3;
    const blockedPaths = (_b = options.blockedPaths) != null ? _b : DEFAULT_BLOCKED;
    const L = {
      title: "C'\xE8 una nuova versione dell'app",
      text: "Tocca \xABAggiorna ora\xBB: i tuoi dati restano.",
      button: "Aggiorna ora",
      updating: "Aggiorno\u2026",
      close: "Chiudi",
      ...options.labels
    };
    let pending = null;
    let root = null;
    let lastCheck = 0;
    let waitTimer = null;
    let stopped = false;
    let firstCheck = true;
    {
      const s = load();
      if (current) {
        if (s.seen !== current) {
          s.seen = current;
          save(s);
        }
      }
    }
    function canShow() {
      var _a2;
      if (document.visibilityState === "hidden") return false;
      if (blockedPaths.test(window.location.pathname)) return false;
      if (isTyping() || overlayOpen()) return false;
      if ((_a2 = options.blocked) == null ? void 0 : _a2.call(options)) return false;
      return true;
    }
    function hide() {
      root == null ? void 0 : root.remove();
      root = null;
    }
    function render(id) {
      var _a2;
      if (root && root.dataset.version === id) return;
      hide();
      document.querySelectorAll("#" + ROOT_ID).forEach((n) => n.remove());
      const t = options.theme || {};
      const bg = t.bg || cssColor("--card", cssColor("--background", "#ffffff"));
      const fg = t.fg || cssColor("--card-foreground", cssColor("--foreground", "#111827"));
      const accent = t.accent || cssColor("--primary", "#2563eb");
      const accentFg = t.accentFg || cssColor("--primary-foreground", "#ffffff");
      const border = t.border || cssColor("--border", "rgba(0,0,0,.12)");
      const radius = t.radius || "16px";
      const font = t.font || "inherit";
      const top = (_a2 = options.topOffset) != null ? _a2 : 0;
      const el = document.createElement("div");
      el.id = ROOT_ID;
      el.dataset.version = id;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("data-no-pull-refresh", "");
      el.style.cssText = [
        "position:fixed",
        "left:max(8px, env(safe-area-inset-left))",
        "right:max(8px, env(safe-area-inset-right))",
        `top:calc(env(safe-area-inset-top, 0px) + ${8 + top}px)`,
        "z-index:2147483000",
        "margin:0 auto",
        "max-width:480px",
        "box-sizing:border-box",
        `background:${bg}`,
        `color:${fg}`,
        `border:1px solid ${border}`,
        `border-radius:${radius}`,
        "box-shadow:0 10px 30px rgba(0,0,0,.18)",
        "padding:12px 44px 12px 14px",
        `font-family:${font}`,
        "font-size:15px",
        "line-height:1.35",
        "text-align:left"
      ].join(";");
      const title = document.createElement("p");
      title.textContent = L.title;
      title.style.cssText = "margin:0 0 2px;font-weight:700;font-size:16px";
      const text = document.createElement("p");
      text.textContent = L.text;
      text.style.cssText = "margin:0 0 10px;opacity:.85;font-size:14px";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = L.button;
      btn.setAttribute("data-update-now", "");
      btn.style.cssText = [
        "display:block",
        "width:100%",
        "min-height:48px",
        "border:0",
        `border-radius:${radius === "0" ? "0" : "12px"}`,
        `background:${accent}`,
        `color:${accentFg}`,
        "font:inherit",
        "font-size:16px",
        "font-weight:700",
        "cursor:pointer"
      ].join(";");
      const x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", L.close);
      x.setAttribute("data-update-close", "");
      x.textContent = "\xD7";
      x.style.cssText = "position:absolute;top:4px;right:4px;width:40px;height:40px;border:0;background:transparent;color:inherit;font-size:26px;line-height:1;cursor:pointer;border-radius:999px";
      x.addEventListener("click", () => {
        const s = load();
        s.dismissed = id;
        save(s);
        pending = null;
        hide();
      });
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = L.updating;
        const s = load();
        s.seen = id;
        s.updatedTo = id;
        s.dismissed = void 0;
        save(s);
        try {
          if (options.onUpdate) await options.onUpdate();
          else await hardRefresh();
        } catch (e) {
          window.location.reload();
        }
      });
      el.append(title, text, btn, x);
      document.body.appendChild(el);
      root = el;
    }
    function tryShow() {
      if (stopped) return;
      if (!pending) {
        hide();
        return;
      }
      if (canShow()) {
        render(pending);
        if (waitTimer) {
          clearInterval(waitTimer);
          waitTimer = null;
        }
      } else if (!root && !waitTimer) {
        waitTimer = setInterval(tryShow, 3e3);
      }
    }
    async function check(force = false) {
      var _a2;
      if (stopped) return;
      const now = Date.now();
      if (!force && now - lastCheck < 3e4) return;
      lastCheck = now;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      let id = null;
      try {
        if ((_a2 = options.versionFiles) == null ? void 0 : _a2.length) {
          const texts = await Promise.all(
            options.versionFiles.map(async (f) => {
              const sep = f.includes("?") ? "&" : "?";
              const res = await fetch(`${f}${sep}pigi-v=${now.toString(36)}`, { cache: "no-store", credentials: "same-origin" });
              if (!res.ok) throw new Error("status");
              return res.text();
            })
          );
          let h = 5381;
          const all = texts.join("\0");
          for (let i = 0; i < all.length; i++) h = (h << 5) + h + all.charCodeAt(i) | 0;
          id = "f" + (h >>> 0).toString(36) + all.length.toString(36);
        } else {
          const sep = versionUrl.includes("?") ? "&" : "?";
          const res = await fetch(`${versionUrl}${sep}pigi-v=${now.toString(36)}`, { cache: "no-store", credentials: "same-origin" });
          if (!res.ok) return;
          const data = await res.json();
          id = typeof (data == null ? void 0 : data.buildId) === "string" && data.buildId ? data.buildId : null;
        }
      } catch (e) {
        return;
      }
      if (!id) return;
      const wasFirst = firstCheck;
      firstCheck = false;
      const s = load();
      if (current) {
        if (id === current) {
          pending = null;
        } else if (s.dismissed === id || s.updatedTo === id) {
          pending = null;
        } else {
          pending = id;
        }
      } else {
        if (wasFirst || !s.seen) {
          s.seen = id;
          save(s);
          pending = null;
        } else if (id === s.seen || s.dismissed === id) {
          pending = null;
        } else {
          pending = id;
        }
      }
      tryShow();
    }
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    const startTimer = setTimeout(() => void check(true), 2500);
    const loop = setInterval(() => void check(true), interval);
    w.__pigiCheckUpdate = () => check(true);
    return () => {
      stopped = true;
      w[FLAG] = false;
      clearTimeout(startTimer);
      clearInterval(loop);
      if (waitTimer) clearInterval(waitTimer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
      hide();
    };
  }

  // static-entry.ts
  var script = document.currentScript;
  var files = ((script == null ? void 0 : script.dataset.files) || "/sw.js,/index.html").split(",").map((s) => s.trim()).filter(Boolean);
  var d = (script == null ? void 0 : script.dataset) || {};
  var start = () => installUpdateBanner({
    currentBuildId: null,
    versionFiles: files,
    theme: {
      bg: d.bg || "#0d2340",
      fg: d.fg || "#e8eaed",
      accent: d.accent || "#6c8cff",
      accentFg: d.accentFg || "#081a31",
      border: d.border || "#24426c"
    }
  });
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
