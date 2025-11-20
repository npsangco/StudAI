export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-300 px-6 py-6">
          <h1 className="text-3xl font-bold text-white">PRIVACY POLICY</h1>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <p className="text-gray-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
          
          <p className="text-gray-700">
            Welcome to StudAI. This Privacy Policy explains how we collect, use, and protect your personal information 
            when you use our website and related services. By using the Service, you agree to the practices described in this policy.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-3 text-gray-700">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Account information (email, username, password)</li>
              <li>Profile information (birthday, profile picture)</li>
              <li>Study content (notes, quizzes, files you upload)</li>
              <li>Usage data (study streaks, achievements, points)</li>
              <li>Pet companion data (pet stats, items, actions)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p className="mb-3 text-gray-700">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Enable study features (notes, quizzes, planning)</li>
              <li>Track your progress and achievements</li>
              <li>Send you important service updates</li>
              <li>Respond to your requests and support inquiries</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Information Sharing and Disclosure</h2>
            <p className="mb-3 text-gray-700">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li><strong>With your consent:</strong> When you choose to share notes or participate in study sessions</li>
              <li><strong>For legal reasons:</strong> If required by law or to protect our rights</li>
              <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., hosting, email)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="mb-3 text-gray-700">
              Our service integrates with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li><strong>Google OAuth:</strong> For account authentication</li>
              <li><strong>Zoom:</strong> For study session meetings</li>
              <li><strong>OpenAI:</strong> For AI-powered features (summaries, chatbot)</li>
              <li><strong>Firebase:</strong> For real-time quiz battles</li>
            </ul>
            <p className="mt-3 text-gray-700">
              These services have their own privacy policies governing their use of your information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
            <p className="text-gray-700 mb-3">
              We implement appropriate security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Encrypted passwords using bcrypt</li>
              <li>Secure HTTPS connections</li>
              <li>Session-based authentication</li>
              <li>Regular security updates</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights and Choices</h2>
            <p className="mb-3 text-gray-700">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Access and update your account information</li>
              <li>Delete your account and associated data</li>
              <li>Export your study content</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p className="text-gray-700">
              We retain your information for as long as your account is active or as needed to provide you services. 
              You can request deletion of your account at any time.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is intended for students of all ages. For users under 13, we comply with applicable 
              children's privacy laws and require parental consent where necessary.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date at the top.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="text-gray-700 mb-2">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-700 font-medium">
              studai.service@gmail.com
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
