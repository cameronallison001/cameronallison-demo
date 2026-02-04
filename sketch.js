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
