import React, { useState } from 'react'

export default function LandingNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-yellow-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative inline-flex items-center justify-center rounded-md p-2 text-black hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black cursor-pointer"
            >
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center sm:justify-start">
            <div className="flex shrink-0 items-center sm:ml-0">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img 
                  src="/StudAI_Logo-black.png" 
                  alt="StudAI Logo" 
                  className="h-10 w-auto"
                />
                <span className="text-2xl font-bold tracking-tight text-black hidden sm:block">
                  Stud<span className="text-indigo-600">AI</span>
                </span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-3 ml-4">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-white/80 backdrop-blur-sm text-gray-900 hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md border border-gray-200 cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => window.location.href = '/signup'}
              className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="space-y-2 px-4 pt-3 pb-4 bg-yellow-300 border-t border-black/10">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-white/80 text-gray-900 hover:bg-white block rounded-lg px-4 py-2.5 text-base font-semibold w-full text-center transition-all border border-gray-200 cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => window.location.href = '/signup'}
              className="bg-gray-900 text-white hover:bg-gray-800 block rounded-lg px-4 py-2.5 text-base font-semibold w-full text-center transition-all cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}