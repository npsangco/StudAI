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
      
      // Notify parent component
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
    // Only allow numbers, max 6 digits
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setGamePin(cleaned);
    setError('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        Join Quiz Battles
      </h2>
      <p className="text-gray-600 mb-6">
        Challenge your friends or join an ongoing quiz battle!
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GAME PIN
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit PIN"
            maxLength={6}
            value={gamePin}
            onChange={(e) => handlePinChange(e.target.value)}
            className="w-full px-4 py-3 text-2xl font-bold text-center tracking-widest border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
            disabled={loading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleJoinBattle}
          disabled={gamePin.length !== 6 || loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            gamePin.length === 6 && !loading
              ? 'bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? 'Joining...' : 'Enter'}
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">
          How to Join:
        </h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Get the 6-digit PIN from the host</li>
          <li>Enter the PIN above</li>
          <li>Wait in the lobby</li>
          <li>Start when host begins the battle!</li>
        </ol>
      </div>
    </div>
  );
};