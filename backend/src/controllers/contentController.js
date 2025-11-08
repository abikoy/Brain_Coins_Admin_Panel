import { generateStructuredMaterialFromFile } from '../services/geminiService.js';


// POST /api/content/structured-from-file
export const structuredFromFileHandler = async (req, res) => {
  try {
    const { fileUrl, fileType } = req.body;
    if (!fileUrl || !fileType) {
      return res.status(400).json({ success: false, error: 'fileUrl and fileType are required' });
    }

    const material = await generateStructuredMaterialFromFile(fileUrl, fileType);

    res.json({ success: true, data: material });
  } catch (error) {
    console.error('[Backend] Structured material error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate structured material' });
  }
};

export default { structuredFromFileHandler };
