// Attune — shared glass UI primitives (the menu world is plain RN Views with a
// frosted-glass treatment, mirroring the design's glassmorphism recipe).

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ATN_BASE, FONT } from '../theme';
import { withAlpha } from '../utils/color';

// Soft radial-ish backdrop — layered color washes over the void. (RN has no
// radial gradient natively, so we stack a base fill + two diagonal linear
// gradients + a glow blob to approximate the prototype's twin radial washes.)
export function AtnBackdrop({ pal, intensity = 1 }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: ATN_BASE.void }]} />
      <LinearGradient
        colors={[withAlpha(pal.bg1, 0.85 * intensity), 'transparent']}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.7 }}
        style={[StyleSheet.absoluteFill, { opacity: 1 }]}
      />
      <LinearGradient
        colors={['transparent', withAlpha(pal.bg2, 0.9 * intensity)]}
        start={{ x: 0.2, y: 0.4 }} end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute', width: 280, height: 280, left: '52%', top: '6%',
          borderRadius: 140, backgroundColor: withAlpha(pal.glow, 0.13 * intensity),
        }}
      />
    </View>
  );
}

// Frosted glass panel.
export function AtnPanel({ style, tone = 'base', intensity = 26, children, ...rest }) {
  const bg = tone === 'hi' ? ATN_BASE.glassHi : tone === 'dk' ? ATN_BASE.glassDk : ATN_BASE.glass;
  return (
    <View
      style={[
        {
          borderRadius: 18,
          shadowColor: '#000', shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.5, shadowRadius: 24, elevation: 8,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={{
          borderRadius: 18, borderWidth: 1, borderColor: ATN_BASE.hair,
          backgroundColor: bg, overflow: 'hidden',
        }}
      >
        {children}
      </BlurView>
    </View>
  );
}

// Eyebrow-styled mono chip.
export function AtnChip({ color, children, style }) {
  const c = color || ATN_BASE.ink2;
  return (
    <View
      style={[
        {
          flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
          paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999,
          backgroundColor: withAlpha(c, 0.1), borderWidth: 1, borderColor: withAlpha(c, 0.23),
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: c }}>
        {children}
      </Text>
    </View>
  );
}

// Primary (gradient) / ghost (glass) button.
export function AtnButton({ variant = 'primary', pal, children, onPress, style, textStyle }) {
  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ width: '100%', transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
        <LinearGradient
          colors={[pal.player, pal.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            {
              shadowColor: pal.glow, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5, shadowRadius: 18, elevation: 6,
            },
          ]}
        >
          <Text style={[styles.btnText, { color: '#05080F' }, textStyle]}>{children}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          width: '100%', backgroundColor: ATN_BASE.glass, borderWidth: 1, borderColor: ATN_BASE.hair,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: ATN_BASE.ink }, textStyle]}>{children}</Text>
    </Pressable>
  );
}

// Small round glass icon button (back / settings / pause).
export function AtnIconButton({ children, onPress, size = 42, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: ATN_BASE.glass, borderWidth: 1, borderColor: ATN_BASE.hair,
        },
        style,
      ]}
    >
      {typeof children === 'string'
        ? <Text style={{ color: ATN_BASE.ink2, fontSize: 18 }}>{children}</Text>
        : children}
    </Pressable>
  );
}

// Alignment meter — thin bar that fills + glows as you stay centered.
export function AtnAlignMeter({ value, pal, label = 'RESONANCE' }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ gap: 5, minWidth: 96 }}>
      <Text style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: ATN_BASE.ink3 }}>
        {label}
      </Text>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <LinearGradient
          colors={[pal.wall, pal.player]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{
            height: '100%', width: `${v * 100}%`,
            shadowColor: pal.glow, shadowOpacity: v > 0.85 ? 1 : 0, shadowRadius: 12,
          }}
        />
      </View>
    </View>
  );
}

// Colored avatar with initials (Game Center rows).
export function AtnAvatar({ name, size = 34, hue }) {
  const h = hue != null ? hue : (name.charCodeAt(0) * 37 + name.length * 11) % 360;
  const initials = name === 'You' ? 'YOU' : name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  return (
    <LinearGradient
      colors={[`hsl(${h}, 70%, 55%)`, `hsl(${(h + 50) % 360}, 75%, 45%)`]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontFamily: FONT.displayBold, fontSize: size * 0.3 }}>{initials}</Text>
    </LinearGradient>
  );
}

// Pill toggle switch.
export function AtnSwitch({ on, pal, onChange }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={{ width: 46, height: 28, borderRadius: 999, justifyContent: 'center', padding: 3, backgroundColor: on ? 'transparent' : 'rgba(255,255,255,0.14)' }}
    >
      {on && (
        <LinearGradient
          colors={[pal.player, pal.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />
      )}
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', marginLeft: on ? 18 : 0, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }} />
    </Pressable>
  );
}

// Lightweight draggable slider (no extra dependency).
export function AtnSlider({ value, min = 0, max = 1, step = 0.05, pal, onChange, width = 130 }) {
  const [w, setW] = useState(width);
  const wRef = useRef(width); wRef.current = w;
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const emit = (clientFrac) => {
    let v = min + clientFrac * (max - min);
    v = Math.round(v / step) * step;
    v = Math.max(min, Math.min(max, v));
    onChange(+v.toFixed(4));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => emit(Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)))),
      onPanResponderMove: (e) => emit(Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)))),
    }),
  ).current;
  return (
    <View
      style={{ width, height: 28, justifyContent: 'center' }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={{ height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <View style={{ height: 4, borderRadius: 999, width: `${frac * 100}%`, backgroundColor: pal.player }} />
      </View>
      <View style={{ position: 'absolute', left: Math.max(0, frac * w - 9), width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </View>
  );
}

export const atnFmt = (n) => (n || 0).toLocaleString('en-US');

const styles = StyleSheet.create({
  btn: {
    borderRadius: 999, paddingVertical: 16, paddingHorizontal: 26,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  btnText: { fontFamily: FONT.displaySemi, fontSize: 16, letterSpacing: -0.16 },
});
