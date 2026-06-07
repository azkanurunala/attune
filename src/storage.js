// Thin async wrapper over AsyncStorage. All keys are prefixed; every value is
// JSON; nothing ever throws (safe fallbacks). today() enables date-gated
// features without a server.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'attune.';

export const LS = {
  async get(key, fallback) {
    try {
      const v = await AsyncStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {}
  },
  async multiGet(keys) {
    const out = {};
    await Promise.all(
      keys.map(async ([k, d]) => {
        out[k] = await LS.get(k, d);
      }),
    );
    return out;
  },
};

// Local date key (YYYY-MM-DD) for any daily reset features.
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
