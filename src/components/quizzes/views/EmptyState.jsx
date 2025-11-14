import React from 'react';
import { Plus, Sparkles, BookOpen, Users, Trophy } from 'lucide-react';

const EmptyQuizState = ({ onCreateQuiz }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col items-center justify-center">
        {/* Animated Icon with Gradient Background */}
        <div className="relative mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm animate-pulse">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Main Message */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Your Quiz Library Awaits
        </h2>
        <p className="text-[11px] text-gray-600 mb-3 max-w-sm text-center">
          Create your first quiz or import one from a friend to get started!
        </p>

        {/* CTA Button */}
        <button
          onClick={onCreateQuiz}
          className="group bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-5 rounded-lg font-semibold text-sm hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm hover:shadow-md mb-3"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Create Your First Quiz
        </button>

        {/* Feature Cards Grid - Compact */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md">
          {/* Feature 1 */}
          <div className="p-2 text-center">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[10px] mb-0.5">Multiple Types</h3>
            <p className="text-[8px] text-gray-600 leading-tight">
              4 question types
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-2 text-center">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Users className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[10px] mb-0.5">Battle Mode</h3>
            <p className="text-[8px] text-gray-600 leading-tight">
              Real-time PvP
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-2 text-center">
            <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[10px] mb-0.5">Earn Rewards</h3>
            <p className="text-[8px] text-gray-600 leading-tight">
              Points & EXP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyQuizState;