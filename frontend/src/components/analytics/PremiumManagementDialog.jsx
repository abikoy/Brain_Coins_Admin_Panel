import React, { useState, useEffect } from 'react';
import { X, Crown, Calendar, DollarSign, User, Phone } from 'lucide-react';
import Button from '../ui/Button';
import GlassCard from '../shared/GlassCard';
import analyticsService from '../../api/analyticsService';

const PremiumManagementDialog = ({ student, isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [studentDetails, setStudentDetails] = useState(null);
    const [formData, setFormData] = useState({
        plan_type: 'individual',
        interval: 'monthly',
        amount: 49900, // LKR 499 for monthly individual
        currency: 'LKR',
        product_id: 'premium_monthly_individual'
    });

    const planOptions = [
        {
            value: 'monthly_individual',
            label: 'Monthly (Individual) - LKR 499',
            data: { plan_type: 'individual', interval: 'monthly', amount: 49900, product_id: 'premium_monthly_individual' }
        },
        {
            value: 'yearly_individual',
            label: 'Yearly (Individual) - LKR 4,999',
            data: { plan_type: 'individual', interval: 'yearly', amount: 499900, product_id: 'premium_yearly_individual' }
        },
        {
            value: 'monthly_family',
            label: 'Monthly (Family) - LKR 799',
            data: { plan_type: 'family', interval: 'monthly', amount: 79900, product_id: 'premium_monthly_family' }
        },
        {
            value: 'yearly_family',
            label: 'Yearly (Family) - LKR 6,999',
            data: { plan_type: 'family', interval: 'yearly', amount: 699900, product_id: 'premium_yearly_family' }
        }
    ];
    const handlePlanChange = (selectedValue) => {
        const selectedPlan = planOptions.find(plan => plan.value === selectedValue);
        if (selectedPlan) {
            setFormData(selectedPlan.data);
        }
    };
    useEffect(() => {
        if (isOpen && student) {
            loadStudentDetails();
        }
    }, [isOpen, student]);

    const loadStudentDetails = async () => {
        try {
            const details = await analyticsService.getStudentDetails(student.id);
            setStudentDetails(details);
        } catch (error) {
            console.error('Error loading student details:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!student) return;

        try {
            setLoading(true);

            // Manually set premium status by updating the profile.
            // This avoids relying on auth.user records and keeps the admin flow simple.
            const premiumUntil = new Date();
            if (formData.interval === 'monthly') {
                premiumUntil.setMonth(premiumUntil.getMonth() + 1);
            } else if (formData.interval === 'yearly') {
                premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
            }

            const result = await analyticsService.updateStudentPremiumStatus(student.id, true, premiumUntil.toISOString());

            if (result.success) {
                onSuccess?.(result.data);
                onClose();
            }
        } catch (error) {
            console.error('Error updating premium status:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePremium = async () => {
        if (!student || !confirm('Are you sure you want to remove premium access from this student?')) {
            return;
        }

        try {
            setLoading(true);
            const result = await analyticsService.updateStudentPremiumStatus(student.id, false, null);

            if (result.success) {
                onSuccess?.(result.data);
                onClose();
            }
        } catch (error) {
            console.error('Error removing premium:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const calculateExpiry = () => {
        const expiry = new Date();
        if (formData.interval === 'monthly') {
            expiry.setMonth(expiry.getMonth() + 1);
        } else if (formData.interval === 'yearly') {
            expiry.setFullYear(expiry.getFullYear() + 1);
        }
        return expiry.toLocaleDateString();
    };

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full">
                            <Crown className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Premium Management</h3>
                            <p className="text-sm text-gray-600">Manage student premium access</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Student Info */}
                <div className="bg-gradient-glass rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
                            <User className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{student.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Grade: {student.grade || 'N/A'}</span>
                                {student.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {student.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${student.isPremium
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {student.isPremium ? 'Premium' : 'Free'}
                        </div>
                    </div>

                    {studentDetails?.premium_until && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white bg-opacity-50 rounded px-3 py-2">
                            <Calendar className="h-4 w-4" />
                            <span>Premium until: {new Date(studentDetails.premium_until).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                {/* Premium Form */}
                {!student.isPremium ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <select
                            value={planOptions.find(plan =>
                                plan.data.plan_type === formData.plan_type &&
                                plan.data.interval === formData.interval
                            )?.value || 'monthly_individual'}
                            onChange={(e) => handlePlanChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royal-purple focus:border-transparent"
                            required
                        >
                            {planOptions.map((plan) => (
                                <option key={plan.value} value={plan.value}>
                                    {plan.label}
                                </option>
                            ))}
                        </select>

                        {/* Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h5 className="font-medium text-blue-800 mb-2">Subscription Summary</h5>
                            <div className="text-sm text-blue-700 space-y-1">
                                <div className="flex justify-between">
                                    <span>Plan:</span>
                                    <span>{formData.plan_type} ({formData.interval})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount:</span>
                                    <span>${(formData.amount / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span>Expires:</span>
                                    <span>{calculateExpiry()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-gradient-primary"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Make Premium'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    // Remove Premium Section
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-amber-800 mb-2">
                                <Crown className="h-4 w-4" />
                                <span className="font-medium">Student is already premium</span>
                            </div>
                            <p className="text-sm text-amber-700">
                                You can remove premium access if the student requested it or their subscription ended.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRemovePremium}
                                variant="danger"
                                className="flex-1"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Remove Premium'}
                            </Button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default PremiumManagementDialog;