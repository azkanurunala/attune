// Attune — the playable wave-surf engine (React Native Skia).
//
// A glowing sine (you) scrolls forward through a wavy glowing corridor. Drag a
// thumb up/down to change your wave's pitch (spatial frequency); match the
// corridor's frequency AND phase to ride centered through the channel. Frequency
// shifts demand anticipation; companion waves (superposition) overlay yours so
// you must tune the SUM. Touch the wall and the run ends.
//
// All sim state lives in refs and runs in a single rAF loop; React only repaints
// (setFrame) and re-reads props through a ref-mirror — the PANDUAN engine model.

import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder } from 'react-native';
import {
  Canvas, Group, Rect, Path, Circle, Line, LinearGradient, vec, Skia, BlurMask, DashPathEffect,
} from '@shopify/react-native-skia';
import { atnPitchToFreq, atnGapToPx, atnMakeEndlessGen } from '../songs';
import { rgba, withAlpha } from '../utils/color';

const ATN_STEP = 3; // profile sample resolution (px)

// Build a normalized corridor profile from a segment list. Stores sine VALUES
// (decoupled from canvas size) so resize never rebuilds the geometry.
function atnBuildProfile(segments) {
  const sinC = []; const gp01 = []; const compS = [];
  let phase = 0; let compPhase = 0;
  let prevPitch = segments[0].pitch; let prevGap = segments[0].gap;
  const push = (seg) => {
    const startPitch = prevPitch; const targetPitch = seg.pitch;
    const startGap = prevGap; const targetGap = seg.gap;
    const ramp = seg.ramp || 0; const comp = seg.comp || null;
    const n = Math.max(1, Math.round(seg.len / ATN_STEP));
    for (let k = 0; k < n; k++) {
      const d = k * ATN_STEP;
      const t = ramp > 0 ? Math.min(1, d / ramp) : 1;
      const pitch = startPitch + (targetPitch - startPitch) * t;
      const gap = startGap + (targetGap - startGap) * t;
      phase += 2 * Math.PI * atnPitchToFreq(pitch) * ATN_STEP;
      sinC.push(Math.sin(phase));
      gp01.push(gap);
      if (comp) {
        compPhase += 2 * Math.PI * atnPitchToFreq(comp.pitch) * ATN_STEP;
        compS.push(Math.sin(compPhase) * comp.amp * t);
      } else compS.push(0);
    }
    prevPitch = targetPitch; prevGap = targetGap;
  };
  segments.forEach(push);
  return {
    sinC, gp01, compS, STEP: ATN_STEP, totalLen: sinC.length * ATN_STEP,
    _phase: phase, _compPhase: compPhase, _prevPitch: prevPitch, _prevGap: prevGap,
  };
}

function atnExtendProfile(profile, gen, untilLen) {
  let phase = profile._phase; let compPhase = profile._compPhase;
  let prevPitch = profile._prevPitch; let prevGap = profile._prevGap;
  while (profile.sinC.length * ATN_STEP < untilLen) {
    const seg = gen();
    const startPitch = prevPitch; const targetPitch = seg.pitch;
    const startGap = prevGap; const targetGap = seg.gap;
    const ramp = seg.ramp || 0; const comp = seg.comp || null;
    const n = Math.max(1, Math.round(seg.len / ATN_STEP));
    for (let k = 0; k < n; k++) {
      const d = k * ATN_STEP;
      const t = ramp > 0 ? Math.min(1, d / ramp) : 1;
      const pitch = startPitch + (targetPitch - startPitch) * t;
      const gap = startGap + (targetGap - startGap) * t;
      phase += 2 * Math.PI * atnPitchToFreq(pitch) * ATN_STEP;
      profile.sinC.push(Math.sin(phase));
      profile.gp01.push(gap);
      if (comp) { compPhase += 2 * Math.PI * atnPitchToFreq(comp.pitch) * ATN_STEP; profile.compS.push(Math.sin(compPhase) * comp.amp * t); }
      else profile.compS.push(0);
    }
    prevPitch = targetPitch; prevGap = targetGap;
  }
  profile._phase = phase; profile._compPhase = compPhase;
  profile._prevPitch = prevPitch; profile._prevGap = prevGap;
  profile.totalLen = profile.sinC.length * ATN_STEP;
}

