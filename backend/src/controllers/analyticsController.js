
import { supabaseAdmin as supabase } from '../services/supabaseService.js';

console.log('✅ Analytics Controller: Using shared Supabase client');

class AnalyticsController {
  // Get real-time stats for frontend cards
  async getRealTimeStats(req, res) {
    try {
      console.log('📊 Fetching real-time stats...');
      const today = new Date().toISOString().split('T')[0];

      // Get total students count
      const { count: totalStudents, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('❌ Error fetching total students:', totalError);
        throw totalError;
      }

      // Get premium students count
      const { count: premiumStudents, error: premiumError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

      if (premiumError) throw premiumError;

      // Get today's active students
      const { count: activeToday, error: activeError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('streak_last_updated', today);

      if (activeError) throw activeError;

      // Get average progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_learning_progress')
        .select('completed_sections, total_sections');

      let avgProgress = 0;
      if (progressData && progressData.length > 0 && !progressError) {
        const totalProgress = progressData.reduce((sum, progress) => {
          const completed = progress.completed_sections?.length || 0;
          const total = progress.total_sections || 1;
          return sum + (completed / total) * 100;
        }, 0);
        avgProgress = Math.round(totalProgress / progressData.length);
      }

      const stats = {
        totalStudents: totalStudents || 0,
        premiumStudents: premiumStudents || 0,
        activeToday: activeToday || 0,
        averageProgress: avgProgress,
        completedModules: progressData?.length || 0
      };

      console.log('📊 Stats fetched:', stats);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Real-time Stats Error:', {
        message: error.message,
        details: error.stack,
        hint: error.hint || '',
        code: error.code || ''
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch real-time stats',
        details: error.message
      });
    }
  }

