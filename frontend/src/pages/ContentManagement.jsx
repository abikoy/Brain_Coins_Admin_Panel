import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import { Book, Package, HelpCircle, RefreshCw, ToggleLeft, ToggleRight, Crown, Filter, Edit3 } from 'lucide-react';
import contentManagementService, { updateQuestion, deleteQuestion, updateLearningPack, deleteLearningPack } from '../api/contentManagementService';
import SubjectsTable from '../components/contentmanagement/SubjectsTable';
import LearningPacksTable from '../components/contentmanagement/LearningPacksTable';
import QuestionsTable from '../components/contentmanagement/QuestionsTable';
import ContentFilterBar from '../components/contentmanagement/ContentFilterBar';
import Pagination from '../components/ui/Pagination';
import QuestionEditModal from '../components/contentmanagement/QuestionEditModal';
import LearningPackEditModal from '../components/contentmanagement/LearningPackEditModal';
import SubjectEditModal from '../components/contentmanagement/SubjectEditModal';

const ContentManagement = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState('subjects');
    const [subjects, setSubjects] = useState([]);
    const [learningPacks, setLearningPacks] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null);

    // Filter state
    const [filters, setFilters] = useState({});
    const [filteredData, setFilteredData] = useState({
        subjects: [],
        learningPacks: [],
        questions: []
    });

    // Pagination state
    const [pagination, setPagination] = useState({
        subjects: { currentPage: 1, totalPages: 1, totalItems: 0 },
        learningPacks: { currentPage: 1, totalPages: 1, totalItems: 0 },
        questions: { currentPage: 1, totalPages: 1, totalItems: 0 }
    });

    // Question edit modal state
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Subject edit modal state
    const [editingSubject, setEditingSubject] = useState(null);
    const [isSubjectEditModalOpen, setIsSubjectEditModalOpen] = useState(false);

    // Learning pack edit modal state
    const [editingLearningPack, setEditingLearningPack] = useState(null);
    const [isPackEditModalOpen, setIsPackEditModalOpen] = useState(false);

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
    const fetchContentData = async (currentFilters = {}, paginationOptions = {}) => {
        try {
            setRefreshing(true);

            // Build filters based on current selections
            const filters = {};

            // Only add language filter if a specific language is selected
            if (currentFilters.language && currentFilters.language !== 'All Languages') {
                const apiLanguage = currentFilters.language === 'English' ? 'en' :
                    currentFilters.language === 'Sinhala' ? 'si' :
                        currentFilters.language === 'Tamil' ? 'ta' :
                            currentFilters.language;
                filters.language = apiLanguage;
            }

            // Add other filters if they exist
            if (currentFilters.subject_id && currentFilters.subject_id !== 'All Subjects') {
                filters.subject_id = currentFilters.subject_id;
            }

            // Add grade filter if specified
            if (currentFilters.grade && currentFilters.grade !== 'All Grades') {
                filters.grade = currentFilters.grade;
            }

            // For questions, also include pack_id if selected
            const questionFilters = { ...filters };
            if (currentFilters.pack_id && currentFilters.pack_id !== 'All Learning Packs') {
                questionFilters.pack_id = currentFilters.pack_id;
            }

            // Subjects table always shows ALL subjects without filtering
            const subjectsFilters = {
                page: paginationOptions.subjectsPage || pagination.subjects.currentPage,
                limit: 14 // 14 items per page
            };

            const packsFilters = {
                ...filters,
                page: paginationOptions.learningPacksPage || pagination.learningPacks.currentPage,
                limit: 10 // 10 items per page
            };

            const questionsFilters = {
                ...questionFilters,
                page: paginationOptions.questionsPage || pagination.questions.currentPage,
                limit: 100 // 100 items per page
            };




            // Fetch all data in parallel
            const [subjectsResult, packsResult, questionsResult] = await Promise.all([
                contentManagementService.getSubjects(subjectsFilters), // Now with pagination
                contentManagementService.getLearningPacks(packsFilters),
                contentManagementService.getQuestions(questionsFilters)
            ]);

            // Debug logging to check what backend returns
            console.log('Questions Result Debug:', {
                total: questionsResult.total,
                overallStats: questionsResult.overallStats,
                questionsLength: questionsResult.questions?.length
            });

            setSubjects(subjectsResult.subjects || []);
            setLearningPacks(packsResult.learningPacks || []);
            setQuestions(questionsResult.questions || []);

            // Backend now handles language filtering, so use results directly
            const filteredSubjects = subjectsResult.subjects || [];
            const filteredPacks = packsResult.learningPacks || [];
            const filteredQuestions = questionsResult.questions || [];

            setFilteredData({
                subjects: filteredSubjects,
                learningPacks: filteredPacks,
                questions: filteredQuestions
            });

            // Update pagination state
            setPagination({
                subjects: {
                    currentPage: subjectsResult.page || 1,
                    totalPages: subjectsResult.totalPages || 1,
                    totalItems: subjectsResult.total || 0
                },
                learningPacks: {
                    currentPage: packsResult.page || 1,
                    totalPages: packsResult.totalPages || 1,
                    totalItems: packsResult.total || 0
                },
                questions: {
                    currentPage: questionsResult.page || 1,
                    totalPages: questionsResult.totalPages || 1,
                    totalItems: questionsResult.total || 0
                }
            });

            // Use overall statistics from backend instead of calculating from current page data

            const subjectsStats = subjectsResult.overallStats || {
                total: subjectsResult.total || 0,
                active: filteredSubjects?.filter(s => s.is_active)?.length || 0,
                inactive: 0
            };

            const packsStats = packsResult.overallStats || {
                total: packsResult.total || 0,
                active: filteredPacks?.filter(p => p.is_active)?.length || 0,
                inactive: 0,
                premium: filteredPacks?.filter(p => p.is_premium)?.length || 0
            };

            const questionsStats = {
                total: questionsResult.overallStats?.total || questionsResult.total || 0,
                active: questionsResult.overallStats?.active || filteredQuestions?.filter(q => q.is_active)?.length || 0,
                inactive: questionsResult.overallStats?.inactive || 0
            };

            setStats({
                totalSubjects: subjectsStats.total,
                activeSubjects: subjectsStats.active,
                inactiveSubjects: subjectsStats.inactive,
                totalPacks: packsStats.total,
                activePacks: packsStats.active,
                inactivePacks: packsStats.inactive,
                premiumPacks: packsStats.premium,
                totalQuestions: questionsStats.total,
                activeQuestions: questionsStats.active,
                inactiveQuestions: questionsStats.inactive
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

    // Refetch data when filters change
    useEffect(() => {
        if (Object.keys(filters).length > 0) {
            fetchContentData(filters);
        }
    }, [filters]);

    // Pagination handlers
    const handleSubjectsPageChange = (page) => {
        fetchContentData(filters, { subjectsPage: page });
    };

    const handleLearningPacksPageChange = (page) => {
        fetchContentData(filters, { learningPacksPage: page });
    };

    const handleQuestionsPageChange = (page) => {
        fetchContentData(filters, { questionsPage: page });
    };

    // Toast helper functions
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

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

    // Question editing handlers
    const handleEditQuestion = (question) => {
        setEditingQuestion(question);
        setIsEditModalOpen(true);
    };

    // Subject editing handlers
    const handleEditSubject = (subject) => {
        setEditingSubject(subject);
        setIsSubjectEditModalOpen(true);
    };

    const handleSaveSubject = async (subjectId, subjectData) => {
        try {
            await contentManagementService.updateSubject(subjectId, subjectData);
            fetchContentData(filters);
            showToast('Subject updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating subject:', error);
            showToast('Failed to update subject. Please try again.', 'error');
            throw error;
        }
    };

    const handleSaveQuestion = async (questionId, questionData) => {
        try {
            await updateQuestion(questionId, questionData);
            fetchContentData(filters);
            showToast('Question updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating question:', error);
            showToast('Failed to update question. Please try again.', 'error');
            throw error;
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
            try {
                await deleteQuestion(questionId);
                fetchContentData(filters);
                showToast('Question deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting question:', error);
                showToast('Failed to delete question. Please try again.', 'error');
            }
        }
    };


    // Learning pack editing handlers
    const handleEditLearningPack = (learningPack) => {
        setEditingLearningPack(learningPack);
        setIsPackEditModalOpen(true);
    };

    const handleSaveLearningPack = async (packId, packData) => {
        try {
            await updateLearningPack(packId, packData);
            fetchContentData(filters); // Refresh data with current filters
            showToast('Learning pack updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating learning pack:', error);
            showToast('Failed to update learning pack. Please try again.', 'error');
            throw error; // Re-throw to let modal handle the error
        }
    };

    const handleDeleteLearningPack = async (packId) => {
        if (window.confirm('Are you sure you want to delete this learning pack? This will also delete all associated questions. This action cannot be undone.')) {
            try {
                await deleteLearningPack(packId);
                fetchContentData(filters); // Refresh data with current filters
                showToast('Learning pack deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting learning pack:', error);
                showToast('Failed to delete learning pack. Please try again.', 'error');
            }
        }
    };

    // Stats cards data
    const statsCards = [
        {
            label: 'Total Subjects',
            value: stats.totalSubjects,
            icon: Book,
            color: 'text-blue-500',
            subtext: `${stats.activeSubjects} active, ${stats.inactiveSubjects || 0} inactive`
        },
        {
            label: 'Learning Packs',
            value: stats.totalPacks,
            icon: Package,
            color: 'text-green-500',
            subtext: `${stats.activePacks} active, ${stats.inactivePacks || 0} inactive, ${stats.premiumPacks} premium`
        },
        {
            label: 'Questions',
            value: stats.totalQuestions,
            icon: HelpCircle,
            color: 'text-purple-500',
            subtext: `${stats.activeQuestions} active, ${stats.inactiveQuestions || 0} inactive`
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
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => onNavigate && onNavigate('questioneditor')}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Edit3 className="h-4 w-4" />
                        Enhanced Editor
                    </Button>
                    <Button
                        onClick={fetchContentData}
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>
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

            {/* Hierarchical Filter Bar */}
            <ContentFilterBar
                filters={filters}
                onFiltersChange={setFilters}
            />

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
                        <>
                            <SubjectsTable
                                subjects={filteredData.subjects}
                                onToggleStatus={handleToggleSubject}
                                onEditSubject={handleEditSubject}
                                currentLanguageFilter={filters.language}
                            />
                            <Pagination
                                currentPage={pagination.subjects.currentPage}
                                totalPages={pagination.subjects.totalPages}
                                totalItems={pagination.subjects.totalItems}
                                itemsPerPage={10}
                                onPageChange={handleSubjectsPageChange}
                            />
                        </>
                    )}

                    {activeTab === 'learning-packs' && (
                        <>
                            <LearningPacksTable
                                learningPacks={filteredData.learningPacks}
                                onToggleStatus={handleToggleLearningPack}
                                onTogglePremium={handleToggleLearningPackPremium}
                                onBulkToggleStatus={handleBulkToggleLearningPacks}
                                onBulkTogglePremium={handleBulkToggleLearningPacksPremium}
                                onEditPack={handleEditLearningPack}
                                onDeletePack={handleDeleteLearningPack}
                            />
                            <Pagination
                                currentPage={pagination.learningPacks.currentPage}
                                totalPages={pagination.learningPacks.totalPages}
                                totalItems={pagination.learningPacks.totalItems}
                                itemsPerPage={10}
                                onPageChange={handleLearningPacksPageChange}
                            />
                        </>
                    )}

                    {activeTab === 'questions' && (
                        <>
                            <QuestionsTable
                                questions={filteredData.questions}
                                onToggleStatus={handleToggleQuestion}
                                onBulkToggleStatus={handleBulkToggleQuestions}
                                onEditQuestion={handleEditQuestion}
                                onDeleteQuestion={handleDeleteQuestion}
                            />
                            <Pagination
                                currentPage={pagination.questions.currentPage}
                                totalPages={pagination.questions.totalPages}
                                totalItems={pagination.questions.totalItems}
                                itemsPerPage={100}
                                onPageChange={handleQuestionsPageChange}
                            />
                        </>
                    )}
                </div>
            </GlassCard>

            {/* Question Edit Modal */}
            <QuestionEditModal
                question={editingQuestion}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveQuestion}
            />

            {/* Learning Pack Edit Modal */}
            <LearningPackEditModal
                learningPack={editingLearningPack}
                isOpen={isPackEditModalOpen}
                onClose={() => setIsPackEditModalOpen(false)}
                onSave={handleSaveLearningPack}
            />

            {/* Subject Edit Modal */}
            <SubjectEditModal
                subject={editingSubject}
                isOpen={isSubjectEditModalOpen}
                onClose={() => setIsSubjectEditModalOpen(false)}
                onSave={handleSaveSubject}
            />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </div>
    );
};

export default ContentManagement;