import React, { useState } from 'react';
import { Edit, Trash2, Plus, GripVertical } from 'lucide-react';

function Quizzes() {
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

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleAddChoice = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        return { ...q, choices: [...q.choices, ''] };
      }
      return q;
    }));
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

  // Drag and drop
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
      
      // Remove dragged item
      newQuizList.splice(draggedIndex, 1);
      
      // Insert at new position
      newQuizList.splice(dropIndex, 0, draggedItem);
      
      setQuizList(newQuizList);
    }
    setDraggedIndex(null);
  };

  if (editingQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Quiz Title */}
        <div className="bg-white px-6 py-4 border-b">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-black">{editingQuiz.title}</h1>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                  Public
                </span>
                <span className="px-3 py-1 bg-gray-400 text-white text-xs rounded-full font-medium">
                  Private
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setEditingQuiz(null)}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Back
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 font-medium">
                Add a question
              </button>
              <button className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 font-medium">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="max-w-4xl mx-auto p-6">
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-lg border-l-4 border-green-500 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center cursor-move">
                      <span className="text-xs font-bold text-gray-500">::</span>
                    </div>
                    <select 
                      value={question.type}
                      onChange={(e) => handleUpdateQuestion(question.id, 'type', e.target.value)}
                      className="px-2 py-1 bg-gray-100 text-xs rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option>Multiple Choice</option>
                      <option>Fill in the blanks</option>
                      <option>True/False</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {index + 1}. {question.question}
                  </div>
                </div>

                {question.type === 'Multiple Choice' && question.choices && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {question.choices.map((choice, choiceIndex) => (
                        <button
                          key={choiceIndex}
                          onClick={() => handleUpdateQuestion(question.id, 'correctAnswer', choice)}
                          className={`px-3 py-2 text-left text-sm rounded border transition-colors ${
                            question.correctAnswer === choice
                              ? 'bg-green-500 text-white border-green-500 font-medium'
                              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-800'
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleAddChoice(question.id)}
                      className="flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add more choices +
                    </button>
                  </div>
                )}

                {question.type === 'Fill in the blanks' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={question.answer || ''}
                      onChange={(e) => handleUpdateQuestion(question.id, 'answer', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      placeholder="Correct answer"
                    />
                  </div>
                )}
              </div>
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
          
          {/* Left Part */}
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-black mb-6">Your Quizzes</h2>
            
            <div className="space-y-3 mb-6">
              {quizList.map((quiz, index) => (
                <div 
                  key={quiz.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex flex-col sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg cursor-move transition-all duration-200 gap-3 sm:gap-0 ${
                    draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-gray-100'
                  }`}
                >
                  {/* Left green border */}
                  <div className="w-1 h-8 bg-green-500 rounded-full mr-0 sm:mr-3 hidden sm:block"></div>
                  
                  <div className="flex items-center justify-center gap-2 mr-0 sm:mr-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 flex-1">
                    <h3 className="font-semibold text-black text-left sm:text-left min-w-0 flex-1">{quiz.title}</h3>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-sm">
                      <span className="text-gray-500 whitespace-nowrap">{quiz.questions} Questions</span>
                      <span className="text-gray-500 whitespace-nowrap">{quiz.created}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleEditQuiz(quiz)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors ml-0 sm:ml-3 self-end sm:self-center"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
            
            <button className="bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Create Quiz
            </button>
          </div>

          {/* Right Part */}
          <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-black mb-3">Join Quiz Battles</h2>
              <p className="text-gray-600 mb-6 text-sm">
                Challenge your friends or join an ongoing quiz battles!
              </p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="GAME PIN"
                  value={gamePin}
                  onChange={(e) => setGamePin(e.target.value)}
                  className="w-full max-w-xs mx-auto block px-4 py-3 bg-gray-100 border-0 rounded-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium tracking-wider"
                />
                
                <button className="bg-black text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                  Enter
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default Quizzes;