  // Get student list - FIXED: Removed email column
  async getStudents(req, res) {
    try {
      console.log('👥 Fetching students...');
      const { page = 1, limit = 50, search = '', premium_only = false } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          grade,
          school,
          district,
          is_premium,
          premium_until,
          current_streak,
          total_xp,
          total_coins,
          last_active,
          created_at,
          streak_last_updated,
          language_preference
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (premium_only === 'true') {
        query = query.eq('is_premium', true);
      }

      const { data: students, error, count } = await query;

      if (error) throw error;

      // Transform student data
      const transformedStudents = students.map(student => ({
        id: student.id,
        name: student.full_name || 'Unknown Student',
        phone: student.phone,
        grade: student.grade,
        school: student.school,
        district: student.district,
        isPremium: student.is_premium,
        premiumUntil: student.premium_until,
        streak: student.current_streak,
        totalXP: student.total_xp,
        totalCoins: student.total_coins,
        lastActive: student.last_active,
        streakLastUpdated: student.streak_last_updated,
        joinedDate: student.created_at,
        language: student.language_preference,
        progress: 0 // Default progress
      }));

      console.log(`👥 Found ${transformedStudents.length} students`);

      res.json({
        success: true,
        data: transformedStudents,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit)
      });

    } catch (error) {
      console.error('❌ Students fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch students'
      });
    }
  }

  // Get student progress - FIXED: Handle potential join errors
  async getStudentProgress(req, res) {
    try {
      console.log('📈 Fetching student progress...');
      const { timeRange = 'week' } = req.query;

      // Calculate date filter based on timeRange
      let dateFilter = new Date();
      switch (timeRange) {
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
        case 'year':
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
        default:
          dateFilter.setDate(dateFilter.getDate() - 7);
      }
      
      console.log(`📊 Fetching progress for timeRange: ${timeRange}, from: ${dateFilter.toISOString()}`);

      // Get progress data
      const { data: progressData, error: progressError } = await supabase
        .from('user_learning_progress')
        .select('*')
        .gte('updated_at', dateFilter.toISOString())
        .order('updated_at', { ascending: false });

      if (progressError) throw progressError;

      if (!progressData || progressData.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Get all related data separately
      const studentIds = [...new Set(progressData.map(p => p.user_id))];
      const packIds = [...new Set(progressData.map(p => p.pack_id))];

      // Fetch students
      const { data: studentProfiles, error: studentError } = await supabase
        .from('profiles')
        .select('id, full_name, grade')
        .in('id', studentIds);

      // Fetch learning packs with subjects
      const { data: learningPacks, error: packsError } = await supabase
        .from('learning_packs')
        .select('id, title, subject_id')
        .in('id', packIds);

      // Fetch subjects
      const subjectIds = learningPacks?.map(p => p.subject_id).filter(Boolean) || [];
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      // Create lookup maps
      const studentMap = {};
      const packMap = {};
      const subjectMap = {};

      studentProfiles?.forEach(student => { studentMap[student.id] = student; });
      learningPacks?.forEach(pack => { packMap[pack.id] = pack; });
      subjects?.forEach(subject => { subjectMap[subject.id] = subject; });

      // Build progress metrics
      const progressMetrics = progressData.map(progress => {
        const completed = progress.completed_sections?.length || 0;
        const total = progress.total_sections || 1;
        const percentage = Math.round((completed / total) * 100);

        const student = studentMap[progress.user_id];
        const pack = packMap[progress.pack_id];
        const subject = pack ? subjectMap[pack.subject_id] : null;

        return {
          id: progress.id,
          studentName: student?.full_name || 'Unknown Student',
          grade: student?.grade || 'Not Set',
          pack: pack?.title || 'Unknown Pack',
          subject: subject?.name || 'No Subject',
          progress: percentage,
          completedSections: completed,
          totalSections: total,
          lastUpdated: progress.updated_at
        };
      });

      console.log('📈 Progress metrics calculated:', progressMetrics.length);
      console.log('Subjects found:', [...new Set(progressMetrics.map(p => p.subject))]);

      res.json({ success: true, data: progressMetrics });

    } catch (error) {
      console.error('❌ Student Progress Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // Dashboard overview
  async getDashboardOverview(req, res) {
    try {
      console.log('📋 Fetching dashboard overview...');

      // Get basic stats
      const statsResult = await this.getRealTimeStats(req, res);

      // You can add more detailed data here later
      res.json({
        success: true,
        data: {
          overview: statsResult?.data || {},
          message: 'Dashboard overview data'
        }
      });
    } catch (error) {
      console.error('❌ Dashboard Overview Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview'
      });
    }
  }

  // Premium analytics
  async getPremiumAnalytics(req, res) {
    try {
      console.log('👑 Fetching premium analytics...');

      // Get premium students
      const { data: premiumStudents, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_premium', true);

      if (error) throw error;

      res.json({
        success: true,
        data: {
          premiumUsers: premiumStudents || [],
          totalPremium: premiumStudents?.length || 0
        }
      });
    } catch (error) {
      console.error('❌ Premium Analytics Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch premium analytics'
      });
    }
  }

  // System logs
  async getSystemLogs(req, res) {
    try {
      console.log('📝 Fetching system logs...');

      // Check if system_logs table exists
      const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('System logs table might not exist:', error.message);
        // Return empty array if table doesn't exist
        return res.json({
          success: true,
          logs: []
        });
      }

      res.json({
        success: true,
        logs: logs || []
      });
    } catch (error) {
      console.error('❌ System Logs Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system logs'
      });
    }
  }

  async getStudentDetails(req, res) {
    try {
      const { id } = req.params;
      console.log('📋 Fetching details for student:', id);

      const { data: student, error } = await supabase
        .from('profiles')
        .select(`
        *,
        subscription_plan(
          amount, 
          currency, 
          paid_at, 
          product_id,
          plan_type,
          interval,
          ends_at
        )
      `)
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: student
      });

    } catch (error) {
      console.error('❌ Get student details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch student details'
      });
    }
  }

  // Update student premium status
  async updateStudentPremiumStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_premium, premium_until } = req.body;

      console.log('👑 Updating premium status for student:', id, { is_premium, premium_until });

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          is_premium: is_premium,
          premium_until: premium_until,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: updatedProfile,
        message: `Student ${is_premium ? 'upgraded to' : 'downgraded from'} premium successfully`
      });

    } catch (error) {
      console.error('❌ Update premium status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update premium status'
      });
    }
  }

  // Create manual subscription
  // Create manual subscription with new plan structure
  async createManualSubscription(req, res) {
    try {
      const { id } = req.params;
      const {
        plan_type = 'individual',
        interval = 'monthly',
        amount,
        currency = 'LKR',
        product_id,
        payment_provider = 'manual'
      } = req.body;

      console.log('💰 Creating manual subscription for student:', id, {
        plan_type, interval, amount, currency, product_id
      });

      // Generate a unique payment reference
      const payment_reference = `manual_${Date.now()}`;

      // 1. Create a payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: id,
          product_id: product_id || `manual_${plan_type}_${interval}`,
          amount: amount,
          currency: currency,
          plan_type: plan_type,
          interval: interval,
          payment_reference: payment_reference,
          payment_provider: payment_provider,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Create a subscription record, which will trigger profile update
      const endsAt = new Date();
      if (interval === 'monthly') {
        endsAt.setMonth(endsAt.getMonth() + 1);
      } else if (interval === 'yearly') {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscription_plan')
        .insert({
          user_id: id,
          product_id: product_id || `manual_${plan_type}_${interval}`,
          payment_intent_id: payment_reference, // Use the same reference
          amount: amount,
          currency: currency,
          plan_type: plan_type,
          interval: interval,
          ends_at: endsAt.toISOString(),
          paid_at: new Date().toISOString(),
          payment_reference: payment_reference,
          payment_provider: payment_provider,
          is_active: true
        })
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      // 3. Get updated profile to return
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      res.json({
        success: true,
        data: {
          profile: updatedProfile,
          subscription: subscription,
          payment: payment
        },
        message: `Premium ${plan_type} ${interval} subscription created successfully`
      });

    } catch (error) {
      console.error('❌ Create manual subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create manual subscription',
        details: error.message
      });
    }
  }

  // Create new student
  async createStudent(req, res) {
    try {
      const studentData = req.body;
      console.log('👤 Creating new student:', studentData);

      const { data: newStudent, error } = await supabase
        .from('profiles')
        .insert({
          full_name: studentData.full_name,
          grade: studentData.grade,
          school: studentData.school,
          district: studentData.district,
          phone: studentData.phone,
          language_preference: studentData.language_preference || 'en',
          is_premium: studentData.is_premium || false,
          premium_until: studentData.premium_until || null
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: newStudent,
        message: 'Student created successfully'
      });

    } catch (error) {
      console.error('❌ Create student error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create student',
        details: error.details
      });
    }
  }

  // Update student information
  async updateStudent(req, res) {
    try {
      const { id } = req.params;
      const studentData = req.body;
      console.log('👤 Updating student:', id, studentData);

      const { data: updatedStudent, error } = await supabase
        .from('profiles')
        .update({
          full_name: studentData.full_name,
          grade: studentData.grade,
          school: studentData.school,
          district: studentData.district,
          phone: studentData.phone,
          language_preference: studentData.language_preference,
          is_premium: studentData.is_premium,
          premium_until: studentData.premium_until || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: updatedStudent,
        message: 'Student updated successfully'
      });

    } catch (error) {
      console.error('❌ Update student error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update student',
        details: error.details
      });
    }
  }
}

// Export the controller instance
export default new AnalyticsController();