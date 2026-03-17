import { env } from '../config/env';

export type PricingPlan = {
  billing_period: string;
  amount_total: number;
  amount_per_month: number;
  is_promo: boolean;
};

export type PricingResponse = {
  region_key: string;
  currency: string;
  plans: PricingPlan[];
};

let pricingCache: PricingResponse | null = null;
let pricingRequest: Promise<PricingResponse> | null = null;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

export async function getPricing(): Promise<PricingResponse> {
  if (pricingCache) {
    return pricingCache;
  }

  if (pricingRequest) {
    return pricingRequest;
  }

  const baseUrl = assertApiBaseUrl();
  pricingRequest = (async () => {
    const response = await fetch(`${baseUrl}/api/pricing`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load pricing');
    }

    const data = (await response.json()) as PricingResponse;
    pricingCache = data;
    return data;
  })();

  try {
    return await pricingRequest;
  } finally {
    pricingRequest = null;
  }
}
