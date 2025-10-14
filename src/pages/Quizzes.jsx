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
import { SoloLoadingScreen, BattleLobbyScreen } from '../components/quizzes/QuizLoadingScreens';
import { useLobbySimulation } from '../components/quizzes/QuizLobbySimulation';

// Animations
const styles = `
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

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
    opacity: 0;
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
  const [countdown, setCountdown] = useState(5);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [playerPositions, setPlayerPositions] = useState([]);
  
  useLobbySimulation(lobbyPlayers, setLobbyPlayers, currentView === 'lobby');

  // Hide/Show navbar based on current view
  useEffect(() => {
    const shouldHideNavbar = ['loading', 'loadingBattle', 'lobby', 'solo', 'battle'].includes(currentView);
    
    if (shouldHideNavbar) {
      document.body.classList.add('hide-navbar');
    } else {
      document.body.classList.remove('hide-navbar');
    }

    return () => {
      document.body.classList.remove('hide-navbar');
    };
  }, [currentView]);

  // Generate random positions for players when they join
  useEffect(() => {
    if (currentView === 'lobby' && lobbyPlayers.length > 0) {
      setPlayerPositions(prev => {
        const newPositions = [...prev];
        
        const radius = 2.5;
        
        for (let i = prev.length; i < lobbyPlayers.length; i++) {
          let x, y, tooClose;
          let attempts = 0;
          
          do {
            x = Math.random() * (100 - radius * 4) + radius * 2;
            y = Math.random() * (73 - radius * 2) + (12 + radius);
            tooClose = false;
            
            for (let j = 0; j < newPositions.length; j++) {
              const dx = x - newPositions[j].x;
              const dy = y - newPositions[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < radius * 2 + 3) {
                tooClose = true;
                break;
              }
            }
            
            attempts++;
          } while (tooClose && attempts < 50);
          
          // Walking speed
          newPositions.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2
          });
        }
        
        return newPositions;
      });
    }
  }, [lobbyPlayers.length, currentView]);
  
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
    setCountdown(5);
    setCurrentView('loading');
    
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

  useEffect(() => {
    if (currentView === 'lobby' && lobbyPlayers.length > 0 && lobbyPlayers.every(p => p.isReady)) {
      setTimeout(() => {
        setIsLoading(true);
        setCountdown(5); // Changed to 5 seconds like solo
        setCurrentView('loadingBattle'); // New loading state for battle
        
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

  const handleDeleteQuiz = (quiz) => {
    if (window.confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
      setQuizList(quizList.filter(q => q.id !== quiz.id));
    }
  };

  const handleBackToList = () => {
    setEditingQuiz(null);
    setSelectedQuiz(null);
    setCurrentView('list');
    setIsLoading(false);
    setCountdown(5);
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

  // Solo Loading Screen
  if (currentView === 'loading') {
    return (
      <SoloLoadingScreen 
        countdown={countdown} 
        quizTitle={selectedQuiz?.title} 
      />
    );
  }

  // Battle Loading Screen (after all players ready)
  if (currentView === 'loadingBattle') {
    return (
      <SoloLoadingScreen 
        countdown={countdown} 
        quizTitle={selectedQuiz?.title} 
      />
    );
  }

  // Battle Lobby Screen
  if (currentView === 'lobby') {
    return (
      <BattleLobbyScreen
        lobbyPlayers={lobbyPlayers}
        playerPositions={playerPositions}
        quizTitle={selectedQuiz?.title}
        onUserReady={handleUserReady}
        onLeave={handleBackToList}
      />
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
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <QuizList 
              quizzes={quizList}
              draggedIndex={draggedIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditQuiz={handleEditQuiz}
              onDeleteQuiz={handleDeleteQuiz}
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