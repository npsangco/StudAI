import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Trophy, Handshake, Medal, FileText, Award } from 'lucide-react';
import AnswerReviewModal from './AnswerReviewModal';
import {
  syncBattleResultsToMySQL,
  incrementViewers,
  decrementViewersAndCleanup
} from '../../../firebase/battleOperations';
import { quizApi } from '../../../api/api';

const QuizLeaderboard = ({ isOpen, onClose, results }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [battleData, setBattleData] = useState(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const syncAttempted = useRef(false);

  // Debug: Log when component receives props
  useEffect(() => {
    console.log('🎯 QuizLeaderboard Props Changed:');
    console.log('   isOpen:', isOpen);
    console.log('   results:', results);
    console.log('   gamePin:', results?.gamePin);
    console.log('   isHost:', results?.isHost);
  }, [isOpen, results]);

  // Reset flags when modal closes or reopens
  useEffect(() => {
    if (!isOpen) {
      syncAttempted.current = false;
      setSyncComplete(false);
    }
  }, [isOpen]);

  // SYNC WITH MYSQL (HOST ONLY) - Must happen BEFORE fetching results
  useEffect(() => {
    if (!isOpen || !results?.gamePin) return;
    if (syncAttempted.current) return;
    
    syncAttempted.current = true;
    
    const syncAndFetch = async () => {
      try {
        setLoading(true);
        
        // HOST: Sync to MySQL first
        if (results?.isHost) {
          console.log('🔄 Host syncing results to MySQL...');
          const syncResult = await syncBattleResultsToMySQL(results.gamePin);
          
          if (syncResult.success) {
            console.log('✅ MySQL sync successful');
          } else {
            console.log('⚠️ MySQL sync failed:', syncResult.error);
          }
          
          // Wait a bit for database to commit
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // NON-HOST: Wait for host to sync (give them time)
          console.log('⏳ Non-host waiting for host to sync...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        setSyncComplete(true);
        
        // FETCH FROM MYSQL
        
        console.log('📊 Fetching leaderboard from MySQL for PIN:', results.gamePin);
        
        const response = await Promise.race([
          quizApi.getBattleResults(results.gamePin),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        console.log('✅ MySQL Results:', response);
        console.log('📊 Raw results array:', response.results);
        
        const mysqlResults = response.results || [];
        
        const formattedResults = mysqlResults.map(player => {
          console.log('🔍 Formatting player:', {
            raw: player,
            player_name: player.player_name,
            username: player.username,
            user_id: player.user_id
          });
          
          return {
            id: `user_${player.user_id}`,
            userId: player.user_id, // Numeric user_id from MySQL
            username: player.username,
            name: player.player_name || player.username || 'Unknown',
            score: player.score || 0,
            initial: player.player_initial || player.player_name?.[0] || player.username?.[0] || '?',
            profilePicture: player.profile_picture,
            forfeited: player.score === 0,
            isWinner: player.is_winner || false,
            pointsEarned: player.points_earned || 0,
            expEarned: player.exp_earned || 0
          };
        });
        
        setFinalPlayers(formattedResults);
        setBattleData(response.battle);
        setLoading(false);
        
        console.log('✅ Leaderboard loaded from MySQL:', formattedResults.length, 'players');
        console.log('🎯 Formatted player data:', formattedResults.map(p => ({
          userId: p.userId,
          name: p.name,
          username: p.username,
          score: p.score
        })));
        
      } catch (error) {
        console.error('❌ Failed to fetch MySQL results:', error);
        
        // Try one more time with a longer timeout
        console.log('🔄 Retrying MySQL fetch...');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryResponse = await quizApi.getBattleResults(results.gamePin);
          
          const retryResults = retryResponse.results || [];
          const formattedRetry = retryResults.map(player => ({
            id: `user_${player.user_id}`,
            userId: player.user_id,
            username: player.username,
            name: player.player_name,
            score: player.score || 0,
            initial: player.player_initial || player.player_name?.[0] || '?',
            profilePicture: player.profile_picture,
            forfeited: player.score === 0,
            isWinner: player.is_winner || false,
            pointsEarned: player.points_earned || 0,
            expEarned: player.exp_earned || 0
          }));
          
          if (formattedRetry.length > 0) {
            console.log('✅ Retry successful:', formattedRetry.length, 'players');
            setFinalPlayers(formattedRetry);
            setBattleData(retryResponse.battle);
          } else {
            console.log('⚠️ Retry returned empty, falling back to prop results');
            if (results?.players && results.players.length > 0) {
              setFinalPlayers(results.players);
            }
          }
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          
          // FINAL FALLBACK: Use results passed from props
          console.log('⚠️ Final fallback to prop results:', results?.players);
          
          if (results?.players && results.players.length > 0) {
            setFinalPlayers(results.players);
          } else {
            console.error('❌ No players data available anywhere');
          }
        }
        
        setLoading(false);
      }
    };
    
    syncAndFetch();
  }, [isOpen, results?.gamePin, results?.isHost]); // Removed results?.players dependency  // VIEWER TRACKING
  useEffect(() => {
    if (!isOpen || !results?.gamePin) return;

    const gamePin = results.gamePin;
    let isRegistered = false;
    
    const registerViewer = async () => {
      try {
        const result = await incrementViewers(gamePin);
        if (result.success) {
          isRegistered = true;

        }
      } catch (error) {

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
  const quizTitle = battleData?.quiz_title || results?.quizTitle || 'Quiz Battle';
  
  console.log('🎯 Leaderboard Display - validPlayers:', validPlayers);
  console.log('🎯 battleData:', battleData);
  console.log('🎯 isOpen:', isOpen);
  console.log('🎯 results:', results);
  
  const sortedPlayers = [...validPlayers].sort((a, b) => b.score - a.score);
  
  // Use MySQL winner flags if available, otherwise compute from scores
  const mysqlWinners = validPlayers.filter(p => p.isWinner);
  const winners = mysqlWinners.length > 0 ? mysqlWinners : sortedPlayers.filter(p => p.score === sortedPlayers[0]?.score);
  
  console.log('🏆 Winners computed:', winners);
  
  const isTie = battleData?.is_tied || winners.length > 1;
  const highestScore = winners.length > 0 ? winners[0].score : 0;

  const pointsEarned = winners[0]?.pointsEarned || (highestScore * 10);

  // RENDER
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md mx-auto overflow-hidden">
          
          {/* Content */}
          <div className="p-5 sm:p-6">
            
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                {isTie ? (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span>It's a Tie!</span>
                    <Handshake className="w-5 h-5 text-yellow-500" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span>Battle Complete!</span>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </>
                )}
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
              <h3 className="text-xs font-bold text-gray-700 mb-2.5 text-center flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" />
                Final Rankings
              </h3>
              
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto scrollbar-thin">
                {sortedPlayers.map((player, index) => {
                  const rank = index + 1;
                  const isWinner = winners.some(w => w.userId === player.userId);
                  const getRankIcon = () => {
                    if (rank === 1 && !isTie) return <Award className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
                    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400 fill-gray-400" />;
                    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600 fill-amber-600" />;
                    return null;
                  };

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
                        <div className="text-[10px] font-bold text-gray-600 min-w-[35px] flex-shrink-0 flex items-center gap-1">
                          {rank === 1 && isTie ? '1st (T)' : rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
                        </div>

                        {getRankIcon() && <span className="flex-shrink-0">{getRankIcon()}</span>}
                        {isTie && isWinner && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                        
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
                <Award className="w-5 h-5 text-yellow-600" />
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
                  <FileText className="w-4 h-4" />
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
