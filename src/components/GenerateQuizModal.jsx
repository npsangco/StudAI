import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader, CheckCircle, AlertCircle, Brain } from 'lucide-react';
import { quizApi } from '../api/api';
import { aiUsageApi } from '../api/api';

const QUESTION_TYPES = [
  'Multiple Choice',
  'Fill in the blanks',
  'True/False',
  'Matching'
];

const TITLE_CHAR_LIMIT = 50;
const TITLE_LENGTH_ERROR = `Quiz title must be ${TITLE_CHAR_LIMIT} characters or fewer.`;
const TITLE_REQUIRED_ERROR = 'Please enter a quiz title';

const GenerateQuizModal = ({ note, onClose, onQuizCreated, toast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quizTitle, setQuizTitle] = useState(`Quiz from "${note.title}"`);
  const [success, setSuccess] = useState(false);
  const [generatedQuizId, setGeneratedQuizId] = useState(null);
  const [usageSnapshot, setUsageSnapshot] = useState(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState(QUESTION_TYPES);

  const trimmedTitle = quizTitle.trim();
  const isTitleTooLong = quizTitle.length > TITLE_CHAR_LIMIT;

  const refreshUsage = useCallback(async () => {
    try {
      const { data } = await aiUsageApi.getToday();
      setUsageSnapshot(data);
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    } finally {
      setIsUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const quizLimit = usageSnapshot?.limits?.quiz ?? 2;
  const quizRemaining = usageSnapshot?.remaining?.quiz ?? quizLimit;
  const quizLimitReached = !isUsageLoading && quizRemaining <= 0;
  
  // Fixed 15-question default
  const questionCount = 15;

  const handleTypeToggle = (type) => {
    setSelectedQuestionTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
    setError(null);
  };

  const handleGenerateQuiz = async () => {
    if (!trimmedTitle) {
      setError(TITLE_REQUIRED_ERROR);
      return;
    }

    if (isTitleTooLong) {
      setError(TITLE_LENGTH_ERROR);
      return;
    }

    if (!selectedQuestionTypes.length) {
      setError('Select at least one question type');
      return;
    }

     if (quizLimitReached) {
       setError('Daily AI quiz limit reached. Try again tomorrow.');
       return;
     }

    setIsLoading(true);
    setError(null);

    try {
      // Call the API to generate quiz from notes (always 10 questions)
      const response = await quizApi.generateFromNote({
        noteId: note.id,
        noteContent: note.content,
        noteTitle: note.title,
        quizTitle: trimmedTitle,
        questionTypes: selectedQuestionTypes
      });

      if (response.data && response.data.quiz) {
        setGeneratedQuizId(response.data.quiz.quiz_id);
        setSuccess(true);
        refreshUsage();

        // Redirect to quiz after 2 seconds
        setTimeout(() => {
          window.location.href = `/quizzes`;
        }, 2000);
      } else {
        setError('Failed to generate quiz. Please try again.');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.details || 
        'Failed to generate quiz. Please ensure your note has enough content and try again.';
      setError(errorMessage);
      if (err.response?.status === 429) {
        refreshUsage();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Quiz Generated!</h3>
          <p className="text-slate-600 mb-6">
            Your quiz has been created successfully with {questionCount} questions.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to your quizzes...
          </p>
          <div className="mt-6 flex items-center justify-center">
            <Loader className="w-4 h-4 animate-spin text-blue-600 mr-2" />
            <span className="text-sm text-slate-600">Loading</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-800">Generate Quiz with AI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Note Info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Generating from note:</p>
          <p className="font-medium text-slate-800 truncate">{note.title}</p>
          <p className="text-xs text-slate-600 mt-1">{note.words || 0} words</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Quiz Title Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quiz Title
            <span className="text-xs text-slate-500 ml-2">({quizTitle.length}/{TITLE_CHAR_LIMIT})</span>
          </label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => {
              const value = e.target.value;
              setQuizTitle(value);
              if (error) {
                const resolvedLengthError = error === TITLE_LENGTH_ERROR && value.length <= TITLE_CHAR_LIMIT;
                const resolvedEmptyError = error === TITLE_REQUIRED_ERROR && value.trim();
                if (resolvedLengthError || resolvedEmptyError) {
                  setError(null);
                }
              }
            }}
            placeholder="Enter quiz title..."
            maxLength={TITLE_CHAR_LIMIT}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            disabled={isLoading}
          />
          {isTitleTooLong && (
            <p className="mt-1 text-xs text-red-600">
              {TITLE_LENGTH_ERROR} Shorten the generated title or edit it manually.
            </p>
          )}
        </div>

        {/* Question Types */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Question Types
          </label>
          <p className="text-xs text-slate-500 mb-3">Choose at least one format. The AI will only generate questions using the selected types.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUESTION_TYPES.map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition ${selectedQuestionTypes.includes(type) ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600"
                  checked={selectedQuestionTypes.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                  disabled={isLoading}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question Count Display */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-6">
          <p className="text-sm font-medium text-indigo-900 mb-1">Quiz Details</p>
          <p className="text-sm text-indigo-800">
            <strong>{questionCount} questions</strong> will be generated using: <span className="font-semibold">{selectedQuestionTypes.join(', ')}</span>.
          </p>
        </div>

        {/* Daily Limit Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-amber-800">
            <strong>⏰ Daily Limit:</strong> {quizLimit} AI quiz{quizLimit > 1 ? 'zes' : ''} per day. {quizLimitReached ? 'Limit reached for today.' : `${quizRemaining} left today.`}
          </p>
        </div>

        {quizLimitReached && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
            You have used your AI quiz generation for today. Please try again tomorrow.
          </div>
        )}

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Note:</strong> AI-generated questions are based on your note content. Review and edit them as needed after generation.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateQuiz}
            disabled={isLoading || quizLimitReached || isTitleTooLong}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Generate Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuizModal;
