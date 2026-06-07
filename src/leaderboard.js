// Attune — safe wrapper over the local Game Center native module. iOS-only;
// everywhere else (Android, Expo Go, JS bundle) the module is absent and every
// call degrades to a no-op so the leaderboard screen falls back to its preview.

import { Platform } from 'react-native';
import { leaderboardIdFor } from './config';

function gc() {
  try { return require('../modules/expo-game-center').default; } catch (e) { return null; }
}

export const isLeaderboardAvailable = () => Platform.OS === 'ios' && !!gc();

export async function authenticateGameCenter() {
  const m = gc();
  try { return m ? await m.authenticate() : false; } catch (e) { return false; }
}

export async function isAuthenticated() {
  const m = gc();
  try { return m ? await m.isAuthenticated() : false; } catch (e) { return false; }
}

export async function submitScore(score, board = 'endless') {
  const m = gc();
  if (!m || !score || score <= 0) return false;
  try { return await m.submitScore(Math.floor(score), leaderboardIdFor(board)); } catch (e) { return false; }
}

export async function presentLeaderboard(board = 'endless') {
  const m = gc();
  if (!m) return false;
  try { return await m.presentLeaderboard(leaderboardIdFor(board)); } catch (e) { return false; }
}

export async function loadTopScores(board = 'endless', count = 50) {
  const m = gc();
  if (!m) return [];
  try {
    const rows = await m.loadTopScores(leaderboardIdFor(board), count);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}
