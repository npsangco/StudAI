import React, { useState } from 'react'

export default function LandingNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-yellow-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative inline-flex items-center justify-center rounded-md p-2 text-black hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black"
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

          <div className="flex items-center">
            <div className="flex shrink-0 items-center ml-4 sm:ml-0">
              <button
              onClick={() => window.location.href = '/'}
              className="text-2xl font-bold tracking-tight text-black hover:text-gray-800 transition-colors cursor-pointer"
              >
                Stud<span className="text-indigo-600">AI</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 ml-4">
            <button
              onClick={() => window.location.href = '/signup'}
              className="text-black hover:text-gray-800 px-3 py-2 text-sm font-medium transition-colors"
            >
              + Create
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Log in
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 bg-yellow-300 border-t border-black/10">
            <button
              onClick={() => window.location.href = '/signup'}
              className="text-black hover:bg-black/10 block rounded-md px-3 py-2 text-base font-medium w-full text-left"
            >
              + Create
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="text-black hover:bg-black/10 block rounded-md px-3 py-2 text-base font-medium w-full text-left"
            >
              Log in
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}