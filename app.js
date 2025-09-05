// Winamp Visualizer Web App

// Grab DOM elements
const canvas = document.getElementById('visualizerCanvas');
const milkToggle = document.getElementById('milkToggle');
const geissToggle = document.getElementById('geissToggle');
const fileInput = document.getElementById('fileInput');
const micButton = document.getElementById('micButton');

// Audio and visualization state
let audioCtx = null;
let audioSource = null;
let visualizer = null;
let currentMode = 'milk';
let geissTime = 0;
const geissCtx = canvas.getContext('2d');

// Initialize the AudioContext lazily
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Load a default preset from butterchurn-presets
function getDefaultPreset() {
  const presets = butterchurnPresets.getPresets();
  // Choose a deterministic preset (first key) for reproducibility
  const keys = Object.keys(presets);
  if (keys.length > 0) {
    return presets[keys[0]];
  }
  return null;
}

// Configure the Butterchurn visualizer and connect the current audio source
async function setupButterchurn() {
  initAudioContext();
  // Create the visualizer only once
  if (!visualizer) {
    visualizer = butterchurn.createVisualizer(audioCtx, canvas, {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: window.devicePixelRatio || 1,
    });
    const preset = getDefaultPreset();
    if (preset) {
      visualizer.loadPreset(preset, 0.0);
    }
  }
  if (audioSource) {
    visualizer.connectAudio(audioSource);
  }
}

// Connect an HTMLMediaElement (file or microphone stream) to the audio context
function connectMediaElement(element) {
  initAudioContext();
  if (audioSource) {
    try { audioSource.disconnect(); } catch (_) {}
  }
  audioSource = audioCtx.createMediaElementSource(element);
  audioSource.connect(audioCtx.destination);
  if (visualizer) {
    visualizer.connectAudio(audioSource);
  }
}

// Connect a MediaStream (microphone) to the audio context
function connectMediaStream(stream) {
  initAudioContext();
  if (audioSource) {
    try { audioSource.disconnect(); } catch (_) {}
  }
  audioSource = audioCtx.createMediaStreamSource(stream);
  // Only connect to destination if you want to hear your mic; omit to silence
  // audioSource.connect(audioCtx.destination);
  if (visualizer) {
    visualizer.connectAudio(audioSource);
  }
}

// Handle audio file selection
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const audioElem = new Audio();
  audioElem.src = url;
  audioElem.crossOrigin = 'anonymous';
  audioElem.addEventListener('canplay', () => {
    connectMediaElement(audioElem);
    audioElem.play().catch((err) => {
      console.error('Audio play error:', err);
    });
  });
});

// Handle microphone capture
micButton.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    connectMediaStream(stream);
  } catch (err) {
    console.error('Microphone error:', err);
    alert('Microphone access denied or unavailable.');
  }
});

// Mode toggles
milkToggle.addEventListener('click', () => {
  currentMode = 'milk';
  milkToggle.classList.add('active');
  geissToggle.classList.remove('active');
  setupButterchurn();
});

geissToggle.addEventListener('click', () => {
  currentMode = 'geiss';
  geissToggle.classList.add('active');
  milkToggle.classList.remove('active');
});

// Resize canvas and visualizers when the window changes
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  if (visualizer) {
    visualizer.setRendererSize(canvas.width, canvas.height);
  }
}
window.addEventListener('resize', resizeCanvas);

// Render loop
function tick() {
  if (currentMode === 'milk' && visualizer) {
    visualizer.render();
  } else if (currentMode === 'geiss') {
    renderGeiss();
  }
  requestAnimationFrame(tick);
}

// Simple Geiss stub: draws a swirling color gradient
function renderGeiss() {
  geissTime += 0.015;
  const w = canvas.width;
  const h = canvas.height;
  // Compute color components based on sine waves offset by 120°
  const r = 0.5 * (Math.sin(geissTime) + 1.0);
  const g = 0.5 * (Math.sin(geissTime + 2.094) + 1.0);
  const b = 0.5 * (Math.sin(geissTime + 4.188) + 1.0);
  geissCtx.fillStyle = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
  geissCtx.fillRect(0, 0, w, h);
}

// Initialize canvas size and Butterchurn on startup
function init() {
  resizeCanvas();
  setupButterchurn();
  tick();
}

// Kick things off when the document is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}