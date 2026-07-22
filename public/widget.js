/**
 * Alex widget loader.
 *
 * One-line install on a job board's site:
 *   <script src="https://<host>/widget.js" data-client-id="…"></script>
 *
 * Injects a floating launcher button and mounts the chat UI in a sandboxed
 * iframe hosted on our origin. All logic (LLM, search) is server-side; nothing
 * sensitive ships in this file. Slice 1: chat only, placeholder branding.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var clientId = script.getAttribute("data-client-id") || "placeholder";
  // Our origin is wherever this script was served from.
  var origin = new URL(script.src).origin;
  var BRAND_COLOR = "oklch(0.54 0.23 293)";

  function el(tag, styles) {
    var node = document.createElement(tag);
    Object.assign(node.style, styles);
    return node;
  }

  // ── Chat iframe (hidden until opened) ──────────────────────────────
  var iframe = el("iframe", {
    position: "fixed",
    bottom: "88px",
    right: "20px",
    width: "380px",
    height: "560px",
    maxHeight: "calc(100vh - 120px)",
    maxWidth: "calc(100vw - 40px)",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    zIndex: "2147483000",
    display: "none",
    background: "white",
  });
  iframe.src = origin + "/embed?client_id=" + encodeURIComponent(clientId);
  iframe.setAttribute("title", "Alex chat");

  // ── Launcher button ────────────────────────────────────────────────
  var button = el("button", {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: BRAND_COLOR,
    color: "white",
    fontSize: "24px",
    lineHeight: "56px",
    textAlign: "center",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    zIndex: "2147483001",
    padding: "0",
  });
  button.setAttribute("aria-label", "Open Alex chat");

  // Folded state shows the tenant's logo when set (fetched below), else 💬.
  // Open state always shows the ✕ on the brand color.
  var open = false;
  var logoUrl = null;

  function render() {
    if (open) {
      button.style.backgroundImage = "none";
      button.style.background = BRAND_COLOR;
      button.innerHTML = "&#10005;"; // ✕
    } else if (logoUrl) {
      button.innerHTML = "";
      button.style.background = "white";
      button.style.backgroundImage = 'url("' + logoUrl + '")';
      button.style.backgroundSize = "cover";
      button.style.backgroundPosition = "center";
      button.style.backgroundRepeat = "no-repeat";
    } else {
      button.style.backgroundImage = "none";
      button.style.background = BRAND_COLOR;
      button.innerHTML = "&#128172;"; // 💬
    }
    button.setAttribute("aria-label", open ? "Close Alex chat" : "Open Alex chat");
  }
  render();

  // Pull the tenant's branding (logo) for the folded button. Non-blocking.
  fetch(origin + "/api/widget-config?client_id=" + encodeURIComponent(clientId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg && cfg.logoUrl) {
        logoUrl = cfg.logoUrl;
        render();
      }
    })
    .catch(function () { /* keep the default 💬 button */ });

  button.addEventListener("click", function () {
    open = !open;
    iframe.style.display = open ? "block" : "none";
    render();
  });

  function mount() {
    document.body.appendChild(iframe);
    document.body.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
