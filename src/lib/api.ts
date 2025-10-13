export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000/api/v1';

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
