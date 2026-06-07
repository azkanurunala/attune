// Attune — app shell: state machine, load-once persistence, stack navigation,
// service init, fonts, and the first-run onboarding chain.
//
// Two worlds chosen by the top route: the Skia game stage vs. the RN menu
// screens. One component holds all state; progress + tweaks each persist to
// AsyncStorage. External services (audio / IAP / Game Center) degrade to no-op.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Modal, TextInput, Text, Pressable, Alert, Linking, LogBox } from 'react-native';

// keep dev warning banners out of screenshots / gameplay
if (typeof __DEV__ !== 'undefined' && __DEV__) { try { LogBox.ignoreAllLogs(true); } catch (e) {} }
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';

import { ATN_BASE, FONT, atnResolvePalette } from './theme';
import { ATN_SONGS } from './songs';
import { ATN_LIBRARY, ATN_PACK_BY_ID, atnPackUnlocked } from './library';
import { ATN_TUTORIAL } from './songs';
import { LS } from './storage';
import attuneAudio from './audio';
import { initIAP, getProStatus, getOfferingPrice, restorePurchases } from './iap';
import { authenticateGameCenter, submitScore } from './leaderboard';
import { isValidGiftCode } from './giftcodes';

import { TitleScreen } from './screens/TitleScreen';
import { SongMapScreen } from './screens/SongMapScreen';
import { PackScreen } from './screens/PackScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { StoryScreen } from './screens/StoryScreen';
import { HowToScreen } from './screens/HowToScreen';
import { PaywallScreen } from './screens/PaywallScreen';
import { GameScreen } from './screens/GameScreen';

const DEFAULT_TWEAKS = {
  palette: 'auto', glow: 1, speed: 1, gap: 1,
  audio: true, volume: 0.8, colorblind: false, haptics: true, songIntros: true,
};
const FRESH_PROGRESS = {
  songs: {}, endlessBest: 0, totalRuns: 0,
  storySeen: false, tutorialDone: false, purchased: false,
};

