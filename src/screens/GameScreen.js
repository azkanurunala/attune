// Attune — gameplay wrapper: HUD, pause sheet, fair-resume countdown, tutorial
// hints. Hosts the Skia WaveGame engine and the per-run audio lifecycle.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnButton, AtnAlignMeter, atnFmt } from '../components/ui';
import { WaveGame } from '../game/WaveEngine';
import { atnSongSegments } from '../library';

const TUT_HINTS = [
  { at: 0, text: 'Drag up and down to tune your wave.' },
  { at: 1300, text: 'Match the glowing channel — ride its centre.' },
  { at: 2600, text: "Stay aligned and the music blooms. You're attuned." },
];

export function GameScreen({ mode, song, pal, t, audio, onResult, onExit, topInset = 54 }) {
  useKeepAwake();
  const isEndless = mode === 'endless';
  const isTut = mode === 'tutorial';
  const trackRef = useRef(
    isEndless ? { endless: true, seed: (Date.now() & 0xffff) || 7 } : { segments: atnSongSegments(song) },
  );
  const track = trackRef.current;

  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState('count'); // count | play | crashed | won
  const [hud, setHud] = useState({ score: 0, distance: 0, align: 0, perfects: 0, pitch: 0.4 });
  const [hintIdx, setHintIdx] = useState(0);
  const resultRef = useRef(null);
  const phaseRef = useRef(phase); phaseRef.current = phase;

  // audio lifecycle (start per run, stop on unmount)
  useEffect(() => {
    if (t.audio) {
      audio.setVolume(t.volume); audio.setEnabled(true);
      audio.start(song ? song.palette : 'drift', song ? song.bpm : 116);
    } else audio.setEnabled(false);
    return () => audio.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  useEffect(() => { audio.setEnabled(t.audio); }, [t.audio]); // eslint-disable-line
  useEffect(() => { audio.setVolume(t.volume); }, [t.volume]); // eslint-disable-line

  // resume countdown
  useEffect(() => {
    if (phase !== 'count') return undefined;
    setCountdown(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(id); setPhase('play'); } else setCountdown(n);
    }, 650);
    return () => clearInterval(id);
  }, [phase, runKey]);

  // auto-pause when app backgrounded
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && phaseRef.current === 'play') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // tutorial hint progression
  useEffect(() => {
    if (!isTut) return;
    let next = 0;
    for (let i = 0; i < TUT_HINTS.length; i++) if (hud.distance >= TUT_HINTS[i].at) next = i;
    if (next !== hintIdx) setHintIdx(next);
  }, [hud.distance, isTut, hintIdx]);

  const handleStats = useCallback((s) => setHud(s), []);
  const handlePerfect = useCallback(() => {
    if (t.haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} }
  }, [t.haptics]);
  const handleCrash = useCallback((r) => {
    resultRef.current = { ...r, outcome: 'crash', mode, songId: song ? song.id : 'endless' };
    if (t.haptics) { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {} }
    setPhase('crashed');
    setTimeout(() => onResult(resultRef.current), 900);
  }, [mode, song, onResult, t.haptics]);
  const handleWin = useCallback((r) => {
    resultRef.current = { ...r, outcome: 'win', mode, songId: song ? song.id : 'endless' };
    if (t.haptics) { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} }
    setPhase('won');
    setTimeout(() => onResult(resultRef.current), 1100);
  }, [mode, song, onResult, t.haptics]);

  const restart = () => { setPaused(false); setPhase('count'); setRunKey((k) => k + 1); };
  const gameFrozen = paused || phase === 'count';

  return (
    <View style={{ flex: 1, backgroundColor: '#05070D' }}>
      <WaveGame
        track={track} pal={pal} glow={t.glow} speedMult={t.speed} gapMult={t.gap}
        colorblind={t.colorblind} paused={gameFrozen} audio={audio} audioEnabled={t.audio}
        runKey={runKey} onStats={handleStats} onCrash={handleCrash} onWin={handleWin} onPerfect={handlePerfect}
      />

      {/* HUD */}
      <View style={{ position: 'absolute', top: topInset, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }} pointerEvents="box-none">
        <Pressable onPress={() => setPaused(true)} style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glass, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <View style={{ width: 3, height: 13, backgroundColor: ATN_BASE.ink, borderRadius: 1 }} />
          <View style={{ width: 3, height: 13, backgroundColor: ATN_BASE.ink, borderRadius: 1 }} />
        </Pressable>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>{isEndless ? 'Distance' : 'Score'}</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 26, color: ATN_BASE.ink, lineHeight: 28 }}>{isEndless ? atnFmt(hud.distance) : atnFmt(hud.score)}</Text>
        </View>
      </View>

      {/* alignment meter */}
      <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ATN_BASE.glassDk, borderWidth: 1, borderColor: ATN_BASE.hair2 }}>
          <AtnAlignMeter value={hud.align} pal={pal} label={hud.align > 0.85 ? 'ATTUNED' : 'RESONANCE'} />
          {hud.perfects > 0 && <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: pal.accent }}>×{hud.perfects}</Text>}
        </View>
      </View>

      {/* drag hint at very start */}
      {phase === 'play' && hud.distance < 600 && !isTut && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 86, alignItems: 'center' }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink2 }}>↕ drag to tune</Text>
        </View>
      )}

      {/* tutorial hints */}
      {isTut && phase === 'play' && (
        <View style={{ position: 'absolute', left: 24, right: 24, bottom: 92, alignItems: 'center' }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.sansMed, fontSize: 15, color: ATN_BASE.ink, textAlign: 'center' }}>{TUT_HINTS[hintIdx].text}</Text>
        </View>
      )}
      {isTut && (
        <Pressable onPress={() => onResult({ outcome: 'win', mode: 'tutorial', score: 0, distance: 0, perfects: 0 })} style={{ position: 'absolute', top: topInset + 8, alignSelf: 'center' }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: ATN_BASE.ink3 }}>Skip ›</Text>
        </Pressable>
      )}

      {/* countdown */}
      {phase === 'count' && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,7,13,0.35)' }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.displayBold, fontSize: 88, color: pal.player }}>{countdown}</Text>
          {isTut && <Text style={{ fontFamily: FONT.sans, color: ATN_BASE.ink2, marginTop: 8 }}>Find the channel</Text>}
        </View>
      )}

      {/* crash / win flash */}
      {phase === 'crashed' && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(ATN_BASE.danger, 0.13) }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 30, color: '#fff', letterSpacing: -0.9 }}>clipped</Text>
        </View>
      )}
      {phase === 'won' && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 30, color: pal.player, letterSpacing: -0.9 }}>{isTut ? 'attuned' : 'resonance'}</Text>
        </View>
      )}

      {/* pause sheet */}
      {paused && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: 'rgba(5,7,13,0.82)' }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 10 }}>Paused</Text>
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 30, color: ATN_BASE.ink, marginBottom: 26 }}>{isEndless ? 'Drift' : (song ? song.title : '')}</Text>
          <View style={{ width: '100%', maxWidth: 280, gap: 10 }}>
            <AtnButton variant="primary" pal={pal} onPress={() => { setPaused(false); setPhase('count'); }}>Resume</AtnButton>
            <AtnButton variant="ghost" pal={pal} onPress={restart} textStyle={{ fontSize: 14 }}>Restart</AtnButton>
            <AtnButton variant="ghost" pal={pal} onPress={onExit} textStyle={{ fontSize: 14 }}>Quit to map</AtnButton>
          </View>
        </View>
      )}
    </View>
  );
}
