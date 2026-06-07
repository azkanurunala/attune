// Attune — animated story video. A cinematic, time-driven sequence telling the
// arc: Dissonance → Searching → Resonance. One tone, lost in noise, learns to
// find the channel where it finally attunes. Skia-drawn, captions crossfade,
// skippable, replayable. Time-based so it self-recovers if rAF is throttled.

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Canvas, Path, Circle, Group, Rect, Skia, BlurMask, LinearGradient, vec } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT, mixHex } from '../theme';
import { AtnButton, AtnIconButton } from '../components/ui';

const DUR = 24; // seconds
const CAPS = [
  { s: 0.6, e: 4.5, t: 'In a world that never stops sounding —' },
  { s: 4.8, e: 8.2, t: 'one tone, alone. Out of phase with everything.' },
  { s: 8.6, e: 12.4, t: "It doesn't fight the noise. It listens." },
  { s: 12.8, e: 16.4, t: 'It searches for the frequency where it fits.' },
  { s: 16.8, e: 20.2, t: 'And when it finds it, the world stops being noise —' },
  { s: 20.4, e: 23.6, t: '— and becomes a song.' },
];

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

function sineP(W, yFn, step = 5) {
  const p = Skia.Path.Make();
  for (let x = 0; x <= W; x += step) { const y = yFn(x); if (x === 0) p.moveTo(x, y); else p.lineTo(x, y); }
  return p;
}

