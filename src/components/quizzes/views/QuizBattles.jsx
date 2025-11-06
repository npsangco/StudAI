import React, { useState } from 'react';
import { quizApi } from '../../../api/api';
import { addPlayerToBattle } from '../../../firebase/battleOperations';

export const QuizBattles = ({ gamePin, setGamePin, onJoinSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinBattle = async () => {
    if (gamePin.length !== 6) {
      setError('Please enter a valid 6-digit PIN');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 0️⃣ GET CURRENT USER INFO FIRST
      let currentUser;
      try {
        const userResponse = await fetch('http://localhost:4000/api/user/profile', {
          credentials: 'include'
        });
        currentUser = await userResponse.json();
        console.log('✅ Current user fetched:', currentUser.username);
      } catch (userError) {
        console.error('❌ Failed to get user info:', userError);
        setError('Please log in first');
        return;
      }
      
      // 1️⃣ Join battle in MySQL (existing API)
      const response = await quizApi.joinBattle({ gamePin });
      const { battle, participant } = response.data;
      
      console.log('✅ Joined MySQL battle:', battle);
      
      // 2️⃣ Add player to Firebase room 
      await addPlayerToBattle(gamePin, {
        userId: currentUser.user_id, 
        name: currentUser.username,  
        initial: currentUser.username[0].toUpperCase() 
      });
      
      console.log('✅ Added to Firebase room');
      
      // 3️⃣ Continue with existing flow
      if (onJoinSuccess) {
        onJoinSuccess(battle, participant);
      }
      
    } catch (err) {
      console.error('Join battle error:', err);
      setError(err.response?.data?.error || 'Failed to join battle');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setGamePin(cleaned);
    setError('');
  };

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
          Join Quiz Battles
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Challenge your friends or join an ongoing quiz battle!
        </p>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-md mx-auto w-full space-y-4 sm:space-y-6">
          
          {/* Game PIN Input Section */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2">
              GAME PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit PIN"
              maxLength={6}
              value={gamePin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xl sm:text-2xl font-bold text-center tracking-widest border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all bg-white"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-xs sm:text-sm text-red-600 font-medium text-center">
                {error}
              </p>
            )}
          </div>

          {/* Enter Button */}
          <button
            onClick={handleJoinBattle}
            disabled={gamePin.length !== 6 || loading}
            className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base text-white transition-all ${
              gamePin.length === 6 && !loading
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? 'Joining...' : 'Enter'}
          </button>

          {/* How to Join Section */}
          <div className="p-4 sm:p-5 bg-white bg-opacity-80 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">💡</span>
              How to Join:
            </h3>
            <ol className="text-xs sm:text-sm text-gray-700 space-y-1.5 sm:space-y-2 list-decimal list-inside">
              <li className="leading-relaxed">Get the 6-digit PIN from the host</li>
              <li className="leading-relaxed">Enter the PIN above</li>
              <li className="leading-relaxed">Wait in the lobby</li>
              <li className="leading-relaxed">Start when host begins the battle!</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
};