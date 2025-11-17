import React, { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { useTutorial } from '../hooks/useTutorial';

export default function DevMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { resetAllTutorials } = useTutorial();

  // Only show in development or if Ctrl+Shift+D is pressed
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (!isDev) return null;

  const handleResetAllTutorials = () => {
    if (confirm('Reset all tutorials? They will show again on each page.')) {
      resetAllTutorials();
      alert('All tutorials have been reset! Refresh the page to see them.');
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Dev Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9997] bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all"
        title="Developer Menu"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dev Menu Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9997] bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Dev Menu
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleResetAllTutorials}
              className="w-full flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All Tutorials
            </button>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This menu only appears in development mode
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
