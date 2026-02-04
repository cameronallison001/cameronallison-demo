const bar = document.getElementById("progress-bar");

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  if (bar) bar.style.width = pct + "%";
}

window.addEventListener("scroll", updateProgress);
window.addEventListener("resize", updateProgress);
updateProgress();
