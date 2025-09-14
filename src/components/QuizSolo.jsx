import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { MatchingQuizPlayer } from './QuizComponents';

const QuizSolo = ({ quiz, onBack, onShowResults }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState(''); // For fill-in-the-blank
  const [userMatches, setUserMatches] = useState([]); // For matching questions
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());
  
  // Use ref to track score immediately and accurately
  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);

  // Sample questions for the quiz - now with all types
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
        { left: 'Stack', right: 'LIFO operations' }
      ]
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
    if (selectedAnswer) return; // Prevent changing answer after selection
    
    setSelectedAnswer(answer);
    
    // Update score IMMEDIATELY using ref for instant accuracy
    const isCorrect = isAnswerCorrect(questions[currentQuestion], answer);
    if (isCorrect) {
      scoreRef.current += 1;
      setDisplayScore(scoreRef.current);
    }
    
    // Auto-advance to next question after 2 seconds
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleFillInAnswer = () => {
    if (!userAnswer.trim() || userAnswer.includes('submitted')) return;
    
    const currentQ = questions[currentQuestion];
    const actualAnswer = userAnswer;
    const isCorrect = isAnswerCorrect(currentQ, actualAnswer);
    
    setUserAnswer(actualAnswer + '_submitted');
    
    if (isCorrect) {
      scoreRef.current += 1;
      setDisplayScore(scoreRef.current);
    }
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleMatchingSubmit = (matches) => {
    setUserMatches(matches);
    
    const currentQ = questions[currentQuestion];
    const isCorrect = isAnswerCorrect(currentQ, matches);
    
    if (isCorrect) {
      scoreRef.current += 1;
      setDisplayScore(scoreRef.current);
    }
    
    setTimeout(() => handleNextQuestion(), 2000);
  };

  const handleNextQuestion = () => {
    const newAnswers = [...userAnswers];
    
    // Store the appropriate answer based on question type
    if (questions[currentQuestion].type === 'Fill in the blanks') {
      newAnswers[currentQuestion] = userAnswer.replace('_submitted', '');
    } else if (questions[currentQuestion].type === 'Matching') {
      newAnswers[currentQuestion] = userMatches;
    } else {
      newAnswers[currentQuestion] = selectedAnswer;
    }
    
    setUserAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
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

  // For Matching questions, use the dedicated component
  if (currentQ.type === 'Matching') {
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
          
          {/* Multiple Choice Questions */}
          {currentQ.type === 'Multiple Choice' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
            <div className="grid grid-cols-2 gap-4 mb-8">
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
            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userAnswer.replace('_submitted', '')}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !userAnswer.includes('submitted') && handleFillInAnswer()}
                  className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your answer here..."
                  disabled={userAnswer.includes('submitted')}
                />
              </div>
            </div>
          )}

          {/* Submit Button for Fill in the Blanks - Positioned at Bottom */}
          {currentQ.type === 'Fill in the blanks' && (
            <div className="text-center mb-8">
              <button
                onClick={handleFillInAnswer}
                disabled={!userAnswer.trim() || userAnswer.includes('submitted')}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  !userAnswer.trim() || userAnswer.includes('submitted')
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Submit Answer
              </button>
            </div>
          )}
          
          {/* Result Display */}
          {(selectedAnswer || userAnswer.includes('submitted')) && (
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                (currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
                currentQ.type === 'Fill in the blanks' && userAnswer.includes('submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {(currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
                 currentQ.type === 'Fill in the blanks' && userAnswer.includes('submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) 
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
  );
};

export default QuizSolo;