// ── stack router with transition direction ─────────────────────────────────
function useRouter(initial) {
  const [stack, setStack] = useState([initial]);
  const push = useCallback((r) => setStack((s) => [...s, r]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((r) => setStack([r]), []);
  const replace = useCallback((r) => setStack((s) => [...s.slice(0, -1), r]), []);
  return { stack, top: stack[stack.length - 1], push, back, reset, replace };
}

function Game() {
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(FRESH_PROGRESS);
  const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);
  const [entitlementPro, setEntitlementPro] = useState(false);
  const [price, setPrice] = useState('$2.99');
  const [redeem, setRedeem] = useState(false);
  const router = useRouter({ name: 'title' });
  const audio = attuneAudio;

  // load once
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await LS.multiGet([['progress', FRESH_PROGRESS], ['tweaks', DEFAULT_TWEAKS]]);
      if (!alive) return;
      setProgress({ ...FRESH_PROGRESS, ...s.progress });
      setTweaks({ ...DEFAULT_TWEAKS, ...s.tweaks });
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // persist per key (after load)
  useEffect(() => { if (loaded) LS.set('progress', progress); }, [progress, loaded]);
  useEffect(() => { if (loaded) LS.set('tweaks', tweaks); }, [tweaks, loaded]);

  // init services once
  useEffect(() => {
    let alive = true;
    authenticateGameCenter();
    initIAP((isPro) => { if (alive) setEntitlementPro(isPro); });
    (async () => {
      const [proNow, p] = await Promise.all([getProStatus(), getOfferingPrice()]);
      if (!alive) return;
      if (proNow) setEntitlementPro(true);
      if (p) setPrice(p);
    })();
    return () => { alive = false; };
  }, []);

  // entitlement from the store flows into persisted unlock
  useEffect(() => {
    if (entitlementPro && !progress.purchased) setProgress((p) => ({ ...p, purchased: true }));
  }, [entitlementPro]); // eslint-disable-line

  const setTweak = useCallback((key, val) => {
    setTweaks((t) => ({ ...t, [key]: val }));
    if (key === 'audio') audio.setEnabled(val);
    if (key === 'volume') audio.setVolume(val);
  }, [audio]);

  const saveProgress = useCallback((updater) => setProgress((prev) => updater(prev)), []);

  // ── deep-link / screenshot harness ──────────────────────────────────────
  // attune://shot?screen=map&pro=1&nointro=1&song=firstlight&mode=song&...
  // Lets tooling jump straight to any page/state for capture; also a real,
  // harmless deep-link entry point.
  useEffect(() => {
    const apply = (url) => {
      if (!url || url.indexOf('attune://') !== 0) return;
      const q = {};
      (url.split('?')[1] || '').split('&').forEach((kv) => {
        const i = kv.indexOf('=');
        if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
      });
      if (q.reset === '1') setProgress(FRESH_PROGRESS);
      if (q.pro === '1') saveProgress((p) => ({ ...p, purchased: true, storySeen: true, tutorialDone: true }));
      if (q.pro === '0') saveProgress((p) => ({ ...p, purchased: false }));
      if (q.nointro != null) setTweaks((t) => ({ ...t, songIntros: q.nointro !== '1' ? true : false }));
      if (q.cb != null) setTweaks((t) => ({ ...t, colorblind: q.cb === '1' }));
      setRedeem(q.redeem === '1');
      const s = q.screen;
      const r = {
        title: { name: 'title' },
        story: { name: 'story', flow: false },
        howto: { name: 'howto', flow: false },
        paywall: { name: 'paywall', flow: false },
        map: { name: 'map' },
        settings: { name: 'settings' },
        pack: { name: 'pack', packId: q.packId || 'pack0' },
        leaderboard: { name: 'leaderboard', board: q.board || 'endless' },
        game: { name: 'game', mode: q.mode || 'song', songId: q.song || 'firstlight', initPaused: q.paused === '1' },
        results: {
          name: 'results',
          res: {
            mode: q.mode || 'song', songId: q.song || 'firstlight', outcome: q.outcome || 'win',
            score: Number(q.score || 1840), distance: Number(q.dist || 2600),
            perfects: Number(q.perfects || 4), isNewBest: q.best === '1',
          },
        },
      }[s];
      if (r) router.reset(r);
    };
    const sub = Linking.addEventListener('url', (e) => apply(e.url));
    Linking.getInitialURL().then((u) => u && apply(u));
    return () => sub.remove();
  }, []); // eslint-disable-line

  // ── derived ──
  const purchased = progress.purchased || entitlementPro;
  const t = tweaks;

  // resolve palette: auto follows the current song/pack, else the override
  const songForPalette = (() => {
    const top = router.top;
    if (top.songId && ATN_LIBRARY[top.songId]) return ATN_LIBRARY[top.songId];
    if (top.packId && ATN_PACK_BY_ID[top.packId]) return { palette: ATN_PACK_BY_ID[top.packId].palette };
    return ATN_SONGS[0];
  })();
  const palKey = t.palette === 'auto' ? songForPalette.palette : t.palette;
  const pal = atnResolvePalette(palKey, t.colorblind);

  // ── navigation ──
  // First-run chain: title → story → how-to → tutorial → paywall → map.
  const begin = () => {
    if (!progress.storySeen) router.reset({ name: 'story', flow: true });
    else if (!progress.tutorialDone) router.reset({ name: 'howto', flow: true });
    else if (!purchased) router.reset({ name: 'paywall', flow: true });
    else router.reset({ name: 'map' });
  };
  const playSong = (id) => router.push({ name: 'game', mode: 'song', songId: id });
  const playEndless = () => router.push({ name: 'game', mode: 'endless' });
  const openPack = (pack) => {
    if (atnPackUnlocked(pack, { purchased })) router.push({ name: 'pack', packId: pack.id });
    else router.push({ name: 'paywall', flow: false });
  };

  const finishGift = (ok) => {
    setRedeem(false);
    if (ok) { saveProgress((p) => ({ ...p, purchased: true })); }
  };

  const handleResult = useCallback((res) => {
    if (res.mode === 'tutorial') {
      const wasFlow = router.top.flow;
      saveProgress((p) => ({ ...p, tutorialDone: true }));
      if (wasFlow && !purchased) router.reset({ name: 'paywall', flow: true });
      else router.reset({ name: 'map' });
      return;
    }
    let newBest = false;
    saveProgress((p) => {
      const np = { ...p, totalRuns: p.totalRuns + 1, songs: { ...p.songs } };
      if (res.mode === 'endless') {
        if (res.distance > p.endlessBest) { np.endlessBest = res.distance; newBest = true; }
      } else {
        const cur = p.songs[res.songId] || { best: 0, completed: false };
        const best = Math.max(cur.best, res.score);
        if (res.score > cur.best) newBest = true;
        np.songs[res.songId] = { ...cur, best, completed: cur.completed || res.outcome === 'win' };
      }
      return np;
    });
    // submit to Game Center (no-op off-iOS)
    if (res.mode === 'endless') submitScore(res.distance, 'endless');
    else submitScore(res.score, 'score');
    router.push({ name: 'results', res: { ...res, isNewBest: newBest } });
  }, [saveProgress, router, purchased]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: ATN_BASE.void }} />;

  const topInset = insets.top + 6;

  let screen = null;
  const r = router.top;
  switch (r.name) {
    case 'title':
      screen = <TitleScreen pal={pal} onBegin={begin} />;
      break;
    case 'map':
      screen = (
        <SongMapScreen
          pal={pal} progress={progress} onEndless={playEndless}
          onSettings={() => router.push({ name: 'settings' })}
          onHowTo={() => router.push({ name: 'howto', flow: false })}
          onOpenPack={openPack}
          onLeaderboard={() => router.push({ name: 'leaderboard' })}
        />
      );
      break;
    case 'pack':
      screen = (
        <PackScreen pal={pal} pack={ATN_PACK_BY_ID[r.packId]} progress={progress} onPlay={playSong} onBack={router.back} />
      );
      break;
    case 'leaderboard':
      screen = <LeaderboardScreen pal={pal} progress={progress} initialBoard={r.board} onBack={router.back} />;
      break;
    case 'settings':
      screen = (
        <SettingsScreen
          pal={pal} t={t} setTweak={setTweak} purchased={purchased} onBack={router.back}
          onStory={() => router.push({ name: 'story', flow: false })}
          onHowTo={() => router.push({ name: 'howto', flow: false })}
          onTutorial={() => router.push({ name: 'game', mode: 'tutorial', flow: false })}
          onPaywall={() => router.push({ name: 'paywall', flow: false })}
          onRestore={async () => { const ok = await restorePurchases(); if (ok) { saveProgress((p) => ({ ...p, purchased: true })); Alert.alert('Restored', 'Attune Pro is active on this device.'); } else Alert.alert('Nothing to restore', 'No previous purchase found for this Apple ID.'); }}
          onRedeem={() => setRedeem(true)}
        />
      );
      break;
    case 'story': {
      const adv = () => { saveProgress((p) => ({ ...p, storySeen: true })); if (r.flow) router.reset({ name: 'howto', flow: true }); else router.back(); };
      screen = <StoryScreen pal={pal} onDone={adv} onSkip={adv} onBack={r.flow ? undefined : router.back} />;
      break;
    }
    case 'howto': {
      const adv = () => { if (r.flow) router.reset({ name: 'game', mode: 'tutorial', flow: true }); else router.back(); };
      screen = <HowToScreen pal={pal} flow={r.flow} onDone={adv} onSkip={adv} onBack={r.flow ? undefined : router.back} />;
      break;
    }
    case 'paywall': {
      const done = () => { saveProgress((p) => ({ ...p, purchased: true })); if (r.flow) router.reset({ name: 'map' }); else router.back(); };
      const later = () => { saveProgress((p) => ({ ...p, storySeen: true, tutorialDone: true })); router.reset({ name: 'map' }); };
      screen = <PaywallScreen pal={pal} price={price} onPurchase={done} onRestore={done} onLater={r.flow ? later : undefined} onBack={r.flow ? undefined : router.back} haptics={t.haptics} />;
      break;
    }
    case 'game': {
      const song = r.mode === 'song' ? ATN_LIBRARY[r.songId] : (r.mode === 'tutorial' ? ATN_TUTORIAL : null);
      // first play of a song shows a quick one-move demo (unless turned off)
      const seenIntro = r.mode === 'song' && !!(progress.songs[r.songId] || {}).introSeen;
      const introMode = r.mode === 'song' && t.songIntros && !seenIntro ? 'lite' : 'none';
      const markIntroSeen = () => saveProgress((p) => {
        const cur = p.songs[r.songId] || { best: 0, completed: false };
        return { ...p, songs: { ...p.songs, [r.songId]: { ...cur, introSeen: true } } };
      });
      screen = (
        <GameScreen
          mode={r.mode} song={song} pal={pal} t={t} audio={audio}
          introMode={introMode} onIntroSeen={markIntroSeen} initPaused={!!r.initPaused}
          onResult={handleResult} onExit={() => router.reset({ name: 'map' })} topInset={topInset}
        />
      );
      break;
    }
    case 'results': {
      const res = r.res;
      const song = res.mode === 'song' ? ATN_LIBRARY[res.songId] : null;
      let nextSong = null;
      if (song) {
        const pack = ATN_PACK_BY_ID[song.packId];
        const idx = pack ? pack.songs.findIndex((s) => s.id === song.id) : -1;
        if (pack && idx >= 0 && idx < pack.songs.length - 1) nextSong = pack.songs[idx + 1];
      }
      screen = (
        <ResultsScreen
          pal={pal} result={res} song={song} isNewBest={res.isNewBest}
          onRetry={() => router.replace({ name: 'game', mode: res.mode, songId: res.songId })}
          onNext={nextSong ? () => router.replace({ name: 'game', mode: 'song', songId: nextSong.id }) : null}
          onLeaderboard={() => router.push({ name: 'leaderboard' })}
          onMap={() => router.reset({ name: 'map' })}
          onShare={() => Alert.alert('Share', 'Clip sharing arrives with the production build.')}
        />
      );
      break;
    }
    default:
      screen = null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: ATN_BASE.void }}>
      <StatusBar style="light" />
      {screen}
      <RedeemModal visible={redeem} pal={pal} onClose={() => setRedeem(false)} onResult={finishGift} />
    </View>
  );
}

