// Attune — How to Play onboarding: looping mini-demos per concept, then a clear
// "what it is / what it isn't" card.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnBackdrop, AtnButton } from '../components/ui';
import { AtnMiniDemo } from '../components/skiaWaves';

const STEPS = [
  { kind: 'tune', eyebrow: 'The control', title: 'One thumb.', body: "Your wave rolls forward on its own. Drag up and down to tune its frequency — that's the whole control." },
  { kind: 'match', eyebrow: 'The goal', title: 'Ride the channel.', body: 'Tune until your wave slips inside the glowing channel and rides its centre. The closer to centre, the better.' },
  { kind: 'bloom', eyebrow: 'The feeling', title: 'Hear yourself attune.', body: 'Stay aligned and the music blooms, layer by layer. Drift and it strains. Touch the wall and the run ends — restart is instant.' },
  { kind: 'shift', eyebrow: 'Hidden depth', title: 'It goes deeper.', body: 'Channels shift frequency mid-run — lead them early. Later, a second wave joins yours and you tune the sum. Simple to start, years to master.' },
];

const IS = [
  'A one-thumb skill game where the music is the obstacle',
  'Easy to pick up, deep to master — hidden depth',
  '300 songs across 25 packs + an endless Drift mode',
  '100% offline. No account. No data collected.',
  'Premium: pay once, play forever',
];
const ISNT = [
  'A set-the-dial puzzle — this is real-time flow',
  'A tap-to-the-beat rhythm game — control is continuous',
  'A physics lesson — no Hz, just feel',
  'Ads, IAP, energy timers, or loot',
  'Online, social, or login-gated',
];

export function HowToScreen({ pal, onDone, onSkip, flow }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const last = i >= STEPS.length; // final = clarity card
  const step = STEPS[i];
  const total = STEPS.length + 1;

  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={0.6} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: insets.top + 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: total }).map((_, k) => (
            <View key={k} style={{ width: k === Math.min(i, total - 1) ? 22 : 7, height: 7, borderRadius: 999, backgroundColor: k <= i ? pal.player : 'rgba(255,255,255,0.16)' }} />
          ))}
        </View>
        <Pressable onPress={onSkip}><Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.4, color: ATN_BASE.ink3 }}>SKIP ›</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
        {!last ? (
          <>
            <View style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glassDk, marginBottom: 26 }}>
              <AtnMiniDemo kind={step.kind} pal={pal} />
            </View>
            <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 10 }}>{step.eyebrow}</Text>
            <Text style={{ fontFamily: FONT.displaySemi, fontSize: 30, color: ATN_BASE.ink, letterSpacing: -0.9 }}>{step.title}</Text>
            <Text style={{ fontFamily: FONT.sans, fontSize: 15, lineHeight: 23, color: ATN_BASE.ink2, marginTop: 12 }}>{step.body}</Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 10 }}>Know what you're playing</Text>
            <Text style={{ fontFamily: FONT.displaySemi, fontSize: 28, color: ATN_BASE.ink, letterSpacing: -0.84, marginBottom: 18 }}>Attune is, and isn't.</Text>
            <View style={{ gap: 12 }}>
              <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: withAlpha(pal.player, 0.23), backgroundColor: withAlpha(pal.player, 0.07) }}>
                <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 10 }}>It is</Text>
                {IS.map((x, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 9, marginTop: k ? 8 : 0 }}>
                    <Text style={{ color: pal.player, fontSize: 13, lineHeight: 20 }}>✓</Text>
                    <Text style={{ flex: 1, fontFamily: FONT.sans, fontSize: 13.5, color: ATN_BASE.ink, lineHeight: 19 }}>{x}</Text>
                  </View>
                ))}
              </View>
              <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glassDk }}>
                <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3, marginBottom: 10 }}>It isn't</Text>
                {ISNT.map((x, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 9, marginTop: k ? 8 : 0 }}>
                    <Text style={{ color: ATN_BASE.ink3, fontSize: 13, lineHeight: 20 }}>✕</Text>
                    <Text style={{ flex: 1, fontFamily: FONT.sans, fontSize: 13.5, color: ATN_BASE.ink2, lineHeight: 19 }}>{x}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 24, paddingTop: 12 }}>
        <AtnButton variant="primary" pal={pal} onPress={() => { if (last) onDone(); else setI(i + 1); }}>
          {last ? (flow ? 'Try the tutorial' : 'Got it') : 'Next'}
        </AtnButton>
        {i > 0 && (
          <Pressable onPress={() => setI(Math.max(0, i - 1))} style={{ marginTop: 8, alignItems: 'center', padding: 6 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.4, color: ATN_BASE.ink3 }}>‹ BACK</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
