import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import AnswerSummary from './AnswerSummary';

/**
 * For reviewing quiz answers
 * Opens when user clicks "View Answer Summary" from results
 */
const AnswerReviewModal = ({ isOpen, onClose, answers = [], quizTitle = 'Quiz' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.9)] flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Results"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Review Answers</h2>
              <p className="text-sm text-gray-600">{quizTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnswerSummary answers={answers} />
        </div>

      </div>
    </div>
  );
};

export default AnswerReviewModal;