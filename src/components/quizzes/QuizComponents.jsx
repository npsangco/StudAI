import React, { useState } from 'react';
import { Edit, Trash2, Plus, GripVertical, Play, X } from 'lucide-react';

// Quiz Controls Component
export const QuizControls = ({ quiz, onBack, onAddQuestion, onSave }) => (
  <div className="bg-white px-6 py-4">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
            Public
          </span>
          <span className="px-3 py-1 bg-gray-400 text-white text-xs rounded-full font-medium">
            Private
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Back
        </button>
        <button 
          onClick={onAddQuestion}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 font-medium"
        >
          Add a question
        </button>
        <button 
          onClick={onSave}
          className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 font-medium"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

// Multiple Choice Question Component
export const MultipleChoiceQuestion = ({ question, onUpdateQuestion, onUpdateChoice, onAddChoice }) => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {question.choices?.map((choice, choiceIndex) => (
          <div
            key={choiceIndex}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                // Use the actual choice value, not the index
                onUpdateQuestion(question.id, 'correctAnswer', choice);
              }
            }}
            className={`p-3 rounded border transition-colors cursor-pointer ${
              question.correctAnswer === choice // Compare with choice value
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
                
                // If this was the correct answer, update it too
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
export const MatchingQuizPlayer = ({ question, onSubmit, timeLeft, isPaused = false }) => {
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

// Quiz Item Component
export const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect }) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, index)}
    className={`flex flex-col sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg transition-all duration-200 gap-3 sm:gap-0 ${
      draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-gray-100'
    }`}
  >
    <div className="w-1 h-8 bg-green-500 rounded-full mr-0 sm:mr-3 hidden sm:block"></div>
    
    <div className="flex items-center justify-center gap-2 mr-0 sm:mr-3">
      <GripVertical className="w-4 h-4 text-gray-400" />
    </div>
    
    <div 
      onClick={() => onSelect(quiz)}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 flex-1 cursor-pointer"
    >
      <h3 className="font-semibold text-black text-left sm:text-left min-w-0 flex-1 hover:text-blue-600 transition-colors">
        {quiz.title}
      </h3>
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-sm">
        <span className="text-gray-500 whitespace-nowrap">{quiz.questionCount} Questions</span>
        <span className="text-gray-500 whitespace-nowrap">{quiz.created}</span>
      </div>
    </div>
    
    <div className="flex gap-2 ml-0 sm:ml-3 self-end sm:self-center">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onSelect(quiz);
        }}
        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
        title="Start Quiz"
      >
        <Play className="w-4 h-4" />
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onEdit(quiz);
        }}
        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        title="Edit Quiz"
      >
        <Edit className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  </div>
);

// Quiz List Component
export const QuizList = ({ quizzes, draggedIndex, onDragStart, onDragOver, onDrop, onEditQuiz, onQuizSelect }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
    <h2 className="text-2xl font-bold text-black mb-6">Your Quizzes</h2>
    
    <div className="space-y-3 mb-6">
      {quizzes.map((quiz, index) => (
        <QuizItem
          key={quiz.id}
          quiz={quiz}
          index={index}
          draggedIndex={draggedIndex}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onEdit={onEditQuiz}
          onSelect={onQuizSelect}
        />
      ))}
    </div>
    
    <button className="bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors">
      Create Quiz
    </button>
  </div>
);

// Quiz Battles Component
export const QuizBattles = ({ gamePin, setGamePin }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-black mb-3">Join Quiz Battles</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Challenge your friends or join an ongoing quiz battles!
      </p>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="GAME PIN"
          value={gamePin}
          onChange={(e) => setGamePin(e.target.value)}
          className="w-full max-w-xs mx-auto block px-4 py-3 bg-gray-100 border-0 rounded-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium tracking-wider"
        />
        
        <button className="bg-black text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          Enter
        </button>
      </div>
    </div>
  </div>
);