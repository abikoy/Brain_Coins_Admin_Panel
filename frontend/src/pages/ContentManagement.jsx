import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import Button from '../components/ui/Button';
import { Book, Package, HelpCircle, RefreshCw, ToggleLeft, ToggleRight, Crown, Filter } from 'lucide-react';
import contentManagementService from '../api/contentManagementService';
import SubjectsTable from '../components/contentmanagement/SubjectsTable';
import LearningPacksTable from '../components/contentmanagement/LearningPacksTable';
import QuestionsTable from '../components/contentmanagement/QuestionsTable';

const ContentManagement = () => {
    const [activeTab, setActiveTab] = useState('subjects');
    const [subjects, setSubjects] = useState([]);
    const [learningPacks, setLearningPacks] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalSubjects: 0,
        activeSubjects: 0,
        totalPacks: 0,
        activePacks: 0,
        premiumPacks: 0,
        totalQuestions: 0,
        activeQuestions: 0
    });

    // Fetch all content data
    const fetchContentData = async () => {
        try {
            setRefreshing(true);

            // Fetch all data in parallel
            const [subjectsResult, packsResult, questionsResult] = await Promise.all([
                contentManagementService.getSubjects({ limit: 1000 }),
                contentManagementService.getLearningPacks({ limit: 1000 }),
                contentManagementService.getQuestions({ limit: 1000 })
            ]);

            setSubjects(subjectsResult.subjects || []);
            setLearningPacks(packsResult.learningPacks || []);
            setQuestions(questionsResult.questions || []);

            // Calculate stats
            const activeSubjects = subjectsResult.subjects?.filter(s => s.is_active)?.length || 0;
            const activePacks = packsResult.learningPacks?.filter(p => p.is_active)?.length || 0;
            const premiumPacks = packsResult.learningPacks?.filter(p => p.is_premium)?.length || 0;
            const activeQuestions = questionsResult.questions?.filter(q => q.is_active)?.length || 0;

            setStats({
                totalSubjects: subjectsResult.total || 0,
                activeSubjects,
                totalPacks: packsResult.total || 0,
                activePacks,
                premiumPacks,
                totalQuestions: questionsResult.total || 0,
                activeQuestions
            });

        } catch (error) {
            console.error('Error fetching content data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchContentData();
    }, []);

    // Handle status toggles
    const handleToggleSubject = async (subjectId, isActive) => {
        try {
            await contentManagementService.toggleSubjectStatus(subjectId, isActive);
            fetchContentData(); // Refresh data
        } catch (error) {
            console.error('Error toggling subject:', error);
        }
    };

    const handleToggleLearningPack = async (packId, isActive) => {
        try {
            await contentManagementService.toggleLearningPackStatus(packId, isActive);
            fetchContentData();
        } catch (error) {
            console.error('Error toggling learning pack:', error);
        }
    };

    const handleToggleLearningPackPremium = async (packId, isPremium) => {
        try {
            await contentManagementService.toggleLearningPackPremium(packId, isPremium);
            fetchContentData();
        } catch (error) {
            console.error('Error toggling learning pack premium:', error);
        }
    };

    const handleToggleQuestion = async (questionId, isActive) => {
        try {
            await contentManagementService.toggleQuestionStatus(questionId, isActive);
            fetchContentData();
        } catch (error) {
            console.error('Error toggling question:', error);
        }
    };

    // Bulk operations
    const handleBulkToggleQuestions = async (questionIds, isActive) => {
        try {
            await contentManagementService.bulkToggleQuestions(questionIds, isActive);
            fetchContentData();
        } catch (error) {
            console.error('Error bulk toggling questions:', error);
        }
    };

    const handleBulkToggleLearningPacks = async (packIds, isActive) => {
        try {
            await contentManagementService.bulkToggleLearningPacks(packIds, isActive);
            fetchContentData();
        } catch (error) {
            console.error('Error bulk toggling learning packs:', error);
        }
    };

    const handleBulkToggleLearningPacksPremium = async (packIds, isPremium) => {
        try {
            await contentManagementService.bulkToggleLearningPacksPremium(packIds, isPremium);
            fetchContentData();
        } catch (error) {
            console.error('Error bulk toggling learning packs premium:', error);
        }
    };

    // Stats cards data
    const statsCards = [
        {
            label: 'Total Subjects',
            value: stats.totalSubjects,
            icon: Book,
            color: 'text-blue-500',
            subtext: `${stats.activeSubjects} active`
        },
        {
            label: 'Learning Packs',
            value: stats.totalPacks,
            icon: Package,
            color: 'text-green-500',
            subtext: `${stats.activePacks} active, ${stats.premiumPacks} premium`
        },
        {
            label: 'Questions',
            value: stats.totalQuestions,
            icon: HelpCircle,
            color: 'text-purple-500',
            subtext: `${stats.activeQuestions} active`
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-purple"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                        Content Management
                    </h2>
                    <p className="text-gray-600">Manage subjects, learning packs, and questions</p>
                </div>
                <Button
                    onClick={fetchContentData}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <GlassCard key={index} hover>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                                </div>
                                <div className={`p-3 rounded-full bg-gradient-glass ${stat.color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Tabs Navigation */}
            <GlassCard>
                <div className="flex space-x-1 border-b border-gray-200">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: Book },
                        { id: 'learning-packs', label: 'Learning Packs', icon: Package },
                        { id: 'questions', label: 'Questions', icon: HelpCircle }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'text-royal-purple border-b-2 border-royal-purple'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                    {activeTab === 'subjects' && (
                        <SubjectsTable
                            subjects={subjects}
                            onToggleStatus={handleToggleSubject}
                        />
                    )}

                    {activeTab === 'learning-packs' && (
                        <LearningPacksTable
                            learningPacks={learningPacks}
                            onToggleStatus={handleToggleLearningPack}
                            onTogglePremium={handleToggleLearningPackPremium}
                            onBulkToggleStatus={handleBulkToggleLearningPacks}
                            onBulkTogglePremium={handleBulkToggleLearningPacksPremium}
                        />
                    )}

                    {activeTab === 'questions' && (
                        <QuestionsTable
                            questions={questions}
                            onToggleStatus={handleToggleQuestion}
                            onBulkToggleStatus={handleBulkToggleQuestions}
                        />
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default ContentManagement;