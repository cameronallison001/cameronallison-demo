const bar = document.getElementById("progress-bar");
function updateProgress() {
  const top = window.scrollY;
  const doc = document.documentElement.scrollHeight - window.innerHeight;
  const pct = doc > 0 ? (top / doc) * 100 : 0;
  bar.style.width = pct + "%";
}
window.addEventListener("scroll", updateProgress);
window.addEventListener("resize", updateProgress);
updateProgress();
