import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import AnswerReviewModal from './AnswerReviewModal';
import { 
  listenToPlayers, 
  syncBattleResultsToMySQL,
  deleteBattleRoom, 
  incrementViewers,
  decrementViewersAndCleanup
} from '../../../firebase/battleOperations';
import { ref, get, set } from 'firebase/database';
import { realtimeDb } from '../../../firebase/config';

const QuizLeaderboard = ({ isOpen, onClose, onRetry, results }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const syncAttempted = useRef(false); // Prevent double sync

  // Reset sync flag when modal closes or reopens
  useEffect(() => {
    if (!isOpen) {
      syncAttempted.current = false;
      console.log('🔄 Sync flag reset - modal closed');
    }
  }, [isOpen]);

  // ========================================
  // FETCH FINAL SCORES FROM FIREBASE
  // ========================================
  useEffect(() => {
    if (!isOpen) return;
    
    if (results?.gamePin) {
      console.log('📊 Fetching final results from Firebase for PIN:', results.gamePin);
      
      const unsubscribe = listenToPlayers(results.gamePin, (firebasePlayers) => {
        console.log('🔥 Firebase final results:', firebasePlayers);
        
        const formattedResults = firebasePlayers.map(player => ({
          id: `user_${player.userId}`,
          userId: player.userId,
          name: player.name,
          score: player.forfeited ? 0 : (player.score || 0), // Force 0 score if forfeited
          initial: player.initial || player.name[0],
          forfeited: player.forfeited || false // Track forfeit status
        }));
        
        setFinalPlayers(formattedResults);
        setLoading(false);
      });

      return () => {
        console.log('🔇 Unsubscribing from final leaderboard');
        unsubscribe();
      };
    } else {
      console.log('⚠️ No gamePin, using prop results');
      setFinalPlayers(results?.players || []);
      setLoading(false);
    }
  }, [isOpen, results?.gamePin, results?.players]);
  
  // ========================================
  // SYNC WITH PROPER TIMING
  // ========================================
  useEffect(() => {
    // Early returns for invalid states
    if (!isOpen || !results?.gamePin) {
      return;
    }
    
    console.log('🎮 Leaderboard opened - Sync check:');
    console.log('   isOpen:', isOpen);
    console.log('   isHost:', results?.isHost);
    console.log('   gamePin:', results?.gamePin);
    console.log('   finalPlayers loaded:', finalPlayers.length);
    console.log('   loading state:', loading);
    console.log('   syncAttempted.current:', syncAttempted.current);
    
    // Only host syncs
    if (!results?.isHost) {
      console.log('⏭️ Not host, skipping MySQL sync');
      return;
    }
    
    // Prevent double sync
    if (syncAttempted.current) {
      console.log('⏭️ Sync already attempted (flag is true)');
      return;
    }
    
    // Wait for data to be loaded
    if (loading || finalPlayers.length === 0) {
      console.log('⏳ Waiting for Firebase data to load...');
      return;
    }
    
    // Mark as attempted IMMEDIATELY to prevent race conditions
    syncAttempted.current = true;
    console.log('🚩 Sync flag set to TRUE');
    
    console.log('🔄 HOST triggering MySQL sync for:', results.gamePin);
    console.log('📊 Players to sync:', finalPlayers);
    
    // Start sync with slight delay to ensure Firebase stability
    const syncTimeout = setTimeout(async () => {
      try {
        console.log('📡 Starting sync...');
        const result = await syncBattleResultsToMySQL(results.gamePin);
        
        console.log('📋 Sync result:', result);
        
        if (result.success) {
          console.log('✅ Battle results saved to MySQL successfully!');
          console.log('   Battle ID:', result.battleId);
          console.log('   Winner ID:', result.winnerId);
          console.log('   Total Players:', result.totalPlayers);
          console.log('   Updated Players:', result.updatedPlayers);
          
        } else if (result.alreadySynced) {
          console.log('ℹ️ Battle was already synced previously');
          
        } else {
          console.error('❌ Failed to save battle results to MySQL');
          console.error('   Error:', result.error);
          console.error('   Full result:', result);
        }
      } catch (error) {
        console.error('❌ Fatal sync error:', error);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
      }
    }, 1000); // Reduced to 1 second
    
    return () => {
      clearTimeout(syncTimeout);
    };
  }, [isOpen, results?.gamePin, results?.isHost, finalPlayers, loading]); 

  // ========================================
  // ATOMIC VIEWER TRACKING & CLEANUP
  // ========================================
  useEffect(() => {
    if (!isOpen || !results?.gamePin) return;

    const gamePin = results.gamePin;
    let isRegistered = false;
    
    console.log('👀 Registering viewer for battle:', gamePin);
    
    // Register this viewer atomically
    const registerViewer = async () => {
      try {
        const result = await incrementViewers(gamePin);
        
        if (result.success) {
          isRegistered = true;
          console.log(`✅ Viewer registered. Total viewers: ${result.viewerCount}`);
        } else {
          console.error('❌ Failed to register viewer:', result.error);
        }
      } catch (error) {
        console.error('❌ Error registering viewer:', error);
      }
    };

    registerViewer();

    // Handle browser close/refresh (X button)
    const handleBeforeUnload = (e) => {
      if (isRegistered && gamePin) {
        console.log('⚠️ Browser closing - marking viewer for cleanup');
        
        // Mark viewer for cleanup
        // The server-side or Firebase Functions can process this later
        const cleanupUrl = `https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app/battles/${gamePin}/metadata/pendingViewerCleanup/${Date.now()}.json`;
        
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({ 
            timestamp: Date.now(), 
            action: 'decrement',
            reason: 'beforeunload'
          })], { type: 'application/json' });
          navigator.sendBeacon(cleanupUrl, blob);
          console.log('📡 Sent viewer cleanup beacon');
        } else {
          // Fallback: synchronous XHR
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', cleanupUrl, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ 
              timestamp: Date.now(), 
              action: 'decrement',
              reason: 'beforeunload'
            }));
            console.log('📡 Sent viewer cleanup XHR');
          } catch (err) {
            console.error('❌ Failed to send viewer cleanup:', err);
          }
        }
      }
    };

    // Add event listener for browser close
    if (isRegistered) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup when component unmounts OR modal closes
    return () => {
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (isRegistered) {
        console.log('🚪 Unregistering viewer from battle:', gamePin);
        
        const unregisterViewer = async () => {
          try {
            const result = await decrementViewersAndCleanup(gamePin);
            
            if (result.success) {
              console.log(`✅ Viewer unregistered. Remaining: ${result.viewerCount}`);
              
              if (result.cleanedUp) {
                console.log('🗑️ Battle data cleaned up from Firebase');
              } else if (result.viewerCount === 0) {
                console.log('⏳ Cleanup pending MySQL sync confirmation');
              }
            } else {
              console.error('❌ Failed to unregister viewer:', result.error);
            }
          } catch (error) {
            console.error('❌ Error unregistering viewer:', error);
          }
        };

        unregisterViewer();
      }
    };
  }, [isOpen, results?.gamePin]);

  // ========================================
  // RENDER: LOADING STATE
  // ========================================
  if (!isOpen) return null;

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

  // ========================================
  // COMPUTE RESULTS DATA
  // ========================================
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

  // ========================================
  // RENDER: MAIN LEADERBOARD
  // ========================================
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

              {/* Action Buttons */}
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
                        {player.forfeited && (
                          <span className="ml-2 text-xs text-red-600 font-medium">(Forfeited)</span>
                        )}
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

      {/* Animation Styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </>
  );
};

export default QuizLeaderboard;
