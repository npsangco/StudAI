import React, { useState } from 'react';
import { 
  QuizControls, 
  QuizList, 
  QuizBattles,
  QuestionCard  
} from '../components/quizzes/QuizComponents';
import QuizModal from '../components/quizzes/QuizModal';
import QuizGame from '../components/quizzes/QuizGame';
import QuizResults from '../components/quizzes/QuizResults';
import QuizLeaderboard from '../components/quizzes/QuizLeaderboard';

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
    setCurrentView('solo');
    setShowModal(false);
  };

  const handleQuizBattle = () => {
    setCurrentView('battle');
    setShowModal(false);
  };

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
    // For now, use global questions - later you'll load from database
    setQuestions(questions.length > 0 ? questions : []);
    setCurrentView('editing');
  };

  const handleBackToList = () => {
    setEditingQuiz(null);
    setSelectedQuiz(null);
    setCurrentView('list');
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

  if (currentView === 'solo' && selectedQuiz) {
    return (
      <>
        <QuizGame 
          key={`solo-${quizKey}`}
          quiz={{
            ...selectedQuiz,
            questions: questions // Pass the actual questions array
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
        <QuizGame 
          key={`battle-${quizKey}`}
          quiz={{
            ...selectedQuiz,
            questions: questions // Pass the actual questions array
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
    );
  }

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
  );
}

export default QuizzesPage;