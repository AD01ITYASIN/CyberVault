
const API_BASE = 'http://localhost:3001/api';

export async function getHealth() {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error('Unable to retrieve database status.');
  }

  return response.json();
}
