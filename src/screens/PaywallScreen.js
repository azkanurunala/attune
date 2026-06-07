// Attune — premium paywall (custom). Attune Pro · lifetime $2.99.
// Drives the real RevenueCat purchase when configured; otherwise simulates the
// unlock so the prototype flow is fully walkable.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';
import { AtnBackdrop, AtnButton } from '../components/ui';
import { AtnHeroWave } from '../components/skiaWaves';
import { PRO_FALLBACK_PRICE } from '../config';
import { getProOffering, purchasePro, restorePurchases, isStoreAvailable } from '../iap';

const FEATURES = [
  { icon: '♪', t: 'All 300 songs, 25 packs', d: 'Every pack unlocked — a track + difficulty arc you surf end to end.' },
  { icon: '∞', t: 'Endless Drift mode', d: 'A procedural channel without end. Chase the line.' },
  { icon: '◍', t: 'Adaptive soundtrack', d: 'The music is the obstacle — it blooms as you attune.' },
  { icon: '♚', t: 'Game Center leaderboards', d: 'Global ranks, weekly boards, phase-perfect bragging rights.' },
  { icon: '⛒', t: 'No ads. No IAP. Ever.', d: 'One payment, for life. No subscriptions, timers, or loot.' },
  { icon: '⤓', t: 'Plays fully offline', d: 'No account, no network, no data collected.' },
];

export function PaywallScreen({ pal, price = PRO_FALLBACK_PRICE, onPurchase, onRestore, onLater, haptics = true }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState('offer'); // offer | buying | done

  const buy = async () => {
    setState('buying');
    let ok = false;
    if (isStoreAvailable()) {
      const offer = await getProOffering();
      ok = offer ? await purchasePro(offer) : false;
    } else {
      // simulate for the prototype / no-store builds
      await new Promise((r) => setTimeout(r, 1100));
      ok = true;
    }
    if (!ok) { setState('offer'); return; }
    if (haptics) { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} }
    setState('done');
    setTimeout(() => onPurchase(), 1000);
  };

  const restore = async () => {
    const ok = await restorePurchases();
    if (ok) onRestore();
  };

  if (state === 'done') {
    return (
      <View style={{ flex: 1 }}>
        <AtnBackdrop pal={pal} intensity={1} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.displayBold, fontSize: 54, color: '#fff' }}>✦</Text>
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 30, color: ATN_BASE.ink, letterSpacing: -0.9, marginTop: 18, marginBottom: 6 }}>Unlocked</Text>
          <Text style={{ fontFamily: FONT.sans, color: ATN_BASE.ink2, fontSize: 14 }}>Attune is yours. Forever.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={0.85} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: ATN_BASE.hair, backgroundColor: ATN_BASE.glassDk, marginBottom: 22 }}>
          <AtnHeroWave pal={pal} height={150} />
        </View>
        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 8 }}>Attune Pro · lifetime</Text>
        <Text style={{ fontFamily: FONT.displayBold, fontSize: 34, color: ATN_BASE.ink, letterSpacing: -1.4 }}>Unlock everything</Text>
        <Text style={{ fontFamily: FONT.sans, fontSize: 14.5, color: ATN_BASE.ink2, marginTop: 8, lineHeight: 21 }}>
          One payment unlocks all 300 songs, every mode, and Game Center — yours for life. Pack 1 stays free forever.
        </Text>

        <View style={{ gap: 12, marginVertical: 22 }}>
          {FEATURES.map((f, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 13 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(pal.player, 0.09), borderWidth: 1, borderColor: withAlpha(pal.player, 0.23) }}>
                <Text style={{ color: pal.player, fontSize: 17 }}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.sansSemi, fontSize: 14.5, color: ATN_BASE.ink }}>{f.t}</Text>
                <Text style={{ fontFamily: FONT.sans, fontSize: 12.5, color: ATN_BASE.ink3, marginTop: 1, lineHeight: 18 }}>{f.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <AtnButton variant="primary" pal={pal} onPress={buy} style={{ opacity: state === 'buying' ? 0.7 : 1 }}>
          {state === 'buying' ? 'Processing…' : `Get Attune Pro · ${price}`}
        </AtnButton>
        <Text style={{ fontFamily: FONT.sans, textAlign: 'center', color: ATN_BASE.ink3, fontSize: 11.5, marginTop: 12, lineHeight: 17 }}>
          Lifetime unlock · one payment, no subscription. Family Sharing supported.
        </Text>
        <Pressable onPress={restore} style={{ alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: ATN_BASE.ink2 }}>Restore purchase</Text>
        </Pressable>
        {onLater && (
          <Pressable onPress={onLater} style={{ alignItems: 'center', marginTop: 10, padding: 8 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11.5, letterSpacing: 1, color: ATN_BASE.ink3 }}>Not now — play the free pack</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
