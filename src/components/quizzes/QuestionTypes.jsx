import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

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
export const MatchingQuizPlayer = ({ question, onSubmit, isPaused = false, mode = 'solo' }) => {
  const [matches, setMatches] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCorrectMatches, setShowCorrectMatches] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [leftItems] = useState(question.matchingPairs.map(p => p.left));
  const [rightItems] = useState([...question.matchingPairs.map(p => p.right)].sort(() => Math.random() - 0.5));

  const [colorPalette] = useState(() => {
    const colors = [];
    for (let i = 0; i < question.matchingPairs.length; i++) {
      if (i < 8) {
        const baseColors = [
          { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
          { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
          { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
          { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
          { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' },
          { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
          { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
          { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700' }
        ];
        colors.push(baseColors[i]);
      } else {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20) + 50;
        const lightness = Math.floor(Math.random() * 15) + 70;
        
        colors.push({
          bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
          border: `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`,
          text: `hsl(${hue}, ${saturation}%, ${lightness - 50}%)`
        });
      }
    }
    return colors;
  });

  const isMatchCorrect = (match) => {
    return question.matchingPairs.some(pair => 
      pair.left === match.left && pair.right === match.right
    );
  };

  const getCorrectMatch = (item, side) => {
    return question.matchingPairs.find(pair => pair[side] === item);
  };

  const handleDragStart = (e, item, side) => {
    if (isPaused || isSubmitted) return;
    
    const existingMatch = matches.find(m => m[side] === item);
    if (existingMatch) {
      setMatches(prev => prev.filter(m => m[side] !== item));
    }
    
    setDraggedItem({ item, side });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item, side) => {
    if (isPaused || isSubmitted) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && draggedItem.side !== side) {
      setDragOverZone({ item, side });
    }
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (e, dropItem, dropSide) => {
    if (isPaused || isSubmitted) return;
    e.preventDefault();
    setDragOverZone(null);
    
    if (!draggedItem || draggedItem.side === dropSide) return;

    const filteredMatches = matches.filter(m => 
      m[draggedItem.side] !== draggedItem.item && m[dropSide] !== dropItem
    );

    const newMatch = {
      left: draggedItem.side === 'left' ? draggedItem.item : dropItem,
      right: draggedItem.side === 'right' ? draggedItem.item : dropItem,
      color: colorPalette[filteredMatches.length]
    };

    setMatches([...filteredMatches, newMatch]);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverZone(null);
  };

  const handleUnmatch = (item, side) => {
    if (isPaused || isSubmitted) return;
    setMatches(prev => prev.filter(m => m[side] !== item));
  };

  const handleSubmit = () => {
    if (isPaused) return;
    setIsSubmitted(true);
    onSubmit(matches);
  };

  const getItemMatch = (item, side) => {
    return matches.find(m => m[side] === item);
  };

  const isMatched = (item, side) => {
    return matches.some(m => m[side] === item);
  };

  const isDragging = draggedItem !== null;
  const canSubmit = matches.length > 0 && matches.length === question.matchingPairs.length;

  // Calculate results
  const correctMatches = matches.filter(isMatchCorrect);
  const incorrectMatches = matches.filter(match => !isMatchCorrect(match));
  const correctCount = correctMatches.length;
  const totalCount = question.matchingPairs.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const allCorrect = correctCount === totalCount;

  // Get gradient colors based on score
  const getGradientColors = () => {
    if (percentage === 100) return 'from-green-400 to-green-500';
    if (percentage >= 80) return 'from-green-400 to-yellow-400';
    if (percentage >= 60) return 'from-yellow-400 to-orange-400';
    if (percentage >= 40) return 'from-orange-400 to-red-400';
    return 'from-red-400 to-red-500';
  };

  // Get encouraging message
  const getMessage = () => {
    if (percentage === 100) return 'Perfect! You nailed it! 🎉';
    if (percentage >= 80) return 'Great job! Almost perfect! 🌟';
    if (percentage >= 60) return 'Good effort! Review the mistakes. 👍';
    if (percentage >= 40) return 'Keep trying! You\'re learning. 📚';
    return 'Don\'t worry! Review and try again. 💪';
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{question.question}</h2>
        
        {!isSubmitted ? (
          <p className="text-gray-600">Drag items from one column and drop them on matching items in the other column</p>
        ) : (
<>
            {/* Score Card */}
            <div className={`relative overflow-hidden rounded-xl shadow-lg mb-6 bg-gradient-to-r ${getGradientColors()}`}>
              <div className="absolute inset-0 bg-white opacity-10"></div>
              <div className="relative px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {correctCount}/{totalCount} CORRECT
                    </div>
                    <div className="text-sm font-medium opacity-90">{getMessage()}</div>
                  </div>
                  <div className="text-5xl font-bold">
                    {percentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Correct Answers Section */}
            {correctMatches.length > 0 && (
              <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowCorrectMatches(!showCorrectMatches)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base font-semibold text-gray-900">
                      Correct Answers ({correctMatches.length})
                    </span>
                  </div>
                  <span className="text-gray-600 text-xl">
                    {showCorrectMatches ? '▴' : '▾'}
                  </span>
                </button>
                
                {showCorrectMatches && (
                  <div className="px-5 pb-4 space-y-2 border-t border-gray-200 pt-3">
                    {correctMatches.map((match, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <span className="font-medium">{match.left}</span>
                          <span className="text-green-600 font-bold">→</span>
                          <span className="font-medium">{match.right}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mistakes Section */}
            {incorrectMatches.length > 0 && (
              <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowMistakes(!showMistakes)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base font-semibold text-gray-900">
                      Mistakes to Review ({incorrectMatches.length})
                    </span>
                  </div>
                  <span className="text-gray-600 text-xl">
                    {showMistakes ? '▴' : '▾'}
                  </span>
                </button>
                
                {showMistakes && (
                  <div className="px-5 pb-4 space-y-3 border-t border-gray-200 pt-3">
                    {incorrectMatches.map((match, index) => {
                      const correctLeft = getCorrectMatch(match.left, 'left');
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Your Answer:
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">{match.left}</span>
                              <span className="text-red-600 font-bold">→</span>
                              <span className="font-medium line-through text-red-600">{match.right}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                              Correct Answer:
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">{match.left}</span>
                              <span className="text-green-600 font-bold">→</span>
                              <span className="font-medium text-green-600">{correctLeft.right}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Only show matching grid if NOT submitted */}
      {!isSubmitted && (
        <>
          {/* Matching Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                Column A
              </h3>
              {leftItems.map((item, index) => {
                const match = getItemMatch(item, 'left');
                const matched = isMatched(item, 'left');
                const isDraggedItem = draggedItem?.item === item && draggedItem?.side === 'left';
                const isDropZone = dragOverZone?.item === item && dragOverZone?.side === 'left' && draggedItem?.side !== 'left';

                return (
                  <div key={index} className="relative">
                    <div
                      draggable={!isPaused}
                      onDragStart={(e) => handleDragStart(e, item, 'left')}
                      onDragOver={(e) => handleDragOver(e, item, 'left')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item, 'left')}
                      onDragEnd={handleDragEnd}
                      onClick={() => matched && handleUnmatch(item, 'left')}
                      className={`
                        relative p-4 rounded-xl border-2 font-medium text-center
                        transition-all duration-300 transform
                        ${matched 
                          ? `${match.color.border} ${match.color.text} cursor-pointer hover:scale-105` 
                          : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400 cursor-grab active:cursor-grabbing'
                        }
                        ${isDraggedItem ? 'opacity-40 scale-95' : ''}
                        ${isDropZone ? 'ring-4 ring-blue-300 scale-105 border-blue-500' : ''}
                        ${isDragging && !matched && !isDraggedItem ? 'hover:ring-2 hover:ring-blue-200' : ''}
                        shadow-sm hover:shadow-md
                      `}
                      style={matched ? {
                        backgroundColor: match.color.bg,
                        borderColor: match.color.border,
                        color: match.color.text
                      } : {}}
                    >
                      <span className="block">{item}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                Column B
              </h3>
              {rightItems.map((item, index) => {
                const match = getItemMatch(item, 'right');
                const matched = isMatched(item, 'right');
                const isDraggedItem = draggedItem?.item === item && draggedItem?.side === 'right';
                const isDropZone = dragOverZone?.item === item && dragOverZone?.side === 'right' && draggedItem?.side !== 'right';

                return (
                  <div key={index} className="relative">
                    <div
                      draggable={!isPaused}
                      onDragStart={(e) => handleDragStart(e, item, 'right')}
                      onDragOver={(e) => handleDragOver(e, item, 'right')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item, 'right')}
                      onDragEnd={handleDragEnd}
                      onClick={() => matched && handleUnmatch(item, 'right')}
                      className={`
                        relative p-4 rounded-xl border-2 font-medium text-center
                        transition-all duration-300 transform
                        ${matched 
                          ? `${match.color.border} ${match.color.text} cursor-pointer hover:scale-105` 
                          : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400 cursor-grab active:cursor-grabbing'
                        }
                        ${isDraggedItem ? 'opacity-40 scale-95' : ''}
                        ${isDropZone ? 'ring-4 ring-blue-300 scale-105 border-blue-500' : ''}
                        ${isDragging && !matched && !isDraggedItem ? 'hover:ring-2 hover:ring-blue-200' : ''}
                        shadow-sm hover:shadow-md
                      `}
                      style={matched ? {
                        backgroundColor: match.color.bg,
                        borderColor: match.color.border,
                        color: match.color.text
                      } : {}}
                    >
                      <span className="block">{item}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPaused}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg text-white 
                transition-all duration-300 transform
                ${canSubmit && !isPaused
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 cursor-not-allowed'
                }
              `}
            >
              {canSubmit ? 'Submit Answers ✓' : 'Match All Pairs to Submit'}
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        [draggable="true"] {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </div>
  );
};