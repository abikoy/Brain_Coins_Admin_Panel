import { 
	getLearningPacksBySubject,
	getLearningPackWithSubject,
	createLearningPack
} from '../services/learningPackService.js';
// Add these two imports to the top of your learningPackController.js file:
import { createRequire } from 'module';
import { pathToFileURL } from 'url'; // Required to convert the path to a URL format
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import mammoth from 'mammoth';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Import the module
import * as pdfParseModule from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// GET /api/learning-packs
// Optional query: subject_id
const listLearningPacksHandler = async (req, res) => {
	try {
		const { subject_id } = req.query;

		if (subject_id) {
			const packs = await getLearningPacksBySubject(subject_id);
			return res.json({ success: true, data: packs });
		}

		// If no filter, list all active packs
		const { supabaseAdmin } = await import('../config/supabaseClient.js');
		const { data, error } = await supabaseAdmin
			.from('learning_packs')
			.select('*')
			.eq('is_active', true)
			.order('created_at', { ascending: false });

		if (error) throw error;

		return res.json({ success: true, data: data || [] });
	} catch (error) {
		console.error('[Backend] List learning packs error:', error);
		res.status(500).json({ success: false, error: error.message || 'Failed to list learning packs' });
	}
};

// GET /api/learning-packs/:id
const getLearningPackHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const pack = await getLearningPackWithSubject(id);
		if (!pack) {
			return res.status(404).json({ success: false, error: 'Learning pack not found' });
		}
		res.json({ success: true, data: pack });
	} catch (error) {
		console.error(`[Backend] Get learning pack ${req.params.id} error:`, error);
		res.status(500).json({ success: false, error: error.message || 'Failed to get learning pack' });
	}
};

// POST /api/learning-packs
const createLearningPackHandler = async (req, res) => {
	try {
		const { subject_id, grade, title, title_si, title_ta, difficulty, description, is_active } = req.body;

		if (!subject_id || !grade || !title) {
			return res.status(400).json({ success: false, error: 'subject_id, grade, and title are required' });
		}

		const gradeNum = Number(grade);
		if (!Number.isInteger(gradeNum) || gradeNum < 6 || gradeNum > 11) {
			return res.status(400).json({ success: false, error: 'grade must be an integer between 6 and 11' });
		}

		const pack = await createLearningPack({
			subject_id,
			grade: gradeNum,
			title,
			title_si,
			title_ta,
			difficulty: difficulty || 'Medium',
			description: description || '',
			is_active: is_active !== false
		});

		res.status(201).json({ success: true, data: pack });
	} catch (error) {
		console.error('[Backend] Create learning pack error:', error);
		res.status(500).json({ success: false, error: error.message || 'Failed to create learning pack' });
	}
};

// Ensure upload directory exists
const ensureUploadDir = async () => {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	} catch (err) {
		console.error('Error creating upload directory:', err);
	}
};

