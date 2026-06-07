// Attune — title: a breathing wave in the dark. Tap anywhere to begin.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnBackdrop } from '../components/ui';
import { AtnHeroWave } from '../components/skiaWaves';

export function TitleScreen({ pal, onBegin }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={onBegin} style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 26 }}>
          One tone · surf the song
        </Text>
        <Text style={{ fontFamily: FONT.displayBold, fontSize: 64, color: ATN_BASE.ink, letterSpacing: -3.2, textShadowColor: withAlpha(pal.glow, 0.33), textShadowRadius: 40, textShadowOffset: { width: 0, height: 0 } }}>
          Attune
        </Text>
        <View style={{ width: '100%', maxWidth: 320, marginVertical: 28 }}>
          <AtnHeroWave pal={pal} />
        </View>
        <Text style={{ fontFamily: FONT.sans, color: ATN_BASE.ink2, fontSize: 15, lineHeight: 22, maxWidth: 280, textAlign: 'center' }}>
          Find the frequency where you belong. Align your wave with the channel and the music comes alive.
        </Text>
      </View>
      <View style={{ paddingBottom: insets.bottom + 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>
          Tap anywhere to begin
        </Text>
      </View>
    </Pressable>
  );
}
