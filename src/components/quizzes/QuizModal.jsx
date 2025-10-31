import React from 'react';
import { X, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';

// ============================================
// QUIZ MODE SELECTION MODAL
// ============================================
export const QuizModal = ({ quiz, isOpen, onClose, onSoloQuiz, onQuizBattle }) => {
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

// ============================================
// DELETE CONFIRMATION MODAL
// ============================================
export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "quiz" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Delete {itemType}?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 leading-relaxed mb-4">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{itemName}"</span>?
          </p>
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                This action cannot be undone
              </p>
              <p className="text-xs text-red-700 mt-1">
                All questions and data associated with this {itemType} will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// ============================================
// VALIDATION ERROR MODAL - REDESIGNED ✨
// ============================================
export const ValidationErrorModal = ({ isOpen, onClose, errors }) => {
  if (!isOpen) return null;

  // Group errors by question number
  const groupedErrors = errors.reduce((acc, error) => {
    const qNum = error.questionNumber || 0;
    if (!acc[qNum]) {
      acc[qNum] = [];
    }
    acc[qNum].push(error);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-fade-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Cannot Save Quiz
              </h3>
              <p className="text-sm text-gray-600">
                {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Error List - REDESIGNED */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-600 mb-4 font-medium">
            Please fix the following issues:
          </p>
          
          <div className="space-y-3">
            {Object.keys(groupedErrors).sort((a, b) => a - b).map((questionNum) => {
              const questionErrors = groupedErrors[questionNum];
              
              return (
                <div key={questionNum}>
                  {/* Question Header - Only if questionNum > 0 */}
                  {questionNum > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Question {questionNum}
                      </span>
                      <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                  )}
                  
                  {/* Error Cards - Clean Design */}
                  <div className="space-y-2">
                    {questionErrors.map((error, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white border-l-4 border-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {error.message}
                            </p>
                            {error.details && (
                              <p className="text-xs text-gray-600">
                                {error.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Fix Errors
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};