// Helper function to download a file from a URL
const downloadFile = async (url, outputPath) => {
	try {
		// If it's a data URL, handle it directly
		if (url.startsWith('data:')) {
			const base64Data = url.split(';base64,').pop();
			await fs.writeFile(outputPath, base64Data, 'base64');
			return;
		}

		// Ensure URL is absolute
		let absoluteUrl = url;
		if (!url.match(/^https?:\/\//i) && !url.startsWith('blob:')) {
			throw new Error(`Invalid URL: ${url}. Only absolute URLs are supported.`);
		}

		const response = await fetch(absoluteUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const buffer = await response.buffer();
		await fs.writeFile(outputPath, buffer);
	} catch (error) {
		console.error('Error downloading file:', error);
		throw new Error(`Failed to download file: ${error.message}`);
	}
};

// Extract text from document based on file type
const extractTextFromFile = async (filePath, fileType) => {
  try {
    console.log(`Extracting text from ${fileType} file: ${filePath}`);
    
    // Handle PDF files
    if (fileType === 'application/pdf') {
      try {
        console.log('Using pdf-parse for text extraction...');
        const dataBuffer = await fs.readFile(filePath);
        // Use the imported module correctly
        const data = await pdfParseModule.default(dataBuffer, {
          max: 20,  // Limit to first 20 pages
          worker: false  // Disable worker for better compatibility
        });
        if (!data.text || !data.text.trim()) {
          throw new Error('No text content found in PDF');
        }
        return data.text;
      } catch (pdfError) {
        console.error('Error with pdf-parse:', pdfError);
        throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
      }
    }
    
    // Handle image files (PNG, JPG, JPEG)
    if (['image/png', 'image/jpeg', 'image/jpg'].includes(fileType)) {
      try {
        console.log('Using Tesseract.js for OCR...');
        const worker = await createWorker({
          logger: m => console.log(m.status) // Optional: log progress
        });
        
        await worker.loadLanguage('eng+sin+tam');
        await worker.initialize('eng+sin+tam');
        
        const { data: { text } } = await worker.recognize(filePath);
        await worker.terminate();
        
        if (!text.trim()) {
          throw new Error('No text could be extracted from the image');
        }
        
        return text;
      } catch (ocrError) {
        console.error('Error with Tesseract.js:', ocrError);
        throw new Error(`Failed to perform OCR on image: ${ocrError.message}`);
      }
    }
		
		// Handle DOCX files
		if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
			fileType === 'application/msword') {
			const result = await mammoth.extractRawText({ path: filePath });
			return result.value;
		}
		
		// Handle plain text files
		if (fileType === 'text/plain') {
			return await fs.readFile(filePath, 'utf-8');
		}
		
		throw new Error('Unsupported file type');
		
	} catch (error) {
		console.error(`Error extracting text from file: ${error.message}`, error);
		throw new Error(`Failed to extract text from file: ${error.message}`);
	}
};

// Detect language from text
const detectLanguage = (text) => {
	// Simple language detection based on common characters
	const tamilChars = text.match(/[\u0B80-\u0BFF]/g) || [];
	const sinhalaChars = text.match(/[\u0D80-\u0DFF]/g) || [];
	
	if (tamilChars.length > sinhalaChars.length && tamilChars.length > 10) {
		return 'Tamil';
	} else if (sinhalaChars.length > 10) {
		return 'Sinhala';
	}
	
	return 'English';
};

// Analyze document structure and extract chapters (optimized for speed)
const analyzeDocumentStructure = (text, language) => {
    // Limit text processing to first 50,000 characters for performance
    const maxTextLength = 50000;
    const limitedText = text.length > maxTextLength 
        ? text.substring(0, maxTextLength) + '... [content truncated]'
        : text;
    
    // Simple paragraph splitting for faster processing
    const paragraphs = limitedText.split(/\n\s*\n+/);
    const chapters = [];
    
    // Use first 5 paragraphs as chapters for speed
    const maxChapters = 5;
    for (let i = 0; i < Math.min(maxChapters, paragraphs.length); i++) {
        const content = paragraphs[i].trim();
        if (content) {
            chapters.push({
                title: `${language === 'Sinhala' ? 'කොටස' : language === 'Tamil' ? 'பகுதி' : 'Part'} ${i + 1}`,
                content: content,
                order: i + 1
            });
        }
    }
    
    // If no content was found, return the first 2000 characters as a single chapter
    if (chapters.length === 0) {
        return [{
            title: language === 'Sinhala' ? 'ප්‍රධාන අංග' : 
                   language === 'Tamil' ? 'முக்கிய பகுதி' : 'Main Content',
            content: limitedText.substring(0, 2000),
            order: 1
        }];
    }
    
    return chapters;
};

// Generate learning packs from chapters (optimized for speed)
const generateLearningPacks = (chapters, language) => {
    const difficultyLevels = {
        'English': ['Beginner', 'Intermediate', 'Advanced'],
        'Sinhala': ['ආරම්භක', 'මධ්‍යම', 'උසස්'],
        'Tamil': ['தொடக்கநிலை', 'இடைநிலை', 'மேம்பட்ட']
    };
    
    const difficulties = difficultyLevels[language] || difficultyLevels['English'];
    const now = Date.now();
    
    // Limit to first 3 chapters for faster generation
    const maxChapters = Math.min(3, chapters.length);
    
    return chapters.slice(0, maxChapters).map((chapter, index) => {
        // Simple difficulty assignment
        const difficultyIndex = Math.min(index, difficulties.length - 1);
        const difficulty = difficulties[difficultyIndex];
        
        // Simple topic extraction (first 3 words)
        const topics = chapter.content
            .split(/\s+/)
            .slice(0, 3)
            .filter(w => w.length > 3) // Only words longer than 3 characters
            .map(w => w.replace(/[^\w\s]/g, ''));
            
        // Simple description
        const descriptions = {
            'English': `Covers key concepts from ${chapter.title}`,
            'Sinhala': `${chapter.title} හි ප්‍රධාන සංකල්ප ආවරණය කරයි`,
            'Tamil': `${chapter.title} இன் முக்கிய கருத்துக்களை உள்ளடக்கியது`
        };
        
        return {
            id: `pack-${now}-${index}`,
            title: chapter.title,
            description: descriptions[language] || descriptions['English'],
            duration: 15, // Fixed duration for all packs
            topics: topics.length > 0 ? topics : [chapter.title],
            difficulty: difficulty,
            order: index + 1,
            language: language,
            contentPreview: chapter.content.substring(0, 200) + '...'
        };
    });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, UPLOAD_DIR);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, `${uniqueSuffix}-${file.originalname}`);
	}
});

