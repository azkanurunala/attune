// Attune — decorative Skia canvases: the breathing hero wave (title / paywall)
// and the looping how-to mini-demos. Each runs a light rAF loop that advances a
// time ref and repaints by bumping a frame counter — the same engine pattern,
// kept tiny since these are ornamental.

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, Path, Circle, Group, Skia, BlurMask } from '@shopify/react-native-skia';
import { View } from 'react-native';

// rAF clock → elapsed seconds, repainting via a frame counter.
function useClockFrames() {
  const t = useRef(0);
  const last = useRef(0);
  const [, setFrame] = useState(0);
  useEffect(() => {
    let raf;
    const loop = (ts) => {
      if (!last.current) last.current = ts;
      let dt = (ts - last.current) / 1000;
      last.current = ts;
      if (dt > 0.05) dt = 0.05;
      t.current += dt;
      setFrame((f) => (f + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

// Build a sine path across [0..W]. yFn(x) → y.
function sinePath(W, yFn, step = 4) {
  const p = Skia.Path.Make();
  for (let x = 0; x <= W; x += step) {
    const y = yFn(x);
    if (x === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

// A glowing stroked wave = blurred halo stroke + crisp core stroke.
function GlowWave({ path, color, width, blur, coreColor = 'rgba(255,255,255,0.85)', coreWidth = 1.3, opacity = 1 }) {
  return (
    <Group opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={width} color={color} strokeJoin="round" strokeCap="round">
        <BlurMask blur={blur} style="solid" />
      </Path>
      {coreWidth > 0 && (
        <Path path={path} style="stroke" strokeWidth={coreWidth} color={coreColor} strokeJoin="round" strokeCap="round" />
      )}
    </Group>
  );
}

// ── Breathing hero waveform (title screen + paywall header) ─────────────────
export function AtnHeroWave({ pal, height = 180 }) {
  const t = useClockFrames();
  const [w, setW] = useState(320);
  const H = height;
  const mid = H / 2;
  const time = t.current;
  const breathe = 0.5 + 0.5 * Math.sin(time * 0.9);

  const wallPath = sinePath(w, (x) => mid + (30 + 8 * breathe) * Math.sin(x * 0.026 + time * 0.6));
  const phase = time * 0.6 + 0.2 * breathe;
  const amp = 22 + 14 * breathe;
  const playerPath = sinePath(w, (x) => mid + amp * Math.sin(x * 0.026 + phase));
  const headX = w * 0.5;
  const headY = mid + amp * Math.sin(headX * 0.026 + phase);

  return (
    <View style={{ width: '100%', height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Canvas style={{ flex: 1 }}>
        <GlowWave path={wallPath} color={pal.wall} width={2} blur={7} coreWidth={0} opacity={0.5} />
        <GlowWave path={playerPath} color={pal.player} width={3} blur={11 + 8 * breathe} />
        <Circle cx={headX} cy={headY} r={5} color="#ffffff">
          <BlurMask blur={12} style="solid" />
        </Circle>
      </Canvas>
    </View>
  );
}

// ── Looping how-to mini-demos (one tiny "video" per concept) ────────────────
export function AtnMiniDemo({ kind, pal, height = 150 }) {
  const t = useClockFrames();
  const [w, setW] = useState(300);
  const H = height;
  const mid = H / 2;
  const time = t.current;
  const cyc = (time % 5) / 5; // 5s loop

  let content = null;

  if (kind === 'tune') {
    const f = 0.018 + 0.022 * (0.5 + 0.5 * Math.sin(time * 1.1));
    const wave = sinePath(w, (x) => mid + H * 0.22 * Math.sin(x * f + time * 0.6));
    const th = H * 0.5; const ty = mid - th / 2; const tx = 22;
    const knobY = ty + th * (1 - (0.5 + 0.5 * Math.sin(time * 1.1)));
    const track = Skia.Path.Make(); track.moveTo(tx, ty); track.lineTo(tx, ty + th);
    content = (
      <>
        <GlowWave path={wave} color={pal.player} width={3} blur={14} coreWidth={0} />
        <Path path={track} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.18)" />
        <Circle cx={tx} cy={knobY} r={7} color="#fff"><BlurMask blur={10} style="solid" /></Circle>
      </>
    );
  } else if (kind === 'match') {
    const chF = 0.03; const chAmp = H * 0.16; const gap = H * 0.34;
    const wallTop = sinePath(w, (x) => mid - gap / 2 + chAmp * Math.sin(x * chF + time * 0.6));
    const wallBot = sinePath(w, (x) => mid + gap / 2 + chAmp * Math.sin(x * chF + time * 0.6));
    const align = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
    const pf = 0.05 - 0.02 * align; const off = (1 - align) * H * 0.12;
    const player = sinePath(w, (x) => mid + off + chAmp * Math.sin(x * pf + time * 0.6));
    content = (
      <>
        <GlowWave path={wallTop} color={pal.wall} width={2} blur={6} coreWidth={0} opacity={0.9} />
        <GlowWave path={wallBot} color={pal.wall} width={2} blur={6} coreWidth={0} opacity={0.9} />
        <GlowWave path={player} color={pal.player} width={3} blur={12 + 14 * align} coreWidth={0} />
      </>
    );
  } else if (kind === 'bloom') {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
    const chF = 0.03;
    const ghost = sinePath(w, (x) => mid + H * 0.16 * Math.sin(x * chF + time * 0.6));
    const player = sinePath(w, (x) => mid + H * 0.16 * Math.sin(x * chF + time * 0.6));
    const dots = [];
    for (let i = 0; i < 5; i++) {
      const x = (w * (i + 0.5)) / 5;
      const y = mid + H * 0.16 * Math.sin(x * chF + time * 0.6);
      dots.push(<Circle key={i} cx={x} cy={y} r={2.5} color={pal.accent} opacity={pulse} />);
    }
    content = (
      <>
        <GlowWave path={ghost} color={pal.wall} width={2} blur={8} coreWidth={0} opacity={0.5} />
        <GlowWave path={player} color={pal.player} width={3.4} blur={14 + 24 * pulse} coreWidth={0} />
        {dots}
      </>
    );
  } else if (kind === 'shift') {
    const chF = 0.026 + (0.042 - 0.026) * Math.max(0, Math.min(1, (cyc - 0.4) / 0.2));
    const gap = H * 0.32;
    const wallTop = sinePath(w, (x) => mid - gap / 2 + H * 0.15 * Math.sin(x * chF + time * 0.6));
    const wallBot = sinePath(w, (x) => mid + gap / 2 + H * 0.15 * Math.sin(x * chF + time * 0.6));
    const player = sinePath(w, (x) => mid + H * 0.15 * Math.sin(x * chF + time * 0.6));
    content = (
      <>
        <GlowWave path={wallTop} color={pal.wall} width={2} blur={6} coreWidth={0} opacity={0.9} />
        <GlowWave path={wallBot} color={pal.wall} width={2} blur={6} coreWidth={0} opacity={0.9} />
        <GlowWave path={player} color={pal.player} width={3} blur={14} coreWidth={0} />
      </>
    );
  } else if (kind === 'superpose') {
    const a1 = 0.03; const a2 = 0.06;
    const w1 = sinePath(w, (x) => mid + H * 0.1 * Math.sin(x * a1 + time * 0.6));
    const w2 = sinePath(w, (x) => mid + H * 0.06 * Math.sin(x * a2 + time * 0.6));
    const sum = sinePath(w, (x) => mid + H * 0.1 * Math.sin(x * a1 + time * 0.6) + H * 0.06 * Math.sin(x * a2 + time * 0.6));
    content = (
      <>
        <GlowWave path={w1} color={pal.player} width={1.6} blur={5} coreWidth={0} opacity={0.45} />
        <GlowWave path={w2} color={pal.wall} width={1.6} blur={5} coreWidth={0} opacity={0.45} />
        <GlowWave path={sum} color="#ffffff" width={3} blur={16} coreWidth={0} />
      </>
    );
  }

  return (
    <View style={{ width: '100%', height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Canvas style={{ flex: 1 }}>{content}</Canvas>
    </View>
  );
}

// Static mini wave glyph (song / pack thumbnails).
export function AtnMiniGlyph({ size = 46, diff = 'easy', color, glow }) {
  const freq = diff === 'hard' ? 0.55 : diff === 'mid' ? 0.42 : 0.3;
  const amp = size * 0.22;
  const path = sinePath(size, (x) => size / 2 + amp * Math.sin(x * freq), 2);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path} style="stroke" strokeWidth={2} color={color} strokeJoin="round" strokeCap="round">
        <BlurMask blur={3} style="solid" />
      </Path>
    </Canvas>
  );
}
