const REMEMBER_KEY = 'hr_rag_remember';

interface StoredCredentials {
  username: string;
  password: string;
}

export function getStoredCredentials(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    return null;
  }
}
