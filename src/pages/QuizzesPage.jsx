import React, { useState } from 'react';
import { 
  QuizControls, 
  QuestionCard, 
  QuizList, 
  QuizBattles 
} from './QuizComponents';

function QuizzesPage() {
  // State Management
  const [gamePin, setGamePin] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
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

  // Quiz Management Handlers
  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
  };

  const handleBackToList = () => {
    setEditingQuiz(null);
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

  // Render Quiz Editing View
  if (editingQuiz) {
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
          />
          
          <QuizBattles 
            gamePin={gamePin}
            setGamePin={setGamePin}
          />
        </div>
      </div>
    </div>
  );
}

export default QuizzesPage;