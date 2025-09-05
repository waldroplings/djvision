# Winamp Visualizer Web MVP

This folder contains a browser‑based music visualizer built with
JavaScript, WebAudio and WebGL.  It leverages the
[`butterchurn`](https://github.com/jberg/butterchurn) library (a
reimplementation of Winamp’s MilkDrop visualizer) and includes a
stubbed Geiss module implemented on top of the HTML5 canvas.  The
result is a responsive, modern web application with a clean UI and
toggleable visualizer modules.

## Features

* **MilkDrop‑style visualizations via Butterchurn** – When the “MilkDrop” mode is active, the app creates a Butterchurn visualizer, feeds it audio from the user’s selected source (file or microphone) and renders a preset onto the `<canvas>` element.  Butterchurn performs its own FFT and beat detection internally【569572155840304†L60-L87】.
* **Geiss stub module** – Press the **Geiss** toggle to switch to a simple color‑swirling effect rendered with the Canvas 2D API.  This demonstrates how a future Geiss port could plug into the same interface.
* **Audio source selection** – Users can either upload an audio file or allow microphone access.  The file input uses the WebAudio `decodeAudioData` API, while microphone capture uses `getUserMedia`.
* **Responsive layout** – The UI is built with Flexbox and scales to different screen sizes.  Buttons are clearly labeled and the canvas automatically resizes to fill the available area.

## Running locally

Since modern browsers enforce strict file‑access policies, it’s best to serve the app from a local web server.  If you have Python installed, run:

```bash
cd web_app
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Alternatively, you can simply open `index.html` directly in a modern browser, but the file upload may be restricted depending on browser security settings.

## Extending the MVP

* **Real Geiss and AVS modules** – Replace the simple gradient effect in `app.js` with a real port of the Geiss or AVS algorithms.  For Geiss, you could translate the original effect into GLSL and render via WebGL.
* **Preset management** – At present, the app loads a single default preset using Butterchurn.  You can load additional presets via the `butterchurn-presets` package or by dropping MilkDrop preset files into a server and loading them dynamically.
* **GUI controls** – Use a library like [Tweakpane](https://cocopon.github.io/tweakpane/) or build your own React/Vue interface to allow users to select presets, adjust parameters, and view performance metrics.

## License

This web MVP is released under the MIT licence.  It depends on Butterchurn, which is MIT‑licensed as well.