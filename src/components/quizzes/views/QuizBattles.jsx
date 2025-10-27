import React from 'react';

export const QuizBattles = ({ gamePin, setGamePin }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-black mb-3">Join Quiz Battles</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Challenge your friends or join an ongoing quiz battles!
      </p>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="GAME PIN"
          value={gamePin}
          onChange={(e) => setGamePin(e.target.value)}
          className="w-full max-w-xs mx-auto block px-4 py-3 bg-gray-100 border-0 rounded-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium tracking-wider"
        />
        
        <button className="bg-black text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          Enter
        </button>
      </div>
    </div>
  </div>
);