export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-300 px-6 py-6">
          <h1 className="text-3xl font-bold text-white">TERMS OF USE</h1>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <p className="text-gray-700">
            Welcome to StudAI. These Terms of Use govern your access to and use of our website, services, and applications. 
            By accessing or using StudAI, you agree to be bound by these Terms.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By creating an account or using StudAI, you acknowledge that you have read, understood, and agree to be bound 
              by these Terms of Use and our Privacy Policy. If you do not agree to these terms, please do not use our services.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-700 mb-3">
              StudAI is an educational platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Note-taking and organization tools</li>
              <li>AI-powered study assistance and summaries</li>
              <li>Quiz creation and practice features</li>
              <li>Study session scheduling with Zoom integration</li>
              <li>Collaborative study features</li>
              <li>Progress tracking and gamification elements</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <p className="text-gray-700 mb-3">
              To use certain features of StudAI, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be responsible for all activities that occur under your account</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-3">
              You agree NOT to use StudAI to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for any commercial purpose without permission</li>
              <li>Share inappropriate, offensive, or illegal content</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. User Content</h2>
            <p className="text-gray-700 mb-3">
              You retain ownership of content you create on StudAI (notes, quizzes, files). By using our service, you grant us:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>A license to store, process, and display your content to provide our services</li>
              <li>The right to use anonymized data for improving our AI features</li>
              <li>Permission to backup your content for data protection purposes</li>
            </ul>
            <p className="text-gray-700 mt-3">
              You are responsible for ensuring you have the right to upload and share any content you post.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Third-Party Services</h2>
            <p className="text-gray-700 mb-3">
              StudAI integrates with third-party services including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li><strong>Google OAuth:</strong> For authentication</li>
              <li><strong>Zoom:</strong> For video conferencing in study sessions</li>
              <li><strong>OpenAI:</strong> For AI-powered features</li>
              <li><strong>Firebase:</strong> For real-time features</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Your use of these third-party services is subject to their respective terms and policies.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Zoom Integration</h2>
            <p className="text-gray-700">
              When using Zoom features through StudAI, you agree to comply with Zoom's Terms of Service. 
              Meeting links are generated through our platform and are subject to Zoom's usage policies and limitations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p className="text-gray-700">
              All content, features, and functionality of StudAI (including but not limited to design, text, graphics, logos, 
              and software) are owned by StudAI and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Termination</h2>
            <p className="text-gray-700 mb-3">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Suspend or terminate your account for violation of these Terms</li>
              <li>Remove content that violates our policies</li>
              <li>Modify or discontinue services with or without notice</li>
            </ul>
            <p className="text-gray-700 mt-3">
              You may delete your account at any time through your profile settings.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              StudAI is provided "as is" and "as available" without warranties of any kind, either express or implied. 
              We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, StudAI shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via 
              email or through the platform. Continued use of StudAI after changes constitutes acceptance of the new Terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
              conflict of law provisions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Contact Information</h2>
            <p className="text-gray-700 mb-2">
              If you have any questions about these Terms of Use, please contact us at:
            </p>
            <p className="text-gray-700 font-medium">
              studai.service@gmail.com
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-gray-600 text-sm">
              By using StudAI, you acknowledge that you have read and understood these Terms of Use and agree to be bound by them.
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
