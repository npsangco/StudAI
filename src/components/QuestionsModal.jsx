import { X, Trash2, AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';

const QuestionsModal = ({ isOpen, onClose, quiz, questions, onDeleteQuestion }) => {
    const [deletingQuestionId, setDeletingQuestionId] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        question: null,
        reason: "",
        isSubmitting: false
    });

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const openDeleteModal = (question) => {
        setDeleteModalState({
            isOpen: true,
            question: question,
            reason: "",
            isSubmitting: false
        });
    };

    const closeDeleteModal = () => {
        setDeleteModalState({
            isOpen: false,
            question: null,
            reason: "",
            isSubmitting: false
        });
    };

    const handleDelete = async () => {
        if (!deleteModalState.reason.trim()) return;
        
        try {
            setDeleteModalState(prev => ({ ...prev, isSubmitting: true }));
            setDeletingQuestionId(deleteModalState.question.question_id);
            await onDeleteQuestion(deleteModalState.question.question_id, deleteModalState.reason);
            setDeletingQuestionId(null);
            closeDeleteModal();
        } catch (error) {
            console.error("Failed to delete question:", error);
            setDeleteModalState(prev => ({ ...prev, isSubmitting: false }));
            setDeletingQuestionId(null);
        }
    };

    const renderQuestionContent = (question) => {
        console.log('DEBUG - Full question object:', question);
        console.log('DEBUG - Question fields:', {
            type: question.type,
            choices: question.choices,
            choices_type: typeof question.choices,
            correct_answer: question.correct_answer,
            correctAnswer: question.correctAnswer,
            matching_pairs: question.matching_pairs,
            matchingPairs: question.matchingPairs,
            answer: question.answer
        });

        let choices = null;
        let matchingPairs = null;

        // Handle Multiple Choice questions
        try {
            const rawChoices = question.choices;
            console.log('DEBUG - Raw choices:', rawChoices);
            
            if (rawChoices !== null && rawChoices !== undefined) {
                if (typeof rawChoices === 'string') {
                    try {
                        choices = JSON.parse(rawChoices);
                        console.log('DEBUG - Parsed choices from string:', choices);
                    } catch (parseError) {
                        console.log('DEBUG - Failed to parse choices JSON:', parseError);
                        choices = null;
                    }
                } else if (Array.isArray(rawChoices)) {
                    choices = rawChoices;
                    console.log('DEBUG - Using array choices:', choices);
                } else if (typeof rawChoices === 'object') {
                    // Handle case where it's already an object but not an array
                    const values = Object.values(rawChoices);
                    choices = Array.isArray(values) ? values : null;
                    console.log('DEBUG - Converted object to array choices:', choices);
                }
            }
        } catch (e) {
            console.log('DEBUG - Error processing choices:', e);
            choices = null;
        }

        // Handle Matching questions
        try {
            const rawPairs = question.matchingPairs || question.matching_pairs;
            console.log('DEBUG - Raw pairs:', rawPairs);
            
            if (rawPairs !== null && rawPairs !== undefined) {
                if (typeof rawPairs === 'string') {
                    try {
                        matchingPairs = JSON.parse(rawPairs);
                        console.log('DEBUG - Parsed pairs from string:', matchingPairs);
                    } catch (parseError) {
                        console.log('DEBUG - Failed to parse pairs JSON:', parseError);
                        matchingPairs = null;
                    }
                } else if (Array.isArray(rawPairs)) {
                    matchingPairs = rawPairs;
                    console.log('DEBUG - Using array pairs:', matchingPairs);
                } else if (typeof rawPairs === 'object') {
                    // Handle case where it's an object with key-value pairs
                    if (Object.keys(rawPairs).length > 0) {
                        matchingPairs = Object.entries(rawPairs).map(([left, right]) => ({ left, right }));
                        console.log('DEBUG - Converted object to array pairs:', matchingPairs);
                    }
                }
            }
        } catch (e) {
            console.log('DEBUG - Error processing matching pairs:', e);
            matchingPairs = null;
        }

        console.log('DEBUG - Final processed data:', { choices, matchingPairs });

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
                            const correctAnswer = question.correctAnswer || question.correct_answer;
                            const isCorrect = choice === correctAnswer;
                            return (
                                <div
                                    key={idx}
                                    className={`px-4 py-3 rounded-lg text-sm break-words transition-all ${
                                        isCorrect
                                            ? 'bg-green-50 border-2 border-green-300'
                                            : 'bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className={`font-semibold flex-shrink-0 ${
                                            isCorrect ? 'text-green-900' : 'text-gray-700'
                                        }`}>
                                            {String.fromCharCode(65 + idx)}.
                                        </span>
                                        <span className={`flex-1 ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'}`}>
                                            {choice}
                                        </span>
                                        {isCorrect && (
                                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1 flex-shrink-0">
                                                <Check className="w-3 h-3" />
                                                CORRECT
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
                        <div className="px-4 py-3 bg-green-50 border-2 border-green-300 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                                        Correct Answer:
                                    </p>
                                    <p className="text-sm font-medium text-green-900">
                                        {question.correctAnswer || question.correct_answer || 'N/A'}
                                    </p>
                                </div>
                            </div>
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
                                        {question.answer || question.correctAnswer || question.correct_answer || 'N/A'}
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
                        <div className="mb-3">
                            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                                Correct Matches:
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Left Column */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Column A</h4>
                                {matchingPairs.map((pair, idx) => (
                                    <div
                                        key={`left-${idx}`}
                                        className="px-3 py-2 bg-purple-50 border-2 border-purple-300 rounded-lg"
                                    >
                                        <span className="text-sm font-semibold text-purple-900">
                                            {pair.left || ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Right Column */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Column B</h4>
                                {matchingPairs.map((pair, idx) => (
                                    <div
                                        key={`right-${idx}`}
                                        className="px-3 py-2 bg-purple-50 border-2 border-purple-300 rounded-lg"
                                    >
                                        <span className="text-sm font-semibold text-purple-900">
                                            {pair.right || ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
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
                                        <button
                                            onClick={() => openDeleteModal(question)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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

            {/* Delete Reason Modal */}
            {deleteModalState.isOpen && deleteModalState.question && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 sm:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                Delete Question
                            </h2>
                            <p className="text-gray-600 mb-4">
                                You are about to delete this question from "{quiz?.title}". This action cannot be undone.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                    {deleteModalState.question.question}
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={deleteModalState.reason}
                                    onChange={(e) => setDeleteModalState(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Enter the reason for deleting this question..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                                    rows="4"
                                    maxLength={150}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    This reason will be included in the email notification sent to {quiz?.creator} ({deleteModalState.reason.length}/150 characters)
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={closeDeleteModal}
                                    disabled={deleteModalState.isSubmitting}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={!deleteModalState.reason.trim() || deleteModalState.isSubmitting}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleteModalState.isSubmitting ? "Deleting..." : "Delete Question"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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