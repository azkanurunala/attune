// Attune — results: score, best, "one more run", and Game Center.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { AtnBackdrop, AtnButton, AtnChip, atnFmt } from '../components/ui';

export function ResultsScreen({ pal, result, song, isNewBest, onRetry, onNext, onMap, onLeaderboard, onShare }) {
  const insets = useSafeAreaInsets();
  const won = result.outcome === 'win';
  const endless = result.mode === 'endless';
  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={won ? 1 : 0.5} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 30, paddingBottom: insets.bottom + 30, paddingHorizontal: 26 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: won ? pal.player : ATN_BASE.ink3, marginBottom: 12 }}>
          {endless ? 'Drift ended' : won ? 'Channel complete' : 'Wave clipped'}
        </Text>
        <Text style={{ fontFamily: FONT.displayBold, fontSize: 40, color: ATN_BASE.ink, letterSpacing: -1.6 }}>
          {endless ? 'Drift' : (song ? song.title : 'Run')}
        </Text>

        <View style={{ marginTop: 26, padding: 22, borderRadius: 22, backgroundColor: ATN_BASE.glass, borderWidth: 1, borderColor: ATN_BASE.hair }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>{endless ? 'Distance' : 'Score'}</Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 46, color: ATN_BASE.ink, lineHeight: 50 }}>{endless ? atnFmt(result.distance) : atnFmt(result.score)}</Text>
            </View>
            {isNewBest && <AtnChip color={pal.player} style={{ marginBottom: 6 }}>New best</AtnChip>}
          </View>
          <View style={{ flexDirection: 'row', gap: 22, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: ATN_BASE.hair2 }}>
            <View>
              <Text style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>Phase-perfect</Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 20, color: pal.accent, marginTop: 3 }}>{result.perfects}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>{endless ? 'Score' : 'Distance'}</Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 20, color: ATN_BASE.ink2, marginTop: 3 }}>{endless ? atnFmt(result.score) : atnFmt(result.distance)}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <AtnButton variant="primary" pal={pal} onPress={onRetry}>↻ One more run</AtnButton>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><AtnButton variant="ghost" pal={pal} onPress={onMap} textStyle={{ fontSize: 14 }}>Song map</AtnButton></View>
            {won && onNext && <View style={{ flex: 1 }}><AtnButton variant="ghost" pal={pal} onPress={onNext} textStyle={{ fontSize: 14 }}>Next song →</AtnButton></View>}
          </View>
          <Pressable onPress={onLeaderboard} style={{ marginTop: 6, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: ATN_BASE.ink2 }}>♚ View Game Center ranks ↗</Text>
          </Pressable>
          <Pressable onPress={onShare} style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: ATN_BASE.ink3 }}>Share last 5 seconds ↗</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
