// src/components/quizzes/views/QuizLeaderboard.jsx

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
  const viewerRegistered = useRef(false); // Track if this user is registered as viewer

  // 🆕 Add sync state tracking
  const [syncState, setSyncState] = useState({
    status: 'idle', // 'idle' | 'syncing' | 'success' | 'failed'
    error: null,
    attempt: 0
  });
  const syncAttempted = useRef(false); // Prevent double sync

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
      console.log('⚠️ No gamePin, using prop results');
      setFinalPlayers(results?.players || []);
      setLoading(false);
    }
  }, [isOpen, results?.gamePin, results?.players]);
  
  // ========================================
  // 🆕 IMPROVED: SYNC RESULTS TO MYSQL (HOST ONLY)
  // ========================================
  useEffect(() => {
    if (!isOpen || !results?.gamePin) return;
    
    // Only host syncs
    if (!results?.isHost) {
      console.log('⏭️ Not host, skipping MySQL sync');
      setSyncState({ status: 'idle', error: null, attempt: 0 });
      return;
    }
    
    // Prevent double sync
    if (syncAttempted.current) {
      console.log('⏭️ Sync already attempted');
      return;
    }
    
    syncAttempted.current = true;
    
    console.log('🔄 HOST triggering MySQL sync for:', results.gamePin);
    setSyncState({ status: 'syncing', error: null, attempt: 0 });
    
    // Start sync after 2 second delay (let players see leaderboard first)
    const syncTimeout = setTimeout(async () => {
      try {
        const result = await syncBattleResultsToMySQL(results.gamePin);
        
        if (result.success) {
          console.log('✅ Battle results saved to database');
          setSyncState({ 
            status: 'success', 
            error: null, 
            attempt: result.attempt || 1 
          });
        } else {
          console.error('❌ Failed to save battle results:', result.error);
          setSyncState({ 
            status: 'failed', 
            error: result.error || 'Unknown error', 
            attempt: result.attempt || 0 
          });
        }
      } catch (error) {
        console.error('❌ Fatal sync error:', error);
        setSyncState({ 
          status: 'failed', 
          error: error.message, 
          attempt: 0 
        });
      }
    }, 2000);
    
    return () => {
      clearTimeout(syncTimeout);
    };
  }, [isOpen, results?.gamePin, results?.isHost]);

  // ========================================
  // 🆕 IMPROVED: ATOMIC VIEWER TRACKING & CLEANUP
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

    // Cleanup when component unmounts OR modal closes
    return () => {
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
  // 🆕 RENDER: SYNC STATUS INDICATOR
  // ========================================
  const renderSyncStatus = () => {
    if (!results?.isHost) return null;
    
    if (syncState.status === 'syncing') {
      return (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm z-10 animate-fade-in">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Saving results...</span>
        </div>
      );
    }
    
    if (syncState.status === 'success') {
      return (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm z-10 animate-fade-in">
          <span className="text-lg">✓</span>
          <span>Results saved!</span>
        </div>
      );
    }
    
    if (syncState.status === 'failed') {
      return (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm max-w-xs z-10 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚠️</span>
            <span className="font-bold">Save Failed</span>
          </div>
          <p className="text-xs opacity-90 mb-2">{syncState.error}</p>
          <button
            onClick={async () => {
              syncAttempted.current = false; // Reset
              setSyncState({ status: 'syncing', error: null, attempt: 0 });
              const result = await syncBattleResultsToMySQL(results.gamePin);
              setSyncState(result.success 
                ? { status: 'success', error: null, attempt: result.attempt }
                : { status: 'failed', error: result.error, attempt: result.attempt }
              );
            }}
            className="w-full bg-white text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            Retry Save
          </button>
        </div>
      );
    }
    
    return null;
  };

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
        
        {/* 🆕 Sync Status Indicator */}
        {renderSyncStatus()}
        
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
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
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