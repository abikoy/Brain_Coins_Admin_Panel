const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Start background analysis job
export const startAnalysisJob = async (fileUrl) => {
  const response = await fetch(`${API_BASE_URL}/jobs/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ file_url: fileUrl })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start analysis job');
  }

  return response.json();
};

// Check job status
export const getJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get job status');
  }

  return response.json();
};

// Poll job until completion
export const pollJobUntilComplete = async (jobId, onProgress = null) => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await getJobStatus(jobId);
        const job = response.job;

        if (onProgress) {
          onProgress(job);
        }

        if (job.status === 'completed') {
          resolve(job.result);
        } else if (job.status === 'failed') {
          reject(new Error(job.error || 'Job failed'));
        } else {
          // Continue polling every 3 seconds
          setTimeout(poll, 3000);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
};