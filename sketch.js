// Breath Pacer
// A soft circle that grows as you breathe in and shrinks as you breathe out,
// with an airy, shimmering tone at the start of each inhale and exhale.
// Tap to begin. Tap again to switch breathing patterns.
 
let audio;            // the browser's built-in sound engine
let reverb;           // gives the tones a spacious, echoing feel
let started = false;
let patternIndex = 0;
let phaseIndex = 0;
let phaseStart = 0;   // when the current phase began, in milliseconds
let lastTap = 0;      // used to ignore a phone tap that registers twice
 
// Each pattern is a list of phases. "from" and "to" say where the circle
// starts and ends during that phase: 0 is small, 1 is full.
const patterns = [
  {
    name: "calm · 4 in, 6 out",
    phases: [
      { label: "breathe in", secs: 4, from: 0, to: 1, note: 64 },
      { label: "breathe out", secs: 6, from: 1, to: 0, note: 57 },
    ],
  },
  {
    name: "box · 4, 4, 4, 4",
    phases: [
      { label: "breathe in", secs: 4, from: 0, to: 1, note: 64 },
      { label: "hold", secs: 4, from: 1, to: 1, note: null },
      { label: "breathe out", secs: 4, from: 1, to: 0, note: 57 },
      { label: "hold", secs: 4, from: 0, to: 0, note: null },
    ],
  },
  {
    name: "relax · 4 in, 7 hold, 8 out",
    phases: [
      { label: "breathe in", secs: 4, from: 0, to: 1, note: 64 },
      { label: "hold", secs: 7, from: 1, to: 1, note: null },
      { label: "breathe out", secs: 8, from: 1, to: 0, note: 57 },
    ],
  },
];
 
function setup() {
  createCanvas(windowWidth, windowHeight);
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
 
  // Load Crimson Pro, an elegant serif font from Google Fonts
  let font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;1,400&display=swap";
  document.head.appendChild(font);
 
  textAlign(CENTER, CENTER);
  noStroke();
 
  // Listen for taps and clicks directly from the browser.
  // "touchend" is what iPhones count as a real tap for unlocking sound.
  document.addEventListener("touchend", handleTap, { passive: true });
  document.addEventListener("click", handleTap);
}
 
function draw() {
  background(16, 24, 38);
 
  let pattern = patterns[patternIndex];
  let phase = pattern.phases[phaseIndex];
  let size = 0;
  let progress = 0;
 
  if (started) {
    // How far through this phase are we, from 0 to 1?
    progress = (millis() - phaseStart) / (phase.secs * 1000);
 
    if (progress >= 1) {
      nextPhase();
      phase = pattern.phases[phaseIndex];
      progress = 0;
    }
 
    // Ease in and out so the circle moves like a real breath
    let eased = (1 - cos(progress * PI)) / 2;
    size = lerp(phase.from, phase.to, eased);
  }
 
  drawCircle(size);
  drawText(pattern, phase, progress);
}
 
function drawCircle(size) {
  let minR = min(width, height) * 0.12;
  let maxR = min(width, height) * 0.36;
  let r = lerp(minR, maxR, size);
 
  // Soft glow: several see-through circles stacked from large to small
  for (let i = 6; i > 0; i--) {
    fill(120, 190, 220, 14);
    circle(width / 2, height / 2, r * 2 + i * 22);
  }
 
  // The main circle shifts from deep blue toward soft teal as it fills
  let c = lerpColor(color(70, 110, 180), color(130, 210, 200), size);
  fill(c);
  circle(width / 2, height / 2, r * 2);
}
 
function drawText(pattern, phase, progress) {
  // Crimson Pro is a graceful serif; until it loads, a plain font stands in
  textFont("Crimson Pro");
  textSize(28);
 
  if (!started) {
    // Gently pulse the starting message
    fill(235, 242, 248, 140 + 60 * sin(millis() / 600));
    text("tap to begin", width / 2, height / 2);
  } else {
    // Fade each label in at the start of a phase and out near the end
    let fadeIn = constrain(progress / 0.15, 0, 1);
    let fadeOut = constrain((1 - progress) / 0.15, 0, 1);
    fill(235, 242, 248, 200 * min(fadeIn, fadeOut));
    text(phase.label, width / 2, height / 2);
  }
 
  textSize(16);
  fill(235, 242, 248, 90);
  text(pattern.name, width / 2, 40);
  text("tap to change pattern", width / 2, height - 30);
}
 
function nextPhase() {
  let phases = patterns[patternIndex].phases;
  phaseIndex = (phaseIndex + 1) % phases.length;
  phaseStart = millis();
  playTone(phases[phaseIndex].note);
}
 
function handleTap() {
  // Phones can report one tap as both a touch and a click, so ignore repeats
  if (millis() - lastTap < 400) return;
  lastTap = millis();
 
  // Start the sound engine. If anything goes wrong with sound,
  // the breathing circle still runs.
  try {
    if (!audio) {
      let AudioEngine = window.AudioContext || window.webkitAudioContext;
      audio = new AudioEngine();
      reverb = makeReverb(5);
    }
    if (audio.state === "suspended") {
      audio.resume();
    }
  } catch (e) {
    console.log("Sound unavailable:", e);
  }
 
  // The first tap starts; every tap after that switches patterns
  if (started) {
    patternIndex = (patternIndex + 1) % patterns.length;
  }
  started = true;
  phaseIndex = 0;
  phaseStart = millis();
  playTone(patterns[patternIndex].phases[0].note);
}
 
// Build a simple reverb: a burst of fading noise that sound "echoes" through,
// like singing in a big, open room
function makeReverb(seconds) {
  let length = audio.sampleRate * seconds;
  let impulse = audio.createBuffer(2, length, audio.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    let data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  let convolver = audio.createConvolver();
  convolver.buffer = impulse;
  convolver.connect(audio.destination);
  return convolver;
}
 
// An airy pad: the note, a fifth above, and an octave above,
// each doubled and slightly out of tune so they shimmer against each other
function playTone(note) {
  if (!audio || !reverb || note === null) return;
 
  let freq = 440 * pow(2, (note - 69) / 12);
  let now = audio.currentTime;
  let length = 7;
 
  let volume = audio.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(1, now + 1.8);        // slow swell in
  volume.gain.exponentialRampToValueAtTime(0.001, now + length); // long fade out
 
  // Send most of the sound through the reverb and a little straight out
  let dry = audio.createGain();
  dry.gain.value = 0.35;
  volume.connect(dry);
  dry.connect(audio.destination);
  volume.connect(reverb);
 
  let layers = [
    { ratio: 1, level: 0.06 },     // the note itself
    { ratio: 1.5, level: 0.035 },  // a fifth above
    { ratio: 2, level: 0.025 },    // an octave above
  ];
 
  for (let layer of layers) {
    for (let detune of [-6, 6]) {
      let osc = audio.createOscillator();
      let g = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * layer.ratio;
      osc.detune.value = detune;   // tiny pitch offset creates the shimmer
      g.gain.value = layer.level;
      osc.connect(g);
      g.connect(volume);
      osc.start(now);
      osc.stop(now + length + 0.1);
    }
  }
}
 
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
