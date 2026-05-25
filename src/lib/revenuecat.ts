import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

import { env } from '@/src/config/env';

export const REVENUECAT_ENTITLEMENT_ID = 'full_access';
export const REVENUECAT_OFFERING_ID = 'default';

const isSupportedPlatform = Platform.OS === 'ios';

let isConfigured = false;
let configuredUserId: string | null = null;

const getTrimmedApiKey = () => env.revenueCatIosApiKey.trim();

const getNormalizedUserId = (userId: string | null | undefined) => {
  if (typeof userId !== 'string') {
    return null;
  }
  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
};

export const isRevenueCatAvailable = () => isSupportedPlatform && getTrimmedApiKey().length > 0;

export async function initializeRevenueCat() {
  if (!isRevenueCatAvailable()) {
    return false;
  }

  if (isConfigured) {
    return true;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }

  Purchases.configure({
    apiKey: getTrimmedApiKey(),
  });
  isConfigured = true;
  configuredUserId = null;
  return true;
}

export async function syncRevenueCatUser(userId: string | null | undefined) {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    return;
  }

  const normalizedUserId = getNormalizedUserId(userId);
  if (normalizedUserId === configuredUserId) {
    return;
  }

  if (normalizedUserId) {
    await Purchases.logIn(normalizedUserId);
    configuredUserId = normalizedUserId;
    return;
  }

  await Purchases.logOut();
  configuredUserId = null;
}

export async function getRevenueCatOffering() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  return offerings.current ?? offerings.all[REVENUECAT_OFFERING_ID] ?? null;
}

export async function getRevenueCatCustomerInfo() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    return null;
  }

  return Purchases.getCustomerInfo();
}

export async function purchaseRevenueCatPackage(pkg: PurchasesPackage) {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    throw new Error('RevenueCat is not configured.');
  }

  return Purchases.purchasePackage(pkg);
}

export async function restoreRevenueCatPurchases() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    throw new Error('RevenueCat is not configured.');
  }

  return Purchases.restorePurchases();
}

export function hasRevenueCatFullAccess(customerInfo: CustomerInfo | null | undefined) {
  if (!customerInfo) {
    return false;
  }

  return typeof customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== 'undefined';
}

export function getPlanPackageMap(offering: PurchasesOffering | null): Partial<Record<'monthly' | '3-month' | '6-month' | 'lifetime', PurchasesPackage>> {
  if (!offering) {
    return {};
  }

  const mapped: Partial<Record<'monthly' | '3-month' | '6-month' | 'lifetime', PurchasesPackage>> = {};

  if (offering.monthly) {
    mapped.monthly = offering.monthly;
  }
  if (offering.threeMonth) {
    mapped['3-month'] = offering.threeMonth;
  }
  if (offering.sixMonth) {
    mapped['6-month'] = offering.sixMonth;
  }
  if (offering.lifetime) {
    mapped.lifetime = offering.lifetime;
  }

  for (const pkg of offering.availablePackages) {
    const productId = pkg.product.identifier;
    if (!mapped.monthly && productId.includes('.1month')) {
      mapped.monthly = pkg;
    } else if (!mapped['3-month'] && productId.includes('.3month')) {
      mapped['3-month'] = pkg;
    } else if (!mapped['6-month'] && productId.includes('.6month')) {
      mapped['6-month'] = pkg;
    } else if (!mapped.lifetime && productId.includes('.lifetime')) {
      mapped.lifetime = pkg;
    }
  }

  return mapped;
}
