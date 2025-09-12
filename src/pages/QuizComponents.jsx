import React from 'react';
import { Edit, Trash2, Plus, GripVertical, Play } from 'lucide-react';

// Quiz Controls Component
export const QuizControls = ({ quiz, onBack, onAddQuestion, onSave }) => (
  <div className="bg-white px-6 py-4">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
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
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Back
        </button>
        <button 
          onClick={onAddQuestion}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 font-medium"
        >
          Add a question
        </button>
        <button 
          onClick={onSave}
          className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 font-medium"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

// Multiple Choice Question Component
export const MultipleChoiceQuestion = ({ question, onUpdateQuestion, onUpdateChoice, onAddChoice }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      {question.choices.map((choice, choiceIndex) => (
        <div
          key={choiceIndex}
          onClick={() => onUpdateQuestion(question.id, 'correctAnswer', choice)}
          className={`p-3 rounded border transition-colors cursor-pointer ${
            question.correctAnswer === choice
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="text"
            value={choice}
            onChange={(e) => {
              e.stopPropagation();
              onUpdateChoice(question.id, choiceIndex, e.target.value);
            }}
            className={`w-full bg-transparent border-0 text-sm focus:outline-none ${
              question.correctAnswer === choice ? 'text-white placeholder-green-200' : 'text-gray-800 placeholder-gray-400'
            }`}
            placeholder={`Option ${choiceIndex + 1}`}
          />
        </div>
      ))}
    </div>
    <button
      onClick={() => onAddChoice(question.id)}
      className="flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add more choices +
    </button>
  </div>
);

// Fill in the Blanks Question Component
export const FillInBlanksQuestion = ({ question, onUpdateQuestion }) => (
  <div className="mt-3">
    <input
      type="text"
      value={question.answer || ''}
      onChange={(e) => onUpdateQuestion(question.id, 'answer', e.target.value)}
      className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      placeholder="Correct answer"
    />
  </div>
);

// Individual Question Card Component
export const QuestionCard = ({ question, index, onUpdateQuestion, onUpdateChoice, onAddChoice, onDeleteQuestion }) => (
  <div className="bg-white rounded-lg border-l-4 border-green-500 p-4 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center cursor-move">
          <span className="text-xs font-bold text-gray-500">::</span>
        </div>
        <select 
          value={question.type}
          onChange={(e) => onUpdateQuestion(question.id, 'type', e.target.value)}
          className="px-2 py-1 bg-gray-100 text-xs rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option>Multiple Choice</option>
          <option>Fill in the blanks</option>
          <option>True/False</option>
        </select>
      </div>
      <button 
        onClick={() => onDeleteQuestion(question.id)}
        className="p-1 text-red-500 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

    <div className="mb-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        {index + 1}. 
      </div>
      <textarea
        value={question.question}
        onChange={(e) => onUpdateQuestion(question.id, 'question', e.target.value)}
        className="w-full p-3 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="2"
        placeholder="Enter your question here..."
      />
    </div>

    {question.type === 'Multiple Choice' && question.choices && (
      <MultipleChoiceQuestion 
        question={question}
        onUpdateQuestion={onUpdateQuestion}
        onUpdateChoice={onUpdateChoice}
        onAddChoice={onAddChoice}
      />
    )}

    {question.type === 'Fill in the blanks' && (
      <FillInBlanksQuestion 
        question={question}
        onUpdateQuestion={onUpdateQuestion}
      />
    )}
  </div>
);

// Quiz Item Component
export const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect }) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, index)}
    className={`flex flex-col sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg transition-all duration-200 gap-3 sm:gap-0 ${
      draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-gray-100'
    }`}
  >
    <div className="w-1 h-8 bg-green-500 rounded-full mr-0 sm:mr-3 hidden sm:block"></div>
    
    <div className="flex items-center justify-center gap-2 mr-0 sm:mr-3">
      <GripVertical className="w-4 h-4 text-gray-400" />
    </div>
    
    <div 
      onClick={() => onSelect(quiz)}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 flex-1 cursor-pointer"
    >
      <h3 className="font-semibold text-black text-left sm:text-left min-w-0 flex-1 hover:text-blue-600 transition-colors">
        {quiz.title}
      </h3>
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-sm">
        <span className="text-gray-500 whitespace-nowrap">{quiz.questions} Questions</span>
        <span className="text-gray-500 whitespace-nowrap">{quiz.created}</span>
      </div>
    </div>
    
    <div className="flex gap-2 ml-0 sm:ml-3 self-end sm:self-center">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onSelect(quiz);
        }}
        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
        title="Start Quiz"
      >
        <Play className="w-4 h-4" />
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onEdit(quiz);
        }}
        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        title="Edit Quiz"
      >
        <Edit className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  </div>
);

// Quiz List Component
export const QuizList = ({ quizzes, draggedIndex, onDragStart, onDragOver, onDrop, onEditQuiz, onQuizSelect }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
    <h2 className="text-2xl font-bold text-black mb-6">Your Quizzes</h2>
    
    <div className="space-y-3 mb-6">
      {quizzes.map((quiz, index) => (
        <QuizItem
          key={quiz.id}
          quiz={quiz}
          index={index}
          draggedIndex={draggedIndex}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onEdit={onEditQuiz}
          onSelect={onQuizSelect}
        />
      ))}
    </div>
    
    <button className="bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors">
      Create Quiz
    </button>
  </div>
);

// Quiz Battles Component
export const QuizBattles = ({ gamePin, setGamePin }) => (
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
);