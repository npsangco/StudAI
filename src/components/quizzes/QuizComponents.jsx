import React from 'react';
import { Trash2 } from 'lucide-react';
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
  onAddMatchingPair,
  onUpdateMatchingPair,
  onRemoveMatchingPair
}) => (
  <div className="bg-white rounded-lg border-l-4 border-green-500 p-4 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center cursor-move">
          <span className="text-xs font-bold text-gray-500">::</span>
        </div>
        <select 
          value={question.type}
          onChange={(e) => onUpdateQuestion(question.id, 'type', e.target.value)}
          className="px-2 py-1 bg-gray-100 text-xs rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option>Multiple Choice</option>
          <option>Fill in the blanks</option>
          <option>True/False</option>
          <option>Matching</option>
        </select>
      </div>
      <button 
        onClick={() => onDeleteQuestion(question.id)}
        className="p-1 text-red-500 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

    <div className="mb-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        {index + 1}. 
      </div>
      <textarea
        value={question.question}
        onChange={(e) => onUpdateQuestion(question.id, 'question', e.target.value)}
        className="w-full p-3 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="2"
        placeholder="Enter your question here..."
      />
    </div>

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