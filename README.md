# XP Music Visualizer

This project is a web‑based music visualizer inspired by the classic
Windows XP/Windows Media Player visualizations such as **Ambience**,
**Alchemy**, **Battery**, and **Musical Colors**.  It uses the Web Audio API
to analyse audio from a file or microphone and renders colourful,
swirling lines and particles on a full‑screen canvas.

## Features

- **Real‑time FFT analysis** – The visualizer extracts the frequency
  spectrum of the audio and maps each frequency band to a rotating arc.
- **Swirling arcs and particles** – Multiple concentric arcs and
  particles respond to amplitude and cycle through hues reminiscent of
  WMP’s classic “trippy” visuals.
- **Audio sources** – You can select an audio file from your device or
  use your microphone as the input.  When no audio source is
  connected, the visualizer still animates softly so the screen isn’t
  blank.
- **Responsive and touch‑friendly UI** – Buttons and overlay messages
  guide the user and resume the `AudioContext` on interaction.

## Running the app

Because browsers block microphone access and file playback from local
files, you should serve the app via a local web server:

```sh
cd web_app_xp
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a modern WebGL‑capable browser
(Chrome, Firefox, Edge).  Click **Load Audio File** to select a song
from your computer or click **Use Microphone** to visualise live
audio.  The overlay will disappear once the audio starts.

## Customising the visuals

The core visualisation logic resides in `app.js` within the
`XPVisualizer` class.  You can experiment with the following to
fine‑tune the look:

- Adjust the `fftSize` on the analyser (default 512) to change the
  number of frequency bands.  A higher value yields more detail.
- Tweak the colour formulas in `animate()` to change the hue and
  lightness transitions.
- Modify `smoothingTimeConstant` on the analyser to control how
  aggressively the display follows the audio.

Enjoy reminiscing with modern browser technology!