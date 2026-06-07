// Attune — song map: 300 songs across 25 packs, plus Endless + Game Center.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnBackdrop, AtnIconButton, atnFmt } from '../components/ui';
import { atnPackUnlocked, ATN_PACKS, ATN_TOTAL_SONGS } from '../library';
import { AtnGCBanner, AtnPackCard, GCDots, atnRankFor } from './parts';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export function SongMapScreen({ pal, progress, onEndless, onSettings, onHowTo, onOpenPack, onLeaderboard }) {
  const insets = useSafeAreaInsets();
  const myRank = atnRankFor(progress.endlessBest || 0);
  const ownedPacks = ATN_PACKS.filter((p) => atnPackUnlocked(p, progress)).length;

  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={0.7} />
      <AtnGCBanner pal={pal} rank={myRank} onTap={onLeaderboard} top={insets.top + 4} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
          <View>
            <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 8 }}>
              {ATN_TOTAL_SONGS} songs · {ownedPacks}/{ATN_PACKS.length} packs
            </Text>
            <Text style={{ fontFamily: FONT.displayBold, fontSize: 38, color: ATN_BASE.ink, letterSpacing: -1.5 }}>Attune</Text>
          </View>
          <AtnIconButton onPress={onSettings}>⚙</AtnIconButton>
        </View>

        {/* Endless + Game Center quick row */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable onPress={onEndless} style={{ flex: 1 }}>
            <View style={{ padding: 15, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: withAlpha(pal.player, 0.27) }}>
              <LinearGradient colors={[pal.bg1, pal.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
              <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.accent, marginBottom: 7 }}>Endless</Text>
              <Text style={{ fontFamily: FONT.displaySemi, fontSize: 22, color: ATN_BASE.ink, letterSpacing: -0.66 }}>Drift</Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: ATN_BASE.ink2, marginTop: 6 }}>best {atnFmt(progress.endlessBest)}</Text>
            </View>
          </Pressable>
          <Pressable onPress={onLeaderboard} style={{ flex: 1 }}>
            <BlurView intensity={26} tint="dark" style={{ padding: 15, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glass }}>
              <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                <GCDots size={8} />
                <Text style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>Game Center</Text>
              </View>
              <Text style={{ fontFamily: FONT.displaySemi, fontSize: 22, color: ATN_BASE.ink, letterSpacing: -0.66 }}>Ranks</Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: ATN_BASE.ink2, marginTop: 6 }}>#{myRank.toLocaleString()}</Text>
            </BlurView>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16, marginHorizontal: 2 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>Packs</Text>
          <Pressable onPress={onHowTo}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: pal.player }}>How to play →</Text>
          </Pressable>
        </View>

        <View style={{ gap: 9 }}>
          {ATN_PACKS.map((pack) => (
            <AtnPackCard key={pack.id} pack={pack} pal={pal} progress={progress} onOpen={onOpenPack} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
