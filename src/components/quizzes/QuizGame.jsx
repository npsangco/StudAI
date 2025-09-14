// Updated QuizGame.js - Add live leaderboard for battle mode

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { useQuizCore, QuizQuestion } from './QuizCore';

// Live Leaderboard Component for Battle Mode
const LiveLeaderboard = ({ players, currentPlayerName = 'You' }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-bold text-lg mb-4 text-center">Live Leaderboard</h3>
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id} 
            className={`flex items-center justify-between p-3 rounded-lg ${
              player.name === currentPlayerName ? 'bg-yellow-100 border-yellow-300 border' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                index === 0 ? 'bg-yellow-500' : 
                index === 1 ? 'bg-gray-400' : 
                index === 2 ? 'bg-orange-400' : 'bg-gray-600'
              }`}>
                {player.initial}
              </div>
              <div>
                <div className={`font-semibold ${player.name === currentPlayerName ? 'text-yellow-800' : 'text-black'}`}>
                  {player.name === currentPlayerName ? 'You' : player.name}
                </div>
                <div className="text-xs text-gray-500">
                  {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} place
                </div>
              </div>
            </div>
            <div className={`font-bold ${
              index === 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {player.score}pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simulated Players Hook (remove when adding database)
const useSimulatedPlayers = (totalQuestions, currentQuestion) => {
  const [simulatedPlayers] = useState([
    { id: 1, name: 'Denise', initial: 'D', score: 0, accuracy: 0.85 },
    { id: 2, name: 'Den', initial: 'D', score: 0, accuracy: 0.75 },
    { id: 3, name: 'Nimrod', initial: 'N', score: 0, accuracy: 0.70 },
    { id: 4, name: 'Bins', initial: 'B', score: 0, accuracy: 0.65 }
  ]);

  const [players, setPlayers] = useState(simulatedPlayers);

  // Simulate other players answering when current question changes
  useEffect(() => {
    if (currentQuestion > 0) {
      const timer = setTimeout(() => {
        setPlayers(prev => prev.map(player => {
          // Simulate answer based on player's accuracy
          const gotCorrect = Math.random() < player.accuracy;
          return {
            ...player,
            score: gotCorrect ? player.score + 1 : player.score
          };
        }));
      }, Math.random() * 3000 + 1000); // Random delay 1-4 seconds

      return () => clearTimeout(timer);
    }
  }, [currentQuestion]);

  return players;
};

const QuizGame = ({ 
  quiz, 
  mode = 'solo', 
  onBack, 
  onComplete,
  onPlayerScoreUpdate 
}) => {
  const questions = quiz?.questions || [];
  const {
    currentQuestion,
    selectedAnswer,
    userAnswer,
    userMatches,
    timeLeft,
    isPaused,
    displayScore,
    score,
    setCurrentQuestion,
    setSelectedAnswer,
    setUserAnswer,
    setUserMatches,
    setTimeLeft,
    setIsPaused,
    isAnswerCorrect,
    updateScore,
    getTimeSpent
  } = useQuizCore(questions, mode, 30);

  // Simulated players for battle mode (remove when adding database)
  const simulatedPlayers = useSimulatedPlayers(questions.length, currentQuestion);
  const [userPlayer] = useState({ id: 'user', name: 'You', initial: 'Y', score: 0 });
  
  // Combine user with simulated players for battle mode
  const allPlayers = mode === 'battle' ? [
    { ...userPlayer, score: score },
    ...simulatedPlayers
  ] : [];

  const currentQ = questions[currentQuestion];

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer || isPaused) return;
    
    setSelectedAnswer(answer);
    
    const isCorrect = isAnswerCorrect(currentQ, answer);
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleFillInAnswer = () => {
    if (!userAnswer?.trim() || userAnswer.includes('_submitted') || isPaused) return;
    
    const actualAnswer = userAnswer.trim();
    const isCorrect = isAnswerCorrect(currentQ, actualAnswer);
    
    setUserAnswer(actualAnswer + '_submitted');
    
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleMatchingSubmit = (matches) => {
    if (isPaused || isProcessing) return; // Prevent multiple submits
    
    setIsProcessing(true); // Block further submits
    setUserMatches(matches);
    const isCorrect = isAnswerCorrect(currentQ, matches);
    
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false); // Re-enable for next question
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    setIsProcessing(false); // Reset processing state
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const results = {
      score: score,
      totalQuestions: questions.length,
      timeSpent: getTimeSpent(),
      quizTitle: quiz.title
    };
    
    if (mode === 'battle') {
      // For battle mode, include all players in results
      results.players = allPlayers;
      results.winner = allPlayers.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
    }
    
    onComplete(results);
  };

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">No questions available</h2>
          <button onClick={onBack} className="bg-black text-white px-6 py-3 rounded-lg">
            Go Back
          </button>
        </div>
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
            <div>
              <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
              <p className="text-sm text-gray-700">
                Question {currentQuestion + 1} of {questions.length}
                {mode === 'battle' && ` • ${allPlayers.length} Players`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-semibold text-black">{timeLeft}s</span>
            </div>
            <div className="text-sm text-gray-700">
              Score: {displayScore}/{questions.length}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-200 h-2">
          <div
            className="bg-green-500 h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className={`${mode === 'battle' ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}`}>
          {/* Quiz Question */}
          <div className={mode === 'battle' ? 'lg:col-span-3' : ''}>
            <QuizQuestion
              question={currentQ}
              selectedAnswer={selectedAnswer}
              userAnswer={userAnswer}
              userMatches={userMatches}
              onAnswerSelect={handleAnswerSelect}
              onFillInAnswer={handleFillInAnswer}
              onMatchingSubmit={handleMatchingSubmit}
              onUserAnswerChange={setUserAnswer}
              timeLeft={timeLeft}
              isPaused={isPaused}
              isAnswerCorrect={isAnswerCorrect}
            />
          </div>
          
          {/* Live Leaderboard (Battle Mode Only) */}
          {mode === 'battle' && (
            <div className="lg:col-span-1">
              <LiveLeaderboard players={allPlayers} currentPlayerName="You" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGame;