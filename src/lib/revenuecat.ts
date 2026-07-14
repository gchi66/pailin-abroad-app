import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { env } from '@/src/config/env';

export const REVENUECAT_ENTITLEMENT_ID = 'full_access';
export const REVENUECAT_OFFERING_ID = 'default';

const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';
const shouldLogAndroidRevenueCatDebug = __DEV__ && Platform.OS === 'android';

let isConfigured = false;
let configuredUserId: string | null = null;

const logAndroidRevenueCatDebug = (message: string, data?: unknown) => {
  if (!shouldLogAndroidRevenueCatDebug) {
    return;
  }

  if (typeof data === 'undefined') {
    console.log(`[revenuecat:android] ${message}`);
    return;
  }

  console.log(`[revenuecat:android] ${message}`, data);
};

const getTrimmedApiKey = () => {
  if (Platform.OS === 'android') {
    return env.revenueCatAndroidApiKey.trim();
  }

  return env.revenueCatIosApiKey.trim();
};

const getNormalizedUserId = (userId: string | null | undefined) => {
  if (typeof userId !== 'string') {
    return null;
  }
  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
};

export const isRevenueCatAvailable = () => isSupportedPlatform && getTrimmedApiKey().length > 0;

export async function initializeRevenueCat() {
  logAndroidRevenueCatDebug('initialize requested', {
    hasApiKey: getTrimmedApiKey().length > 0,
    isConfigured,
    isSupportedPlatform,
  });

  if (!isRevenueCatAvailable()) {
    logAndroidRevenueCatDebug('initialize skipped');
    return false;
  }

  if (isConfigured) {
    logAndroidRevenueCatDebug('already configured');
    return true;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({
      apiKey: getTrimmedApiKey(),
    });
    isConfigured = true;
    configuredUserId = null;
    logAndroidRevenueCatDebug('configured');
    return true;
  } catch (error) {
    console.warn('[revenuecat] failed to configure', error);
    isConfigured = false;
    configuredUserId = null;
    return false;
  }
}

export async function syncRevenueCatUser(userId: string | null | undefined) {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    logAndroidRevenueCatDebug('sync user skipped; not ready');
    return;
  }

  const normalizedUserId = getNormalizedUserId(userId);
  if (normalizedUserId === configuredUserId) {
    logAndroidRevenueCatDebug('sync user skipped; unchanged user');
    return;
  }

  try {
    if (normalizedUserId) {
      await Purchases.logIn(normalizedUserId);
      configuredUserId = normalizedUserId;
      logAndroidRevenueCatDebug('logged in user', { userId: normalizedUserId });
      return;
    }

    await Purchases.logOut();
    configuredUserId = null;
    logAndroidRevenueCatDebug('logged out user');
  } catch (error) {
    console.warn('[revenuecat] failed to sync user', error);
  }
}

export async function getRevenueCatOffering() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    logAndroidRevenueCatDebug('offering skipped; not ready');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[REVENUECAT_OFFERING_ID] ?? null;
    logAndroidRevenueCatDebug('offerings loaded', {
      currentOfferingIdentifier: offerings.current?.identifier ?? null,
      offeringIdentifiers: Object.keys(offerings.all),
      selectedOfferingIdentifier: offering?.identifier ?? null,
      availablePackages: offering?.availablePackages.map((pkg) => ({
        packageIdentifier: pkg.identifier,
        productIdentifier: pkg.product.identifier,
        productType: pkg.product.productType,
        price: pkg.product.price,
        priceString: pkg.product.priceString,
        subscriptionPeriod: pkg.product.subscriptionPeriod,
      })) ?? [],
    });
    return offering;
  } catch (error) {
    console.warn('[revenuecat] failed to load offerings', error);
    return null;
  }
}

export async function getRevenueCatCustomerInfo() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    logAndroidRevenueCatDebug('customer info skipped; not ready');
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    logAndroidRevenueCatDebug('customer info loaded', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      originalAppUserId: customerInfo.originalAppUserId,
    });
    return customerInfo;
  } catch (error) {
    console.warn('[revenuecat] failed to load customer info', error);
    return null;
  }
}

export async function invalidateRevenueCatCustomerInfoCache() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    return;
  }

  try {
    await Purchases.invalidateCustomerInfoCache();
  } catch (error) {
    console.warn('[revenuecat] failed to invalidate customer info cache', error);
  }
}

export async function syncRevenueCatPurchases() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    logAndroidRevenueCatDebug('sync purchases skipped; not ready');
    return null;
  }

  try {
    const result = await Purchases.syncPurchasesForResult();
    logAndroidRevenueCatDebug('purchases synced', {
      activeEntitlements: Object.keys(result.customerInfo.entitlements.active),
    });
    return result.customerInfo;
  } catch (error) {
    console.warn('[revenuecat] failed to sync purchases', error);
    return null;
  }
}

export function addRevenueCatCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener) {
  Purchases.addCustomerInfoUpdateListener(listener);
}

export function removeRevenueCatCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener) {
  Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function purchaseRevenueCatPackage(pkg: PurchasesPackage) {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    throw new Error('RevenueCat is not configured.');
  }

  logAndroidRevenueCatDebug('purchase started', {
    packageIdentifier: pkg.identifier,
    productIdentifier: pkg.product.identifier,
    price: pkg.product.price,
    priceString: pkg.product.priceString,
  });
  const result = await Purchases.purchasePackage(pkg);
  logAndroidRevenueCatDebug('purchase completed', {
    activeEntitlements: Object.keys(result.customerInfo.entitlements.active),
    productIdentifier: result.productIdentifier,
  });
  return result;
}

export async function restoreRevenueCatPurchases() {
  const isReady = await initializeRevenueCat();
  if (!isReady) {
    throw new Error('RevenueCat is not configured.');
  }

  logAndroidRevenueCatDebug('restore started');
  const customerInfo = await Purchases.restorePurchases();
  logAndroidRevenueCatDebug('restore completed', {
    activeEntitlements: Object.keys(customerInfo.entitlements.active),
  });
  return customerInfo;
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

  logAndroidRevenueCatDebug('plan package map built', {
    monthly: mapped.monthly?.product.identifier ?? null,
    threeMonth: mapped['3-month']?.product.identifier ?? null,
    sixMonth: mapped['6-month']?.product.identifier ?? null,
    lifetime: mapped.lifetime?.product.identifier ?? null,
  });

  return mapped;
}
