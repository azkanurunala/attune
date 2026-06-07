// Attune — pack detail: the songs inside one pack.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, ATN_PALETTES, FONT } from '../theme';
import { AtnBackdrop, AtnIconButton } from '../components/ui';
import { AtnSongRow } from './parts';

export function PackScreen({ pal, pack, progress, onPlay, onBack }) {
  const insets = useSafeAreaInsets();
  const pp = ATN_PALETTES[pack.palette];
  const done = pack.songs.filter((s) => (progress.songs[s.id] || {}).completed).length;
  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pp} intensity={0.7} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <AtnIconButton onPress={onBack} size={40} style={{ marginBottom: 18 }}>‹</AtnIconButton>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pp.player }}>{pack.tier} pack</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: ATN_BASE.ink3 }}>· {done}/{pack.count} cleared</Text>
        </View>
        <Text style={{ fontFamily: FONT.displayBold, fontSize: 36, color: ATN_BASE.ink, letterSpacing: -1.4 }}>{pack.name}</Text>
        <View style={{ gap: 10, marginTop: 22 }}>
          {pack.songs.map((song) => {
            const pr = progress.songs[song.id] || {};
            return (
              <AtnSongRow key={song.id} song={song} best={pr.best || 0} completed={!!pr.completed} locked={false} onPlay={() => onPlay(song.id)} />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
