import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, Crown } from 'lucide-react';

const QuizBattle = ({ quiz, onBack, onShowLeaderboard }) => {
  const [gameState, setGameState] = useState('lobby'); // lobby, countdown, playing, results
  const [players, setPlayers] = useState([
    { id: 1, name: 'Denise', score: 0, initial: 'D', isReady: true },
    { id: 2, name: 'Den', score: 0, initial: 'D', isReady: false },
    { id: 3, name: 'Nimrod', score: 0, initial: 'N', isReady: false },
    { id: 4, name: 'Bins', score: 0, initial: 'B', isReady: false },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [gamePin] = useState('ABC123');

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
      type: 'Multiple Choice',
      question: 'What is the time complexity of binary search?',
      choices: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctAnswer: 'O(log n)'
    },
    {
      id: 3,
      type: 'Multiple Choice',
      question: 'Which data structure follows LIFO principle?',
      choices: ['Queue', 'Stack', 'Array', 'Linked List'],
      correctAnswer: 'Stack'
    }
  ];

  // Simulate players joining and getting ready
  useEffect(() => {
    if (gameState === 'lobby') {
      const timer = setTimeout(() => {
        setPlayers(prev => prev.map(player => ({ ...player, isReady: true })));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Start countdown when all players are ready
  useEffect(() => {
    if (gameState === 'lobby' && players.every(player => player.isReady)) {
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

  const handleAnswerSelect = (answer) => {
    if (gameState !== 'playing') return;
    setSelectedAnswer(answer);
    
    // Simulate scoring
    const isCorrect = answer === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setPlayers(prev => prev.map(player => 
        player.id === 1 ? { ...player, score: player.score + 1 } : player
      ));
    }
    
    // Simulate AI players answering randomly
    setTimeout(() => {
      setPlayers(prev => prev.map(player => {
        if (player.id !== 1) {
          const randomCorrect = Math.random() > 0.4;
          return randomCorrect ? { ...player, score: player.score + 1 } : player;
        }
        return player;
      }));
    }, 1000);
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setTimeLeft(15);
    } else {
      // Show leaderboard when quiz is complete
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];
      onShowLeaderboard({ winner, players });
    }
  };

  const handlePlayAgain = () => {
    setGameState('lobby');
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setTimeLeft(15);
    setCountdown(3);
    setPlayers(prev => prev.map(player => ({ ...player, score: 0, isReady: player.id === 1 })));
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
                {players.map((player, index) => (
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQ.choices.map((choice, index) => {
                  let buttonClass = 'p-4 rounded-lg border-2 text-left transition-all font-medium ';
                  
                  if (selectedAnswer) {
                    if (choice === questions[currentQuestion].correctAnswer) {
                      buttonClass += 'border-green-500 bg-green-50 text-green-700';
                    } else if (choice === selectedAnswer) {
                      buttonClass += 'border-red-500 bg-red-50 text-red-700';
                    } else {
                      buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                    }
                  } else {
                    buttonClass += selectedAnswer === choice
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
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
              
              {selectedAnswer && (
                <div className="mt-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                    selectedAnswer === questions[currentQuestion].correctAnswer
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedAnswer === questions[currentQuestion].correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
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