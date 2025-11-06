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
    const baseColors = [
      { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
      { bg: '#e9d5ff', border: '#a78bfa', text: '#6b21a8' },
      { bg: '#d1fae5', border: '#34d399', text: '#065f46' },
      { bg: '#fed7aa', border: '#fb923c', text: '#9a3412' },
      { bg: '#fecaca', border: '#f87171', text: '#991b1b' },
      { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
      { bg: '#ddd6fe', border: '#a78bfa', text: '#5b21b6' },
      { bg: '#fce7f3', border: '#f472b6', text: '#9f1239' }
    ];
    
    for (let i = 0; i < question.matchingPairs.length; i++) {
      if (i < baseColors.length) {
        colors.push(baseColors[i]);
      } else {
        const hue = Math.floor(Math.random() * 360);
        colors.push({
          bg: `hsl(${hue}, 85%, 85%)`,
          border: `hsl(${hue}, 70%, 60%)`,
          text: `hsl(${hue}, 70%, 30%)`
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

  const canSubmit = matches.length > 0 && matches.length === question.matchingPairs.length;

  // Calculate results
  const correctMatches = matches.filter(isMatchCorrect);
  const incorrectMatches = matches.filter(match => !isMatchCorrect(match));
  const correctCount = correctMatches.length;
  const totalCount = question.matchingPairs.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

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
    <div className="min-h-screen px-3 sm:px-4 py-4 sm:py-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 -z-10" />
      
      {/* Animated background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 left-5 w-20 h-20 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-5 w-24 h-24 sm:w-48 sm:h-48 bg-black/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
      </div>

      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        {/* Question */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight px-2 drop-shadow-lg">
          {question.question}
        </h2>
        
        {!isSubmitted ? (
          <>
            {/* Instructions */}
            <p className="text-base sm:text-lg text-gray-900 px-2 font-medium">
              Drag items from one column and drop them on matching items in the other column
            </p>

            {/* Matching Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center px-2">
                  Column A
                </h3>
                {leftItems.map((item, index) => {
                  const match = getItemMatch(item, 'left');
                  const matched = isMatched(item, 'left');
                  const isDraggedItem = draggedItem?.item === item && draggedItem?.side === 'left';
                  const isDropZone = dragOverZone?.item === item && dragOverZone?.side === 'left' && draggedItem?.side !== 'left';
                  
                  return (
                    <div
                      key={index}
                      draggable={!isPaused}
                      onDragStart={(e) => handleDragStart(e, item, 'left')}
                      onDragOver={(e) => handleDragOver(e, item, 'left')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item, 'left')}
                      onDragEnd={handleDragEnd}
                      onClick={() => matched && handleUnmatch(item, 'left')}
                      className={`
                        bg-white/90 backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-5
                        font-semibold text-base sm:text-lg
                        transition-all duration-300 transform cursor-grab active:cursor-grabbing
                        hover:scale-102 hover:-translate-y-1 hover:shadow-xl
                        ${matched ? 'border-2' : 'border-white/50 hover:border-white'}
                        ${isDraggedItem ? 'opacity-50 scale-95' : ''}
                        ${isDropZone ? 'border-yellow-400 bg-yellow-50/90 scale-105' : ''}
                        ${matched ? 'shadow-lg' : 'shadow-md'}
                      `}
                      style={matched ? {
                        backgroundColor: match.color.bg,
                        borderColor: match.color.border,
                        color: match.color.text
                      } : {}}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center px-2">
                  Column B
                </h3>
                {rightItems.map((item, index) => {
                  const match = getItemMatch(item, 'right');
                  const matched = isMatched(item, 'right');
                  const isDraggedItem = draggedItem?.item === item && draggedItem?.side === 'right';
                  const isDropZone = dragOverZone?.item === item && dragOverZone?.side === 'right' && draggedItem?.side !== 'right';
                  
                  return (
                    <div
                      key={index}
                      draggable={!isPaused}
                      onDragStart={(e) => handleDragStart(e, item, 'right')}
                      onDragOver={(e) => handleDragOver(e, item, 'right')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item, 'right')}
                      onDragEnd={handleDragEnd}
                      onClick={() => matched && handleUnmatch(item, 'right')}
                      className={`
                        bg-white/90 backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-5
                        font-semibold text-base sm:text-lg
                        transition-all duration-300 transform cursor-grab active:cursor-grabbing
                        hover:scale-102 hover:-translate-y-1 hover:shadow-xl
                        ${matched ? 'border-2' : 'border-white/50 hover:border-white'}
                        ${isDraggedItem ? 'opacity-50 scale-95' : ''}
                        ${isDropZone ? 'border-yellow-400 bg-yellow-50/90 scale-105' : ''}
                        ${matched ? 'shadow-lg' : 'shadow-md'}
                      `}
                      style={matched ? {
                        backgroundColor: match.color.bg,
                        borderColor: match.color.border,
                        color: match.color.text
                      } : {}}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isPaused}
                className="
                  bg-gradient-to-r from-yellow-400 to-amber-500
                  hover:from-yellow-500 hover:to-amber-600
                  disabled:from-gray-300 disabled:to-gray-400
                  text-black font-bold text-lg sm:text-xl px-10 sm:px-12 py-4 sm:py-5
                  rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-yellow-500/30
                  transition-all duration-300 transform hover:scale-105
                  disabled:cursor-not-allowed disabled:hover:scale-100
                  border-2 border-yellow-600/30
                "
              >
                {canSubmit ? 'Submit Answers' : 'Match All Pairs to Submit'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Score Card */}
            <div className={`relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r ${getGradientColors()}`}>
              <div className="absolute inset-0 bg-white/10"></div>
              <div className="relative px-5 sm:px-6 py-5 sm:py-6 text-white">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {correctCount}/{totalCount} CORRECT
                    </div>
                    <div className="text-sm sm:text-base font-medium opacity-90">
                      {getMessage()}
                    </div>
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold">
                    {percentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Correct Answers Section */}
            {correctMatches.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-white/50 overflow-hidden">
                <button
                  onClick={() => setShowCorrectMatches(!showCorrectMatches)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      Correct Answers ({correctMatches.length})
                    </span>
                  </div>
                  <span className="text-gray-700 text-xl font-bold">
                    {showCorrectMatches ? '▴' : '▾'}
                  </span>
                </button>
                
                {showCorrectMatches && (
                  <div className="px-5 pb-4 space-y-2 border-t-2 border-white/50 pt-3">
                    {correctMatches.map((match, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-xl border-2 border-green-200">
                        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900">
                          <span>{match.left}</span>
                          <span className="text-green-600 font-bold">→</span>
                          <span>{match.right}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mistakes Section */}
            {incorrectMatches.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-white/50 overflow-hidden">
                <button
                  onClick={() => setShowMistakes(!showMistakes)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      Mistakes to Review ({incorrectMatches.length})
                    </span>
                  </div>
                  <span className="text-gray-700 text-xl font-bold">
                    {showMistakes ? '▴' : '▾'}
                  </span>
                </button>
                
                {showMistakes && (
                  <div className="px-5 pb-4 space-y-3 border-t-2 border-white/50 pt-3">
                    {incorrectMatches.map((match, index) => {
                      const correctLeft = getCorrectMatch(match.left, 'left');
                      return (
                        <div key={index} className="p-3 bg-red-50 rounded-xl border-2 border-red-200 space-y-2">
                          <div>
                            <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                              Your Answer:
                            </div>
                            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                              <span className="text-gray-900">{match.left}</span>
                              <span className="text-red-600 font-bold">→</span>
                              <span className="line-through text-red-600">{match.right}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">
                              Correct Answer:
                            </div>
                            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                              <span className="text-gray-900">{match.left}</span>
                              <span className="text-green-600 font-bold">→</span>
                              <span className="text-green-700">{correctLeft.right}</span>
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
    </div>
  );
};