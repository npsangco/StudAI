import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import {
  MultipleChoiceQuestion,
  FillInBlanksQuestion,
  TrueFalseQuestion,
  MatchingQuestion
} from './QuestionTypes';

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
  onRemoveMatchingPair
}) => (
  <div className="bg-white rounded-lg border-l-4 border-green-500 p-3 sm:p-4 shadow-sm">
    {/* Header */}
    <div className="flex items-start justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 rounded flex items-center justify-center cursor-move flex-shrink-0">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500">::</span>
        </div>
        <select 
          value={question.type}
          onChange={(e) => onUpdateQuestion(question.id, 'type', e.target.value)}
          className="px-2 py-1 bg-gray-100 text-xs sm:text-sm rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium flex-1 sm:flex-initial min-w-0"
        >
          <option>Multiple Choice</option>
          <option>Fill in the blanks</option>
          <option>True/False</option>
          <option>Matching</option>
        </select>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={() => onDuplicateQuestion && onDuplicateQuestion(question.id)}
          className="p-1 sm:p-1.5 text-blue-500 hover:bg-blue-50 rounded flex-shrink-0"
          title="Duplicate question"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDeleteQuestion(question.id)}
          className="p-1 sm:p-1.5 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
          title="Delete question"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Question Text */}
    <div className="mb-3 sm:mb-4">
      <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
        {index + 1}. 
      </div>
      <textarea
        value={question.question}
        onChange={(e) => onUpdateQuestion(question.id, 'question', e.target.value)}
        className="w-full p-2 sm:p-3 border border-gray-200 rounded text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="2"
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