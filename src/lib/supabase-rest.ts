import { assertSupabaseEnv, env } from '../config/env';

type QueryParamValue = string | number | boolean;

type SupabaseSelectParams = {
  table: string;
  select: string;
  filters?: string[];
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
};

const toQueryString = (params: Record<string, QueryParamValue>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
};

const buildSelectUrl = ({ table, select, filters = [], orderBy, limit }: SupabaseSelectParams) => {
  const query: Record<string, QueryParamValue> = { select };
  if (orderBy) {
    const direction = orderBy.ascending === false ? 'desc' : 'asc';
    query.order = `${orderBy.column}.${direction}`;
  }
  if (typeof limit === 'number') {
    query.limit = limit;
  }

  const basePath = `${env.supabaseUrl}/rest/v1/${table}`;
  const queryString = toQueryString(query);
  const filterSuffix = filters.length > 0 ? `&${filters.join('&')}` : '';
  return `${basePath}?${queryString}${filterSuffix}`;
};

const baseHeaders = {
  apikey: env.supabaseAnonKey,
  Authorization: `Bearer ${env.supabaseAnonKey}`,
  Accept: 'application/json',
};

export async function supabaseSelect<T>(params: SupabaseSelectParams): Promise<T[]> {
  assertSupabaseEnv();
  const url = buildSelectUrl(params);
  const response = await fetch(url, {
    method: 'GET',
    headers: baseHeaders,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase select failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T[];
}