const upload = multer({ 
	storage: storage,
	limits: { 
		fileSize: 50 * 1024 * 1024, // 50MB limit
		fieldSize: 50 * 1024 * 1024 // 50MB limit for fields (if any)
	}
});

// Middleware to handle file upload
const uploadMiddleware = upload.single('file');

// POST /api/learning-packs/analyze-document
// Analyzes an uploaded document and generates learning packs
const analyzeDocumentHandler = async (req, res) => {
	await ensureUploadDir();
	
	// Handle file upload using multer middleware
	uploadMiddleware(req, res, async (err) => {
		try {
			if (err) {
				console.error('File upload error:', err);
				return res.status(400).json({
					success: false,
					error: err.message || 'Error uploading file'
				});
			}

			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: 'No file uploaded'
				});
			}

			const filePath = req.file.path;
			const fileType = req.file.mimetype;
			
			try {
				// Extract text from the file
				const text = await extractTextFromFile(filePath, fileType);
				
				if (!text || text.trim().length === 0) {
					throw new Error('The uploaded file appears to be empty');
				}
				
				// Detect language
				const language = detectLanguage(text);
				
				// Analyze document structure
				const chapters = analyzeDocumentStructure(text, language);
				
				if (!chapters || chapters.length === 0) {
					throw new Error('Could not identify any chapters or sections in the document');
				}
				
				// Generate learning packs
				const learningPacks = generateLearningPacks(chapters, language);
				
				// Clean up the uploaded file
				try {
					await fs.unlink(filePath);
				} catch (err) {
					console.error('Error cleaning up file:', err);
				}
				
				return res.json({
					success: true,
					data: learningPacks,
					language: language
				});
				
			} catch (error) {
				console.error('Error processing file:', error);
				
				// Clean up the uploaded file if it exists
				try {
					await fs.access(filePath);
					await fs.unlink(filePath);
				} catch (err) {
					// File doesn't exist or couldn't be deleted, ignore
				}
				
				throw error;
			}
			
		} catch (error) {
			console.error('[Backend] Document analysis error:', error);
			res.status(500).json({
				success: false,
				error: error.message || 'Failed to analyze document'
			});
		}
	});
};

export {
	listLearningPacksHandler,
	getLearningPackHandler,
	createLearningPackHandler,
	analyzeDocumentHandler
};
