export default function ZoomDocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-300 px-6 py-6">
          <h1 className="text-3xl font-bold text-white">ZOOM INTEGRATION DOCUMENTATION</h1>
          <p className="text-white mt-2">How StudAI uses Zoom for collaborative study sessions</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          {/* Overview */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 mb-4">
              StudAI integrates with Zoom to enable students to create and join virtual study sessions. 
              This integration allows seamless video collaboration for group studying, homework sessions, 
              and peer learning without leaving the StudAI platform.
            </p>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How StudAI Uses Zoom</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <h3 className="font-bold text-gray-900 mb-2">1. Creating Study Sessions</h3>
                <p className="text-gray-700">
                  When you create a study session in StudAI, the app automatically generates a Zoom meeting 
                  link in the background. You don't need to manually set up a Zoom meeting or leave the app.
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <h3 className="font-bold text-gray-900 mb-2">2. Joining Study Sessions</h3>
                <p className="text-gray-700">
                  Participants can join study sessions directly from StudAI. Clicking "Join Zoom" opens 
                  the Zoom meeting in your browser or desktop app with one click - no meeting ID or password needed.
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                <h3 className="font-bold text-gray-900 mb-2">3. Session Management</h3>
                <p className="text-gray-700">
                  Study sessions are tracked within StudAI. You can view active sessions, see participants, 
                  and manage your schedule all from the Sessions page without switching between apps.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 font-bold mr-3">✓</span>
                <span><strong>Automatic Meeting Creation:</strong> No manual Zoom setup required</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 font-bold mr-3">✓</span>
                <span><strong>One-Click Join:</strong> Access meetings directly from StudAI</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 font-bold mr-3">✓</span>
                <span><strong>Session Scheduling:</strong> Plan study sessions in advance</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 font-bold mr-3">✓</span>
                <span><strong>Participant Tracking:</strong> See who's joining your sessions</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 font-bold mr-3">✓</span>
                <span><strong>Seamless Integration:</strong> All within the StudAI interface</span>
              </li>
            </ul>
          </div>

          {/* Getting Started */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Step 1: Create an Account</h3>
                <p className="text-gray-700">Sign up for StudAI at <a href="https://studai.dev" className="text-blue-600 hover:underline">https://studai.dev</a></p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Step 2: Navigate to Sessions</h3>
                <p className="text-gray-700">Click on "Sessions" in the main navigation menu</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Step 3: Create a Study Session</h3>
                <p className="text-gray-700">Click "Create Session", fill in the details, and a Zoom meeting link will be automatically generated</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Step 4: Share with Friends</h3>
                <p className="text-gray-700">Share the session with classmates who can join with one click</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Step 5: Join the Meeting</h3>
                <p className="text-gray-700">Click "Join Zoom" button to start your video study session</p>
              </div>
            </div>
          </div>

          {/* Data & Privacy */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data & Privacy</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                <strong>What data does StudAI access from Zoom?</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Meeting creation and management permissions</li>
                <li>Basic meeting information (meeting ID, join URL)</li>
                <li>No recording or content access</li>
                <li>No personal Zoom account data beyond meeting creation</li>
              </ul>
              <p className="text-gray-700 mt-3">
                For full privacy details, see our <a href="/privacypolicy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">•</span>
                <span>Active StudAI account</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">•</span>
                <span>Internet connection for video calls</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">•</span>
                <span>Zoom app (optional - works in browser too)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3">•</span>
                <span>Webcam and microphone for video participation</span>
              </li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Meeting link not working?</h3>
                <p className="text-gray-700">Try refreshing the page or creating a new session. Contact support if the issue persists.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can't join a meeting?</h3>
                <p className="text-gray-700">Ensure you have a stable internet connection and that Zoom is not blocked by your network or firewall.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Video/audio not working?</h3>
                <p className="text-gray-700">This is handled by Zoom directly. Check your Zoom settings and permissions for camera/microphone access.</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-700 mb-4">
              If you encounter any issues with the Zoom integration or have questions:
            </p>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-700 mb-2">
                <strong>Email Support:</strong> <a href="mailto:studai.service@gmail.com" className="text-blue-600 hover:underline">studai.service@gmail.com</a>
              </p>
              <p className="text-gray-700">
                <strong>Support Page:</strong> <a href="/support" className="text-blue-600 hover:underline">Visit Support Center</a>
              </p>
            </div>
          </div>

          {/* Version Info */}
          <div className="border-t pt-6">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()} | Version 1.0
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-8 py-6">
          <a 
            href="/"
            className="inline-block bg-yellow-400 text-white px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors font-medium"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
