const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get learning packs (optionally filter by subject_id)
export const getLearningPacks = async (subject_id) => {
  const url = new URL(`${API_BASE_URL}/learning-packs`);
  if (subject_id) url.searchParams.set('subject_id', subject_id);
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { }
    throw new Error(err?.error || 'Failed to fetch learning packs');
  }
  const data = await res.json();
  return data.data || [];
};

// Get a single learning pack with subject
export const getLearningPackWithSubject = async (id) => {
  const res = await fetch(`${API_BASE_URL}/learning-packs/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { }
    throw new Error(err?.error || 'Failed to fetch learning pack');
  }
  const data = await res.json();
  return data.data;
};

// Create a new learning pack
export const createLearningPack = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/learning-packs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { }
    throw new Error(err?.error || 'Failed to create learning pack');
  }
  const data = await res.json();
  return data.data;
};

// Analyze document and suggest learning packs
export const analyzeDocument = async (fileUrl) => {
  if (!fileUrl) {
    throw new Error('fileUrl is required for analysis');
  }

  const res = await fetch(`${API_BASE_URL}/learning-packs/analyze-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ file_url: fileUrl })
  });

  if (!res.ok) {
    // Try to read JSON first, then fallback to text
    let message = 'Failed to analyze document';
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch { }
    }
    throw new Error(message);
  }

  const data = await res.json();
  return data; // { success, data, language, stats }
};

export default {
  getLearningPacks,
  getLearningPackWithSubject,
  createLearningPack,
  analyzeDocument
};
