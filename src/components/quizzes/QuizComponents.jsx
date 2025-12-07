import React from 'react';
import { Trash2, Copy, Star } from 'lucide-react';
import {
  MultipleChoiceQuestion,
  FillInBlanksQuestion,
  TrueFalseQuestion,
  MatchingQuestion
} from './QuestionTypes';
import { TEXT_LIMITS } from './utils/constants';

// Individual Question Card Component
export const QuestionCard = ({
  question,
  index,
  onUpdateQuestion,
  onUpdateChoice,
  onAddChoice,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAddMatchingPair,
  onUpdateMatchingPair,
  onRemoveMatchingPair,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  // Get difficulty info for colored badge
  const getDifficultyInfo = () => {
    switch (question.difficulty) {
      case 'easy':
        return { label: 'EASY', points: 1, starCount: 1, bgColor: 'bg-green-100', textColor: 'text-green-700' };
      case 'hard':
        return { label: 'HARD', points: 10, starCount: 3, bgColor: 'bg-red-100', textColor: 'text-red-700' };
      default: // medium
        return { label: 'MEDIUM', points: 5, starCount: 2, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' };
    }
  };

  const difficultyInfo = getDifficultyInfo();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-md hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        {/* Left side: Drag + Number + Type */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag Handle - Works on both desktop and mobile */}
          <div
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            data-drag-handle="true"
            className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-300 transition-colors flex-shrink-0 touch-none"
            title="Drag to reorder question"
          >
            <span className="text-sm font-bold text-gray-600" style={{ pointerEvents: 'none' }}>⋮⋮</span>
          </div>

          {/* Question Number */}
          <span className="text-lg font-bold text-gray-900">Q{index + 1}.</span>

          {/* Type Selector */}
          <select
            value={question.type}
            onChange={(e) => onUpdateQuestion(question.id, 'type', e.target.value)}
            className="px-3 py-1.5 bg-gray-100 text-sm rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium hover:bg-gray-200 transition-colors"
          >
            <option>Multiple Choice</option>
            <option>Fill in the blanks</option>
            <option>True/False</option>
            <option>Matching</option>
          </select>

          {/* Difficulty Star Selector - Inline */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'easy')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'easy'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
              title="Easy - 1 point"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'easy' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'medium')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'medium'
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
              title="Medium - 5 points"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'medium' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'medium' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'hard')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'hard'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
              }`}
              title="Hard - 10 points"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
          </div>
        </div>

        {/* Right side: Difficulty (mobile) + Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Difficulty Star Selector - Mobile */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'easy')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'easy'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
              title="Easy - 1 point"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'easy' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'medium')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'medium'
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
              title="Medium - 5 points"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'medium' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'medium' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateQuestion(question.id, 'difficulty', 'hard')}
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-0.5 ${
                question.difficulty === 'hard'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
              }`}
              title="Hard - 10 points"
            >
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
              <Star className={`w-3.5 h-3.5 ${question.difficulty === 'hard' ? 'fill-white' : 'fill-yellow-500 text-yellow-500'}`} style={{ pointerEvents: 'none' }} />
            </button>
          </div>

          <button
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDuplicateQuestion && onDuplicateQuestion(question.id)}
            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
            title="Duplicate question"
          >
            <Copy className="w-4 h-4" style={{ pointerEvents: 'none' }} />
          </button>
          <button
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDeleteQuestion(question.id)}
            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
            title="Delete question"
          >
            <Trash2 className="w-4 h-4" style={{ pointerEvents: 'none' }} />
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <textarea
          value={question.question}
          onChange={(e) => onUpdateQuestion(question.id, 'question', e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-lg text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          placeholder="Enter your question here..."
        />
      </div>

      {/* Question Type Components */}
      {question.type === 'Multiple Choice' && question.choices && (
        <MultipleChoiceQuestion
          question={question}
          onUpdateQuestion={onUpdateQuestion}
          onUpdateChoice={onUpdateChoice}
          onAddChoice={onAddChoice}
        />
      )}

      {question.type === 'Fill in the blanks' && (
        <FillInBlanksQuestion
          question={question}
          onUpdateQuestion={onUpdateQuestion}
        />
      )}

      {question.type === 'True/False' && (
        <TrueFalseQuestion
          question={question}
          onUpdateQuestion={onUpdateQuestion}
        />
      )}

      {question.type === 'Matching' && (
        <MatchingQuestion
          question={question}
          onAddMatchingPair={onAddMatchingPair}
          onUpdateMatchingPair={onUpdateMatchingPair}
          onRemoveMatchingPair={onRemoveMatchingPair}
        />
      )}
    </div>
  );
};
