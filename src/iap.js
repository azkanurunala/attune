// Attune — RevenueCat hub. Every function reaches the native module lazily via
// require() inside try/catch, so a JS-only bundle / Expo Go / a build before the
// SDK compiled all degrade to safe no-ops — the app never crashes.

import { Platform } from 'react-native';
import {
  REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY, ENTITLEMENT_ID, OFFERING_ID,
  PRO_FALLBACK_PRICE, isPlaceholder,
} from './config';

let configured = false;

function purchasesModule() {
  try { return require('react-native-purchases'); } catch (e) { return null; }
}
function purchasesUIModule() {
  try { return require('react-native-purchases-ui'); } catch (e) { return null; }
}
const Purchases = () => purchasesModule()?.default || null;
const RevenueCatUI = () => purchasesUIModule()?.default || null;

const platformKey = () => (Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY);

export function hasPro(info) {
  return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
}

// Configure once + subscribe to entitlement changes (RevenueCat is the source of truth).
export function initIAP(onProChange) {
  const P = Purchases();
  if (!P || configured) return;
  const key = platformKey();
  if (isPlaceholder(key)) return; // no key yet → stay no-op
  try {
    P.configure({ apiKey: key });
    configured = true;
    P.addCustomerInfoUpdateListener((info) => onProChange(hasPro(info)));
  } catch (e) {}
}

export async function getProStatus() {
  const P = Purchases();
  if (!P || !configured) return false;
  try { return hasPro(await P.getCustomerInfo()); } catch (e) { return false; }
}

export async function restorePurchases() {
  const P = Purchases();
  if (!P || !configured) return false;
  try { return hasPro(await P.restorePurchases()); } catch (e) { return false; }
}

// Localized price string for the lifetime package, or the fallback.
export async function getOfferingPrice() {
  const P = Purchases();
  if (!P || !configured) return PRO_FALLBACK_PRICE;
  try {
    const offerings = await P.getOfferings();
    const offering = OFFERING_ID ? offerings.all?.[OFFERING_ID] : offerings.current;
    const pkg = offering?.availablePackages?.[0];
    return pkg?.product?.priceString || PRO_FALLBACK_PRICE;
  } catch (e) {
    return PRO_FALLBACK_PRICE;
  }
}

export async function getProOffering() {
  const P = Purchases();
  if (!P || !configured) return null;
  try {
    const offerings = await P.getOfferings();
    const offering = OFFERING_ID ? offerings.all?.[OFFERING_ID] : offerings.current;
    return offering?.availablePackages?.[0] || null;
  } catch (e) {
    return null;
  }
}

// Purchase the lifetime package → resolves true when the entitlement is active.
export async function purchasePro(pkg) {
  const P = Purchases();
  if (!P || !configured || !pkg) return false;
  try {
    const { customerInfo } = await P.purchasePackage(pkg);
    return hasPro(customerInfo);
  } catch (e) {
    return false; // includes user-cancelled
  }
}

// Present the RevenueCat-hosted paywall (alternative to the custom PaywallScreen).
export async function presentPaywall() {
  const UI = RevenueCatUI();
  if (!UI) return false;
  try {
    const res = await UI.presentPaywall();
    return res === UI.PAYWALL_RESULT?.PURCHASED || res === UI.PAYWALL_RESULT?.RESTORED;
  } catch (e) {
    return false;
  }
}

export async function presentCustomerCenter() {
  const UI = RevenueCatUI();
  if (!UI) return false;
  try { await UI.presentCustomerCenter(); return true; } catch (e) { return false; }
}

export function isStoreAvailable() {
  return Platform.OS === 'ios' && !!RevenueCatUI() && !isPlaceholder(platformKey());
}
