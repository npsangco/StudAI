import React, { useState } from 'react';
import { quizApi } from '../../../api/api';
import { API_URL } from '../../../config/api.config';
import { addPlayerToBattle } from '../../../firebase/battleOperations';
import { Crown, Lightbulb, Swords } from 'lucide-react';

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
        const userResponse = await fetch(`${API_URL}/api/user/profile`, {
          credentials: 'include'
        });
        currentUser = await userResponse.json();

      } catch (userError) {

        setError('Please log in first');
        return;
      }
      
      // 1️⃣ Join battle in MySQL (existing API)
      const response = await quizApi.joinBattle({ gamePin });
      const { battle, participant } = response.data;

      // 2️⃣ Add player to Firebase room
      // Convert relative profile picture path to full URL
      let profilePictureUrl = null;
      if (currentUser.profile_picture) {
        profilePictureUrl = currentUser.profile_picture.startsWith('http') || currentUser.profile_picture.startsWith('/')
          ? currentUser.profile_picture
          : `${API_URL}${currentUser.profile_picture}`;
      }

      await addPlayerToBattle(gamePin, {
        userId: currentUser.user_id,
        name: currentUser.username,
        initial: currentUser.username[0].toUpperCase(),
        profilePicture: profilePictureUrl
      });

      // 3️⃣ Continue with existing flow
      if (onJoinSuccess) {
        onJoinSuccess(battle, participant);
      }
      
    } catch (err) {

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[800px]" data-tutorial="join-battle">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Quiz Battles
        </h2>
        <p className="text-sm text-gray-600">
          Join a battle with a game PIN
        </p>
      </div>

      {/* Content Area - Scrollable if needed */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">

          {/* Game PIN Input Section */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Enter Game PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={gamePin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="w-full px-4 py-3 text-2xl font-mono text-center tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white cursor-text"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium text-center">
                {error}
              </p>
            )}

            {/* Enter Button */}
            <button
              onClick={handleJoinBattle}
              disabled={gamePin.length !== 6 || loading}
              className={`w-full mt-4 py-3 rounded-xl font-semibold text-base text-white transition-all flex items-center justify-center gap-2 ${
                gamePin.length === 6 && !loading
                  ? 'bg-black hover:bg-slate-800 shadow-md hover:shadow-lg cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Join Battle
                </>
              )}
            </button>
          </div>

          {/* How It Works Section */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              How It Works
            </h3>
            
            {/* Join a Battle */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">To Join a Battle:</p>
              <ol className="text-sm text-gray-700 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-xs flex items-center justify-center">1</span>
                  <span>Get the 6-digit PIN from the battle host</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-xs flex items-center justify-center">2</span>
                  <span>Enter the PIN code above and click "Join Battle"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-xs flex items-center justify-center">3</span>
                  <span>Wait in the lobby for other players</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-xs flex items-center justify-center">4</span>
                  <span>Compete when the host starts the battle!</span>
                </li>
              </ol>
            </div>

            {/* Host a Battle */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">To Host a Battle:</p>
              <ol className="text-sm text-gray-700 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs flex items-center justify-center">1</span>
                  <span>Go to "My Quizzes" and select a quiz (10+ questions required)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs flex items-center justify-center">2</span>
                  <span>Choose "Battle Mode" from the quiz options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs flex items-center justify-center">3</span>
                  <span>Share the 6-digit PIN with your friends</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs flex items-center justify-center">4</span>
                  <span>Wait for players to join, then start the battle!</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Battle Features Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Swords className="w-5 h-5 text-indigo-600" />
              Battle Features
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Real-time competition</strong> - Race against other players</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Live leaderboard</strong> - See rankings update as you play</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Point-based scoring</strong> - Earn points for correct answers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Multiplayer fun</strong> - Play with friends or classmates</span>
              </li>
            </ul>
          </div>

          {/* Pro Tips Section */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Tips for Success
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">💡</span>
                <span>Make sure you have a stable internet connection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">💡</span>
                <span>Stay focused - you can't pause during a battle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">💡</span>
                <span>Read questions carefully before answering</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};