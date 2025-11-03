import React from 'react';
import { Plus, Sparkles, BookOpen, Users } from 'lucide-react';

const EmptyQuizState = ({ onCreateQuiz }) => {
  return (
    <div className="text-center py-12 px-6 flex flex-col items-center justify-center min-h-full">
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <BookOpen className="w-10 h-10 text-yellow-600" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
        </div>
      </div>

      {/* Main Message */}
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        No Quizzes Yet!
      </h2>
      <p className="text-gray-600 mb-1.5 max-w-md">
        Start your learning journey by creating your first quiz.
      </p>
      <p className="text-sm text-gray-500 mb-7 max-w-md">
        Create engaging quizzes with multiple question types, share them with friends, or challenge yourself!
      </p>

      {/* Create Quiz Button */}
      <button 
        onClick={onCreateQuiz}
        className="group bg-yellow-500 text-white py-3 px-7 rounded-lg font-semibold text-base hover:bg-yellow-600 transition-all transform hover:scale-105 flex items-center gap-2"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        Create Your First Quiz
      </button>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-10 w-full max-w-xl">
        <div className="text-center p-3">
          <div className="w-9 h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-4.5 h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Multiple Types</h4>
          <p className="text-xs text-gray-500 leading-tight">Multiple choice, fill-in-blanks, true/false, and matching</p>
        </div>
        
        <div className="text-center p-3">
          <div className="w-9 h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-4.5 h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Battle Mode</h4>
          <p className="text-xs text-gray-500 leading-tight">Challenge friends in real-time quiz battles</p>
        </div>
        
        <div className="text-center p-3">
          <div className="w-9 h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-4.5 h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Earn Rewards</h4>
          <p className="text-xs text-gray-500 leading-tight">Gain points and EXP with every quiz</p>
        </div>
      </div>
    </div>
  );
};

export default EmptyQuizState;