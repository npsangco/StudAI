import React, { useState } from 'react';
import { Plus, X, Check, Info, Link } from 'lucide-react';

// Multiple Choice Question Component
export const MultipleChoiceQuestion = ({ question, onUpdateQuestion, onUpdateChoice, onAddChoice }) => {
  // Parse choices if it's a JSON string
  let choices = question.choices;
  if (typeof choices === 'string') {
    try {
      choices = JSON.parse(choices);
    } catch (e) {
      choices = [];
    }
  }
  choices = choices || [];

  const MAX_CHOICES = 6;
  const canAddMore = choices.length < MAX_CHOICES;

  const handleRemoveChoice = (indexToRemove) => {
    if (choices.length <= 2) return; // Don't allow removing if only 2 choices left
    
    const removedChoice = choices[indexToRemove];
    const newChoices = choices.filter((_, idx) => idx !== indexToRemove);
    
    // Update choices
    onUpdateQuestion(question.id, 'choices', newChoices);
    
    // If the removed choice was the correct answer, clear correct answer
    if (question.correctAnswer === removedChoice) {
      onUpdateQuestion(question.id, 'correctAnswer', '');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium px-1">
        <Info className="w-3.5 h-3.5 text-blue-500" />
        <span>Click the checkbox to mark as correct answer</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {choices?.map((choice, choiceIndex) => {
          // Only mark as correct if both the choice and correctAnswer are non-empty and match
          const isCorrect = choice && question.correctAnswer && question.correctAnswer === choice;

          return (
            <div
              key={`choice-${question.id}-${choiceIndex}`}
              className={`relative p-2 sm:p-3 rounded-lg border-2 transition-all ${
                isCorrect
                  ? 'bg-green-50 border-green-500 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
            <div className="flex items-center gap-2">
              {/* Checkbox to mark as correct */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuestion(question.id, 'correctAnswer', choice);
                }}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110 ${
                  isCorrect
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white border-gray-300 hover:border-green-400'
                }`}
                title="Mark as correct answer"
              >
                {isCorrect && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>

              <input
                type="text"
                value={choice}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onUpdateChoice(question.id, choiceIndex, newValue);

                  // Update correct answer if this was the selected choice
                  if (question.correctAnswer === choice) {
                    onUpdateQuestion(question.id, 'correctAnswer', newValue);
                  }
                }}
                className={`flex-1 bg-transparent border-0 text-xs sm:text-sm focus:outline-none focus:ring-0 ${
                  isCorrect ? 'text-green-900 font-medium placeholder-green-300' : 'text-gray-800 placeholder-gray-400'
                }`}
                placeholder={`Option ${choiceIndex + 1}`}
              />

              {/* Remove Button */}
              {choices.length > 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveChoice(choiceIndex);
                  }}
                  className={`flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors ${
                    isCorrect ? 'text-red-600 hover:bg-red-200' : 'text-red-500'
                  }`}
                  type="button"
                  title="Remove choice"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
      <button
        onClick={() => onAddChoice(question.id)}
        disabled={!canAddMore}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
          canAddMore
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 cursor-pointer shadow-sm hover:shadow'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        type="button"
      >
        <Plus className="w-4 h-4" />
        {canAddMore ? `Add Choice (${choices.length}/${MAX_CHOICES})` : `Maximum ${MAX_CHOICES} choices reached`}
      </button>
    </div>
  );
};

// Fill in the Blanks Question Component
export const FillInBlanksQuestion = ({ question, onUpdateQuestion }) => (
  <div className="mt-3">
    <input
      type="text"
      value={question.answer || ''}
      onChange={(e) => onUpdateQuestion(question.id, 'answer', e.target.value)}
      className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
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
        className={`p-2 sm:p-3 rounded border transition-colors cursor-pointer ${
          question.correctAnswer === 'True'
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-xs sm:text-sm text-center font-medium">True</div>
      </div>
      <div
        onClick={() => onUpdateQuestion(question.id, 'correctAnswer', 'False')}
        className={`p-2 sm:p-3 rounded border transition-colors cursor-pointer ${
          question.correctAnswer === 'False'
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-xs sm:text-sm text-center font-medium">False</div>
      </div>
    </div>
  </div>
);

// Matching Question Component
export const MatchingQuestion = ({ question, onAddMatchingPair, onUpdateMatchingPair, onRemoveMatchingPair }) => {
  // Parse matchingPairs if it's a JSON string
  let pairs = question.matchingPairs;
  if (typeof pairs === 'string') {
    try {
      pairs = JSON.parse(pairs);
    } catch (e) {
      pairs = [];
    }
  }
  pairs = pairs || [];

  const MAX_PAIRS = 7;
  const canAddMore = pairs.length < MAX_PAIRS;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-medium text-gray-700">Left Column</h4>
          {pairs.map((pair, index) => (
            <div key={index} className="relative">
              <input
                type="text"
                value={pair.left || ''}
                onChange={(e) => onUpdateMatchingPair(question.id, index, 'left', e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-200 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Left item ${index + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-medium text-gray-700">Right Column</h4>
          {pairs.map((pair, index) => (
            <div key={index} className="relative flex gap-2">
              <input
                type="text"
                value={pair.right || ''}
                onChange={(e) => onUpdateMatchingPair(question.id, index, 'right', e.target.value)}
                className="flex-1 p-2 sm:p-3 border border-gray-200 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Right item ${index + 1}`}
              />
              {pairs.length > 1 && (
                <button
                  onClick={() => onRemoveMatchingPair(question.id, index)}
                  className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                  type="button"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => onAddMatchingPair(question.id)}
        disabled={!canAddMore}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
          canAddMore
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 cursor-pointer shadow-sm hover:shadow'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        type="button"
      >
        <Plus className="w-4 h-4" />
        {canAddMore ? `Add Matching Pair (${pairs.length}/${MAX_PAIRS})` : `Maximum ${MAX_PAIRS} pairs reached`}
      </button>
    </div>
  );
};

// Matching Quiz Player Component
export const MatchingQuizPlayer = ({ question, onSubmit, isPaused = false, mode = 'solo' }) => {
  // Parse matchingPairs if it's a JSON string
  let parsedPairs = question.matchingPairs;
  if (typeof parsedPairs === 'string') {
    try {
      parsedPairs = JSON.parse(parsedPairs);
    } catch (e) {
      parsedPairs = [];
    }
  }
  
  // Ensure it's an array
  parsedPairs = Array.isArray(parsedPairs) ? parsedPairs : [];
  
  // Validate matchingPairs exists
  if (!parsedPairs || parsedPairs.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">No matching pairs available for this question.</p>
        </div>
      </div>
    );
  }

  const [matches, setMatches] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCorrectMatches, setShowCorrectMatches] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [leftItems] = useState(parsedPairs.map(p => p.left));
  const [rightItems] = useState([...parsedPairs.map(p => p.right)].sort(() => Math.random() - 0.5));

  // 📱 TOUCH STATE
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);

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
    
    for (let i = 0; i < parsedPairs.length; i++) {
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
    return parsedPairs.some(pair => 
      pair.left === match.left && pair.right === match.right
    );
  };

  const getCorrectMatch = (item, side) => {
    return parsedPairs.find(pair => pair[side] === item);
  };

  // ========================================
  // MOUSE/DESKTOP DRAG HANDLERS
  // ========================================
  
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

  // ========================================
  // 📱 TOUCH/MOBILE DRAG HANDLERS
  // ========================================
  
  const handleTouchStart = (e, item, side) => {
    if (isPaused || isSubmitted) return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    const existingMatch = matches.find(m => m[side] === item);
    if (existingMatch) {
      setMatches(prev => prev.filter(m => m[side] !== item));
    }
    
    setDraggedItem({ item, side });
    setIsDraggingTouch(true);
  };

  const handleTouchMove = (e, item, side) => {
    if (isPaused || isSubmitted || !draggedItem || !isDraggingTouch) return;
    
    e.preventDefault(); // Prevent scrolling while dragging
    
    const touch = e.touches[0];
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementUnderTouch) {
      const dropTarget = elementUnderTouch.closest('[data-drop-item]');
      
      if (dropTarget) {
        const dropItem = dropTarget.getAttribute('data-drop-item');
        const dropSide = dropTarget.getAttribute('data-drop-side');
        
        if (dropSide !== draggedItem.side) {
          setDragOverZone({ item: dropItem, side: dropSide });
        } else {
          setDragOverZone(null);
        }
      } else {
        setDragOverZone(null);
      }
    }
  };

  const handleTouchEnd = (e, currentItem, currentSide) => {
    if (isPaused || isSubmitted || !draggedItem || !isDraggingTouch) return;
    
    const touch = e.changedTouches[0];
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementUnderTouch) {
      const dropTarget = elementUnderTouch.closest('[data-drop-item]');
      
      if (dropTarget) {
        const dropItem = dropTarget.getAttribute('data-drop-item');
        const dropSide = dropTarget.getAttribute('data-drop-side');
        
        // Only create match if dropping on opposite side
        if (dropSide !== draggedItem.side) {
          const filteredMatches = matches.filter(m => 
            m[draggedItem.side] !== draggedItem.item && m[dropSide] !== dropItem
          );

          const newMatch = {
            left: draggedItem.side === 'left' ? draggedItem.item : dropItem,
            right: draggedItem.side === 'right' ? draggedItem.item : dropItem,
            color: colorPalette[filteredMatches.length]
          };

          setMatches([...filteredMatches, newMatch]);
        }
      }
    }
    
    // Reset states
    setDraggedItem(null);
    setDragOverZone(null);
    setIsDraggingTouch(false);
    setTouchStartPos(null);
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

  const canSubmit = matches.length > 0 && matches.length === parsedPairs.length;

  // Calculate results
  const correctMatches = matches.filter(isMatchCorrect);
  const incorrectMatches = matches.filter(match => !isMatchCorrect(match));
  const correctCount = correctMatches.length;
  const totalCount = parsedPairs.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  // Get solid color based on score
  const getScoreColor = () => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-green-400';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get encouraging message
  const getMessage = () => {
    if (percentage === 100) return 'Perfect! You nailed it!';
    if (percentage >= 80) return 'Great job! Almost perfect!';
    if (percentage >= 60) return 'Good effort! Review the mistakes.';
    if (percentage >= 40) return 'Keep trying! You\'re learning.';
    return 'Don\'t worry! Review and try again.';
  };

  // Get question type config
  const config = {
    color: 'bg-orange-500',
    bgPattern: 'from-orange-50 to-red-50',
    label: 'Matching',
    icon: 'link'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* OVERLAPPING BADGE */}
      <div className="relative">
        {/* Question Type Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.color} text-white font-bold text-sm shadow-lg`}>
            <Link size={16} />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Question Card - Glass Theme */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-white/40 relative overflow-hidden pt-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full translate-y-16 -translate-x-16" />

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black drop-shadow-sm leading-tight relative z-10 text-center">
            {question.question}
          </h2>
        </div>
      </div>
        
      {!isSubmitted ? (
        <div className="space-y-4">
          {/* Instructions */}
          <p className="text-base sm:text-lg text-black drop-shadow-sm px-2 font-bold text-center">
            Drag items from one column and drop them on matching items in the other column
          </p>

          {/* Matching Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-bold text-black drop-shadow-sm text-center px-2">
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
                    data-drop-item={item}
                    data-drop-side="left"
                    onDragStart={(e) => handleDragStart(e, item, 'left')}
                    onDragOver={(e) => handleDragOver(e, item, 'left')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item, 'left')}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, item, 'left')}
                    onTouchMove={(e) => handleTouchMove(e, item, 'left')}
                    onTouchEnd={(e) => handleTouchEnd(e, item, 'left')}
                    onClick={() => matched && handleUnmatch(item, 'left')}
                    className={`
                      bg-white/30 backdrop-blur-md border-2 rounded-2xl p-4 sm:p-5
                      font-semibold text-base sm:text-lg
                      transition-all duration-300 transform cursor-grab active:cursor-grabbing
                      hover:scale-102 hover:-translate-y-1 hover:shadow-xl hover:bg-white/40
                      touch-none select-none
                      ${matched ? 'border-2' : 'border-white/40 hover:border-white/60'}
                      ${isDraggedItem ? 'opacity-50 scale-95' : ''}
                      ${isDropZone ? 'border-yellow-400 bg-yellow-400/30 scale-105' : ''}
                      ${matched ? 'shadow-lg' : 'shadow-md'}
                      ${!matched ? 'text-black' : ''}
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
              <h3 className="text-lg sm:text-xl font-bold text-black drop-shadow-sm text-center px-2">
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
                    data-drop-item={item}
                    data-drop-side="right"
                    onDragStart={(e) => handleDragStart(e, item, 'right')}
                    onDragOver={(e) => handleDragOver(e, item, 'right')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item, 'right')}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, item, 'right')}
                    onTouchMove={(e) => handleTouchMove(e, item, 'right')}
                    onTouchEnd={(e) => handleTouchEnd(e, item, 'right')}
                    onClick={() => matched && handleUnmatch(item, 'right')}
                    className={`
                      bg-white/30 backdrop-blur-md border-2 rounded-2xl p-4 sm:p-5
                      font-semibold text-base sm:text-lg
                      transition-all duration-300 transform cursor-grab active:cursor-grabbing
                      hover:scale-102 hover:-translate-y-1 hover:shadow-xl hover:bg-white/40
                      touch-none select-none
                      ${matched ? 'border-2' : 'border-white/40 hover:border-white/60'}
                      ${isDraggedItem ? 'opacity-50 scale-95' : ''}
                      ${isDropZone ? 'border-yellow-400 bg-yellow-400/30 scale-105' : ''}
                      ${matched ? 'shadow-lg' : 'shadow-md'}
                      ${!matched ? 'text-black' : ''}
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
                bg-amber-500 hover:bg-amber-600
                disabled:bg-white/20
                text-white font-bold text-lg sm:text-xl px-10 sm:px-12 py-4 sm:py-5
                rounded-2xl shadow-xl hover:shadow-2xl
                transition-all duration-300 transform hover:scale-105
                disabled:cursor-not-allowed disabled:hover:scale-100 disabled:text-black/50
                border-2 border-white/40
              "
            >
              {canSubmit ? 'Submit Answers' : 'Match All Pairs to Submit'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score Card */}
          <div className={`relative overflow-hidden rounded-2xl shadow-2xl ${getScoreColor()} border-2 border-white/40`}>
            <div className="absolute inset-0 bg-white/20 backdrop-blur-xl"></div>
            <div className="relative px-5 sm:px-6 py-5 sm:py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold mb-1 text-white drop-shadow-lg">
                    {correctCount}/{totalCount} CORRECT
                  </div>
                  <div className="text-sm sm:text-base font-medium text-white/90 drop-shadow-sm">
                    {getMessage()}
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
                  {percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Correct Answers Section */}
          {correctMatches.length > 0 && (
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-white/40 overflow-hidden">
              <button
                onClick={() => setShowCorrectMatches(!showCorrectMatches)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base sm:text-lg font-bold text-black drop-shadow-sm">
                    Correct Answers ({correctMatches.length})
                  </span>
                </div>
                <span className="text-black text-xl font-bold">
                  {showCorrectMatches ? '▴' : '▾'}
                </span>
              </button>

              {showCorrectMatches && (
                <div className="px-5 pb-4 space-y-2 border-t-2 border-white/40 pt-3">
                  {correctMatches.map((match, index) => (
                    <div key={index} className="p-3 bg-green-50/90 backdrop-blur-sm rounded-xl border-2 border-green-200">
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
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-white/40 overflow-hidden">
              <button
                onClick={() => setShowMistakes(!showMistakes)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <X className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base sm:text-lg font-bold text-black drop-shadow-sm">
                    Mistakes to Review ({incorrectMatches.length})
                  </span>
                </div>
                <span className="text-black text-xl font-bold">
                  {showMistakes ? '▴' : '▾'}
                </span>
              </button>

              {showMistakes && (
                <div className="px-5 pb-4 space-y-3 border-t-2 border-white/40 pt-3">
                  {incorrectMatches.map((match, index) => {
                    const correctLeft = getCorrectMatch(match.left, 'left');
                    return (
                      <div key={index} className="p-3 bg-red-50/90 backdrop-blur-sm rounded-xl border-2 border-red-200 space-y-2">
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
        </div>
      )}
    </div>
  );
};
