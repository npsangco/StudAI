import React from 'react';
import { X } from 'lucide-react';

const QuizModal = ({ quiz, isOpen, onClose, onSoloQuiz, onQuizBattle }) => {
  if (!isOpen || !quiz) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-2">QUIZ</h2>
          <p className="text-gray-600 mb-6">How would you want to take your quiz?</p>
          
          <div className="space-y-4">
            <button
              onClick={onSoloQuiz}
              className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <h3 className="font-semibold text-black mb-1">Solo Quiz</h3>
              <p className="text-sm text-gray-500">By yourself</p>
            </button>
            
            <button
              onClick={onQuizBattle}
              className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <h3 className="font-semibold text-black mb-1">Quiz Battle</h3>
              <p className="text-sm text-gray-500">With your friends</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;