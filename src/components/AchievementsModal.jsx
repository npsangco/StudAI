import { useState, useEffect } from 'react';
import { X, Trophy, Lock, Star, CheckCircle } from 'lucide-react';
import { achievementsApi } from '../api/api'; // Update this import

export default function AchievementsModal({ isOpen, onClose }) {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalUnlocked, setTotalUnlocked] = useState(0);
    const [equippedAchievement, setEquippedAchievement] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchAchievements();
        }
    }, [isOpen]);

    const fetchAchievements = async () => {
        try {
            setLoading(true);
            const response = await achievementsApi.getAll(); // Use the new API
            
            if (response.data.success) {
                setAchievements(response.data.achievements);
                setTotalUnlocked(response.data.totalUnlocked);
                
                // Check for equipped achievement
                const equipped = response.data.achievements.find(a => a.is_equipped);
                setEquippedAchievement(equipped);
            }
        } catch (error) {
            console.error('Failed to fetch achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRequirementText = (achievement) => {
        const { requirement_type, requirement_value } = achievement;
        
        const requirements = {
            points: `Earn ${requirement_value} points`,
            streak: `Maintain a ${requirement_value}-day study streak`,
            notes_created: `Create ${requirement_value} notes`,
            quizzes_completed: `Complete ${requirement_value} quizzes`,
            battles_won: `Win ${requirement_value} quiz battles`,
            files_uploaded: `Upload ${requirement_value} files`,
            sessions_hosted: `Host ${requirement_value} study sessions`,
            pet_adopted: `Adopt a pet companion`,
            pet_level: `Reach pet level ${requirement_value}`,
            pet_actions: `Perform ${requirement_value} pet care actions`,
            shop_purchases: `Make ${requirement_value} shop purchases`,
            perfect_health_days: `Maintain perfect pet health for ${requirement_value} days`
        };

        return requirements[requirement_type] || 'Complete requirement';
    };

    const handleEquipAchievement = async (achievementId) => {
        try {
            console.log('Attempting to equip achievement:', achievementId);
            console.log('Available achievements:', achievements);
            
            // Verify the achievement exists and is unlocked
            const achievementToEquip = achievements.find(a => a.achievement_id === achievementId);
            console.log('Achievement to equip:', achievementToEquip);
            
            if (!achievementToEquip) {
                console.error('Achievement not found in local state');
                return;
            }
            
            if (!achievementToEquip.is_unlocked) {
                console.error('Achievement is not unlocked');
                return;
            }

            const response = await achievementsApi.equip(achievementId);
            console.log('Equip response:', response.data);

            if (response.data.success) {
                // Refresh achievements to get updated equipped status from backend
                await fetchAchievements();
                
                // Also update the equipped achievement from the refreshed data
                const updatedAchievements = response.data.achievements || achievements;
                const newlyEquipped = updatedAchievements.find(a => a.is_equipped);
                setEquippedAchievement(newlyEquipped);
            }
        } catch (error) {
            console.error('Failed to equip achievement:', error);
            console.error('Error response data:', error.response?.data);
            // You might want to add user-facing error handling here
        }
    };

    const getAchievementStatus = (achievement) => {
        if (achievement.is_equipped) return 'equipped';
        if (achievement.is_unlocked) return 'unlocked';
        return 'locked';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'equipped': return 'bg-green-100 border-green-300';
            case 'unlocked': return 'bg-white border-gray-200';
            case 'locked': return 'bg-gray-50 border-gray-200 opacity-75';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'equipped': return 'Equipped';
            case 'unlocked': return 'Unlocked';
            case 'locked': return 'Locked';
            default: return '';
        }
    };

    const getStatusIcon = (achievement, status) => {
        switch (status) {
            case 'equipped':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'unlocked':
                return <Trophy className="w-6 h-6" style={{ color: achievement.color }} />;
            case 'locked':
                return <Lock className="w-6 h-6 text-gray-400" />;
            default:
                return <Lock className="w-6 h-6 text-gray-400" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Achievements</h2>
                            <p className="text-gray-600">
                                {totalUnlocked} of {achievements.length} unlocked
                                {equippedAchievement && ` • 1 equipped`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            className="bg-green-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${(totalUnlocked / achievements.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Achievements Grid */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {achievements.map((achievement) => {
                                const status = getAchievementStatus(achievement);
                                const statusColor = getStatusColor(status);
                                
                                return (
                                    <div
                                        key={achievement.achievement_id}
                                        className={`border rounded-xl p-4 transition-all duration-300 ${statusColor} ${
                                            status === 'locked' ? 'grayscale' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Achievement Icon */}
                                            <div
                                                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                                    status === 'locked' ? 'bg-gray-200' : 'bg-opacity-20'
                                                }`}
                                                style={{ 
                                                    backgroundColor: status === 'locked' 
                                                        ? '#E5E7EB' 
                                                        : achievement.color
                                                }}
                                            >
                                                {getStatusIcon(achievement, status)}
                                            </div>

                                            {/* Achievement Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 
                                                            className="font-semibold text-lg"
                                                            style={status === 'locked' ? {} : { color: achievement.color }}
                                                        >
                                                            {achievement.title}
                                                        </h3>
                                                        {achievement.points_reward > 0 && (
                                                            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                                                                <Star className="w-3 h-3" />
                                                                <span>+{achievement.points_reward}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        status === 'equipped' 
                                                            ? 'bg-green-100 text-green-800'
                                                            : status === 'unlocked'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {getStatusText(status)}
                                                    </span>
                                                </div>
                                                
                                                <p className={`text-sm mb-2 ${
                                                    status === 'locked' 
                                                        ? 'text-gray-500' 
                                                        : 'text-gray-700'
                                                }`}>
                                                    {achievement.description}
                                                </p>

                                                {/* Progress Bar (only for locked achievements with progress) */}
                                                {status === 'locked' && achievement.progress > 0 && (
                                                    <div className="mb-2">
                                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                            <span>Progress</span>
                                                            <span>{achievement.current_value} / {achievement.requirement_value}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="h-2 rounded-full transition-all duration-500"
                                                                style={{ 
                                                                    width: `${achievement.progress}%`,
                                                                    backgroundColor: achievement.color
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Requirement Text */}
                                                <p className="text-xs text-gray-500 mb-2">
                                                    {getRequirementText(achievement)}
                                                </p>

                                                {/* Unlocked Date */}
                                                {status !== 'locked' && achievement.unlocked_at && (
                                                    <p className="text-xs text-green-600 mb-2">
                                                        Unlocked on {new Date(achievement.unlocked_at).toLocaleDateString()}
                                                    </p>
                                                )}

                                                {/* Action Button */}
                                                {status === 'unlocked' && (
                                                    <button
                                                        onClick={() => handleEquipAchievement(achievement.achievement_id)}
                                                        className="w-full mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                                                    >
                                                        Equip Achievement
                                                    </button>
                                                )}
                                                {status === 'equipped' && (
                                                    <button
                                                        disabled
                                                        className="w-full mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded-lg cursor-default"
                                                    >
                                                        Currently Equipped
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Complete tasks and reach milestones to unlock more achievements!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}