// Attune — small shared screen parts: Game Center rank math + banner, song row,
// pack card, leaderboard row data.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ATN_BASE, ATN_PALETTES, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnPanel, AtnAvatar, atnFmt } from '../components/ui';
import { AtnMiniGlyph } from '../components/skiaWaves';
import { atnMulberry, atnHash, atnPackUnlocked } from '../library';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// global rank from a score (shared by the map banner + the board, so they agree)
export const atnRankFor = (score) =>
  Math.max(3, 1284 - Math.min(1240, Math.round((score || 0) / 9)));

export const ATN_HANDLES = ['lumen_kid', 'phase.lock', 'drift_witch', 'nulltone', 'sine.surfer', 'kael', 'mireille', '0xWave', 'tidalµ', 'haru_no', 'VOID★', 'aria_b', 'kestrel', 'nocturne9', 'p1xel', 'santi', 'echo.ets', 'mariposa', 'byte_rider', 'Lin', 'umbra', 'fenn', 'qiao', 'Rune', 'halcyon', 'mossy', 'vex', 'Indra', 'so7', 'Noor', 'kairos', 'wenli', 'Pyre', 'amaru', 'Selin', 'dot.dot', 'okami', 'Yara', 'zephyr', 'M3sh'];

export function atnLeaderRows(boardSeed) {
  const r = atnMulberry(boardSeed);
  const rows = [];
  let v = 18000 + Math.floor(r() * 9000);
  for (let i = 0; i < 40; i++) {
    rows.push({ name: ATN_HANDLES[i % ATN_HANDLES.length] + (i >= ATN_HANDLES.length ? i : ''), score: v });
    v -= Math.floor(80 + r() * 360);
  }
  return rows;
}

// stacked Game Center dot logo
export function GCDots({ size = 9, ring = '#0A0E18' }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {['#7AD3FF', '#9D7BFF', '#5BF2A8', '#FFB454'].map((c, i) => (
        <View
          key={i}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c, marginLeft: i ? -size / 3 : 0, borderWidth: 1.5, borderColor: ring }}
        />
      ))}
    </View>
  );
}

// Game Center welcome banner (slides in once on the map).
export function AtnGCBanner({ pal, rank, onTap, top = 50 }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setShow(true), 350);
    const b = setTimeout(() => setShow(false), 4200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (!show) return null;
  return (
    <Pressable
      onPress={onTap}
      style={{ position: 'absolute', top, left: 14, right: 14, zIndex: 80 }}
    >
      <BlurView intensity={40} tint="dark" style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: 'rgba(18,22,34,0.82)', overflow: 'hidden' }}>
        <AtnAvatar name="You" size={34} hue={200} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.sansSemi, fontSize: 13, color: ATN_BASE.ink }}>Welcome back</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10.5, color: ATN_BASE.ink3, marginTop: 1 }}>Game Center · Rank #{rank.toLocaleString()} in Endless</Text>
        </View>
        <GCDots size={8} ring="rgba(18,22,34,0.9)" />
      </BlurView>
    </Pressable>
  );
}

// One song row.
export function AtnSongRow({ song, best, completed, locked, onPlay }) {
  const sp = ATN_PALETTES[song.palette];
  const diffColor = song.difficulty === 'hard' ? '#FF7A9C' : song.difficulty === 'mid' ? '#FFC24B' : sp.player;
  return (
    <Pressable onPress={locked ? undefined : onPlay} style={{ opacity: locked ? 0.45 : 1 }}>
      <BlurView intensity={26} tint="dark" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glass, overflow: 'hidden' }}>
        <View style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: withAlpha(sp.player, 0.27) }}>
          <LinearGradient colors={[sp.bg1, sp.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <AtnMiniGlyph size={46} diff={song.difficulty} color={sp.player} glow={sp.glow} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.displaySemi, fontSize: 18, color: ATN_BASE.ink, letterSpacing: -0.36 }}>{song.title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: FONT.sans, fontSize: 12.5, color: ATN_BASE.ink2, marginTop: 2 }}>{sp.mood}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: diffColor }}>{song.difficulty}</Text>
          {locked
            ? <Text style={{ fontSize: 10, color: ATN_BASE.ink3 }}>🔒</Text>
            : best > 0
              ? <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: ATN_BASE.ink }}>{atnFmt(best)}</Text>
              : <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: ATN_BASE.ink3 }}>{completed ? '✓ done' : 'new'}</Text>}
        </View>
      </BlurView>
    </Pressable>
  );
}

// One pack card.
export function AtnPackCard({ pack, pal, progress, onOpen }) {
  const pp = ATN_PALETTES[pack.palette];
  const unlocked = atnPackUnlocked(pack, progress);
  const done = pack.songs.filter((s) => (progress.songs[s.id] || {}).completed).length;
  const glyphDiff = pack.tier === 'master' || pack.tier === 'hard' ? 'hard' : pack.tier;
  return (
    <Pressable onPress={() => onOpen(pack)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 13, paddingHorizontal: 15, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: ATN_BASE.hair }}>
        <View style={{ width: 48, height: 48, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={[pp.player, pp.wall]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ opacity: 0.5 }}><AtnMiniGlyph size={48} diff={glyphDiff} color="#fff" glow="#fff" /></View>
          {!unlocked && (
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,9,16,0.5)' }}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 18, color: ATN_BASE.ink, letterSpacing: -0.36 }}>{pack.name}</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10.5, color: ATN_BASE.ink3, marginTop: 3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{pack.count} songs · {pack.tier}</Text>
        </View>
        <View>
          {unlocked
            ? <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: done ? pp.player : ATN_BASE.ink3 }}>{done ? `${done}/${pack.count}` : 'play →'}</Text>
            : <Text style={{ fontFamily: FONT.mono, fontSize: 9.5, color: pal.player, letterSpacing: 1, textTransform: 'uppercase' }}>Pro</Text>}
        </View>
      </View>
    </Pressable>
  );
}
