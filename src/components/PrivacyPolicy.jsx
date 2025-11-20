import { useState } from 'react';

export default function PrivacyPolicyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="text-base text-gray-300 hover:text-white transition-colors"
      >
        Privacy Policy
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 m-0 bg-black/70">
          {/* Modal Container */}
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-yellow-300 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">PRIVACY POLICY</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="text-sm text-gray-700 space-y-6">
                <p className="text-gray-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
                
                <p>
                  Welcome to StudAI. This Privacy Policy explains how we collect, use, and protect your personal information 
                  when you use our website and related services. By using the Service, you agree to the practices described in this policy.
                </p>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">1. Information We Collect</h3>
                  <p className="mb-2">
                    We collect information you provide directly to us, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Account information (email, username, password)</li>
                    <li>Profile information (birthday, profile picture)</li>
                    <li>Study content (notes, quizzes, files you upload)</li>
                    <li>Usage data (study streaks, achievements, points)</li>
                    <li>Pet companion data (pet stats, items, actions)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">2. How We Use Your Information</h3>
                  <p className="mb-2">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Create and manage your account</li>
                    <li>Enable study features (notes, quizzes, planning)</li>
                    <li>Track your progress and achievements</li>
                    <li>Send you important service updates</li>
                    <li>Respond to your requests and support inquiries</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">3. Information Sharing and Disclosure</h3>
                  <p className="mb-2">
                    We do not sell your personal information. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>With your consent:</strong> When you choose to share notes or participate in study sessions</li>
                    <li><strong>For legal reasons:</strong> If required by law or to protect our rights</li>
                    <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., hosting, email)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">4. Third-Party Services</h3>
                  <p className="mb-2">
                    Our service integrates with:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Google OAuth:</strong> For account authentication</li>
                    <li><strong>Zoom:</strong> For study session meetings</li>
                    <li><strong>OpenAI:</strong> For AI-powered features (summaries, chatbot)</li>
                    <li><strong>Firebase:</strong> For real-time quiz battles</li>
                  </ul>
                  <p className="mt-2">
                    These services have their own privacy policies governing their use of your information.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">5. Data Security</h3>
                  <p>
                    We implement appropriate security measures to protect your information, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Encrypted passwords using bcrypt</li>
                    <li>Secure HTTPS connections</li>
                    <li>Session-based authentication</li>
                    <li>Regular security updates</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">6. Your Rights and Choices</h3>
                  <p className="mb-2">
                    You have the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Access and update your account information</li>
                    <li>Delete your account and associated data</li>
                    <li>Export your study content</li>
                    <li>Opt out of non-essential communications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">7. Data Retention</h3>
                  <p>
                    We retain your information for as long as your account is active or as needed to provide you services. 
                    You can request deletion of your account at any time.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">8. Children's Privacy</h3>
                  <p>
                    Our service is intended for students of all ages. For users under 13, we comply with applicable 
                    children's privacy laws and require parental consent where necessary.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">9. Changes to This Privacy Policy</h3>
                  <p>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new Privacy Policy on this page and updating the "Last updated" date at the top.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">10. Contact Us</h3>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at:
                  </p>
                  <ul className="list-none space-y-1 mt-2">
                    <li>studai.service@gmail.com</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
