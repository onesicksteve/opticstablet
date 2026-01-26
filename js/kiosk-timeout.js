// js/kiosk-timeout.js
(() => {
  const IDLE_MS = 2 * 60 * 1000; // 2 minutes
  const HOME_URL = "index.html";

  let timer = null;

  function goHome() {
    // If we're already on home, just do nothing
    const here = (location.pathname || "").toLowerCase();
    if (here.endsWith("/" + HOME_URL) || here.endsWith(HOME_URL)) return;

    location.href = HOME_URL;
  }

  function resetTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(goHome, IDLE_MS);
  }

  // Events that count as activity
  const events = [
    "touchstart",
    "touchmove",
    "pointerdown",
    "pointermove",
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "click",
  ];

  // Use capture so it still fires even if something stops propagation
  events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true, capture: true }));

  // Start the timer
  resetTimer();
})();
