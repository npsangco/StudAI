import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Trophy, X, Target, BookOpen, CheckSquare, FileText } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from './api';

const DailyQuests = forwardRef(({ isOpen, onClose }, ref) => {
  const [dailyStats, setDailyStats] = useState({
    notes_created_today: 0,
    quizzes_completed_today: 0,
    planner_updates_today: 0,
    points_earned_today: 0,
    exp_earned_today: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDailyStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/user/daily-stats`, { 
        withCredentials: true 
      });
      setDailyStats(response.data);
    } catch (error) {
      console.error('Failed to fetch daily stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: fetchDailyStats,
    isAllComplete: () => {
      return dailyStats.notes_created_today >= 3 && 
             dailyStats.quizzes_completed_today >= 3 && 
             dailyStats.planner_updates_today >= 3;
    }
  }));

  useEffect(() => {
    if (isOpen) {
      fetchDailyStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quests = [
    {
      id: 'notes',
      title: 'Create Notes',
      description: 'Create 3 notes today',
      icon: FileText,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      current: dailyStats.notes_created_today,
      target: 3,
      points: 50, // 50 points per note
      exp: 15 // 15 EXP per note
    },
    {
      id: 'quizzes',
      title: 'Complete Quizzes',
      description: 'Complete 3 quizzes today',
      icon: BookOpen,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      current: dailyStats.quizzes_completed_today,
      target: 3,
      points: 50, // 10-50 points per quiz (avg ~40)
      exp: 30 // 0-30 EXP per quiz (avg ~20)
    },
    {
      id: 'tasks',
      title: 'Manage Tasks',
      description: 'Create or complete 3 tasks today',
      icon: CheckSquare,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      current: dailyStats.planner_updates_today,
      target: 3,
      points: 30, // 10-30 points (10 for create, 30 for complete)
      exp: 15 // 10-15 EXP (10 for create, 15 for complete)
    }
  ];

  const calculateProgress = (current, target) => {
    const progress = Math.min((current / target) * 100, 100);
    return progress;
  };

  const isQuestComplete = (current, target) => current >= target;

  const totalQuestsComplete = quests.filter(q => isQuestComplete(q.current, q.target)).length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r bg-black p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Daily Quests</h2>
                <p className="text-white/90 text-sm">
                  Complete {totalQuestsComplete}/3 quests
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Today's Progress Summary */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Today's Rewards</h3>
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700">
                  {dailyStats.points_earned_today}
                </div>
                <div className="text-xs text-gray-600">Points Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {dailyStats.exp_earned_today}
                </div>
                <div className="text-xs text-gray-600">EXP Earned</div>
              </div>
            </div>
          </div>

          {/* Quest List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading quests...</p>
              </div>
            ) : (
              quests.map((quest) => {
                const Icon = quest.icon;
                const progress = calculateProgress(quest.current, quest.target);
                const isComplete = isQuestComplete(quest.current, quest.target);

                return (
                  <div
                    key={quest.id}
                    className={`${quest.bgColor} border ${quest.borderColor} rounded-xl p-4 transition-all duration-300 ${
                      isComplete ? 'ring-2 ring-green-400' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${quest.bgColor} border ${quest.borderColor}`}>
                        <Icon className={`w-5 h-5 ${quest.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {quest.title}
                          </h4>
                          {isComplete && (
                            <span className="text-green-600 text-xl flex-shrink-0">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {quest.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-semibold text-yellow-700">
                            +{quest.points} pts
                          </span>
                          <span className="font-semibold text-blue-700">
                            +{quest.exp} exp
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-gray-800">
                          {Math.min(quest.current, quest.target)}/{quest.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete
                              ? 'bg-gradient-to-r from-green-400 to-green-600'
                              : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Completion Message */}
          {totalQuestsComplete === 3 && (
            <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-green-800 mb-1">
                All Quests Complete!
              </h3>
              <p className="text-sm text-green-700">
                Come back tomorrow for new challenges!
              </p>
            </div>
          )}

          {/* Info Note */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 text-center">
              Quests reset daily at midnight. Keep building your streak! 🔥
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DailyQuests;
