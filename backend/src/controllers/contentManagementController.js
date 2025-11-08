// controllers/contentManagementController.js
import contentManagementService from '../services/contentManagementService.js';

class ContentManagementController {
  
  // GET SUBJECTS
  async getSubjects(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '',
        is_active 
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      };

      const result = await contentManagementService.getSubjects(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parseInt(page),
        totalPages: Math.ceil(result.total / limit)
      });

    } catch (error) {
      console.error('Get Subjects Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subjects'
      });
    }
  }

  // TOGGLE SUBJECT STATUS
  async toggleSubjectStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      const result = await contentManagementService.toggleSubjectStatus(id, is_active);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Toggle Subject Status Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle subject status'
      });
    }
  }

  // GET LEARNING PACKS
  async getLearningPacks(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '',
        subject_id,
        grade,
        is_active,
        is_premium
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        subject_id,
        grade,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        is_premium: is_premium !== undefined ? is_premium === 'true' : undefined
      };

      const result = await contentManagementService.getLearningPacks(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parseInt(page),
        totalPages: Math.ceil(result.total / limit)
      });

    } catch (error) {
      console.error('Get Learning Packs Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch learning packs'
      });
    }
  }

  // TOGGLE LEARNING PACK STATUS
  async toggleLearningPackStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      const result = await contentManagementService.toggleLearningPackStatus(id, is_active);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Toggle Learning Pack Status Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle learning pack status'
      });
    }
  }

  // TOGGLE LEARNING PACK PREMIUM
  async toggleLearningPackPremium(req, res) {
    try {
      const { id } = req.params;
      const { is_premium } = req.body;
      
      const result = await contentManagementService.toggleLearningPackPremium(id, is_premium);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Toggle Learning Pack Premium Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle learning pack premium status'
      });
    }
  }

  // GET QUESTIONS
  async getQuestions(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '',
        pack_id,
        question_type,
        difficulty,
        is_active
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        pack_id,
        question_type,
        difficulty,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      };

      const result = await contentManagementService.getQuestions(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parseInt(page),
        totalPages: Math.ceil(result.total / limit)
      });

    } catch (error) {
      console.error('Get Questions Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch questions'
      });
    }
  }

  // TOGGLE QUESTION STATUS
  async toggleQuestionStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      const result = await contentManagementService.toggleQuestionStatus(id, is_active);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Toggle Question Status Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle question status'
      });
    }
  }

  // BULK TOGGLE QUESTIONS
  async bulkToggleQuestions(req, res) {
    try {
      const { ids, is_active } = req.body;
      
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          error: 'Question IDs array is required'
        });
      }

      const result = await contentManagementService.bulkToggleQuestions(ids, is_active);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Bulk Toggle Questions Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk toggle questions'
      });
    }
  }

  // BULK TOGGLE LEARNING PACKS
  async bulkToggleLearningPacks(req, res) {
    try {
      const { ids, is_active } = req.body;
      
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          error: 'Learning pack IDs array is required'
        });
      }

      const result = await contentManagementService.bulkToggleLearningPacks(ids, is_active);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Bulk Toggle Learning Packs Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk toggle learning packs'
      });
    }
  }

  // BULK TOGGLE LEARNING PACKS PREMIUM
  async bulkToggleLearningPacksPremium(req, res) {
    try {
      const { ids, is_premium } = req.body;
      
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          error: 'Learning pack IDs array is required'
        });
      }

      const result = await contentManagementService.bulkToggleLearningPacksPremium(ids, is_premium);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('Bulk Toggle Learning Packs Premium Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk toggle learning packs premium status'
      });
    }
  }
}

export default new ContentManagementController();