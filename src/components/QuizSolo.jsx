import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';

const QuizSolo = ({ quiz, onBack, onShowResults }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());
  
  // Use ref to track score immediately and accurately
  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);

  // Sample questions for the quiz
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

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
  }, [timeLeft]);

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer) return; // Prevent changing answer after selection
    
    setSelectedAnswer(answer);
    
    // Update score IMMEDIATELY using ref for instant accuracy
    const isCorrect = answer === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      scoreRef.current += 1;
      setDisplayScore(scoreRef.current);
    }
    
    // Auto-advance to next question after 2 seconds
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleNextQuestion = () => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedAnswer;
    setUserAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setTimeLeft(30);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const finishQuiz = (answers) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Use the ref score which is always accurate and up-to-date
    onShowResults({
      score: scoreRef.current,
      totalQuestions: questions.length,
      timeSpent: formatTime(timeSpent),
      quizTitle: quiz.title
    });
  };

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-yellow-400 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
        
        {/* Progress Bar */}
        <div className="bg-gray-200 h-2">
          <div
            className="bg-green-500 h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl p-8 shadow-sm border-l-4 border-green-500">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-black mb-4">
              {currentQuestion + 1}. {currentQ.question}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
          
          {selectedAnswer && (
            <div className="text-center">
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
  );
};

export default QuizSolo;