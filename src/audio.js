// Attune — adaptive procedural audio engine.
//
// The music IS the obstacle. Alignment with the corridor drives the mix:
//   aligned   → low-pass opens, pad + shimmer layers swell, full harmony
//   near-clip → layers thin out, filter closes (the "held breath" tension)
//   crash     → tape-stop pitch dive + distorted noise burst, then reset
// Moving your thumb (pitch) also retunes a lead voice — you hear yourself tune.
//
// Ported from the design's Web Audio prototype onto react-native-audio-api
// (Software Mansion's Web Audio implementation for RN). That package is an
// OPTIONAL add — it is not installed by default (its current release has a C++
// header that fails to compile on some Xcode toolchains). When the module is
// absent (the default build, Expo Go, or a build before it compiled), every
// method here is a safe no-op so the rest of the game runs unaffected — visuals
// stay the source of truth for collision, exactly as the PRD requires.
//
// To enable real procedural audio, see "Enabling adaptive audio" in README.md.

// Lazily resolve the native module so a missing one never crashes JS.
function audioModule() {
  try {
    return require('react-native-audio-api');
  } catch (e) {
    return null;
  }
}
function AudioContextCtor() {
  const m = audioModule();
  return (m && (m.AudioContext || m.default?.AudioContext)) || null;
}

export const isAudioAvailable = () => !!AudioContextCtor();

// Route audio to the iOS "playback" category once, so the game's music plays
// even when the device's silent/mute switch is on (this game IS the music).
let _sessionConfigured = false;
function configureSession() {
  if (_sessionConfigured) return;
  const m = audioModule();
  const AudioManager = m && (m.AudioManager || m.default?.AudioManager);
  if (!AudioManager || !AudioManager.setAudioSessionOptions) return;
  try {
    AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default' });
    _sessionConfigured = true;
  } catch (e) {}
}

// Gentle tanh soft-clip — stands in for the (unimplemented) DynamicsCompressor.
function makeSoftClipCurve() {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6);
  }
  return curve;
}

function makeDistortionCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// pentatonic ratios over ~one octave for the lead "you" voice
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

// per-song root frequencies (Hz) — give each track its own colour
const ROOTS = {
  firstlight: 130.81, tide: 146.83, drift: 116.54,
  ember: 138.59, resonance: 110.0, aurora: 123.47,
};

class AttuneAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.8;
    this.running = false;
    this.align = 0;
    this._nodes = null;
    this._timer = null;
    this._smoothAlign = 0;
    this._leadRoot = 261.62;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = AudioContextCtor();
    if (!AC) return;
    configureSession(); // playback category (plays through the silent switch)
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
  }

  // Build the voice graph for a song. paletteKey selects the root.
  // Wrapped end-to-end: if the audio backend lacks a node or throws, we degrade
  // to silence rather than crash the run.
  start(paletteKey, bpm) {
    this._ensure();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
      this.stop(true);
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const root = ROOTS[paletteKey] || 130.81;

      // master chain: master gain → soft-clip limiter → destination.
      // (DynamicsCompressor isn't implemented by react-native-audio-api, so we
      // use a WaveShaper soft-clipper to tame peaks; fall back to a direct
      // connection if even that is unavailable.)
      const master = ctx.createGain();
      master.gain.value = this.enabled ? this.volume : 0;
      try {
        const limiter = ctx.createWaveShaper();
        limiter.curve = makeSoftClipCurve();
        master.connect(limiter); limiter.connect(ctx.destination);
      } catch (e) {
        master.connect(ctx.destination);
      }

      // global low-pass — closes when off-target ("held breath")
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 0.9;
      filter.connect(master);

      // feedback delay for space (createDelay needs a max-delay-time arg)
      let delaySend = filter; // if delay is unavailable, sends just hit the filter
      try {
        const delay = ctx.createDelay(1);
        delay.delayTime.value = (60 / (bpm || 110)) * 0.75;
        const fb = ctx.createGain(); fb.gain.value = 0.32;
        const wet = ctx.createGain(); wet.gain.value = 0.22;
        delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(filter);
        delaySend = delay;
      } catch (e) {}

      const mkOsc = (type, freq, detune, gain, dest) => {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq; if (o.detune) o.detune.value = detune || 0;
        const g = ctx.createGain(); g.gain.value = gain;
        o.connect(g); g.connect(dest); o.start(now);
        return { o, g };
      };

      // BASS — always present (base layer)
      const bassGain = ctx.createGain(); bassGain.gain.value = 0.5; bassGain.connect(filter);
      const bass = mkOsc('sine', root / 2, 0, 0.9, bassGain);
      const bassHarm = mkOsc('triangle', root, 0, 0.18, bassGain);

      // PAD — chord, swells with alignment
      const padGain = ctx.createGain(); padGain.gain.value = 0.0; padGain.connect(filter); padGain.connect(delaySend);
      const padTrem = ctx.createGain(); padTrem.gain.value = 1; padTrem.connect(padGain);
      const padBus = ctx.createGain(); padBus.gain.value = 0.5; padBus.connect(padTrem);
      const pads = [
        mkOsc('sawtooth', root, -7, 0.16, padBus),
        mkOsc('sawtooth', root, +7, 0.16, padBus),
        mkOsc('triangle', root * 1.5, 0, 0.14, padBus),
        mkOsc('triangle', root * 2, +4, 0.10, padBus),
      ];

      // tremolo LFO at the beat
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = (bpm || 110) / 60;
      const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 0.18;
      lfo.connect(lfoDepth); lfoDepth.connect(padTrem.gain); lfo.start(now);

      // SHIMMER / LEAD "you" — blooms only when well aligned; pitch follows thumb
      const leadGain = ctx.createGain(); leadGain.gain.value = 0.0; leadGain.connect(filter); leadGain.connect(delaySend);
      const lead = mkOsc('triangle', root * 2, 0, 0.5, leadGain);
      const leadHi = mkOsc('sine', root * 4, 0, 0.18, leadGain);
      this._leadRoot = root * 2;

      this._nodes = {
        master, filter, padGain, leadGain, bassGain,
        oscs: [bass, bassHarm, ...pads, lead, leadHi],
        extras: [lfo], lead, leadHi,
      };
      this.running = true;
      this._smoothAlign = 0;
      // adaptive parameter easing on a light interval (decoupled from the game loop)
      this._timer = setInterval(() => this._tick(), 33);
    } catch (e) {
      // any backend failure → no music, but the game keeps running
      this.running = false;
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      this._nodes = null;
    }
  }

  _tick() {
    if (!this.running || !this.ctx || !this._nodes) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      this._smoothAlign += (this.align - this._smoothAlign) * 0.18;
      const a = this._smoothAlign;
      const { filter, padGain, leadGain } = this._nodes;
      filter.frequency.setTargetAtTime(620 + a * a * 6800, now, 0.08); // filter opens with alignment
      padGain.gain.setTargetAtTime(0.12 + a * 0.9, now, 0.1); // pad swells
      const leadAmt = Math.max(0, (a - 0.45) / 0.55); // lead blooms high in the range
      leadGain.gain.setTargetAtTime(leadAmt * leadAmt * 0.85, now, 0.12);
    } catch (e) {}
  }

  setAlignment(a) { this.align = Math.max(0, Math.min(1, a || 0)); }

  // map thumb pitch (0..1) to a pentatonic step on the lead voice
  setPlayerPitch(p01) {
    if (!this.running || !this.ctx || !this._nodes) return;
    try {
      const idx = Math.max(0, Math.min(PENTA.length - 1, Math.round((p01 || 0) * (PENTA.length - 1))));
      const f = this._leadRoot * PENTA[idx];
      const now = this.ctx.currentTime;
      this._nodes.lead.o.frequency.setTargetAtTime(f, now, 0.05);
      this._nodes.leadHi.o.frequency.setTargetAtTime(f * 2, now, 0.05);
    } catch (e) {}
  }

  phasePerfect() {
    if (!this.enabled || !this.ctx || !this._nodes) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = this._leadRoot * 3;
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(this._nodes.master);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      o.frequency.exponentialRampToValueAtTime(this._leadRoot * 4, now + 0.5);
      o.start(now); o.stop(now + 0.55);
    } catch (e) {}
  }

  // tape-stop dive + distorted noise burst
  fail() {
    if (!this.ctx || !this._nodes) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const { filter, master, oscs } = this._nodes;
    try {
      oscs.forEach(({ o }) => {
        const f = o.frequency.value;
        o.frequency.cancelScheduledValues(now);
        o.frequency.setValueAtTime(f, now);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f * 0.25), now + 0.45);
      });
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.4);
    } catch (e) {}
    // noise burst through distortion
    try {
      const len = Math.floor(ctx.sampleRate * 0.35);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const shaper = ctx.createWaveShaper(); shaper.curve = makeDistortionCurve(28);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
      const ng = ctx.createGain(); ng.gain.value = 0.0;
      src.connect(shaper); shaper.connect(bp); bp.connect(ng); ng.connect(master);
      ng.gain.setValueAtTime(0.5 * this.volume, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      src.start(now); src.stop(now + 0.36);
    } catch (e) {}
    this.running = false; // freeze adaptive easing on the dive
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  stop(silent) {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.running = false;
    if (!this._nodes || !this.ctx) { this._nodes = null; return; }
    const now = this.ctx.currentTime;
    try {
      if (!silent) this._nodes.master.gain.setTargetAtTime(0, now, 0.1);
      const nodes = this._nodes;
      setTimeout(() => {
        try {
          nodes.oscs.forEach(({ o }) => { try { o.stop(); } catch (e) {} });
          nodes.extras.forEach((o) => { try { o.stop(); } catch (e) {} });
        } catch (e) {}
      }, silent ? 0 : 180);
    } catch (e) {}
    this._nodes = null;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this._nodes && this.ctx) {
      this._nodes.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05);
    }
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._nodes && this.ctx && this.enabled) {
      this._nodes.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }
}

// Single shared instance (mirrors the prototype's window.attuneAudio).
const attuneAudio = new AttuneAudio();
export default attuneAudio;
