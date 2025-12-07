import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

/**
 * Displays answers with filter pills (All/Correct/Mistakes)
 * 
 * @param {Array} answers - Array of answer objects
 * @param {Function} onClose - Function to close the modal
 */
const AnswerSummary = ({ answers = [], onClose }) => {
  const [filter, setFilter] = useState('mistakes'); // Default to mistakes

  // If no answers provided, don't render anything
  if (!answers || answers.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No answers to review</p>
      </div>
    );
  }

  // Separate correct and incorrect answers
  const correctAnswers = answers.filter(a => a.isCorrect);
  const incorrectAnswers = answers.filter(a => !a.isCorrect);

  // Get filtered answers based on selection
  const getFilteredAnswers = () => {
    if (filter === 'correct') return correctAnswers;
    if (filter === 'mistakes') return incorrectAnswers;
    return answers; // 'all'
  };

  const filteredAnswers = getFilteredAnswers();

  const renderAnswerDetail = (answer, index) => {
    const { question, userAnswer, correctAnswer, isCorrect, type } = answer;

    return (
      <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Question {answers.indexOf(answer) + 1}
            </span>
            {isCorrect ? (
              <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Correct
              </span>
            ) : (
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Wrong
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900">{question}</p>
        </div>

        {type === 'Multiple Choice' || type === 'True/False' ? (
          <div className="space-y-2">
            {!isCorrect && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Your Answer:
                </div>
                <div className="text-sm">
                  <span className="font-medium line-through text-red-600">{userAnswer}</span>
                </div>
              </div>
            )}
            
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                isCorrect ? 'text-gray-500' : 'text-green-600'
              }`}>
                {isCorrect ? 'Your Answer:' : 'Correct Answer:'}
              </div>
              <div className="text-sm">
                <span className="font-medium text-green-600">
                  {correctAnswer}
                </span>
              </div>
            </div>
          </div>
        ) : type === 'Fill in the blanks' ? (
          <div className="space-y-2">
            {!isCorrect && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Your Answer:
                </div>
                <div className="text-sm">
                  <span className="font-medium line-through text-red-600">{userAnswer}</span>
                </div>
              </div>
            )}
            
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                isCorrect ? 'text-gray-500' : 'text-green-600'
              }`}>
                {isCorrect ? 'Your Answer:' : 'Correct Answer:'}
              </div>
              <div className="text-sm">
                {(() => {
                  // Parse answer if it's JSON format with alternatives
                  try {
                    const parsed = JSON.parse(correctAnswer);
                    if (parsed.primary !== undefined && parsed.alternatives !== undefined) {
                      return (
                        <div className="space-y-1">
                          <span className="font-medium text-green-600">
                            {parsed.primary}
                          </span>
                          {parsed.alternatives.length > 0 && (
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">Also accepts: </span>
                              {parsed.alternatives.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    }
                  } catch (e) {
                    // Not JSON, display as-is
                  }
                  return (
                    <span className="font-medium text-green-600">
                      {correctAnswer}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : type === 'Matching' ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
              Correct Matches:
            </div>
            {correctAnswer && Array.isArray(correctAnswer) && correctAnswer.map((pair, i) => (
              <div key={i} className="text-sm flex items-center gap-2">
                <span className="font-medium text-gray-900">{pair.left}</span>
                <span className="text-green-600 font-bold">→</span>
                <span className="font-medium text-green-600">{pair.right}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Filter Pills */}
      <div className="flex gap-2 mb-6 flex-shrink-0">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            filter === 'all'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Answers ({answers.length})
        </button>
        
        <button
          onClick={() => setFilter('correct')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            filter === 'correct'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Check className="w-4 h-4 inline mr-1" />
          Correct ({correctAnswers.length})
        </button>
        
        <button
          onClick={() => setFilter('mistakes')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            filter === 'mistakes'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <X className="w-4 h-4 inline mr-1" />
          Mistakes ({incorrectAnswers.length})
        </button>
      </div>

      {/* Filtered Answers List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAnswers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {filter === 'correct' && 'No correct answers yet. Keep trying! 💪'}
              {filter === 'mistakes' && 'Perfect! No mistakes! 🎉'}
              {filter === 'all' && 'No answers to show'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredAnswers.map((answer, index) => renderAnswerDetail(answer, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerSummary;