// Attune — settings: learn (story/how-to/tutorial), sound & access, membership.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATN_BASE, FONT } from '../theme';
import { AtnBackdrop, AtnIconButton, AtnSwitch, AtnSlider } from '../components/ui';

function Row({ label, desc, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: ATN_BASE.hair2 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.sansMed, fontSize: 15, color: ATN_BASE.ink }}>{label}</Text>
        {desc ? <Text style={{ fontFamily: FONT.sans, fontSize: 12.5, color: ATN_BASE.ink3, marginTop: 2 }}>{desc}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function NavRow({ label, desc, onClick }) {
  return (
    <Pressable onPress={onClick}>
      <Row label={label} desc={desc}>
        <Text style={{ color: ATN_BASE.ink3, fontSize: 18 }}>›</Text>
      </Row>
    </Pressable>
  );
}

export function SettingsScreen({ pal, t, setTweak, purchased, onBack, onStory, onHowTo, onTutorial, onPaywall, onRestore, onRedeem }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <AtnBackdrop pal={pal} intensity={0.5} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false}>
        <AtnIconButton onPress={onBack} size={42} style={{ marginBottom: 22 }}>‹</AtnIconButton>
        <Text style={{ fontFamily: FONT.displayBold, fontSize: 34, color: ATN_BASE.ink, letterSpacing: -1.4 }}>Settings</Text>

        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3, marginTop: 26, marginBottom: 4 }}>Learn</Text>
        <NavRow label="Watch the intro story" desc="The lone tone's journey to resonance." onClick={onStory} />
        <NavRow label="How to play" desc="The control, the goal, and the depth." onClick={onHowTo} />
        <NavRow label="Replay tutorial" desc="A slow, hands-on first channel." onClick={onTutorial} />

        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3, marginTop: 26, marginBottom: 4 }}>Sound & access</Text>
        <Row label="Sound" desc="The music is the obstacle — best with headphones.">
          <AtnSwitch on={t.audio} pal={pal} onChange={(v) => setTweak('audio', v)} />
        </Row>
        <Row label="Volume" desc={`${Math.round(t.volume * 100)}%`}>
          <AtnSlider value={t.volume} min={0} max={1} step={0.05} pal={pal} onChange={(v) => setTweak('volume', v)} width={120} />
        </Row>
        <Row label="Haptics" desc="Gentle buzz on perfect align & on crash.">
          <AtnSwitch on={t.haptics} pal={pal} onChange={(v) => setTweak('haptics', v)} />
        </Row>
        <Row label="Colorblind mode" desc="High-contrast colors + dashed walls.">
          <AtnSwitch on={t.colorblind} pal={pal} onChange={(v) => setTweak('colorblind', v)} />
        </Row>

        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3, marginTop: 26, marginBottom: 4 }}>Gameplay</Text>
        <Row label="Speed" desc={`${t.speed.toFixed(2)}×`}>
          <AtnSlider value={t.speed} min={0.6} max={1.6} step={0.05} pal={pal} onChange={(v) => setTweak('speed', v)} width={120} />
        </Row>
        <Row label="Gap width" desc={`${t.gap.toFixed(2)}×`}>
          <AtnSlider value={t.gap} min={0.7} max={1.5} step={0.05} pal={pal} onChange={(v) => setTweak('gap', v)} width={120} />
        </Row>
        <Row label="Glow / bloom" desc={`${t.glow.toFixed(1)}×`}>
          <AtnSlider value={t.glow} min={0.2} max={2} step={0.1} pal={pal} onChange={(v) => setTweak('glow', v)} width={120} />
        </Row>

        <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3, marginTop: 26, marginBottom: 4 }}>Membership</Text>
        {purchased ? (
          <Row label="Attune Premium" desc="Unlocked · pay-once, yours forever.">
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: pal.player }}>✓ OWNED</Text>
          </Row>
        ) : (
          <NavRow label="Unlock Attune" desc="Premium · one-time $2.99 · no ads, no microtransactions." onClick={onPaywall} />
        )}
        <NavRow label="Restore purchase" desc="Already bought on this Apple ID?" onClick={onRestore} />
        <NavRow label="Redeem gift code" desc="Unlock everything with a code." onClick={onRedeem} />

        <Text style={{ fontFamily: FONT.sans, marginTop: 30, color: ATN_BASE.ink3, fontSize: 12, lineHeight: 19 }}>
          Attune collects no data. 100% offline.{'\n'}Progress is stored on this device only.
        </Text>
      </ScrollView>
    </View>
  );
}
