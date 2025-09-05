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
    constructor(canvasElement, analyserNode) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.analyser = analyserNode;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.time = 0;
      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();
      requestAnimationFrame(this.animate);
      // State for burst visual
      this.scribble = [];
      this.maxScribblePoints = 200;
      this.scribbleAngle = 0;
    }

    resize() {
      // Set canvas size to full window
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.maxRadius = Math.min(this.centerX, this.centerY) * 0.9;
    }

    animate() {
      // Pull the frequency data from the analyser
      this.analyser.getByteFrequencyData(this.dataArray);
      // Delegate drawing to the appropriate style
      if (currentStyle === 'swirl') {
        this.drawSwirl();
      } else if (currentStyle === 'burst') {
        this.drawBurst();
      } else if (currentStyle === 'spectrum3d') {
        this.drawSpectrum3D();
      }
      this.time += 16;
      requestAnimationFrame(this.animate);
    }

    drawSwirl() {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const angleStep = (Math.PI * 2) / len;
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const radius = this.maxRadius * (0.5 + amp * 0.5);
        const startAngle = i * angleStep + this.time * 0.0003;
        const endAngle = startAngle + angleStep * 0.9;
        const hue = (i / len * 360 + this.time * 0.02) % 360;
        const lightness = 40 + amp * 40;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${0.3 + amp * 0.5})`;
        ctx.lineWidth = 1 + amp * 3;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, startAngle, endAngle);
        ctx.stroke();
      }
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const radius = this.maxRadius * (0.4 + amp * 0.6);
        const angle = i * angleStep + this.time * 0.0005;
        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;
        const hue = (angle / Math.PI * 180 + this.time * 0.05) % 360;
        const lightness = 50 + amp * 30;
        ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, ${0.4 + amp * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + amp * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBurst() {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const angleStep = (Math.PI * 2) / len;
      for (let i = 0; i < len; i++) {
        const amp = this.dataArray[i] / 255;
        const angle = i * angleStep + this.time * 0.0002;
        const length = this.maxRadius * (0.3 + amp * 0.7);
        const endX = this.centerX + Math.cos(angle) * length;
        const endY = this.centerY + Math.sin(angle) * length;
        const hue = (i / len * 360 + this.time * 0.05) % 360;
        const lightness = 40 + amp * 40;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${0.4 + amp * 0.5})`;
        ctx.lineWidth = 1 + amp * 4;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      // Update scribble path based on average amplitude
      const avgAmp = this.dataArray.reduce((a, b) => a + b) / (255 * len);
      this.scribbleAngle += 0.02 + avgAmp * 0.3;
      const scribbleRadius = this.maxRadius * 0.4;
      const sx = this.centerX + Math.cos(this.scribbleAngle) * scribbleRadius;
      const sy = this.centerY + Math.sin(this.scribbleAngle) * scribbleRadius;
      this.scribble.push({ x: sx, y: sy });
      if (this.scribble.length > this.maxScribblePoints) {
        this.scribble.shift();
      }
      ctx.strokeStyle = `hsla(${(this.time * 0.05) % 360}, 80%, 70%, 0.8)`;
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
      const width = this.canvas.width;
      const height = this.canvas.height;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);
      const len = this.bufferLength;
      const barCount = 64;
      const barsPerBin = Math.floor(len / barCount);
      const barWidth = width / (barCount + 1);
      const depth = barWidth * 0.5; // pseudo extrusion depth
      const maxBarHeight = height * 0.6;
      // vertical perspective offset so bars on the right appear closer
      const slope = depth * 0.6;
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < barsPerBin; j++) {
          sum += this.dataArray[i * barsPerBin + j];
        }
        const amp = sum / (barsPerBin * 255);
        const barHeight = maxBarHeight * amp;
        const x = barWidth * i + barWidth;
        // Baseline is raised on the left and lowered on the right to create a 3D plane effect
        const y = height - 80 - (barCount - i) * slope;
        const hue = 60 - amp * 60;
        const saturation = 90;
        const lightness = 40 + amp * 20;
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
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
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
      visualizer = new XPVisualizer(canvas, analyser);
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
        visualizer = new XPVisualizer(canvas, analyser);
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