import React, { useState } from 'react';
import { quizApi } from '../../../api/api';

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
      
      const response = await quizApi.joinBattle({ gamePin });
      const { battle, participant } = response.data;
      
      console.log('✅ Joined battle:', battle);
      
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
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col justify-center overflow-hidden">
      <div className="max-w-md mx-auto w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Join Quiz Battles
        </h2>
        <p className="text-gray-700 mb-6">
          Challenge your friends or join an ongoing quiz battle!
        </p>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              GAME PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit PIN"
              maxLength={6}
              value={gamePin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="w-full px-4 py-3 text-2xl font-bold text-center tracking-widest border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all bg-white"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                {error}
              </p>
            )}
          </div>

          <button
            onClick={handleJoinBattle}
            disabled={gamePin.length !== 6 || loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
              gamePin.length === 6 && !loading
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? 'Joining...' : 'Enter'}
          </button>
        </div>

        <div className="p-5 bg-white bg-opacity-80 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-yellow-600">💡</span>
            How to Join:
          </h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Get the 6-digit PIN from the host</li>
            <li>Enter the PIN above</li>
            <li>Wait in the lobby</li>
            <li>Start when host begins the battle!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};