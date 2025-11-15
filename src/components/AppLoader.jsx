import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Brain, Target, Sparkles } from 'lucide-react';

const tips = [
  "💡 Take regular breaks every 25 minutes to stay focused and productive!",
  "📚 Create notes immediately after studying to retain information better.",
  "🎯 Set daily goals in your planner to track your progress effectively.",
  "✨ Use AI summaries to quickly review large documents and save time.",
  "🏆 Complete daily quests to level up your pet buddy and earn rewards!",
  "📝 Organize your notes with categories for easier retrieval later.",
  "⚡ Quiz yourself regularly to reinforce learning and identify weak areas.",
  "🤝 Join study sessions to learn with friends and stay motivated.",
  "🎮 Challenge others to quiz battles and make learning competitive!",
  "🌟 Maintain your study streak to unlock special achievements.",
  "💪 Review your mistakes from quizzes to improve your understanding.",
  "📊 Track your daily stats to monitor your study habits and progress.",
  "🎨 Keep your pet happy by feeding, playing, and cleaning regularly!",
  "🔥 Consistent daily activity is the key to long-term academic success.",
  "📖 Break down large topics into smaller notes for better comprehension."
];

const AppLoader = ({ message = "Loading..." }) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Rotate tips every 3 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center z-50">
      <div className="text-center max-w-md px-6">
        {/* Animated Logo/Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-yellow-200 rounded-full opacity-20 animate-ping"></div>
          </div>
          <div className="relative">
            <img 
              src="/StudAI_Logo-black.png" 
              alt="StudAI" 
              className="w-32 h-32 mx-auto drop-shadow-lg animate-pulse"
            />
          </div>
        </div>

        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        </div>

        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {message}
        </h2>
        <p className="text-gray-600 mb-8">Please wait a moment...</p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Decorative Icons */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '0ms'}}>
            <BookOpen className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '150ms'}}>
            <Brain className="w-5 h-5 text-orange-600" />
          </div>
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '300ms'}}>
            <Target className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '450ms'}}>
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
        </div>

        {/* Study Tips */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 min-h-[80px] flex items-center justify-center">
          <p className="text-sm text-gray-700 leading-relaxed transition-opacity duration-500">
            {tips[currentTip]}
          </p>
        </div>

        {/* Small branding */}
        <p className="text-xs text-gray-400 mt-6">StudAI - Your AI Study Companion</p>
      </div>
    </div>
  );
};

export default AppLoader;