// build a Skia polyline path from [x,y] points (optionally with lead/trail pts)
function polyPath(points, pre, post) {
  const p = Skia.Path.Make();
  let started = false;
  if (pre) { p.moveTo(pre[0], pre[1]); started = true; }
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (!started) { p.moveTo(x, y); started = true; } else p.lineTo(x, y);
  }
  if (post) p.lineTo(post[0], post[1]);
  return p;
}

export function WaveGame({
  track, pal, glow = 1, speedMult = 1, gapMult = 1, colorblind = false, diffScale = 1,
  paused = false, audio = null, audioEnabled = true, runKey = 0,
  onStats = () => {}, onCrash = () => {}, onWin = () => {}, onPerfect = () => {},
}) {
  const [wh, setWh] = useState({ w: 0, h: 0 });
  const whRef = useRef(wh); whRef.current = wh;
  const stateRef = useRef(null);
  const profileRef = useRef(null);
  const [, setFrame] = useState(0);

  // keep latest props readable inside the rAF loop
  const propsRef = useRef({});
  propsRef.current = { pal, glow, speedMult, gapMult, colorblind, diffScale, paused, audio, audioEnabled, onStats, onCrash, onWin, onPerfect };

  // relative drag (scale-independent), hold-last on release
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const S = stateRef.current;
        if (S) S._startPitch = S.pitchTarget;
      },
      onPanResponderMove: (_e, g) => {
        const S = stateRef.current;
        if (!S) return;
        const frac = -g.dy / Math.max(1, whRef.current.h);
        S.pitchTarget = Math.max(0, Math.min(1, (S._startPitch ?? S.pitchTarget) + frac * 1.5));
      },
    }),
  );

  // build profile + fresh world + run the loop (rebuilds only on runKey / size)
  useEffect(() => {
    const W = wh.w; const H = wh.h;
    if (W < 2 || H < 2) return undefined;

    const tk = track;
    const endless = !!tk.endless;
    const gen = endless ? atnMakeEndlessGen(tk.seed || 1) : null;
    let profile;
    if (endless) {
      profile = atnBuildProfile([{ len: 900, pitch: 0.38, gap: 0.92 }]);
      atnExtendProfile(profile, gen, 4000);
    } else {
      profile = atnBuildProfile(tk.segments);
    }
    profileRef.current = profile;

    const now0 = (global.performance && performance.now) ? performance.now() : Date.now();
    const S = {
      W, H, worldX: 0, playerPhase: 0,
      pitch: 0.4, pitchTarget: 0.4, _startPitch: 0.4,
      ampFrac: 0.145, baseSpeed: 232,
      score: 0, distance: 0, perfects: 0, runElapsed: 0,
      align: 0, alignSmooth: 0, perfTimer: 0,
      samples: [], particles: [],
      dead: false, won: false, grace: 420,
      last: now0, statClock: 0, flash: 0, shake: 0,
    };
    stateRef.current = S;

    const sampleAt = (wx) => {
      let i = Math.floor(wx / profile.STEP);
      if (i < 0) i = 0;
      if (i >= profile.sinC.length) i = profile.sinC.length - 1;
      return i;
    };

    let raf;
    const frame = (tnow) => {
      raf = requestAnimationFrame(frame);
      const P = propsRef.current;
      const ampPx = H * S.ampFrac;
      const midY = H * 0.5;
      const nowX = W * 0.3;
      let dt = (tnow - S.last) / 1000;
      S.last = tnow;
      if (dt > 0.05) dt = 0.05;

      const frozen = P.paused || S.dead || S.won;
      if (!frozen) {
        S.pitch += (S.pitchTarget - S.pitch) * Math.min(1, dt * 9); // smoothing
        // ease the scroll up over the first ~1.6s so a run never starts too fast,
        // and scale by the song's difficulty (easy songs scroll slower)
        S.runElapsed += dt;
        const startEase = 0.45 + 0.55 * Math.min(1, S.runElapsed / 1.6);
        const speed = S.baseSpeed * P.diffScale * P.speedMult * startEase;
        const pFreq = atnPitchToFreq(S.pitch);
        S.worldX += speed * dt;
        S.distance += speed * dt;
        S.playerPhase += 2 * Math.PI * pFreq * speed * dt;

        if (endless) {
          const need = S.worldX + (W - nowX) + 1200;
          if (profile.totalLen < need) atnExtendProfile(profile, gen, need);
        }

        const i = sampleAt(S.worldX);
        const center = midY + ampPx * profile.sinC[i];
        const gapPx = Math.max(50, atnGapToPx(profile.gp01[i]) * P.gapMult);
        const compVal = ampPx * profile.compS[i];
        const effY = midY + ampPx * Math.sin(S.playerPhase) + compVal;
        const distc = Math.abs(effY - center);
        const half = gapPx / 2;
        const a = Math.max(0, Math.min(1, 1 - distc / half));
        S.align = a;
        S.alignSmooth += (a - S.alignSmooth) * Math.min(1, dt * 8);

        S.samples.push({ x: S.worldX, y: effY });
        const leftWorld = S.worldX - nowX - 20;
        while (S.samples.length > 2 && S.samples[0].x < leftWorld) S.samples.shift();

        S.score += dt * speed * (0.04 + a * 0.16);
        if (a > 0.9) {
          S.perfTimer += dt;
          if (S.perfTimer >= 0.5) {
            S.perfTimer = 0; S.perfects += 1; S.score += 120; S.flash = 1;
            if (P.audio && P.audioEnabled) P.audio.phasePerfect();
            P.onPerfect();
            for (let q = 0; q < 10; q++) {
              S.particles.push({ x: nowX, y: effY, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 120, life: 1, c: P.pal.accent });
            }
          }
        } else S.perfTimer = 0;

        if (S.worldX > S.grace && distc > half - 2) {
          S.dead = true; S.shake = 1;
          if (P.audio) P.audio.fail();
          P.onCrash({ score: Math.round(S.score), distance: Math.round(S.distance), perfects: S.perfects });
        }

        if (!endless && S.worldX >= profile.totalLen - (W - nowX) * 0.4) {
          S.won = true;
          if (P.audio) P.audio.setAlignment(1);
          P.onWin({ score: Math.round(S.score), distance: Math.round(S.distance), perfects: S.perfects });
        }

        if (P.audio) { P.audio.setAlignment(a); P.audio.setPlayerPitch(S.pitch); }
      }

      S.statClock += dt;
      if (S.statClock > 0.1) {
        S.statClock = 0;
        P.onStats({ score: Math.round(S.score), distance: Math.round(S.distance), align: S.alignSmooth, perfects: S.perfects, pitch: S.pitch });
      }

      S.flash *= 0.9;
      S.shake *= 0.86;
      for (const pt of S.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt * 1.6; }
      S.particles = S.particles.filter((p) => p.life > 0);

      setFrame((f) => (f + 1) % 1000000); // repaint
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, wh.w, wh.h]);

  // ── render: build Skia geometry from the current world each repaint ──
  const S = stateRef.current;
  const profile = profileRef.current;
  const W = wh.w; const H = wh.h;
  let scene = null;

  if (S && profile && W > 1 && H > 1) {
    const P = propsRef.current;
    const ampPx = H * S.ampFrac;
    const midY = H * 0.5;
    const nowX = W * 0.3;
    const a = S.alignSmooth;
    const cb = P.colorblind;
    const STEPpx = 5;
    const sampleAt = (wx) => {
      let i = Math.floor(wx / profile.STEP);
      if (i < 0) i = 0;
      if (i >= profile.sinC.length) i = profile.sinC.length - 1;
      return i;
    };

    const top = []; const bot = [];
    for (let sx = -10; sx <= W + 10; sx += STEPpx) {
      const wx = S.worldX + (sx - nowX);
      const i = sampleAt(wx);
      const center = midY + ampPx * profile.sinC[i];
      const gapPx = Math.max(50, atnGapToPx(profile.gp01[i]) * P.gapMult);
      top.push([sx, center - gapPx / 2]);
      bot.push([sx, center + gapPx / 2]);
    }

    // wall regions (solid, outside the channel)
    const topRegion = polyPath(top, [-10, -10], [W + 10, -10]); topRegion.close();
    const botRegion = polyPath(bot, [-10, H + 10], [W + 10, H + 10]); botRegion.close();
    // channel fill (top edge → reversed bottom edge)
    const channel = Skia.Path.Make();
    top.forEach(([x, y], k) => (k === 0 ? channel.moveTo(x, y) : channel.lineTo(x, y)));
    for (let k = bot.length - 1; k >= 0; k--) channel.lineTo(bot[k][0], bot[k][1]);
    channel.close();
    const topEdge = polyPath(top);
    const botEdge = polyPath(bot);

    // player wave: trail (recorded, left of now) + projection (right of now)
    const pts = [];
    for (const s of S.samples) {
      const sx = nowX + (s.x - S.worldX);
      if (sx >= -10 && sx <= nowX + 1) pts.push([sx, s.y]);
    }
    const pFreq = atnPitchToFreq(S.pitch);
    for (let sx = nowX; sx <= W + 10; sx += STEPpx) {
      const wx = S.worldX + (sx - nowX);
      const i = sampleAt(wx);
      const compVal = ampPx * profile.compS[i];
      const ph = S.playerPhase + 2 * Math.PI * pFreq * (wx - S.worldX);
      pts.push([sx, midY + ampPx * Math.sin(ph) + compVal]);
    }
    const playerPath = polyPath(pts);

    const iNow = sampleAt(S.worldX);
    const headY = midY + ampPx * Math.sin(S.playerPhase) + ampPx * profile.compS[iNow];
    const hr = 5 + 4 * a + S.flash * 5;

    // left-edge pitch indicator
    const pad = 14; const trackH = H * 0.34; const ty = midY - trackH / 2;
    const pitchTrack = Skia.Path.Make(); pitchTrack.moveTo(pad, ty); pitchTrack.lineTo(pad, ty + trackH);
    const ky = ty + trackH * (1 - S.pitch);

    const shx = (Math.random() - 0.5) * S.shake * 10;
    const shy = (Math.random() - 0.5) * S.shake * 10;
    const edgeBlur = (10 + 14 * a) * P.glow;
    const playerBlur = (14 + 26 * a) * P.glow;
    const channelAlpha = a > 0.6 ? 0.12 : 0.06;

    scene = (
      <Group transform={[{ translateX: shx }, { translateY: shy }]}>
        {/* backdrop wash */}
        <Rect x={0} y={0} width={W} height={H} opacity={0.92}>
          <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[P.pal.bg1, '#070A12', P.pal.bg2]} positions={[0, 0.5, 1]} />
        </Rect>
        {/* solid walls */}
        <Path path={topRegion} color={rgba('#040711', 0.7)} />
        <Path path={botRegion} color={rgba('#040711', 0.7)} />
        {/* channel tint */}
        <Path path={channel} color={withAlpha(P.pal.wall, channelAlpha)} />
        {/* glowing wall edges */}
        <Path path={topEdge} style="stroke" strokeWidth={2.4} color={P.pal.wall} strokeJoin="round" strokeCap="round">
          <BlurMask blur={edgeBlur} style="solid" />
          {cb && <DashPathEffect intervals={[10, 7]} />}
        </Path>
        <Path path={botEdge} style="stroke" strokeWidth={2.4} color={P.pal.wall} strokeJoin="round" strokeCap="round">
          <BlurMask blur={edgeBlur} style="solid" />
          {cb && <DashPathEffect intervals={[10, 7]} />}
        </Path>
        {/* now-line */}
        <Line p1={vec(nowX, 0)} p2={vec(nowX, H)} color="rgba(255,255,255,0.10)" strokeWidth={1} />
        {/* player wave: glow + core */}
        <Path path={playerPath} style="stroke" strokeWidth={2.8} color={P.pal.player} strokeJoin="round" strokeCap="round">
          <BlurMask blur={playerBlur} style="solid" />
        </Path>
        <Path path={playerPath} style="stroke" strokeWidth={1.4} color={cb ? '#FFFFFF' : 'rgba(255,255,255,0.85)'} strokeJoin="round" strokeCap="round" />
        {/* head dot */}
        <Circle cx={nowX} cy={headY} r={hr} color="#ffffff">
          <BlurMask blur={(16 + 24 * a) * P.glow} style="solid" />
        </Circle>
        {/* particles */}
        {S.particles.map((pt, k) => (
          <Circle key={k} cx={pt.x} cy={pt.y} r={2.2} color={pt.c} opacity={Math.max(0, pt.life)} />
        ))}
        {/* pitch indicator */}
        <Path path={pitchTrack} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.12)" />
        <Circle cx={pad} cy={ky} r={4} color={P.pal.player}>
          <BlurMask blur={10 * P.glow} style="solid" />
        </Circle>
      </Group>
    );
  }

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (Math.abs(width - wh.w) > 1 || Math.abs(height - wh.h) > 1) setWh({ w: width, h: height });
      }}
      {...panRef.current.panHandlers}
    >
      <Canvas style={{ flex: 1 }}>{scene}</Canvas>
    </View>
  );
}
