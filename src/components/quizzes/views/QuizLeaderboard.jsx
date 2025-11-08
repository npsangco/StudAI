import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import AnswerReviewModal from './AnswerReviewModal';
import { listenToPlayers, syncBattleResultsToMySQL  } from '../../../firebase/battleOperations';

const QuizLeaderboard = ({ isOpen, onClose, onRetry, results }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH FINAL SCORES FROM FIREBASE
  useEffect(() => {
    if (!isOpen) return;
    
    // If we have a gamePin, fetch real-time results from Firebase
    if (results?.gamePin) {
      console.log('📊 Fetching final results from Firebase for PIN:', results.gamePin);
      
      const unsubscribe = listenToPlayers(results.gamePin, (firebasePlayers) => {
        console.log('🔥 Firebase final results:', firebasePlayers);
        
        // Transform Firebase players to leaderboard format
        const formattedResults = firebasePlayers.map(player => ({
          id: `user_${player.userId}`,
          userId: player.userId,
          name: player.name,
          score: player.score || 0,
          initial: player.initial || player.name[0]
        }));
        
        setFinalPlayers(formattedResults);
        setLoading(false);
      });

      return () => {
        console.log('🔇 Unsubscribing from final leaderboard');
        unsubscribe();
      };
    } else {
      // Fallback: use prop results if no gamePin
      console.log('⚠️ No gamePin, using prop results');
      setFinalPlayers(results?.players || []);
      setLoading(false);
    }
  }, [isOpen, results?.gamePin, results?.players]);
  
    // ========================================
    // SYNC RESULTS TO MYSQL
    // ========================================
    useEffect(() => {
      if (!isOpen || !results?.gamePin) return;
      
      const hasBeenSynced = sessionStorage.getItem(`synced_${results.gamePin}`);
      if (hasBeenSynced) {
        console.log('⏭️ Battle already synced, skipping...');
        return;
      }
      
      console.log('🔄 Triggering MySQL sync for:', results.gamePin);
      
      const syncTimeout = setTimeout(async () => {
        const success = await syncBattleResultsToMySQL(results.gamePin);
        
        if (success) {
          console.log('✅ Battle results saved to database');
          sessionStorage.setItem(`synced_${results.gamePin}`, 'true');
        } else {
          console.error('❌ Failed to save battle results');
        }
      }, 2000);
      
      return () => clearTimeout(syncTimeout);
    }, [isOpen, results?.gamePin]);

    // ========================================
    // NEW: CLEANUP ON UNMOUNT
    // ========================================
    // Add a ref to track previous state
    const prevOpenRef = useRef(isOpen);

    useEffect(() => {
      // Detect when modal CLOSES (was open, now closed)
      if (prevOpenRef.current === true && isOpen === false && results?.gamePin) {
        const hasBeenCleaned = sessionStorage.getItem(`cleaned_${results.gamePin}`);
        
        if (!hasBeenCleaned) {
          console.log('🧹 Modal just closed! Cleaning up Firebase...');
          
          import('../../../firebase/battleOperations').then(({ deleteBattleRoom }) => {
            deleteBattleRoom(results.gamePin)
              .then(() => {
                console.log('✅ Firebase cleanup complete');
                sessionStorage.setItem(`cleaned_${results.gamePin}`, 'true');
              })
              .catch(err => console.error('❌ Cleanup failed:', err));
          });
        }
      }
      
      // Update previous state
      prevOpenRef.current = isOpen;
    }, [isOpen, results?.gamePin]);
    
  if (!isOpen) return null;

  // Show loading spinner while fetching
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg p-8 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <span className="text-gray-600 font-medium">Loading final results...</span>
        </div>
      </div>
    );
  }

  const validPlayers = finalPlayers || [];
  const answers = results?.answers || [];
  const quizTitle = results?.quizTitle || 'Quiz';
  
  const sortedPlayers = [...validPlayers].sort((a, b) => b.score - a.score);

  // Find the highest score
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
  
  // Find all winners (players with highest score)
  const winners = sortedPlayers.filter(p => p.score === highestScore);
  const isTie = winners.length > 1;

  // Calculate correct ranks with tie handling
  const getPlayerRank = (player) => {
    const playersWithHigherScores = sortedPlayers.filter(p => p.score > player.score);
    return playersWithHigherScores.length + 1;
  };

  const getRankColor = (rank, isTied) => {
    if (isTied) return 'text-yellow-600';
    
    switch (rank) {
      case 1: return 'text-green-600';
      case 2: return 'text-gray-600';
      case 3: return 'text-orange-600';
      default: return 'text-gray-500';
    }
  };

  const getRankText = (player) => {
    const rank = getPlayerRank(player);
    const playersWithSameScore = sortedPlayers.filter(p => p.score === player.score);
    const isTiedAtThisRank = playersWithSameScore.length > 1;
    
    const suffix = isTiedAtThisRank ? ' (Tie)' : '';
    
    switch (rank) {
      case 1: return '1st' + suffix;
      case 2: return '2nd' + suffix;
      case 3: return '3rd' + suffix;
      default: return `${rank}th` + suffix;
    }
  };

  const getRankEmoji = (player) => {
    const rank = getPlayerRank(player);
    const playersWithSameScore = sortedPlayers.filter(p => p.score === player.score);
    const isTiedAtThisRank = playersWithSameScore.length > 1;
    
    // Show crown only for tied winners
    if (rank === 1 && isTiedAtThisRank) return '👑';
    
    // Show medals only for top 3 when NOT tied
    if (!isTiedAtThisRank) {
      switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '';
      }
    }
    
    return '';
  };

  const pointsEarned = highestScore * 10;
  const expEarned = highestScore * 5;

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 max-w-4xl w-full">
          
          {/* Congratulations Card */}
          <div className="bg-white rounded-lg p-4 sm:p-5 md:p-6 shadow-xl flex-1">
            <div className="text-center">
              {/* Header */}
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
                {isTie ? 'It\'s a Tie! 🤝' : 'Congratulations! 🎉'}
              </h2>
              
              {/* Winner Display Section */}
              <>
                {isTie ? (
                  // Display all tied winners 
                  <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border-2 border-yellow-300">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">
                      {winners.length} players tied for 1st place!
                    </p>
                    <div className="space-y-2">
                      {winners.map((winner, idx) => (
                        <div key={idx} className="flex items-center justify-center gap-2 sm:gap-3 py-1.5 sm:py-2">
                          <span className="text-xl sm:text-2xl">👑</span>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {winner?.initial || '?'}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-black text-sm sm:text-base">{winner?.name || 'Unknown'}</div>
                            <div className="text-green-600 font-bold text-sm sm:text-base">{winner?.score || 0}pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : winners.length > 0 ? (
                  // Display single winner
                  <>
                    <div className="mb-3 sm:mb-4">
                      <div className="text-4xl sm:text-5xl mb-2">🏆</div>
                      <h3 className="text-xl sm:text-2xl font-bold text-black mb-1">
                        {winners[0]?.name || 'Unknown'} Wins!
                      </h3>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border-2 border-yellow-300">
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
                          {winners[0]?.initial || '?'}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-black text-base sm:text-lg">
                            {winners[0]?.name || 'Unknown'}
                          </div>
                          <div className="text-green-600 font-bold text-lg sm:text-xl">
                            {winners[0]?.score || 0}pts
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Fallback: No winners
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-gray-300">
                    <p className="text-gray-600 font-semibold">No results available</p>
                  </div>
                )}
              </>
              
              {/* Rewards Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-yellow-200">
                <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2 font-medium">
                  {isTie ? 'All winners earn:' : 'Rewards earned:'}
                </p>
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-base sm:text-lg">🏆</span>
                    <span className="font-bold text-yellow-700">+{pointsEarned} Points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base sm:text-lg">⭐</span>
                    <span className="font-bold text-blue-700">+{expEarned} EXP</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Responsive */}
              <div className="space-y-2 sm:space-y-3">
                {/* View Answer Summary Button */}
                {answers.length > 0 && (
                  <button
                    onClick={() => setShowAnswerReview(true)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>📝</span>
                    View Answer Summary
                  </button>
                )}
                
                <button 
                  onClick={onClose}
                  className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <X className="w-4 h-4" />
                  Exit
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white rounded-lg p-4 sm:p-5 md:p-6 shadow-xl flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6 text-center">
              Final Leaderboard
            </h2>
            
            <div className="space-y-2 sm:space-y-3 max-h-[50vh] lg:max-h-none overflow-y-auto scrollbar-thin">
              {sortedPlayers.map((player, index) => {
                const rank = getPlayerRank(player);
                const isWinner = winners.some(w => w.userId === player.userId);
                const playersWithSameScore = sortedPlayers.filter(p => p.score === player.score);
                const isTiedAtThisRank = playersWithSameScore.length > 1;
                const rankEmoji = getRankEmoji(player);
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-all ${
                      isWinner && isTie 
                        ? 'bg-yellow-50 border-2 border-yellow-400' 
                        : rank === 1 && !isTie
                        ? 'bg-green-50 border-2 border-green-400'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`font-bold text-xs sm:text-sm min-w-[60px] sm:min-w-[70px] flex-shrink-0 ${getRankColor(rank, isTiedAtThisRank)}`}>
                        {getRankText(player)}
                      </div>
                      
                      {rankEmoji && (
                        <span className="text-lg sm:text-xl flex-shrink-0">{rankEmoji}</span>
                      )}
                      
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm flex-shrink-0 ${
                        isWinner && isTie
                          ? 'bg-yellow-600'
                          : rank === 1 && !isTie
                          ? 'bg-green-600'
                          : 'bg-black'
                      }`}>
                        {player.initial}
                      </div>
                      
                      <div className="font-semibold text-black text-sm sm:text-base truncate">
                        {player.name}
                      </div>
                    </div>
                    
                    <div className={`font-bold text-sm sm:text-base flex-shrink-0 ${getRankColor(rank, isTiedAtThisRank)}`}>
                      {player.score}pts
                    </div>
                  </div>
                );
              })}
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