// Attune — Game Center-style leaderboard. Live top scores when the native
// module is present; otherwise a seeded preview (iOS-only feature).

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnBackdrop, AtnIconButton, AtnAvatar } from '../components/ui';
import { atnHash } from '../library';
import { atnLeaderRows, atnRankFor, GCDots } from './parts';
import { loadTopScores, isLeaderboardAvailable, presentLeaderboard } from '../leaderboard';

function Seg({ value, opts, onChange }) {
  return (
    <View style={{ flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.06)', gap: 2 }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)} style={{ flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 12.5, color: on ? ATN_BASE.ink : ATN_BASE.ink3 }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LeaderboardScreen({ pal, progress, onBack }) {
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState('endless'); // endless | score
  const [frame, setFrame] = useState('all'); // today | week | all
  const [live, setLive] = useState(null); // native rows if available

  const playerScore = board === 'endless'
    ? (progress.endlessBest || 0)
    : Object.values(progress.songs || {}).reduce((a, s) => a + (s.best || 0), 0);

  // try the native Game Center board; fall back to the seeded preview
  useEffect(() => {
    let alive = true;
    if (isLeaderboardAvailable()) {
      loadTopScores(board, 40).then((rows) => { if (alive && rows && rows.length) setLive(rows); else if (alive) setLive(null); });
    } else setLive(null);
    return () => { alive = false; };
  }, [board, frame]);

  const seed = atnHash(board === 'endless' ? 101 : 202, frame === 'today' ? 1 : frame === 'week' ? 2 : 3);
  const scale = frame === 'today' ? 0.18 : frame === 'week' ? 0.5 : 1;
  const rows = live
    || atnLeaderRows(seed).map((x) => ({ ...x, score: Math.round(x.score * scale) })).sort((a, b) => b.score - a.score);
  const myRank = board === 'endless' ? atnRankFor(playerScore) : Math.max(3, 4200 - Math.min(4100, Math.round(playerScore / 20)));
  const medal = ['#F5C84B', '#C9D2E0', '#D9925A'];
  const isLive = !!live; // real Game Center rows vs. the seeded sample

  const PlayerRow = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingHorizontal: 12, borderRadius: 13, backgroundColor: withAlpha(pal.player, 0.12), borderWidth: 1, borderColor: withAlpha(pal.player, 0.33) }}>
      <Text style={{ width: 32, textAlign: 'center', fontFamily: FONT.monoSemi, fontSize: 14, color: pal.player }}>{myRank.toLocaleString()}</Text>
      <AtnAvatar name="You" size={32} hue={200} />
      <Text style={{ flex: 1, fontFamily: FONT.sansBold, fontSize: 14, color: ATN_BASE.ink }}>You</Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: pal.player }}>{Math.round(playerScore).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={0.5} />
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 18, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AtnIconButton onPress={onBack} size={38}>‹</AtnIconButton>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GCDots size={9} />
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 15, color: ATN_BASE.ink }}>Game Center</Text>
          </View>
        </View>
      </View>

      {/* player summary */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
        <View style={{ borderRadius: 18, padding: 14, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glass, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <AtnAvatar name="You" size={46} hue={200} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.sansBold, fontSize: 16, color: ATN_BASE.ink }}>You</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: ATN_BASE.ink3, marginTop: 2 }}>wave surfer · since 2026</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>Global rank</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 22, color: pal.player }}>#{myRank.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, gap: 8, paddingBottom: 10 }}>
        <Seg value={board} onChange={setBoard} opts={[{ v: 'endless', l: 'Endless · Distance' }, { v: 'score', l: 'Total Score' }]} />
        <Seg value={frame} onChange={setFrame} opts={[{ v: 'today', l: 'Today' }, { v: 'week', l: 'This Week' }, { v: 'all', l: 'All Time' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isLive ? '#5BF2A8' : '#FFC24B' }} />
          <Text style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>
            {isLive ? 'Live · Game Center' : 'Sample ranks — sign in to Game Center on a device for live global ranks'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ opacity: isLive ? 1 : 0.5 }}>
          {rows.slice(0, 40).map((row, i) => {
            const rank = i + 1;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 13, marginBottom: 5 }}>
                <Text style={{ width: 32, textAlign: 'center', fontFamily: FONT.monoSemi, fontSize: 14, color: rank <= 3 ? medal[rank - 1] : ATN_BASE.ink3 }}>{rank}</Text>
                <AtnAvatar name={row.name} size={32} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.sansMed, fontSize: 14, color: ATN_BASE.ink }}>{row.name}</Text>
                <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: ATN_BASE.ink2 }}>{(row.score || 0).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: ATN_BASE.hair2, paddingTop: 8, marginTop: 4 }}>
          <PlayerRow />
        </View>
        {isLeaderboardAvailable() && (
          <Pressable onPress={() => presentLeaderboard(board)} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: pal.player }}>Open in Game Center ↗</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
