const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Get subjects, optionally filter to compulsory ones
export const getSubjects = async (options = {}) => {
  const url = new URL(`${API_BASE_URL}/subjects`);
  if (options.compulsory === true) url.searchParams.set('compulsory', 'true');
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to fetch subjects');
  }
  const data = await res.json();
  return data.data || [];
};

export default { getSubjects };
