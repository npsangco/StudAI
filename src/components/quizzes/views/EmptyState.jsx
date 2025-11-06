import React from 'react';
import { Plus, Sparkles, BookOpen, Users } from 'lucide-react';

const EmptyQuizState = ({ onCreateQuiz }) => {
  return (
    <div className="text-center py-6 sm:py-8 md:py-12 px-4 sm:px-6 flex flex-col items-center justify-center min-h-full w-full">
      {/* Animated Icon */}
      <div className="relative mb-4 sm:mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-yellow-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white animate-pulse" />
        </div>
      </div>

      {/* Main Message */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
        No Quizzes Yet!
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-1.5 max-w-md px-2">
        Start your learning journey by creating your first quiz.
      </p>
      <p className="text-xs sm:text-sm text-gray-500 mb-5 sm:mb-7 max-w-md px-2 leading-relaxed">
        Create engaging quizzes with multiple question types, share them with friends, or challenge yourself!
      </p>

      {/* Create Quiz Button */}
      <button 
        onClick={onCreateQuiz}
        className="group bg-yellow-500 text-white py-2.5 sm:py-3 px-5 sm:px-7 rounded-lg font-semibold text-sm sm:text-base hover:bg-yellow-600 transition-all transform hover:scale-105 flex items-center gap-2 shadow-md hover:shadow-lg"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
        Create Your First Quiz
      </button>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 mt-6 sm:mt-10 w-full max-w-xl px-2">
        <div className="text-center p-2.5 sm:p-3 bg-white bg-opacity-50 rounded-lg">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Multiple Types</h4>
          <p className="text-xs text-gray-500 leading-tight">Multiple choice, fill-in-blanks, true/false, and matching</p>
        </div>
        
        <div className="text-center p-2.5 sm:p-3 bg-white bg-opacity-50 rounded-lg">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Battle Mode</h4>
          <p className="text-xs text-gray-500 leading-tight">Challenge friends in real-time quiz battles</p>
        </div>
        
        <div className="text-center p-2.5 sm:p-3 bg-white bg-opacity-50 rounded-lg sm:col-span-1 col-span-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-800 text-xs mb-0.5">Earn Rewards</h4>
          <p className="text-xs text-gray-500 leading-tight">Gain points and EXP with every quiz</p>
        </div>
      </div>
    </div>
  );
};

export default EmptyQuizState;