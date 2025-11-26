import React from 'react';
import { HelpCircle } from 'lucide-react';

const TutorialButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 z-40 group ${className}`}
      title="Show Tutorial"
      aria-label="Show Tutorial"
    >
      <HelpCircle className="w-6 h-6" />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Need help? Click for tutorial
      </span>
    </button>
  );
};

export default TutorialButton;
