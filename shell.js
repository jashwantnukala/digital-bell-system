// Shared topbar behavior used by every internal page.
// Toggles the mobile nav dropdown and closes it on outside click / Escape / navigation.
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".topbar nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target) && e.target !== toggle) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
});
