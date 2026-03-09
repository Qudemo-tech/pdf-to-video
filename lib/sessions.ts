import { API_BASE } from './api';

export interface VideoSession {
  id: string;
  user_email: string;
  user_name: string | null;
  created_at: string;
  updated_at: string;
  current_step: string;
  selected_mode: string | null;
  status: string;
  pdf_url: string | null;
  extracted_text: string | null;
  page_count: number;
  character_count: number;
  video_id: string | null;
  hosted_url: string | null;
  pbp_data: Record<string, unknown> | null;
}

export async function createSession(params: {
  user_email: string;
  user_name?: string;
  pdf_url?: string;
  extracted_text?: string;
  page_count?: number;
  character_count?: number;
  pbp_data?: Record<string, unknown>;
}): Promise<VideoSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data.success ? data.session : null;
  } catch {
    return null;
  }
}

export async function getSessionById(sessionId: string): Promise<VideoSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
    const data = await res.json();
    return data.success ? data.session : null;
  } catch {
    return null;
  }
}

export async function getActiveSession(email: string): Promise<VideoSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/active?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return data.success ? data.session : null;
  } catch {
    return null;
  }
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<VideoSession, 'id' | 'user_email' | 'created_at'>>,
): Promise<VideoSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.success ? data.session : null;
  } catch {
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}
