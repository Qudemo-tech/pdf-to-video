import { API_BASE } from './api';

export async function getCredits(email: string): Promise<{ balance: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/credits?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return { balance: data.success ? data.balance : 0 };
  } catch {
    return { balance: 0 };
  }
}

export async function checkCredits(email: string): Promise<{ hasCredits: boolean; balance: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/credits/check?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return data.success ? { hasCredits: data.hasCredits, balance: data.balance } : { hasCredits: false, balance: 0 };
  } catch {
    return { hasCredits: false, balance: 0 };
  }
}

export async function deductCredits(params: {
  user_email: string;
  amount: number;
  video_session_id?: string;
  description?: string;
}): Promise<{ balance: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/credits/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return { balance: data.success ? data.balance : 0 };
  } catch {
    return { balance: 0 };
  }
}

export async function createCheckoutSession(params: {
  user_email: string;
  plan: 'starter' | 'bestvalue' | 'business';
}): Promise<{ url: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return { url: data.success ? data.url : null };
  } catch {
    return { url: null };
  }
}
