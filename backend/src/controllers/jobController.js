import { generateLearningPacksFromBase64 } from '../services/geminiService.js';

// In-memory job store (use Redis in production)
const jobs = new Map();

// Start background job
export const startAnalysisJob = async (req, res) => {
  try {
    const { file_url } = req.body;
    
    if (!file_url) {
      return res.status(400).json({ success: false, error: 'file_url is required' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job with pending status
    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      file_url
    });

    // Start background processing (don't await)
    processAnalysisJob(jobId, file_url).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
    });

    res.json({
      success: true,
      jobId,
      status: 'pending',
      message: 'Analysis started. Use the job ID to check progress.'
    });

  } catch (error) {
    console.error('Failed to start job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check job status
export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Background processing function
async function processAnalysisJob(jobId, file_url) {
  try {
    // Update status to processing
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'processing',
      startedAt: new Date()
    });

    // Download and process file
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // Process with Gemini (this can take 10+ minutes)
    const packs = await generateLearningPacksFromBase64(base64Data, contentType);

    // Normalize results
    const learningPacks = Array.isArray(packs) && packs.length > 0
      ? packs.map((p, i) => {
          const content = String(p.content || '');
          const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
          const duration = Math.max(5, Math.ceil(wordCount / 200) * 5);

          return {
            title: String(p.title || `Learning Pack ${i + 1}`),
            content,
            order: p.order || (i + 1),
            language: p.language || 'English',
            difficulty: p.difficulty || 'Medium',
            duration,
          };
        })
      : [{
          title: 'Learning Pack 1: Document Content',
          content: 'No content available',
          order: 1,
          language: 'English',
          difficulty: 'Medium',
          duration: 10,
        }];

    // Update job with results
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'completed',
      result: {
        data: learningPacks,
        language: learningPacks[0]?.language || 'English',
        stats: {
          chapters: learningPacks.length,
          learningPacks: learningPacks.length,
          totalWords: learningPacks.reduce(
            (sum, p) => sum + (p.content?.split(/\s+/)?.length || 0),
            0
          ),
        },
      },
      completedAt: new Date()
    });

  } catch (error) {
    console.error(`Job ${jobId} processing failed:`, error);
    
    // Update job with error
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    });
  }
}