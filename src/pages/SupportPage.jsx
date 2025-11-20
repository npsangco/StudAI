export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-300 px-6 py-6">
          <h1 className="text-3xl font-bold text-white">SUPPORT</h1>
          <p className="text-white mt-2">We're here to help you get the most out of StudAI</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Support</h2>
            <p className="text-gray-700 mb-4">
              For assistance, questions, or feedback, please reach out to our support team:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Email Support</p>
                  <a href="mailto:studai.service@gmail.com" className="text-lg font-medium text-yellow-500 hover:text-yellow-600">
                    studai.service@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">How do I create a study session?</h3>
                <p className="text-gray-700">
                  Navigate to the Sessions page, click "Create Session", fill in the details including date, time, and participants. 
                  You can optionally generate a Zoom meeting link for virtual collaboration.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">How does the AI chatbot work?</h3>
                <p className="text-gray-700">
                  Our AI chatbot uses advanced language models to help you with study questions, summaries, and explanations. 
                  Simply type your question in the chatbot interface and receive instant AI-powered assistance.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Can I share my notes with others?</h3>
                <p className="text-gray-700">
                  Yes! You can share notes with other StudAI users by using the share feature in the Notes section. 
                  Shared notes can be viewed and collaborated on by invited users.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">How do quiz battles work?</h3>
                <p className="text-gray-700">
                  Quiz battles allow you to compete with other users in real-time. Create a battle quiz, share the game PIN 
                  with friends, and compete to see who can answer questions correctly the fastest.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">What is the pet companion feature?</h3>
                <p className="text-gray-700">
                  Your pet companion is a virtual buddy that grows with you as you study. Feed it, care for it, and watch 
                  it level up as you earn points through quizzes and study activities. Your pet also provides motivation during quizzes!
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">How do I reset my password?</h3>
                <p className="text-gray-700">
                  Click "Forgot Password" on the login page, enter your email, and follow the instructions sent to your inbox 
                  to reset your password securely.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-700">
                  Yes! We use industry-standard encryption for passwords, secure HTTPS connections, and implement best practices 
                  for data protection. See our <a href="/privacypolicy" className="text-yellow-500 hover:text-yellow-600 underline">Privacy Policy</a> for more details.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Can I use StudAI on mobile devices?</h3>
                <p className="text-gray-700">
                  Yes! StudAI is fully responsive and works on smartphones and tablets through your web browser. 
                  Simply visit the website on your mobile device and log in.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Feature Requests & Feedback</h2>
            <p className="text-gray-700 mb-4">
              We're constantly improving StudAI and would love to hear your ideas! Send us your feature requests, 
              suggestions, or feedback at:
            </p>
            <p className="text-gray-700 font-medium">
              <a href="mailto:studai.service@gmail.com" className="text-yellow-500 hover:text-yellow-600">
                studai.service@gmail.com
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Report a Bug</h2>
            <p className="text-gray-700 mb-4">
              If you encounter any issues or bugs while using StudAI, please report them to us with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>A description of the problem</li>
              <li>Steps to reproduce the issue</li>
              <li>Your browser and device information</li>
              <li>Screenshots if applicable</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Send bug reports to: <a href="mailto:studai.service@gmail.com" className="text-yellow-500 hover:text-yellow-600 font-medium">studai.service@gmail.com</a>
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Getting Started Guide</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li><strong>Create an Account:</strong> Sign up with your email or use Google OAuth</li>
                <li><strong>Choose Your Pet:</strong> Select a dog or cat companion to join you on your study journey</li>
                <li><strong>Create Notes:</strong> Start organizing your study materials in the Notes section</li>
                <li><strong>Try Quizzes:</strong> Test your knowledge with our quiz feature or create your own</li>
                <li><strong>Schedule Sessions:</strong> Plan study sessions and invite friends to collaborate</li>
                <li><strong>Track Progress:</strong> View your achievements, streaks, and statistics on the Dashboard</li>
              </ol>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Account & Billing Support</h2>
            <p className="text-gray-700">
              For account-related inquiries, data deletion requests, or billing questions, contact us at: 
              <a href="mailto:studai.service@gmail.com" className="text-yellow-500 hover:text-yellow-600 font-medium ml-1">
                studai.service@gmail.com
              </a>
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
            <p className="text-gray-700">
              We aim to respond to all support inquiries within 24-48 hours during business days. 
              For urgent issues, please mark your email as "URGENT" in the subject line.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-8 py-6 flex flex-col sm:flex-row gap-4">
          <a 
            href="/"
            className="inline-block bg-yellow-400 text-white px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors font-medium text-center"
          >
            Back to Home
          </a>
          <a 
            href="/privacypolicy"
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-medium text-center"
          >
            Privacy Policy
          </a>
          <a 
            href="/termsofuse"
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-medium text-center"
          >
            Terms of Use
          </a>
        </div>
      </div>
    </div>
  );
}
