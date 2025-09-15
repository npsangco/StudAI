import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

// Multiple Choice Question Component
export const MultipleChoiceQuestion = ({ question, onUpdateQuestion, onUpdateChoice, onAddChoice }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      {question.choices?.map((choice, choiceIndex) => (
        <div
          key={choiceIndex}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onUpdateQuestion(question.id, 'correctAnswer', choice);
            }
          }}
          className={`p-3 rounded border transition-colors cursor-pointer ${
            question.correctAnswer === choice
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="text"
            value={choice}
            onChange={(e) => {
              e.stopPropagation();
              const newValue = e.target.value;
              onUpdateChoice(question.id, choiceIndex, newValue);
              
              if (question.correctAnswer === choice) {
                onUpdateQuestion(question.id, 'correctAnswer', newValue);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={`w-full bg-transparent border-0 text-sm focus:outline-none ${
              question.correctAnswer === choice ? 'text-white placeholder-green-200' : 'text-gray-800 placeholder-gray-400'
            }`}
            placeholder={`Option ${choiceIndex + 1}`}
          />
        </div>
      ))}
    </div>
    <button
      onClick={() => onAddChoice(question.id)}
      className="flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
      type="button"
    >
      <Plus className="w-4 h-4" />
      Add more choices 
    </button>
  </div>
);

// Fill in the Blanks Question Component
export const FillInBlanksQuestion = ({ question, onUpdateQuestion }) => (
  <div className="mt-3">
    <input
      type="text"
      value={question.answer || ''}
      onChange={(e) => onUpdateQuestion(question.id, 'answer', e.target.value)}
      className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      placeholder="Correct answer"
    />
  </div>
);

// True/False Question Component
export const TrueFalseQuestion = ({ question, onUpdateQuestion }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <div
        onClick={() => onUpdateQuestion(question.id, 'correctAnswer', 'True')}
        className={`p-3 rounded border transition-colors cursor-pointer ${
          question.correctAnswer === 'True'
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-sm text-center font-medium">True</div>
      </div>
      <div
        onClick={() => onUpdateQuestion(question.id, 'correctAnswer', 'False')}
        className={`p-3 rounded border transition-colors cursor-pointer ${
          question.correctAnswer === 'False'
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-sm text-center font-medium">False</div>
      </div>
    </div>
  </div>
);

// Matching Question Component
export const MatchingQuestion = ({ question, onAddMatchingPair, onUpdateMatchingPair, onRemoveMatchingPair }) => {
  const pairs = question.matchingPairs || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Left Column</h4>
          {pairs.map((pair, index) => (
            <div key={index} className="relative">
              <input
                type="text"
                value={pair.left || ''}
                onChange={(e) => onUpdateMatchingPair(question.id, index, 'left', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Left item ${index + 1}`}
              />
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Right Column</h4>
          {pairs.map((pair, index) => (
            <div key={index} className="relative flex gap-2">
              <input
                type="text"
                value={pair.right || ''}
                onChange={(e) => onUpdateMatchingPair(question.id, index, 'right', e.target.value)}
                className="flex-1 p-3 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Right item ${index + 1}`}
              />
              {pairs.length > 1 && (
                <button
                  onClick={() => onRemoveMatchingPair(question.id, index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => onAddMatchingPair(question.id)}
        className="flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
        type="button"
      >
        <Plus className="w-4 h-4" />
        Add matching pair 
      </button>
    </div>
  );
};

// Matching Quiz Player Component
export const MatchingQuizPlayer = ({ question, onSubmit, isPaused = false }) => {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState([]);
  const [leftItems] = useState(question.matchingPairs.map(p => p.left));
  const [rightItems] = useState([...question.matchingPairs.map(p => p.right)].sort(() => Math.random() - 0.5));

  const colors = [
    'bg-red-200 border-red-400',
    'bg-blue-200 border-blue-400', 
    'bg-green-200 border-green-400',
    'bg-yellow-200 border-yellow-400',
    'bg-purple-200 border-purple-400',
    'bg-pink-200 border-pink-400',
    'bg-indigo-200 border-indigo-400',
    'bg-orange-200 border-orange-400'
  ];

  const handleLeftClick = (item, index) => {
    if (isPaused) return;
    
    const existingMatch = matches.find(m => m.left === item);
    
    if (existingMatch) {
      setMatches(prev => prev.filter(m => m.left !== item));
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    
    if (selectedLeft === index) {
      setSelectedLeft(null);
      return;
    }
    
    setSelectedLeft(index);
    
    if (selectedRight !== null) {
      const rightItem = rightItems[selectedRight];
      const newMatch = {
        left: item,
        right: rightItem,
        leftIndex: index,
        rightIndex: selectedRight,
        color: colors[matches.length % colors.length]
      };
      
      setMatches(prev => [...prev, newMatch]);
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  const handleRightClick = (item, index) => {
    if (isPaused) return;
    
    const existingMatch = matches.find(m => m.right === item);
    
    if (existingMatch) {
      setMatches(prev => prev.filter(m => m.right !== item));
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    
    if (selectedRight === index) {
      setSelectedRight(null);
      return;
    }
    
    setSelectedRight(index);
    
    if (selectedLeft !== null) {
      const leftItem = leftItems[selectedLeft];
      const newMatch = {
        left: leftItem,
        right: item,
        leftIndex: selectedLeft,
        rightIndex: index,
        color: colors[matches.length % colors.length]
      };
      
      setMatches(prev => [...prev, newMatch]);
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  const handleSubmit = () => {
    if (isPaused) return;
    onSubmit(matches);
  };

  const getItemColor = (item, side) => {
    const match = matches.find(m => m[side] === item);
    return match ? match.color : '';
  };

  const isMatched = (item, side) => {
    return matches.some(m => m[side] === item);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">{question.question}</h2>
        <p className="text-gray-600 mb-4">Click items from both columns to create pairs. Click matched items to unmatch them.</p>
        {matches.length > 0 && (
          <div className="text-sm text-green-600 font-medium">
            {matches.length} pair{matches.length !== 1 ? 's' : ''} matched
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-center mb-4">Column A</h3>
          {leftItems.map((item, index) => (
            <div
              key={index}
              onClick={() => handleLeftClick(item, index)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center font-medium ${
                isMatched(item, 'left')
                  ? `${getItemColor(item, 'left')} cursor-pointer`
                  : selectedLeft === index
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-center mb-4">Column B</h3>
          {rightItems.map((item, index) => (
            <div
              key={index}
              onClick={() => handleRightClick(item, index)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center font-medium ${
                isMatched(item, 'right')
                  ? `${getItemColor(item, 'right')} cursor-pointer`
                  : selectedRight === index
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={matches.length === 0 || isPaused}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            matches.length === 0 || isPaused
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Submit {matches.length > 0 ? `(${matches.length} matches)` : ''}
        </button>
      </div>
    </div>
  );
};