// ── Gift-code redeem modal ───────────────────────────────────────────────────
function RedeemModal({ visible, pal, onClose, onResult }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (isValidGiftCode(code)) { setCode(''); setErr(''); onResult(true); }
    else setErr('That code isn’t valid.');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5,7,13,0.7)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <View style={{ width: '100%', maxWidth: 340, borderRadius: 22, padding: 22, backgroundColor: ATN_BASE.canvasHi, borderWidth: 1, borderColor: ATN_BASE.hair }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: pal.player, marginBottom: 8 }}>Gift code</Text>
          <Text style={{ fontFamily: FONT.displaySemi, fontSize: 24, color: ATN_BASE.ink, letterSpacing: -0.7, marginBottom: 14 }}>Redeem Attune</Text>
          <TextInput
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase()); setErr(''); }}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={ATN_BASE.ink3}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{ fontFamily: FONT.mono, fontSize: 16, color: ATN_BASE.ink, borderWidth: 1, borderColor: ATN_BASE.hair, borderRadius: 12, padding: 14, letterSpacing: 1 }}
          />
          {err ? <Text style={{ fontFamily: FONT.sans, color: ATN_BASE.danger, fontSize: 12.5, marginTop: 8 }}>{err}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: ATN_BASE.hair, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.sansSemi, color: ATN_BASE.ink2 }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={{ flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center', backgroundColor: pal.player }}>
              <Text style={{ fontFamily: FONT.sansSemi, color: '#05080F' }}>Redeem</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    JetBrainsMono_500Medium, JetBrainsMono_600SemiBold,
  });
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: ATN_BASE.void }} />;
  }
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}
