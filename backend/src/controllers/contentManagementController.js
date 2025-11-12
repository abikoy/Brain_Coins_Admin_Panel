// controllers/contentManagementController.js
import contentManagementService from '../services/contentManagementService.js';

class ContentManagementController {
  
  // GET SUBJECTS
  async getSubjects(req, res) {
    try {
      
      const { 
        page, 
        limit, 
        search = '',
        is_active,
        language,
        subject_id,
        grade
      } = req.query;

      const filters = {
        search,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        language,
        subject_id,
        grade
      };
      

      // Only add pagination if both page and limit are provided
      if (page && limit) {
        filters.page = parseInt(page);
        filters.limit = parseInt(limit);
      }

      const result = await contentManagementService.getSubjects(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        subjects: result.subjects,
        total: result.total,
        page: filters.page || 1,
        totalPages: filters.page && filters.limit ? Math.ceil(result.total / filters.limit) : 1,
        overallStats: result.overallStats
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
        page, 
        limit, 
        search = '',
        subject_id,
        grade,
        language,
        is_active,
        is_premium
      } = req.query;

      const filters = {
        search,
        subject_id,
        grade,
        language,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        is_premium: is_premium !== undefined ? is_premium === 'true' : undefined
      };

      // Only add pagination if both page and limit are provided
      if (page && limit) {
        filters.page = parseInt(page);
        filters.limit = parseInt(limit);
      }

      const result = await contentManagementService.getLearningPacks(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        learningPacks: result.learningPacks,
        total: result.total,
        page: filters.page || 1,
        totalPages: filters.page && filters.limit ? Math.ceil(result.total / filters.limit) : 1,
        overallStats: result.overallStats
      });

    } catch (error) {
      console.error('Get Learning Packs Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch learning packs'
      });
    }
  }

  // GET CONTENT HIERARCHY FOR FILTERING
  async getContentHierarchy(req, res) {
    try {
      const { language, grade, subject_id } = req.query;

      const filters = {
        language,
        grade,
        subject_id
      };

      const result = await contentManagementService.getContentHierarchy(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Get Content Hierarchy Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content hierarchy'
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

  // UPDATE LEARNING PACK
  async updateLearningPack(req, res) {
    try {
      const { id } = req.params;
      const packData = req.body;
      
      const result = await contentManagementService.updateLearningPack(id, packData);

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
      console.error('Update Learning Pack Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update learning pack'
      });
    }
  }

  // DELETE LEARNING PACK
  async deleteLearningPack(req, res) {
    try {
      const { id } = req.params;
      
      const result = await contentManagementService.deleteLearningPack(id);

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
      console.error('Delete Learning Pack Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete learning pack'
      });
    }
  }

  // GET QUESTIONS
  async getQuestions(req, res) {
    try {
      
      const { 
        page, 
        limit, 
        search = '',
        pack_id,
        question_type,
        difficulty,
        is_active,
        language,
        subject_id,
        grade
      } = req.query;

      const filters = {
        search,
        pack_id,
        question_type,
        difficulty,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        language,
        subject_id,
        grade
      };
      

      // Only add pagination if both page and limit are provided
      if (page && limit) {
        filters.page = parseInt(page);
        filters.limit = parseInt(limit);
      }

      const result = await contentManagementService.getQuestions(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        questions: result.questions,
        total: result.total,
        page: filters.page || 1,
        totalPages: filters.limit ? Math.ceil(result.total / filters.limit) : Math.ceil(result.total / 10),
        overallStats: result.overallStats
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

  // UPDATE QUESTION
  async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const questionData = req.body;
      
      const result = await contentManagementService.updateQuestion(id, questionData);

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
      console.error('Update Question Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update question'
      });
    }
  }

  // DELETE QUESTION
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      
      const result = await contentManagementService.deleteQuestion(id);

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
      console.error('Delete Question Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete question'
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