// three-viewer.js
// Switch between the two <model-viewer> elements already in the HTML

window.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("three-status");

  const mvHeadset = document.getElementById("mv-headset");
  const mvSelf = document.getElementById("mv-self");

  const modelBtns = document.querySelectorAll(".model-btn");
  const previews = document.querySelectorAll(".model-preview");

  if (!mvHeadset || !mvSelf) {
    console.error("❌ model-viewer elements not found (#mv-headset / #mv-self).");
    if (status) status.textContent = "Error: model viewers not found.";
    return;
  }

  function setActiveUI(modelName) {
    modelBtns.forEach((b) => b.classList.toggle("active", b.dataset.model === modelName));
    previews.forEach((p) => p.classList.toggle("active", p.dataset.model === modelName));
  }

  function showModel(modelName) {
    const showHeadset = modelName === "headset0.glb";

    // Toggle visibility
    mvHeadset.classList.toggle("mv-hidden", !showHeadset);
    mvSelf.classList.toggle("mv-hidden", showHeadset);

    // Optional: restart auto-rotate feel
    const activeViewer = showHeadset ? mvHeadset : mvSelf;
    if (activeViewer && activeViewer.resetTurntableRotation) {
      activeViewer.resetTurntableRotation();
    }

    setActiveUI(modelName);
    if (status) status.textContent = `Showing: ${modelName}`;
  }

  // Button clicks
  modelBtns.forEach((btn) => {
    btn.addEventListener("click", () => showModel(btn.dataset.model));
  });

  // Preview clicks + keyboard (Enter/Space)
  previews.forEach((card) => {
    card.addEventListener("click", () => showModel(card.dataset.model));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showModel(card.dataset.model);
      }
    });
  });

  // Set initial model to whatever is marked active in HTML
  const initiallyActive =
    document.querySelector(".model-btn.active")?.dataset.model ||
    document.querySelector(".model-preview.active")?.dataset.model ||
    "self-portrait2.glb";

  showModel(initiallyActive);
});
