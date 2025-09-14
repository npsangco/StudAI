import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Clock, Crown } from 'lucide-react';
import { MatchingQuizPlayer } from './QuizComponents';

const QuizBattle = ({ quiz, onBack, onShowLeaderboard }) => {
  const [gameState, setGameState] = useState('lobby'); // lobby, countdown, playing, results
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState(''); // For fill-in-the-blank
  const [userMatches, setUserMatches] = useState([]); // For matching questions
  const [timeLeft, setTimeLeft] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [gamePin] = useState('ABC123');
  
  // Use ref to track scores immediately and accurately
  const playersRef = useRef([
    { id: 1, name: 'Denise', score: 0, initial: 'D', isReady: true },
    { id: 2, name: 'Den', score: 0, initial: 'D', isReady: false },
    { id: 3, name: 'Nimrod', score: 0, initial: 'N', isReady: false },
    { id: 4, name: 'Bins', score: 0, initial: 'B', isReady: false },
  ]);
  
  const [players, setPlayers] = useState(playersRef.current);

  const questions = [
    {
      id: 1,
      type: 'Multiple Choice',
      question: 'Which sorting algorithm has the most consistent time complexity performance regardless of input data arrangement?',
      choices: ['Quick Sort', 'Bubble Sort', 'Merge Sort', 'Insertion Sort'],
      correctAnswer: 'Merge Sort'
    },
    {
      id: 2,
      type: 'Fill in the blanks',
      question: 'The _______ complexity of binary search is O(log n).',
      answer: 'time'
    },
    {
      id: 3,
      type: 'True/False',
      question: 'Stack follows LIFO (Last In, First Out) principle.',
      correctAnswer: 'True'
    },
    {
      id: 4,
      type: 'Matching',
      question: 'Match the data structures with their characteristics:',
      matchingPairs: [
        { left: 'Array', right: 'Fixed size, indexed access' },
        { left: 'Linked List', right: 'Dynamic size, sequential access' },
        { left: 'Stack', right: 'LIFO operations' },
        { left: 'Queue', right: 'FIFO operations' }
      ]
    }
  ];

  // Simulate players joining and getting ready
  useEffect(() => {
    if (gameState === 'lobby') {
      const timer = setTimeout(() => {
        playersRef.current = playersRef.current.map(player => ({ ...player, isReady: true }));
        setPlayers([...playersRef.current]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Start countdown when all players are ready
  useEffect(() => {
    if (gameState === 'lobby' && playersRef.current.every(player => player.isReady)) {
      setTimeout(() => setGameState('countdown'), 1000);
    }
  }, [players, gameState]);

  // Countdown timer
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
      setTimeLeft(15);
    }
  }, [countdown, gameState]);

  // Game timer
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleNextQuestion();
    }
  }, [timeLeft, gameState]);

  const updatePlayerScore = (playerId, increment = 1) => {
    // Update ref immediately for instant accuracy
    playersRef.current = playersRef.current.map(player => 
      player.id === playerId ? { ...player, score: player.score + increment } : player
    );
    // Update state for display
    setPlayers([...playersRef.current]);
  };

  // Check if answer is correct based on question type
  const isAnswerCorrect = (question, answer) => {
    switch (question.type) {
      case 'Multiple Choice':
        return answer === question.correctAnswer;
      case 'Fill in the blanks':
        return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
      case 'True/False':
        return answer === question.correctAnswer;
      case 'Matching':
        if (!Array.isArray(answer) || answer.length === 0) return false;
        // Check if all matches are correct
        return answer.every(match => 
          question.matchingPairs.some(pair => 
            pair.left === match.left && pair.right === match.right
          )
        ) && answer.length === question.matchingPairs.length;
      default:
        return false;
    }
  };

  const handleAnswerSelect = (answer) => {
    if (gameState !== 'playing' || selectedAnswer || userAnswer || userMatches.length > 0) return;
    
    const currentQ = questions[currentQuestion];
    
    if (currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') {
      setSelectedAnswer(answer);
    }
    
    // Update the current player's score IMMEDIATELY
    const isCorrect = isAnswerCorrect(currentQ, answer);
    if (isCorrect) {
      updatePlayerScore(1); // Player 1 is the human player
    }
    
    // Simulate AI players answering - also immediate updates
    setTimeout(() => {
      playersRef.current.forEach(player => {
        if (player.id !== 1) {
          // Give AI players different skill levels
          let correctChance;
          switch (player.id) {
            case 2: correctChance = 0.7; break; // Den - pretty good
            case 3: correctChance = 0.85; break; // Nimrod - very good  
            case 4: correctChance = 0.6; break; // Bins - decent
            default: correctChance = 0.5;
          }
          
          if (Math.random() < correctChance) {
            updatePlayerScore(player.id);
          }
        }
      });
    }, Math.random() * 1000 + 200); // Random delay between 0.2-1.2s
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleFillInAnswer = () => {
    if (!userAnswer.trim() || userAnswer.includes('submitted')) return;
    
    const currentQ = questions[currentQuestion];
    const actualAnswer = userAnswer;
    const isCorrect = isAnswerCorrect(currentQ, actualAnswer);
    
    setUserAnswer(actualAnswer + '_submitted'); // Mark as submitted like QuizSolo
    
    if (isCorrect) {
      updatePlayerScore(1);
    }
    
    // Simulate AI players
    setTimeout(() => {
      playersRef.current.forEach(player => {
        if (player.id !== 1) {
          let correctChance;
          switch (player.id) {
            case 2: correctChance = 0.7; break;
            case 3: correctChance = 0.85; break;
            case 4: correctChance = 0.6; break;
            default: correctChance = 0.5;
          }
          
          if (Math.random() < correctChance) {
            updatePlayerScore(player.id);
          }
        }
      });
    }, Math.random() * 1000 + 200);
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleMatchingSubmit = (matches) => {
    setUserMatches(matches);
    
    const currentQ = questions[currentQuestion];
    const isCorrect = isAnswerCorrect(currentQ, matches);
    
    if (isCorrect) {
      updatePlayerScore(1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
      setTimeLeft(15);
    } else {
      // Use the ref data which is always up-to-date
      const finalPlayers = [...playersRef.current].sort((a, b) => b.score - a.score);
      const winner = finalPlayers[0];
      
      onShowLeaderboard({ 
        winner: winner, 
        players: finalPlayers,
        quizTitle: quiz.title 
      });
    }
  };

  const handlePlayAgain = () => {
    // Reset everything properly
    playersRef.current = playersRef.current.map(player => ({ 
      ...player, 
      score: 0, 
      isReady: player.id === 1 
    }));
    setPlayers([...playersRef.current]);
    setGameState('lobby');
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setUserAnswer('');
    setUserMatches([]);
    setTimeLeft(15);
    setCountdown(3);
  };

  // Lobby State
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-yellow-400 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-yellow-500 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black">Quiz Battle Lobby</h1>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold mb-4">
                <Users className="w-5 h-5" />
                Game PIN: {gamePin}
              </div>
              <h2 className="text-3xl font-bold text-black mb-2">{quiz.title}</h2>
              <p className="text-gray-600">Waiting for all players to get ready...</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    player.isReady
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    {player.initial}
                  </div>
                  <div className="font-semibold text-black">{player.name}</div>
                  <div className={`text-sm font-medium ${
                    player.isReady ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {player.isReady ? '✓ Ready' : 'Getting ready...'}
                  </div>
                </div>
              ))}
            </div>
            
            {players.every(player => player.isReady) && (
              <div className="text-green-600 font-semibold">
                All players ready! Starting soon...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Countdown State
  if (gameState === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-8xl font-bold mb-4 animate-pulse">
            {countdown || 'GO!'}
          </div>
          <div className="text-white text-2xl font-semibold">
            {countdown > 0 ? 'Get Ready!' : 'Battle Begins!'}
          </div>
        </div>
      </div>
    );
  }

  // Playing State - WITH LEFT SIDEBAR
  const currentQ = questions[currentQuestion];
  
  // Sort players for display in sidebar
  const sortedPlayersForDisplay = [...players].sort((a, b) => b.score - a.score);

  // For Matching questions, use the dedicated component
  if (currentQ.type === 'Matching') {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-yellow-400 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-yellow-500 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="w-5 h-5" />
                <span className="font-bold text-2xl text-black">{timeLeft}s</span>
              </div>
            </div>
          </div>
        </div>

        <MatchingQuizPlayer 
          question={currentQ}
          onSubmit={handleMatchingSubmit}
          timeLeft={timeLeft}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-yellow-400 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-yellow-500 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-bold text-2xl text-black">{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Players */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-black mb-4 text-center">{quiz.title}</h3>
              
              <div className="space-y-3">
                {sortedPlayersForDisplay.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center p-3 rounded-lg border-l-4 ${
                      index === 0 ? 'border-green-500 bg-green-50' : 
                      index === 1 ? 'border-yellow-500 bg-yellow-50' : 
                      index === 2 ? 'border-blue-500 bg-blue-50' :
                      'border-orange-500 bg-orange-50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {player.initial}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-black text-sm">
                        {player.name}
                      </div>
                      <div className={`text-lg font-bold ${
                        index === 0 ? 'text-green-600' : 
                        index === 1 ? 'text-yellow-600' : 
                        index === 2 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {player.score}pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Question */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-green-500">
              <div className="mb-6">
                <div className="text-lg font-semibold text-black mb-4">
                  {currentQuestion + 1}. {currentQ.question}
                </div>
              </div>
              
              {/* Multiple Choice Questions */}
              {currentQ.type === 'Multiple Choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.choices.map((choice, index) => {
                    let buttonClass = 'p-4 rounded-lg border-2 text-left transition-all font-medium ';
                    
                    if (selectedAnswer) {
                      if (choice === currentQ.correctAnswer) {
                        buttonClass += 'border-green-500 bg-green-50 text-green-700';
                      } else if (choice === selectedAnswer) {
                        buttonClass += 'border-red-500 bg-red-50 text-red-700';
                      } else {
                        buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                      }
                    } else {
                      buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(choice)}
                        disabled={!!selectedAnswer}
                        className={buttonClass}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True/False Questions */}
              {currentQ.type === 'True/False' && (
                <div className="grid grid-cols-2 gap-4">
                  {['True', 'False'].map((choice) => {
                    let buttonClass = 'p-4 rounded-lg border-2 text-center transition-all font-medium ';
                    
                    if (selectedAnswer) {
                      if (choice === currentQ.correctAnswer) {
                        buttonClass += 'border-green-500 bg-green-50 text-green-700';
                      } else if (choice === selectedAnswer) {
                        buttonClass += 'border-red-500 bg-red-50 text-red-700';
                      } else {
                        buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                      }
                    } else {
                      buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
                    }
                    
                    return (
                      <button
                        key={choice}
                        onClick={() => handleAnswerSelect(choice)}
                        disabled={!!selectedAnswer}
                        className={buttonClass}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the Blanks Questions */}
              {currentQ.type === 'Fill in the blanks' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={userAnswer.replace('_submitted', '')} // Show clean value like QuizSolo
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !userAnswer.includes('submitted') && handleFillInAnswer()}
                      className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type your answer here..."
                      disabled={userAnswer.includes('submitted')} // Disable after submission
                    />
                    <button
                      onClick={handleFillInAnswer}
                      disabled={!userAnswer.trim() || userAnswer.includes('submitted')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
              
              {(selectedAnswer || userAnswer.includes('submitted') || userMatches.length > 0) && (
                <div className="mt-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                    (currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
                    currentQ.type === 'Fill in the blanks' && userAnswer.includes('submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) ||
                    currentQ.type === 'Matching' && userMatches.length > 0 && isAnswerCorrect(currentQ, userMatches)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {(currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
                     currentQ.type === 'Fill in the blanks' && userAnswer.includes('submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) ||
                     currentQ.type === 'Matching' && userMatches.length > 0 && isAnswerCorrect(currentQ, userMatches)
                      ? '✓ Correct!' : 
                      currentQ.type === 'Fill in the blanks' && userAnswer.includes('submitted')
                        ? `✗ Incorrect. Answer: ${currentQ.answer}`
                        : '✗ Incorrect'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizBattle;