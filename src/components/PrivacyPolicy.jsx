import { useState } from 'react';
import { X } from 'lucide-react';

export default function PrivacyPolicyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-base text-gray-300 hover:text-white transition-colors"
      >
        Privacy Policy
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-600 mb-4">
                  <strong>Effective Date:</strong> November 18, 2025
                </p>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
                  <p className="text-gray-700 mb-2">
                    We collect information you provide directly to us, including:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Account information (email, username, password)</li>
                    <li>Profile information (birthday, profile picture)</li>
                    <li>Study content (notes, quizzes, files you upload)</li>
                    <li>Usage data (study streaks, achievements, points)</li>
                    <li>Pet companion data (pet stats, items, actions)</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
                  <p className="text-gray-700 mb-2">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Create and manage your account</li>
                    <li>Enable study features (notes, quizzes, planning)</li>
                    <li>Track your progress and achievements</li>
                    <li>Send you important service updates</li>
                    <li>Respond to your requests and support inquiries</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Information Sharing and Disclosure</h3>
                  <p className="text-gray-700 mb-2">
                    We do not sell your personal information. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li><strong>With your consent:</strong> When you choose to share notes or participate in study sessions</li>
                    <li><strong>For legal reasons:</strong> If required by law or to protect our rights</li>
                    <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., hosting, email)</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Third-Party Services</h3>
                  <p className="text-gray-700 mb-2">
                    Our service integrates with:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li><strong>Google OAuth:</strong> For account authentication</li>
                    <li><strong>Zoom:</strong> For study session meetings</li>
                    <li><strong>OpenAI:</strong> For AI-powered features (summaries, chatbot)</li>
                    <li><strong>Firebase:</strong> For real-time quiz battles</li>
                  </ul>
                  <p className="text-gray-700 mt-2">
                    These services have their own privacy policies governing their use of your information.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Data Security</h3>
                  <p className="text-gray-700">
                    We implement appropriate security measures to protect your information, including:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
                    <li>Encrypted passwords using bcrypt</li>
                    <li>Secure HTTPS connections</li>
                    <li>Session-based authentication</li>
                    <li>Regular security updates</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Your Rights and Choices</h3>
                  <p className="text-gray-700 mb-2">
                    You have the right to:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Access and update your account information</li>
                    <li>Delete your account and associated data</li>
                    <li>Export your study content</li>
                    <li>Opt out of non-essential communications</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Data Retention</h3>
                  <p className="text-gray-700">
                    We retain your information for as long as your account is active or as needed to provide you services. 
                    You can request deletion of your account at any time.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Children's Privacy</h3>
                  <p className="text-gray-700">
                    Our service is intended for students of all ages. For users under 13, we comply with applicable 
                    children's privacy laws and require parental consent where necessary.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Changes to This Privacy Policy</h3>
                  <p className="text-gray-700">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new Privacy Policy on this page and updating the "Effective Date" at the top.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">10. Contact Us</h3>
                  <p className="text-gray-700">
                    If you have any questions about this Privacy Policy, please contact us at:
                  </p>
                  <p className="text-gray-700 mt-2">
                    <strong>Email:</strong> studai.noreply@gmail.com
                  </p>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
