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
    try { err = await res.json(); } catch {}
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
    try { err = await res.json(); } catch {}
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
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to create learning pack');
  }
  const data = await res.json();
  return data.data;
};

// Analyze document and suggest learning packs
export const analyzeDocument = async (fileUrl, fileType, file) => {
  const formData = new FormData();
  
  if (file) {
    // If we have the file object, use it directly
    formData.append('file', file);
  } else if (fileUrl) {
    // Fallback to URL if file object is not available
    let absoluteUrl = fileUrl;
    if (!fileUrl.startsWith('http') && !fileUrl.startsWith('blob:')) {
      absoluteUrl = `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }
    formData.append('fileUrl', absoluteUrl);
  } else {
    throw new Error('No file provided for analysis');
  }

  const res = await fetch(`${API_BASE_URL}/learning-packs/analyze-document`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to analyze document');
  }
  
  const data = await res.json();
  return data; // Return full response to include language detection
};

export default { 
  getLearningPacks, 
  getLearningPackWithSubject, 
  createLearningPack,
  analyzeDocument 
};
