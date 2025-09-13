import React, { useState } from 'react';
import { 
  QuizControls, 
  QuestionCard, 
  QuizList, 
  QuizBattles
} from '../components/QuizComponents';
import QuizModal from '../components/QuizModal';
import QuizSolo from '../components/QuizSolo';
import QuizBattle from '../components/QuizBattle';
import QuizLeaderboard from '../components/QuizLeaderboard';
import QuizSoloResult from '../components/QuizSoloResult';

function QuizzesPage() {
  // State Management
  const [gamePin, setGamePin] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSoloResults, setShowSoloResults] = useState(false);
  const [gameResults, setGameResults] = useState(null);
  const [soloResults, setSoloResults] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'editing', 'solo', 'battle'
  const [quizKey, setQuizKey] = useState(0);
  
  const [quizList, setQuizList] = useState([
    {
      id: 1,
      title: 'Data Algorithms',
      questions: 50,
      created: 'Created today',
      isPublic: true
    },
    {
      id: 2,
      title: 'Database',
      questions: 15,
      created: 'Created 9d ago',
      isPublic: false
    },
    {
      id: 3,
      title: 'Web Development',
      questions: 20,
      created: 'Created 10d ago',
      isPublic: false
    },
    {
      id: 4,
      title: 'Data Structures',
      questions: 25,
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
    }
  ]);

  // Quiz Selection Handlers
  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuiz(null);
  };

  const handleSoloQuiz = () => {
    setCurrentView('solo');
    setShowModal(false);
  };

  const handleQuizBattle = () => {
    setCurrentView('battle');
    setShowModal(false);
  };

  // Solo Quiz Results Handlers
  const handleShowSoloResults = (results) => {
    setSoloResults(results);
    setShowSoloResults(true);
  };

  const handleCloseSoloResults = () => {
    setShowSoloResults(false);
    setSoloResults(null);
    setCurrentView('list');
  };

  const handleRetrySoloQuiz = () => {
    setShowSoloResults(false);
    // Force re-mount of QuizSolo component by incrementing the key
    setQuizKey(prev => prev + 1);
    // Keep the same view to restart the solo quiz
  };

  // Quiz Battle Results and Leaderboard Handlers
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
    // Force re-mount of QuizBattle component by incrementing the key
    setQuizKey(prev => prev + 1);
    // Keep the same view to restart the battle quiz
  };

  // Quiz Management Handlers
  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setCurrentView('editing');
  };

  const handleBackToList = () => {
    setEditingQuiz(null);
    setSelectedQuiz(null);
    setCurrentView('list');
  };

  // Question Management Handlers
  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
      type: 'Multiple Choice',
      question: 'New question',
      choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'Option 1'
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
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

  const handleSaveQuiz = () => {
    console.log('Saving quiz:', editingQuiz.title, questions);
    alert('Quiz saved successfully!');
  };

  // Drag and Drop Handlers
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

  // Render Solo Quiz View
  if (currentView === 'solo' && selectedQuiz) {
    return (
      <>
        <QuizSolo 
          key={`solo-${quizKey}`} // Force re-mount on retry
          quiz={selectedQuiz}
          onBack={handleBackToList}
          onShowResults={handleShowSoloResults}
        />
        
        {/* Solo Quiz Results Modal */}
        <QuizSoloResult
          isOpen={showSoloResults}
          onClose={handleCloseSoloResults}
          onRetry={handleRetrySoloQuiz}
          score={soloResults?.score}
          totalQuestions={soloResults?.totalQuestions}
          timeSpent={soloResults?.timeSpent}
          quizTitle={soloResults?.quizTitle}
        />
      </>
    );
  }

  // Render Quiz Battle View
  if (currentView === 'battle' && selectedQuiz) {
    return (
      <>
        <QuizBattle 
          key={`battle-${quizKey}`} // Force re-mount on retry
          quiz={selectedQuiz}
          onBack={handleBackToList}
          onShowLeaderboard={handleShowLeaderboard}
        />
        
        {/* Leaderboard Modal */}
        <QuizLeaderboard
          isOpen={showLeaderboard}
          onClose={handleCloseLeaderboard}
          onRetry={handleRetryQuiz}
          winner={gameResults?.winner}
          players={gameResults?.players || []}
        />
      </>
    );
  }

  // Render Quiz Editing View
  if (currentView === 'editing' && editingQuiz) {
    return (
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
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Main Quiz List View
  return (
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
      
      {/* Quiz Selection Modal */}
      <QuizModal
        quiz={selectedQuiz}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSoloQuiz={handleSoloQuiz}
        onQuizBattle={handleQuizBattle}
      />
      
      {/* Solo Quiz Results Modal */}
      <QuizSoloResult
        isOpen={showSoloResults}
        onClose={handleCloseSoloResults}
        onRetry={handleRetrySoloQuiz}
        score={soloResults?.score}
        totalQuestions={soloResults?.totalQuestions}
        timeSpent={soloResults?.timeSpent}
        quizTitle={soloResults?.quizTitle}
      />
      
      {/* Battle Leaderboard Modal */}
      <QuizLeaderboard
        isOpen={showLeaderboard}
        onClose={handleCloseLeaderboard}
        onRetry={handleRetryQuiz}
        winner={gameResults?.winner}
        players={gameResults?.players || []}
      />
    </div>
  );
}

export default QuizzesPage;