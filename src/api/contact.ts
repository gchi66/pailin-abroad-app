import { env } from '../config/env';

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

export async function submitContactMessage(payload: ContactPayload): Promise<string> {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(`${baseUrl}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let responseMessage = 'Failed to send message.';

  try {
    const json = (await response.json()) as { message?: string };
    if (json?.message) {
      responseMessage = json.message;
    }
  } catch {
    // Keep the generic fallback when the server response is not JSON.
  }

  if (!response.ok) {
    throw new Error(responseMessage);
  }

  return responseMessage;
}
