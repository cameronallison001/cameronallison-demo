let dots = [];

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.id("p5-bg");
  noStroke();

  for (let i = 0; i < 120; i++) {
    dots.push({
      x: random(width),
      y: random(height),
      r: random(1, 4),
      s: random(0.2, 1.2)
    });
  }
}

function draw() {
  clear();
  fill(255, 255, 255, 25);

  for (const d of dots) {
    circle(d.x, d.y, d.r);
    d.y += d.s;
    if (d.y > height + 10) {
      d.y = -10;
      d.x = random(width);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
