import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import AnswerReviewModal from './AnswerReviewModal';
import { 
  listenToPlayers, 
  syncBattleResultsToMySQL,
  incrementViewers,
  decrementViewersAndCleanup
} from '../../../firebase/battleOperations';

const QuizLeaderboard = ({ isOpen, onClose, results }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const syncAttempted = useRef(false);

  // Reset sync flag when modal closes or reopens
  useEffect(() => {
    if (!isOpen) {
      syncAttempted.current = false;
    }
  }, [isOpen]);

  // FETCH FINAL SCORES FROM FIREBASE
  useEffect(() => {
    if (!isOpen) return;
    
    if (results?.gamePin) {
      console.log('📊 Fetching final results from Firebase for PIN:', results.gamePin);
      
      const unsubscribe = listenToPlayers(results.gamePin, (firebasePlayers) => {
        const formattedResults = firebasePlayers.map(player => ({
          id: `user_${player.userId}`,
          userId: player.userId,
          name: player.name,
          score: player.forfeited ? 0 : (player.score || 0),
          initial: player.initial || player.name[0],
          forfeited: player.forfeited || false
        }));
        
        setFinalPlayers(formattedResults);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setFinalPlayers(results?.players || []);
      setLoading(false);
    }
  }, [isOpen, results?.gamePin, results?.players]);
  
  // SYNC WITH MYSQL (HOST ONLY)
  useEffect(() => {
    if (!isOpen || !results?.gamePin || !results?.isHost) return;
    if (syncAttempted.current || loading || finalPlayers.length === 0) return;
    
    syncAttempted.current = true;
    
    const syncTimeout = setTimeout(async () => {
      try {
        const result = await syncBattleResultsToMySQL(results.gamePin);
        if (result.success) {
          console.log('✅ Battle results synced to MySQL');
        }
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
    }, 1000);
    
    return () => clearTimeout(syncTimeout);
  }, [isOpen, results?.gamePin, results?.isHost, finalPlayers, loading]); 

  // VIEWER TRACKING
  useEffect(() => {
    if (!isOpen || !results?.gamePin) return;

    const gamePin = results.gamePin;
    let isRegistered = false;
    
    const registerViewer = async () => {
      try {
        const result = await incrementViewers(gamePin);
        if (result.success) {
          isRegistered = true;
          console.log(`✅ Viewer registered. Total viewers: ${result.viewerCount}`);
        }
      } catch (error) {
        console.error('❌ Error registering viewer:', error);
      }
    };

    registerViewer();

    const handleBeforeUnload = (e) => {
      if (isRegistered && gamePin) {
        const cleanupUrl = `https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app/battles/${gamePin}/metadata/pendingViewerCleanup/${Date.now()}.json`;
        
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({ 
            timestamp: Date.now(), 
            action: 'decrement',
            reason: 'beforeunload'
          })], { type: 'application/json' });
          navigator.sendBeacon(cleanupUrl, blob);
        }
      }
    };

    if (isRegistered) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (isRegistered) {
        const unregisterViewer = async () => {
          try {
            await decrementViewersAndCleanup(gamePin);
          } catch (error) {
            console.error('❌ Error unregistering viewer:', error);
          }
        };
        unregisterViewer();
      }
    };
  }, [isOpen, results?.gamePin]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <span className="text-gray-600 font-medium">Loading results...</span>
        </div>
      </div>
    );
  }

  // COMPUTE RESULTS
  const validPlayers = finalPlayers || [];
  const answers = results?.answers || [];
  const quizTitle = results?.quizTitle || 'Quiz Battle';
  
  const sortedPlayers = [...validPlayers].sort((a, b) => b.score - a.score);
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
  const winners = sortedPlayers.filter(p => p.score === highestScore);
  const isTie = winners.length > 1;

  const pointsEarned = highestScore * 10;

  // RENDER
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md mx-auto overflow-hidden">
          
          {/* Content */}
          <div className="p-5 sm:p-6">
            
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {isTie ? '✨ It\'s a Tie! 🤝' : '✨ Battle Complete! 🏆'}
              </h2>
            </div>

            {/* Winner Card */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 sm:p-5 mb-4 border-2 border-yellow-200 shadow-sm">
              {isTie ? (
                // Multiple Winners (Tie)
                <div className="text-center space-y-3">
                  <div className="text-3xl">🤝</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {winners.length} Players Tied!
                  </div>
                  
                  <div className="py-1">
                    <div className="w-10 h-0.5 bg-yellow-300 mx-auto rounded-full"></div>
                  </div>
                  
                  {/* Tied Winners List */}
                  <div className="space-y-2">
                    {winners.map((winner, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2.5 border border-yellow-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👑</span>
                          <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {winner?.initial || '?'}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-gray-900 text-sm">{winner?.name || 'Unknown'}</div>
                          </div>
                        </div>
                        <div className="font-bold text-yellow-600 text-sm">{winner?.score || 0}pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Single Winner
                <div className="text-center space-y-2">
                  <div className="text-4xl">🏆</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {winners[0]?.name || 'Unknown'}
                  </div>
                  <div className="text-sm font-medium text-gray-700">wins the battle!</div>
                  
                  <div className="py-1">
                    <div className="w-10 h-0.5 bg-yellow-300 mx-auto rounded-full"></div>
                  </div>
                  
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {winners[0]?.score || 0} Points
                  </div>
                </div>
              )}
            </div>

            {/* Ranking List */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-700 mb-2.5 text-center">
                📊 Final Rankings
              </h3>
              
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto scrollbar-thin">
                {sortedPlayers.map((player, index) => {
                  const rank = index + 1;
                  const isWinner = winners.some(w => w.userId === player.userId);
                  const rankEmoji = rank === 1 && !isTie ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                  
                  return (
                    <div 
                      key={player.id} 
                      className={`bg-white rounded-lg p-2 border-2 flex items-center justify-between ${
                        isWinner && isTie 
                          ? 'border-yellow-300' 
                          : isWinner
                          ? 'border-green-300'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-gray-600 min-w-[35px] flex-shrink-0">
                          {rank === 1 && isTie ? '1st (T)' : rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
                        </div>
                        
                        {rankEmoji && <span className="text-base flex-shrink-0">{rankEmoji}</span>}
                        {isTie && isWinner && <span className="text-base flex-shrink-0">👑</span>}
                        
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                          isWinner ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                          {player.initial}
                        </div>
                        
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {player.name}
                          {player.forfeited && <span className="ml-1 text-[9px] text-red-600">(Quit)</span>}
                        </div>
                      </div>
                      
                      <div className="text-xs font-bold text-gray-900 flex-shrink-0">
                        {player.score}pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rewards */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-2.5 mb-4 border border-green-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-700">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-bold">
                  {isTie ? 'Winners earned' : 'Winner earned'}: +{pointsEarned} Points
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Review Answers */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <span>📝</span>
                  Review Answers
                </button>
              )}
              
              {/* Exit */}
              <button 
                onClick={onClose}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Answer Review Modal */}
      <AnswerReviewModal
        isOpen={showAnswerReview}
        onClose={() => setShowAnswerReview(false)}
        answers={answers}
        quizTitle={quizTitle}
      />

      {/* Scrollbar Styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
      `}</style>
    </>
  );
};

export default QuizLeaderboard;
