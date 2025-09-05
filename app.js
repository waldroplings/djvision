/*
 * XP Music Visualizer
 *
 * This script implements a custom music visualization inspired by the classic
 * Windows Media Player visualizations (e.g. Alchemy, Ambience, Bars and Waves).
 * It uses the Web Audio API to analyse the frequency spectrum of an audio
 * source (file or microphone) and draws swirling lines and arcs on a canvas.
 *
 * The colours and motion of the arcs are driven by both the current time
 * and the amplitude of each frequency band.  Colour transitions cycle
 * through the spectrum (reds, blues, greens, yellows) and brighten in
 * response to louder audio, while a trailing effect gives a smooth,
 * continuous look.  If no audio source is connected, the visualizer still
 * animates using a low-level signal so that the screen is never blank.
 */

(() => {
  const fileButton = document.getElementById('btn-file');
  const fileInput = document.getElementById('file-input');
  const micButton = document.getElementById('btn-mic');
  const overlay = document.getElementById('overlay');
  const canvas = document.getElementById('visualizer');
  const tabButtons = document.querySelectorAll('.tab-button');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  let audioCtx;
  let analyser;
  let sourceNode;
  let dataArray;
  let visualizer;
  let microphoneStream;

  // Selected visualization style (swirl, burst, spectrum3d)
  let currentStyle = 'swirl';

  class XPVisualizer {
    constructor(canvasElement, analyserNode, audioContext) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.analyser = analyserNode;
      this.audioCtx = audioContext || null;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.timeMs = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.energyEMA = 0;
      this.lastBeatAt = -Infinity;
      this.beatStrength = 0;
      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
      window.addEventListener('resize', this.resize);
      document.addEventListener('fullscreenchange', this.resize);
      this.resize();
      requestAnimationFrame(this.animate);
      // State for burst visual
      this.scribble = [];
      this.maxScribblePoints = 200;
      this.scribbleAngle = 0;
    }

    resize() {
      // High-DPI aware canvas sizing and scaling
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;
      this.canvas.style.width = cssWidth + 'px';
      this.canvas.style.height = cssHeight + 'px';
      this.canvas.width = Math.floor(cssWidth * this.dpr);
      this.canvas.height = Math.floor(cssHeight * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.centerX = cssWidth / 2;
      this.centerY = cssHeight / 2;
      // Use the corner distance so circular patterns reach screen corners
      this.maxRadius = Math.hypot(this.centerX, this.centerY);
    }

    animate() {
      // Pull the frequency data from the analyser
      this.analyser.getByteFrequencyData(this.dataArray);
      // Compute audio-synced time in ms
      const nowMs = (this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000) * 1000;
      this.timeMs = nowMs;
      // Simple beat detection on low frequencies with refractory period
      const len = this.bufferLength;
      const lowBandEnd = Math.max(8, Math.floor(len * 0.15));
      let lowSum = 0;
      for (let i = 0; i < lowBandEnd; i++) lowSum += this.dataArray[i];
      const lowEnergy = lowSum / (255 * lowBandEnd);
      const emaAlpha = 0.12;
      this.energyEMA = this.energyEMA === 0 ? lowEnergy : this.energyEMA * (1 - emaAlpha) + lowEnergy * emaAlpha;
      const threshold = this.energyEMA * 1.35 + 0.02;
      const nowSec = nowMs / 1000;
      if (lowEnergy > threshold && nowSec - this.lastBeatAt > 0.18) {
        this.lastBeatAt = nowSec;
      }
      // Decaying beat strength 0..1 over 250ms
      const beatAge = nowSec - this.lastBeatAt;
      this.beatStrength = Math.max(0, 1 - beatAge / 0.25);
      // Delegate drawing to the appropriate style
      if (currentStyle === 'swirl') {
        this.drawSwirl();
      } else if (currentStyle === 'burst') {
        this.drawBurst();
      } else if (currentStyle === 'spectrum3d') {
        this.drawSpectrum3D();
      }
      requestAnimationFrame(this.animate);
    }

    drawSwirl() {
      const ctx = this.ctx;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const angleStep = (Math.PI * 2) / len;
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const beatBoost = 1 + this.beatStrength * 0.25;
        const radius = this.maxRadius * (0.55 + amp * 0.6) * beatBoost;
        const startAngle = i * angleStep + this.timeMs * 0.0003;
        const endAngle = startAngle + angleStep * 0.9;
        const hue = (i / len * 360 + this.timeMs * 0.02) % 360;
        const lightness = 40 + amp * 40;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${0.25 + amp * 0.55})`;
        ctx.lineWidth = 1 + amp * 3 + this.beatStrength * 1.2;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, startAngle, endAngle);
        ctx.stroke();
      }
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const radius = this.maxRadius * (0.45 + amp * 0.7);
        const angle = i * angleStep + this.timeMs * 0.0005;
        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;
        const hue = (angle / Math.PI * 180 + this.timeMs * 0.05) % 360;
        const lightness = 50 + amp * 30;
        const sparkle = 0.4 + amp * 0.4 + this.beatStrength * 0.2;
        ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, ${sparkle})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + amp * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBurst() {
      const ctx = this.ctx;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const angleStep = (Math.PI * 2) / len;
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const angle = i * angleStep + this.timeMs * 0.0002;
        const length = this.maxRadius * (0.35 + amp * 0.8) * (1 + this.beatStrength * 0.3);
        const endX = this.centerX + Math.cos(angle) * length;
        const endY = this.centerY + Math.sin(angle) * length;
        const hue = (i / len * 360 + this.timeMs * 0.05) % 360;
        const lightness = 40 + amp * 40;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${0.35 + amp * 0.5 + this.beatStrength * 0.2})`;
        ctx.lineWidth = 1 + amp * 4 + this.beatStrength * 1.5;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      // Update scribble path based on average amplitude
      const avgAmp = this.dataArray.reduce((a, b) => a + b) / (255 * len);
      this.scribbleAngle += 0.02 + avgAmp * 0.3 + this.beatStrength * 0.05;
      const scribbleRadius = this.maxRadius * 0.4;
      const sx = this.centerX + Math.cos(this.scribbleAngle) * scribbleRadius;
      const sy = this.centerY + Math.sin(this.scribbleAngle) * scribbleRadius;
      this.scribble.push({ x: sx, y: sy });
      if (this.scribble.length > this.maxScribblePoints) {
        this.scribble.shift();
      }
      ctx.strokeStyle = `hsla(${(this.timeMs * 0.05) % 360}, 80%, 70%, ${0.6 + this.beatStrength * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < this.scribble.length; i++) {
        const p = this.scribble[i];
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }

    drawSpectrum3D() {
      const ctx = this.ctx;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const barCount = 64;
      const barsPerBin = Math.floor(len / barCount);
      const barWidth = width / barCount;
      const depth = barWidth * 0.5;
      const maxBarHeight = height * 0.65;
      // vertical perspective offset so bars on the right appear closer
      const slope = depth * 0.6;
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < barsPerBin; j++) {
          sum += this.dataArray[i * barsPerBin + j];
        }
        const amp = sum / (barsPerBin * 255);
        const barHeight = maxBarHeight * amp;
        const x = barWidth * i;
        // Baseline with gentle perspective
        const baseline = height - Math.max(40, height * 0.08);
        const y = baseline - (barCount - i) * slope;
        const hue = 60 - amp * 60;
        const saturation = 90;
        const lightness = 40 + amp * 20 + this.beatStrength * 5;
        // front
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, y - barHeight, barWidth, barHeight);
        // top face (lighter)
        const topLightness = lightness + 15;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${topLightness}%)`;
        ctx.beginPath();
        ctx.moveTo(x, y - barHeight);
        ctx.lineTo(x + depth, y - barHeight - depth * 0.5);
        ctx.lineTo(x + barWidth + depth, y - barHeight - depth * 0.5);
        ctx.lineTo(x + barWidth, y - barHeight);
        ctx.closePath();
        ctx.fill();
        // side face (darker)
        const sideLightness = lightness - 10;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${sideLightness}%)`;
        ctx.beginPath();
        ctx.moveTo(x + barWidth, y - barHeight);
        ctx.lineTo(x + barWidth + depth, y - barHeight - depth * 0.5);
        ctx.lineTo(x + barWidth + depth, y - depth * 0.5);
        ctx.lineTo(x + barWidth, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  async function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -20;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    // Resume the context on user interaction if suspended
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  }

  function stopCurrentSource() {
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    if (microphoneStream) {
      microphoneStream.getTracks().forEach((t) => t.stop());
      microphoneStream = null;
    }
  }

  async function loadFile(file) {
    await ensureAudioContext();
    stopCurrentSource();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.loop = true;
    bufferSource.connect(analyser);
    bufferSource.connect(audioCtx.destination);
    bufferSource.start();
    sourceNode = bufferSource;
    if (!visualizer) {
      visualizer = new XPVisualizer(canvas, analyser, audioCtx);
    }
    overlay.classList.add('hidden');
  }

  async function useMicrophone() {
    await ensureAudioContext();
    stopCurrentSource();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStream = stream;
      const micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(analyser);
      sourceNode = micSource;
      if (!visualizer) {
        visualizer = new XPVisualizer(canvas, analyser, audioCtx);
      }
      overlay.classList.add('hidden');
    } catch (err) {
      console.error('Microphone access denied:', err);
      overlay.textContent = 'Microphone access was denied. Please allow microphone access or load an audio file.';
      overlay.classList.remove('hidden');
    }
  }

  fileButton.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      loadFile(files[0]);
    }
  });

  micButton.addEventListener('click', () => {
    useMicrophone();
  });

  // Tab selection logic
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const style = btn.getAttribute('data-style');
      currentStyle = style;
      // Update active class
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  });
})();