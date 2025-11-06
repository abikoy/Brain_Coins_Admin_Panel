import { createClient } from '@supabase/supabase-js';

class AnalyticsService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Get comprehensive dashboard analytics
  async getDashboardAnalytics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total students count
      const { count: totalStudents, error: totalError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get premium students count
      const { count: premiumStudents, error: premiumError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

      if (premiumError) throw premiumError;

      // Get today's active students (streak_last_updated = today)
      const { count: activeToday, error: activeError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('streak_last_updated', today);

      if (activeError) throw activeError;

      // Get average progress from user_learning_progress
      const { data: progressData, error: progressError } = await this.supabase
        .from('user_learning_progress')
        .select('completed_sections, total_sections, user_id');

      if (progressError) {
        console.warn('Progress data not available:', progressError.message);
      }

      // Calculate average progress percentage
      let avgProgress = 0;
      if (progressData && progressData.length > 0) {
        const totalProgress = progressData.reduce((sum, progress) => {
          const completed = progress.completed_sections?.length || 0;
          const total = progress.total_sections || 1;
          return sum + (completed / total) * 100;
        }, 0);
        avgProgress = Math.round(totalProgress / progressData.length);
      }

      // Get students with highest streaks
      const { data: topStreaks, error: streakError } = await this.supabase
        .from('profiles')
        .select('full_name, current_streak, total_xp')
        .order('current_streak', { ascending: false })
        .limit(5);

      if (streakError) throw streakError;

      // Get recent premium subscriptions
      const { data: recentSubscriptions, error: subError } = await this.supabase
        .from('subscription_plan')
        .select(`
          paid_at,
          amount,
          currency,
          profiles(full_name, phone)
        `)
        .order('paid_at', { ascending: false })
        .limit(10);

      if (subError) {
        console.warn('Subscription data not available:', subError.message);
      }

      // Get grade distribution
      const { data: gradeDistribution, error: gradeError } = await this.supabase
        .from('profiles')
        .select('grade')
        .not('grade', 'is', null);

      if (gradeError) throw gradeError;

      const gradeStats = gradeDistribution.reduce((acc, profile) => {
        const grade = profile.grade || 'Not Set';
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {});

      // Get progress completion stats
      const completedModules = progressData?.filter(progress => {
        const completed = progress.completed_sections?.length || 0;
        const total = progress.total_sections || 1;
        return completed >= total;
      }).length || 0;

      return {
        success: true,
        data: {
          overview: {
            totalStudents: totalStudents || 0,
            premiumStudents: premiumStudents || 0,
            activeToday: activeToday || 0,
            averageProgress: avgProgress,
            completedModules,
            totalModules: progressData?.length || 0
          },
          streaks: topStreaks || [],
          recentSubscriptions: recentSubscriptions || [],
          gradeDistribution: gradeStats,
          progressStats: {
            completedModules,
            inProgress: (progressData?.length || 0) - completedModules,
            notStarted: (totalStudents || 0) - (progressData?.length || 0)
          }
        }
      };

    } catch (error) {
      console.error('Analytics Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get student progress analytics - FIXED WITH CORRECT COLUMN NAMES
  async getStudentProgressAnalytics(timeRange = 'week') {
    try {
      let dateFilter = new Date();
      
      switch (timeRange) {
        case 'day':
          dateFilter.setDate(dateFilter.getDate() - 1);
          break;
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
        default:
          dateFilter.setDate(dateFilter.getDate() - 7);
      }

      // Get progress data with time filter - USING CORRECT COLUMN NAMES
      const { data: progressData, error: progressError } = await this.supabase
        .from('user_learning_progress')
        .select(`
          *,
          profiles!inner(full_name, grade),
          learning_packs!inner(title, grade, language),
          subjects!inner(name)
        `)
        .gte('updated_at', dateFilter.toISOString())
        .order('updated_at', { ascending: false });

      if (progressError) throw progressError;

      // Calculate progress metrics
      const progressMetrics = progressData?.map(progress => {
        const completed = progress.completed_sections?.length || 0;
        const total = progress.total_sections || 1;
        const percentage = Math.round((completed / total) * 100);
        
        return {
          id: progress.id,
          studentName: progress.profiles?.full_name || 'Unknown',
          grade: progress.profiles?.grade || 'Not Set',
          pack: progress.learning_packs?.title || 'Unknown', // Using 'title' not 'name'
          subject: progress.subjects?.name || 'Unknown',
          progress: percentage,
          completedSections: completed,
          totalSections: total,
          lastUpdated: progress.updated_at
        };
      }) || [];

      return {
        success: true,
        data: progressMetrics
      };

    } catch (error) {
      console.error('Progress Analytics Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get premium users analytics
  async getPremiumAnalytics() {
    try {
      // Get premium users with their details
      const { data: premiumUsers, error: premiumError } = await this.supabase
        .from('profiles')
        .select(`
          *,
          subscription_plan(amount, paid_at, product_id)
        `)
        .eq('is_premium', true)
        .order('premium_until', { ascending: false });

      if (premiumError) throw premiumError;

      // Calculate revenue metrics
      const { data: subscriptions, error: subError } = await this.supabase
        .from('subscription_plan')
        .select('amount, currency, paid_at');

      if (subError) {
        console.warn('Subscription data not available:', subError.message);
      }

      const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
      const monthlyRevenue = subscriptions
        ?.filter(sub => {
          const paidDate = new Date(sub.paid_at);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return paidDate >= monthAgo;
        })
        .reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;

      return {
        success: true,
        data: {
          premiumUsers: premiumUsers || [],
          revenue: {
            total: totalRevenue,
            monthly: monthlyRevenue,
            currency: 'USD'
          },
          subscriptionCount: subscriptions?.length || 0
        }
      };

    } catch (error) {
      console.error('Premium Analytics Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get real-time stats for frontend
  async getRealTimeStats() {
    try {
      const dashboardData = await this.getDashboardAnalytics();
      
      if (!dashboardData.success) {
        throw new Error(dashboardData.error);
      }

      return {
        success: true,
        data: dashboardData.data.overview
      };

    } catch (error) {
      console.error('Real-time Stats Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
}

export default new AnalyticsService();