
const API_BASE = 'https://cyber-vault-pu6h.vercel.app/api';

export async function getHealth() {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error('Unable to retrieve database status.');
  }

  return response.json();
}
