import React, { useState } from 'react';
import { X } from 'lucide-react';
import AnswerReviewModal from './AnswerReviewModal';

const QuizLeaderboard = ({ isOpen, onClose, onRetry, results }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  if (!isOpen) return null;

  const validPlayers = results?.players || [];
  const validWinner = results?.winner || { name: 'Unknown', initial: 'U', score: 0 };
  const answers = results?.answers || [];
  const quizTitle = results?.quizTitle || 'Quiz';
  
  const sortedPlayers = [...validPlayers].sort((a, b) => b.score - a.score);

  const getRankColor = (index) => {
    switch (index) {
      case 0: return 'text-green-600';
      case 1: return 'text-gray-600';
      case 2: return 'text-yellow-600';
      default: return 'text-orange-600';
    }
  };

  const getRankText = (index) => {
    switch (index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      default: return `${index + 1}th`;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
        <div className="flex flex-col lg:flex-row gap-4 max-w-4xl w-full">
          {/* Congratulations Card */}
          <div className="bg-white rounded-lg p-6 shadow-xl flex-1">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-black mb-6">Congratulations!</h2>
              
              <div className="bg-yellow-100 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">
                    {validWinner.initial}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-black">{validWinner.name}</div>
                    <div className="text-green-600 font-bold">{validWinner.score}pts</div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6 text-sm">
                Congratulations you earned {validWinner.score * 10} Companion Points and {validWinner.score * 5} EXP!
              </p>

              {/* View Answer Summary Button */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md"
                >
                  Review Answers
                </button>
              )}
              
              <button 
                onClick={onClose}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Exit
              </button>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white rounded-lg p-6 shadow-xl flex-1">
            <h2 className="text-2xl font-bold text-black mb-6 text-center">Leaderboard</h2>
            
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`font-bold ${getRankColor(index)}`}>
                      {getRankText(index)}
                    </div>
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {player.initial}
                    </div>
                    <div className="font-semibold text-black">
                      {player.name}
                    </div>
                  </div>
                  <div className={`font-bold ${getRankColor(index)}`}>
                    {player.score}pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Separate Answer Review Modal */}
      <AnswerReviewModal
        isOpen={showAnswerReview}
        onClose={() => setShowAnswerReview(false)}
        answers={answers}
        quizTitle={quizTitle}
      />
    </>
  );
};

export default QuizLeaderboard;