let dots = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();

  const count = Math.floor((windowWidth * windowHeight) / 22000);
  for (let i = 0; i < count; i++) {
    dots.push({
      x: random(width),
      y: random(height),
      r: random(1, 2.5),
      s: random(0.2, 0.7), // speed
      o: random(0.06, 0.16) // opacity
    });
  }
}

function draw() {
  // transparent background for trailing
  background(11, 11, 15, 18);

  // subtle drifting dots
  for (let d of dots) {
    d.y -= d.s;
    if (d.y < -10) {
      d.y = height + 10;
      d.x = random(width);
    }

    // tiny glow
    fill(255, 255, 255, 255 * d.o);
    circle(d.x, d.y, d.r);
  }

  // soft highlight band (adds depth)
  fill(140, 160, 255, 12);
  ellipse(width * 0.25, height * 0.2, width * 0.8, height * 0.6);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
let cnv;

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style("position", "fixed");
  cnv.style("top", "0");
  cnv.style("left", "0");

  // Keep p5 behind your HTML (including model-viewer)
  cnv.style("z-index", "-1");

  // IMPORTANT: don't let canvas block mouse interaction
  cnv.style("pointer-events", "none");
}

function draw() {
  clear(); // transparent canvas so your CSS background shows

  // Optional subtle animated glow background
  noStroke();
  const t = millis() * 0.0002;

  for (let i = 0; i < 6; i++) {
    const x = width * (0.2 + 0.6 * noise(i * 10 + t));
    const y = height * (0.2 + 0.6 * noise(i * 20 + t));
    const r = 220 + 120 * noise(i * 30 + t);

    fill(140, 160, 255, 18); // soft bluish glow
    circle(x, y, r);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

