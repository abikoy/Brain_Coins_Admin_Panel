import { getAllReports as getAllReportsService, getReportsStats as getReportsStatsService, updateReportStatus as updateReportStatusService } from '../services/supabaseService.js';

console.log('✅ Reports Controller: Using shared Supabase client');

class ReportsController {
  // Get all reports with optional filtering
  async getAllReports(req, res) {
    try {
      console.log('📋 Fetching reports...');
      
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await getAllReportsService(filters);

      console.log(`✅ Found ${result.data?.length || 0} reports`);
      
      res.json({
        success: true,
        data: result.data,
        count: result.count,
        message: 'Reports fetched successfully'
      });
    } catch (error) {
      console.error('❌ Error in getAllReports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
        error: error.message
      });
    }
  }

  // Get reports statistics
  async getReportsStats(req, res) {
    try {
      console.log('📊 Fetching reports statistics...');

      const stats = await getReportsStatsService();

      console.log('✅ Reports statistics fetched successfully');
      
      res.json({
        success: true,
        data: stats,
        message: 'Reports statistics fetched successfully'
      });
    } catch (error) {
      console.error('❌ Error in getReportsStats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports statistics',
        error: error.message
      });
    }
  }

  // Update report status
  async updateReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log(`🔄 Updating report ${id} status to: ${status}`);

      // Validate status
      const validStatuses = ['pending', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: pending, resolved, dismissed'
        });
      }

      const data = await updateReportStatusService(id, status);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      console.log(`✅ Report ${id} status updated successfully to ${status}`);
      
      res.json({
        success: true,
        data: data,
        message: 'Report status updated successfully'
      });
    } catch (error) {
      console.error('❌ Error in updateReportStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update report status',
        error: error.message
      });
    }
  }
}

export default new ReportsController();
