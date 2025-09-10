export default function LandingPage() {
    return (
    <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-6 py-16">
            <div className="mt-8 p-4 bg-red-200 rounded-lg text-center mx-auto max-w-md">
                <p className="text-sm text-gray-600 mb-2">Authenticated:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                    <a href="/dashboard" className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Dashboard</a>
                </div>
            </div>
            <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                    Welcome to <span className="text-indigo-600">StudAI</span>
                </h1>
                <p className="text-xl text-gray-700 mb-8">
                    Transform your study materials into powerful learning tools with AI-powered summaries, quizzes, and study plans.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => window.location.href = '/signup'}
                        className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-colors"
                        >
                        Sign up for free
                    </button>
                    <button
                        onClick={() => window.location.href = '/create'}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
                        >
                        Study Tools
                    </button>
                </div>
            </div>
            <div className="mt-24 grid md:grid-cols-4 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-4">Smart Quizzes</div>
                    <h3 className="text-xl font-bold mb-3">Prepare for any assessments on any subject</h3>
                    <p className="text-gray-600">
                        Master your exams with personalized practice tests, interactive quizzes, and comprehensive study plans tailored to your specific subjects and learning style.
                    </p>
                </div>
      
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-4">Ai Summarization</div>
                    <h3 className="text-xl font-bold mb-3">Turn your studying materials into something more</h3>
                    <p className="text-gray-600">
                        Transform your notes, textbooks, and lectures into engaging study guides, flashcards, and interactive content that makes learning more effective and enjoyable.
                    </p>
                </div>
      
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-4">Study Buddy</div>
                    <h3 className="text-xl font-bold mb-3">Need help with your studies? AI Chatbot got you</h3>
                    <p className="text-gray-600">
                        Get instant answers to your questions, explanations of complex topics, and personalized tutoring support available 24/7 to keep you on track.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-4">Group Learning</div>
                    <h3 className="text-xl font-bold mb-3">Connect with your friends while studying</h3>
                    <p className="text-gray-600">
                        Study together virtually with collaborative tools, group discussions, and shared resources that make learning social and motivating.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}