export function StoryScreen({ pal, onDone, onSkip, onBack }) {
  const insets = useSafeAreaInsets();
  const [wh, setWh] = useState({ w: 360, h: 720 });
  const [ended, setEnded] = useState(false);
  const [, setFrame] = useState(0);
  const clock = useRef({ start: 0, last: 0, t: 0, ended: false });
  const seeds = useRef(null);
  const parts = useRef([]);

  useEffect(() => {
    if (!seeds.current) {
      seeds.current = Array.from({ length: 6 }, () => ({
        f: 0.012 + Math.random() * 0.04, a: 14 + Math.random() * 26,
        sp: 0.4 + Math.random() * 1.6, ph: Math.random() * 9, y: 0.2 + Math.random() * 0.6,
      }));
    }
    let raf;
    const loop = (ts) => {
      if (!clock.current.last) { clock.current.last = ts; clock.current.start = ts; }
      clock.current.t = (ts - clock.current.start) / 1000;
      // particle update
      const t = clock.current.t;
      const lock = ease((t - 16) / 4);
      if (t > 16 && parts.current.length < 60 && Math.random() < 0.5 * lock) {
        parts.current.push({ x: Math.random() * wh.w, y: wh.h / 2, vy: (Math.random() - 0.5) * 30, life: 1 });
      }
      for (let i = parts.current.length - 1; i >= 0; i--) {
        const p = parts.current[i]; p.y += p.vy * 0.016; p.life -= 0.012;
        if (p.life <= 0) parts.current.splice(i, 1);
      }
      if (t >= DUR && !clock.current.ended) { clock.current.ended = true; setEnded(true); }
      setFrame((f) => (f + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wh.w, wh.h]);

  const replay = () => { clock.current = { start: 0, last: 0, t: 0, ended: false }; parts.current = []; setEnded(false); };

  const W = wh.w; const H = wh.h; const mid = H / 2;
  const t = clock.current.t;
  const warm = ease((t - 14) / 7);
  const bgTop = mixHex('#0A0E16', pal.bg1, warm);
  const bgBot = mixHex('#0A0E16', pal.bg2, warm);

  // act I noise
  const noiseAlpha = lerp(0.5, 0, ease((t - 4) / 5));
  const noisePaths = (noiseAlpha > 0.01 && seeds.current)
    ? seeds.current.map((n) => sineP(W, (x) => mid + (n.y - 0.4) * H * 0.6 + n.a * Math.sin(x * n.f + t * n.sp + n.ph), 6))
    : [];

  // channel
  const chanA = ease((t - 8) / 4);
  const lock = ease((t - 16) / 4);
  const chanFreq = 0.03; const chanAmp = H * 0.12;
  const gap = lerp(H * 0.3, H * 0.13, lock);
  const chanTop = chanA > 0.01 ? sineP(W, (x) => mid + chanAmp * Math.sin(x * chanFreq + t * 0.7) - gap / 2) : null;
  const chanBot = chanA > 0.01 ? sineP(W, (x) => mid + chanAmp * Math.sin(x * chanFreq + t * 0.7) + gap / 2) : null;

  // protagonist
  const bright = ease((t - 6) / 8);
  const jitter = lerp(10, 0, ease((t - 6) / 6));
  const sweep = Math.sin(t * 0.9) * lerp(0.02, 0, lock);
  const pFreq = lerp(0.05, chanFreq, ease((t - 8) / 8)) + sweep;
  const pAmp = lerp(H * 0.04, chanAmp, bright);
  const pCol = mixHex('#6E7A8C', pal.player, bright);
  const proPath = sineP(W, (x) => {
    const jit = jitter * (Math.sin(x * 0.3 + t * 9) * 0.5);
    return mid + pAmp * Math.sin(x * pFreq + t * 0.7) + jit;
  }, 4);

  // captions
  let capText = ''; let capOp = 0;
  for (const c of CAPS) {
    if (t >= c.s - 0.5 && t <= c.e + 0.5) {
      capText = c.t;
      capOp = Math.max(0, Math.min((t - c.s + 0.5) / 0.5, (c.e + 0.5 - t) / 0.5, 1));
    }
  }
  const progress = Math.min(100, (t / DUR) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#06080F' }} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; setWh({ w: width, h: height }); }}>
      <Canvas style={{ flex: 1 }}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[bgTop, '#06080F', bgBot]} positions={[0, 0.5, 1]} />
        </Rect>
        {noisePaths.map((p, k) => (
          <Path key={k} path={p} style="stroke" strokeWidth={1.4} color="#5A6678" opacity={noiseAlpha} />
        ))}
        {chanTop && (
          <Group opacity={chanA * (0.5 + 0.5 * lock)}>
            <Path path={chanTop} style="stroke" strokeWidth={2} color={pal.wall}><BlurMask blur={8 + 18 * lock} style="solid" /></Path>
            <Path path={chanBot} style="stroke" strokeWidth={2} color={pal.wall}><BlurMask blur={8 + 18 * lock} style="solid" /></Path>
          </Group>
        )}
        <Path path={proPath} style="stroke" strokeWidth={2.6 + 1.4 * bright} color={pCol} strokeJoin="round" strokeCap="round">
          <BlurMask blur={(6 + 30 * bright) * (0.6 + 0.4 * lock)} style="solid" />
        </Path>
        {bright > 0.3 && (
          <Path path={proPath} style="stroke" strokeWidth={1.2} color="rgba(255,255,255,0.8)" strokeJoin="round" strokeCap="round" />
        )}
        {parts.current.map((p, k) => (
          <Circle key={k} cx={p.x} cy={p.y} r={2} color={pal.accent} opacity={Math.max(0, p.life)} />
        ))}
      </Canvas>

      {/* logo reveal at climax */}
      {ended && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.displayBold, fontSize: 60, color: '#fff', letterSpacing: -3 }}>Attune</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.accent, marginTop: 14 }}>find your frequency</Text>
        </View>
      )}

      {/* caption */}
      <View style={{ position: 'absolute', left: 28, right: 28, bottom: insets.bottom + 150, alignItems: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: FONT.displaySemi, fontSize: 21, lineHeight: 28, color: '#EEF2FB', textAlign: 'center', letterSpacing: -0.42, opacity: capOp }}>{capText}</Text>
      </View>

      {/* progress bar */}
      <View style={{ position: 'absolute', left: 28, right: 28, bottom: insets.bottom + 118, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: pal.player }} />
      </View>

      {/* controls */}
      {onBack && (
        <View style={{ position: 'absolute', top: insets.top + 8, left: 18 }}>
          <AtnIconButton onPress={onBack} size={38}>‹</AtnIconButton>
        </View>
      )}
      {!ended && (
        <Pressable onPress={onSkip} style={{ position: 'absolute', top: insets.top + 8, right: 18, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glass }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.4, color: ATN_BASE.ink2 }}>SKIP ›</Text>
        </Pressable>
      )}
      {ended && (
        <View style={{ position: 'absolute', left: 28, right: 28, bottom: insets.bottom + 40, gap: 10 }}>
          <AtnButton variant="primary" pal={pal} onPress={onDone}>Continue</AtnButton>
          <Pressable onPress={replay} style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.4, color: ATN_BASE.ink3 }}>↺ REPLAY</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
