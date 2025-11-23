import { X, Trash2, AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';

const QuestionsModal = ({ isOpen, onClose, quiz, questions, onDeleteQuestion }) => {
    const [deletingQuestionId, setDeletingQuestionId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleDelete = async (questionId) => {
        setDeletingQuestionId(questionId);
        await onDeleteQuestion(questionId);
        setDeletingQuestionId(null);
        setConfirmDeleteId(null);
    };

    const handleCancelDelete = () => {
        setConfirmDeleteId(null);
    };

    const renderQuestionContent = (question) => {
        // Parse JSON fields if they're strings, with null checks
        let choices = null;
        let matchingPairs = null;

        try {
            if (question.choices) {
                choices = typeof question.choices === 'string'
                    ? JSON.parse(question.choices)
                    : question.choices;
            }
        } catch (e) {
            console.error('Error parsing choices:', e);
            choices = null;
        }

        try {
            if (question.matching_pairs) {
                matchingPairs = typeof question.matching_pairs === 'string'
                    ? JSON.parse(question.matching_pairs)
                    : question.matching_pairs;
            }
        } catch (e) {
            console.error('Error parsing matching pairs:', e);
            matchingPairs = null;
        }

        switch (question.type) {
            case 'Multiple Choice':
                if (!choices || !Array.isArray(choices) || choices.length === 0) {
                    return (
                        <div className="mt-2 text-sm text-gray-500 italic">
                            No choices available
                        </div>
                    );
                }
                
                return (
                    <div className="mt-3 space-y-2">
                        {choices.map((choice, idx) => {
                            const isCorrect = choice === question.correct_answer;
                            return (
                                <div
                                    key={idx}
                                    className={`px-4 py-3 rounded-lg text-sm break-words transition-all ${
                                        isCorrect
                                            ? 'bg-green-50 border-2 border-green-300'
                                            : 'bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <span className={`font-semibold mr-2 ${
                                                isCorrect ? 'text-green-900' : 'text-gray-700'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}.
                                            </span>
                                            <span className={isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'}>
                                                {choice}
                                            </span>
                                        </div>
                                        {isCorrect && (
                                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1 flex-shrink-0">
                                                <Check className="w-3 h-3" />
                                                CORRECT ANSWER
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'True/False':
                return (
                    <div className="mt-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-50 border-2 border-green-300 rounded-lg">
                            <span className="text-sm font-semibold text-green-900">
                                {question.correct_answer || 'N/A'}
                            </span>
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                CORRECT
                            </span>
                        </div>
                    </div>
                );

            case 'Fill in the blanks':
                return (
                    <div className="mt-3">
                        <div className="px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                                        Correct Answer:
                                    </p>
                                    <p className="text-sm font-medium text-blue-900">
                                        {question.answer || question.correct_answer || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'Matching':
                if (!matchingPairs || !Array.isArray(matchingPairs) || matchingPairs.length === 0) {
                    return (
                        <div className="mt-2 text-sm text-gray-500 italic">
                            No matching pairs available
                        </div>
                    );
                }
                
                return (
                    <div className="mt-3">
                        <div className="mb-2">
                            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                                Correct Matches:
                            </span>
                        </div>
                        <div className="space-y-2">
                            {matchingPairs.map((pair, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-3 px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-lg"
                                >
                                    <span className="text-sm font-semibold text-purple-900 flex-shrink-0">
                                        {pair.left || ''}
                                    </span>
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="h-px flex-1 bg-purple-300"></div>
                                        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            MATCH
                                        </span>
                                        <div className="h-px flex-1 bg-purple-300"></div>
                                    </div>
                                    <span className="text-sm font-semibold text-purple-900 flex-shrink-0">
                                        {pair.right || ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy':
                return 'bg-green-100 text-green-700';
            case 'medium':
                return 'bg-yellow-100 text-yellow-700';
            case 'hard':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col transform transition-all animate-scaleIn">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{quiz?.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{quiz?.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-600">
                                Total Questions: <span className="font-semibold">{questions?.length || 0}</span>
                            </span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-600">
                                Quiz ID: <span className="font-semibold">{quiz?.quiz_id}</span>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {questions && questions.length > 0 ? (
                        <div className="space-y-4">
                            {questions.map((question, index) => (
                                <div
                                    key={question.question_id}
                                    className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors bg-white"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {/* Question Header */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-gray-400">Q{index + 1}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                                    {question.difficulty}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    {question.type}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {question.points} {question.points === 1 ? 'point' : 'points'}
                                                </span>
                                            </div>

                                            {/* Question Text */}
                                            <p className="text-gray-900 font-medium mb-2 break-words">
                                                {question.question}
                                            </p>

                                            {/* Question Content */}
                                            {renderQuestionContent(question)}
                                        </div>

                                        {/* Delete Button */}
                                        {confirmDeleteId === question.question_id ? (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleDelete(question.question_id)}
                                                    disabled={deletingQuestionId === question.question_id}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={handleCancelDelete}
                                                    disabled={deletingQuestionId === question.question_id}
                                                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(question.question_id)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
                            <p className="text-sm">No questions found in this quiz</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
        </div>
    );
};

export default QuestionsModal;