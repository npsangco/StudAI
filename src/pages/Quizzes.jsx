import React, { useState, useEffect } from 'react';
import { 
  QuizControls, 
  QuizList, 
  QuizBattles
} from '../components/quizzes/QuizUIComponents';
import { QuestionCard } from '../components/quizzes/QuizComponents';
import QuizModal from '../components/quizzes/QuizModal';
import QuizGame from '../components/quizzes/QuizGame';
import QuizResults from '../components/quizzes/QuizResults';
import QuizLeaderboard from '../components/quizzes/QuizLeaderboard';
import { Loader2, Users, UserCircle } from 'lucide-react';
import { useLobbySimulation } from '../components/quizzes/QuizLobbySimulation';

// Animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
    }
    50% {
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.8);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
    opacity: 0;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .player-icon {
    transition: transform 0.3s ease;
    cursor: pointer;
  }

  .player-icon:hover {
    transform: scale(1.1);
  }
`;

function QuizzesPage() {
  const [gamePin, setGamePin] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameResults, setGameResults] = useState(null);
  const [soloResults, setSoloResults] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [quizKey, setQuizKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [playerPositions, setPlayerPositions] = useState([]);
    useLobbySimulation(lobbyPlayers, setLobbyPlayers, currentView === 'lobby');

  // Generate random positions for players when they join
  useEffect(() => {
    if (currentView === 'lobby' && lobbyPlayers.length > 0) {
      setPlayerPositions(prev => {
        const newPositions = [...prev];
        
        // Add positions for new players
        for (let i = prev.length; i < lobbyPlayers.length; i++) {
          newPositions.push({
            x: Math.random() * 70 + 15, // 15-85% from left
            y: Math.random() * 60 + 20, // 20-80% from top
            vx: (Math.random() - 0.5) * 0.5, // velocity x
            vy: (Math.random() - 0.5) * 0.5  // velocity y
          });
        }
        
        return newPositions;
      });
    }
  }, [lobbyPlayers.length, currentView]);

  // Animate player positions
  useEffect(() => {
    if (currentView !== 'lobby') return;
    
    const animationInterval = setInterval(() => {
      setPlayerPositions(prev => {
        return prev.map((pos, index) => {
          let newX = pos.x + pos.vx;
          let newY = pos.y + pos.vy;
          let newVx = pos.vx;
          let newVy = pos.vy;

          // Bounce off walls
          if (newX <= 5 || newX >= 90) {
            newVx = -pos.vx;
            newX = newX <= 5 ? 5 : 90;
          }
          if (newY <= 10 || newY >= 85) {
            newVy = -pos.vy;
            newY = newY <= 10 ? 10 : 85;
          }

          // Check collision with other players
          prev.forEach((otherPos, otherIndex) => {
            if (index !== otherIndex) {
              const dx = newX - otherPos.x;
              const dy = newY - otherPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 10) { // Collision threshold
                newVx = -newVx;
                newVy = -newVy;
              }
            }
          });

          return {
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
          };
        });
      });
    }, 50);

    return () => clearInterval(animationInterval);
  }, [currentView]);
  
  const [quizList, setQuizList] = useState([
    {
      id: 1,
      title: 'Data Algorithms',
      questionCount: 50, 
      created: 'Created today',
      isPublic: true
    },
    {
      id: 2,
      title: 'Database',
      questionCount: 15,
      created: 'Created 9d ago',
      isPublic: false
    },
    {
      id: 3,
      title: 'Web Development',
      questionCount: 20,
      created: 'Created 10d ago',
      isPublic: false
    },
    {
      id: 4,
      title: 'Data Structures',
      questionCount: 25,
      created: 'Created 12d ago',
      isPublic: false
    }
  ]);
  
  const [questions, setQuestions] = useState([
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
      question: 'The _______ complexity of binary search is O(log n), which makes it significantly more efficient than linear search\'s O(n) complexity when searching through sorted datasets.',
      answer: 'time'
    },
    {
      id: 3,
      type: 'Matching',
      question: 'Match the programming concepts with their definitions:',
      matchingPairs: [
        { left: 'Variable', right: 'A named storage location' },
        { left: 'Function', right: 'A reusable block of code' },
        { left: 'Loop', right: 'A control structure for repetition' }
      ]
    }
  ]);

  const createNewQuestion = (type = 'Multiple Choice') => {
    const baseQuestion = {
      id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
      question: '',
      type: type
    };

    switch (type) {
      case 'Multiple Choice':
        return {
          ...baseQuestion,
          choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correctAnswer: 'Option 1'
        };
      case 'Fill in the blanks':
        return {
          ...baseQuestion,
          answer: ''
        };
      case 'True/False':
        return {
          ...baseQuestion,
          correctAnswer: 'True'
        };
      case 'Matching':
        return {
          ...baseQuestion,
          matchingPairs: [{ left: '', right: '' }]
        };
      default:
        return baseQuestion;
    }
  };

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuiz(null);
  };

  const handleSoloQuiz = () => {
    setShowModal(false);
    setIsLoading(true);
    setCountdown(3);
    setCurrentView('loading');
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            setIsLoading(false);
            setCurrentView('solo');
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleQuizBattle = () => {
    setShowModal(false);
    setCurrentView('lobby');
    
    // Start with just the user
    const initialPlayers = [
      { id: 'user', name: 'You', initial: 'Y', isReady: false }
    ];
    setLobbyPlayers(initialPlayers);
  };

  const handleUserReady = () => {
    setLobbyPlayers(prev => prev.map(p => 
      p.id === 'user' ? { ...p, isReady: true } : p
    ));
  };

  // Check if all players are ready and start countdown
  useEffect(() => {
    if (currentView === 'lobby' && lobbyPlayers.length > 0 && lobbyPlayers.every(p => p.isReady)) {
      setTimeout(() => {
        setIsLoading(true);
        setCountdown(3);
        
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setTimeout(() => {
                setIsLoading(false);
                setCurrentView('battle');
              }, 500);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, 1000);
    }
  }, [lobbyPlayers, currentView]);

  const handleShowSoloResults = (results) => {
    setSoloResults(results);
    setShowResults(true);
  };

  const handleCloseSoloResults = () => {
    setShowResults(false);
    setSoloResults(null);
    setCurrentView('list');
  };

  const handleRetrySoloQuiz = () => {
    setShowResults(false);
    setQuizKey(prev => prev + 1);
  };

  const handleShowLeaderboard = (results) => {
    setGameResults(results);
    setShowLeaderboard(true);
  };

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
    setGameResults(null);
    setCurrentView('list');
  };

  const handleRetryQuiz = () => {
    setShowLeaderboard(false);
    setQuizKey(prev => prev + 1);
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setQuestions(questions.length > 0 ? questions : []);
    setCurrentView('editing');
  };

  const handleBackToList = () => {
    setEditingQuiz(null);
    setSelectedQuiz(null);
    setCurrentView('list');
    setIsLoading(false);
    setCountdown(3);
    setLobbyPlayers([]);
    setPlayerPositions([]);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleAddQuestion = () => {
    const newQuestion = createNewQuestion('Multiple Choice');
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (field === 'type' && value !== q.type) {
          const newQuestion = createNewQuestion(value);
          return {
            ...newQuestion,
            id: q.id,
            question: q.question
          };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleUpdateChoice = (questionId, choiceIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        const newChoices = [...q.choices];
        newChoices[choiceIndex] = value;
        return { ...q, choices: newChoices };
      }
      return q;
    }));
  };

  const handleAddChoice = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        return { ...q, choices: [...q.choices, ''] };
      }
      return q;
    }));
  };

  const handleAddMatchingPair = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          matchingPairs: [
            ...(q.matchingPairs || []),
            { left: '', right: '' }
          ]
        };
      }
      return q;
    }));
  };

  const handleUpdateMatchingPair = (questionId, pairIndex, side, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.matchingPairs) {
        const newPairs = [...q.matchingPairs];
        newPairs[pairIndex] = {
          ...newPairs[pairIndex],
          [side]: value
        };
        return { ...q, matchingPairs: newPairs };
      }
      return q;
    }));
  };

  const handleRemoveMatchingPair = (questionId, pairIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.matchingPairs) {
        return {
          ...q,
          matchingPairs: q.matchingPairs.filter((_, index) => index !== pairIndex)
        };
      }
      return q;
    }));
  };

  const handleSaveQuiz = () => {
    console.log('Saving quiz:', editingQuiz.title, questions);
    alert('Quiz saved successfully!');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newQuizList = [...quizList];
      const draggedItem = newQuizList[draggedIndex];
      
      newQuizList.splice(draggedIndex, 1);
      newQuizList.splice(dropIndex, 0, draggedItem);
      
      setQuizList(newQuizList);
    }
    setDraggedIndex(null);
  };

  // Loading Screen
  if (currentView === 'loading') {
    return (
      <>
        <style>{styles}</style>
        <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="mb-8">
              {countdown > 0 ? (
                <div className="text-9xl font-bold text-black animate-bounce">
                  {countdown}
                </div>
              ) : (
                <Loader2 className="w-24 h-24 text-black animate-spin mx-auto" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-black mb-2">
              {countdown > 0 ? 'Get Ready!' : 'Loading Quiz...'}
            </h2>
            <p className="text-gray-800 text-lg font-medium">
              {selectedQuiz?.title}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Lobby Screen
  if (currentView === 'lobby') {
    const userPlayer = lobbyPlayers.find(p => p.id === 'user');
    const totalPlayers = lobbyPlayers.length;
    const readyPlayers = lobbyPlayers.filter(p => p.isReady).length;
    const allReady = totalPlayers > 1 && lobbyPlayers.every(p => p.isReady);
    
    return (
      <>
        <style>{styles}</style>
        <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 relative overflow-hidden">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-black mb-2 drop-shadow-lg">Quiz Battle Lobby</h1>
              <p className="text-black text-lg font-medium mb-4">{selectedQuiz?.title}</p>
              
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white bg-opacity-90 rounded-full shadow-lg">
                <Users className="w-6 h-6 text-yellow-700" />
                <span className="font-bold text-yellow-700 text-lg">
                  {readyPlayers}/{totalPlayers} Ready
                </span>
              </div>
            </div>
          </div>

          {/* Floating Players */}
          <div className="absolute inset-0">
            {lobbyPlayers.map((player, index) => {
              const pos = playerPositions[index] || { x: 50, y: 50 };
              
              return (
                <div
                  key={player.id}
                  className="absolute player-icon animate-float"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    animationDelay: `${index * 0.3}s`
                  }}
                >
                  <div className="text-center">
                    <div 
                      className={`w-24 h-24 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center text-black font-bold text-3xl shadow-2xl border-4 ${
                        player.isReady 
                          ? 'border-green-500 animate-pulse-glow' 
                          : 'border-yellow-600'
                      }`}
                    >
                      {player.initial}
                    </div>
                    <div className="mt-2 bg-black bg-opacity-70 px-3 py-1 rounded-full">
                      <div className="font-bold text-white text-sm">{player.name}</div>
                      {player.isReady ? (
                        <div className="text-xs text-green-400 font-medium flex items-center justify-center gap-1">
                          <span>✓</span> Ready
                        </div>
                      ) : (
                        <div className="text-xs text-gray-300">Waiting...</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              {/* Ready Button for User */}
              {userPlayer && !userPlayer.isReady && (
                <button
                  onClick={handleUserReady}
                  className="px-12 py-5 bg-green-500 text-white rounded-2xl font-bold text-2xl hover:bg-green-600 transition-all shadow-2xl hover:scale-105"
                >
                  I'm Ready!
                </button>
              )}

              {/* Status Messages */}
              {allReady && (
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-white bg-opacity-95 text-black rounded-2xl font-bold text-xl shadow-2xl">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  All players ready! Starting quiz...
                </div>
              )}

              {userPlayer && userPlayer.isReady && !allReady && totalPlayers === 1 && (
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-white bg-opacity-90 text-blue-700 rounded-2xl font-semibold text-lg shadow-xl">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Waiting for other players to join...
                </div>
              )}

              {userPlayer && userPlayer.isReady && !allReady && totalPlayers > 1 && (
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-white bg-opacity-90 text-blue-700 rounded-2xl font-semibold text-lg shadow-xl">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Waiting for {totalPlayers - readyPlayers} more player{totalPlayers - readyPlayers !== 1 ? 's' : ''} to ready up...
                </div>
              )}
              
              <div>
                <button 
                  onClick={handleBackToList}
                  className="text-black hover:text-gray-800 font-bold text-lg bg-white bg-opacity-70 px-6 py-2 rounded-full hover:bg-opacity-90 transition-all"
                >
                  ← Leave Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (currentView === 'solo' && selectedQuiz) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame 
          key={`solo-${quizKey}`}
          quiz={{
            ...selectedQuiz,
            questions: questions
          }}
          mode="solo"
          onBack={handleBackToList}
          onComplete={handleShowSoloResults}
        />
        
        <QuizResults
          isOpen={showResults}
          onClose={handleCloseSoloResults}
          onRetry={handleRetrySoloQuiz}
          results={soloResults}
          mode="solo"
        />
      </>
    );
  }
  
  if (currentView === 'battle' && selectedQuiz) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame 
          key={`battle-${quizKey}`}
          quiz={{
            ...selectedQuiz,
            questions: questions
          }}
          mode="battle"
          onBack={handleBackToList}
          onComplete={handleShowLeaderboard}
        />
        
        <QuizLeaderboard
          isOpen={showLeaderboard}
          onClose={handleCloseLeaderboard}
          onRetry={handleRetryQuiz}
          results={gameResults}
        />
      </>
    );
  }

  if (currentView === 'editing' && editingQuiz) {
    return (
      <>
        <style>{styles}</style>
        <div className="min-h-screen bg-gray-50">
          <QuizControls 
            quiz={editingQuiz}
            onBack={handleBackToList}
            onAddQuestion={handleAddQuestion}
            onSave={handleSaveQuiz}
          />
          
          <div className="max-w-4xl mx-auto p-6">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdateQuestion={handleUpdateQuestion}
                  onUpdateChoice={handleUpdateChoice}
                  onAddChoice={handleAddChoice}
                  onDeleteQuestion={handleDeleteQuestion}
                  onAddMatchingPair={handleAddMatchingPair}
                  onUpdateMatchingPair={handleUpdateMatchingPair}
                  onRemoveMatchingPair={handleRemoveMatchingPair}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <QuizList 
              quizzes={quizList}
              draggedIndex={draggedIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditQuiz={handleEditQuiz}
              onQuizSelect={handleQuizSelect}
            />
            
            <QuizBattles 
              gamePin={gamePin}
              setGamePin={setGamePin}
            />
          </div>
        </div>
        
        <QuizModal
          quiz={selectedQuiz}
          isOpen={showModal}
          onClose={handleCloseModal}
          onSoloQuiz={handleSoloQuiz}
          onQuizBattle={handleQuizBattle}
        />
        
        <QuizResults
          isOpen={showResults}
          onClose={handleCloseSoloResults}
          onRetry={handleRetrySoloQuiz}
          results={soloResults}
          mode="solo"
        />
        
        <QuizLeaderboard
          isOpen={showLeaderboard}
          onClose={handleCloseLeaderboard}
          onRetry={handleRetryQuiz}
          results={gameResults}
        />
      </div>
    </>
  );
}

export default QuizzesPage;