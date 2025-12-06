import { useState } from 'react';

export default function TermsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="text-base text-gray-300 hover:text-white transition-colors"
      >
        Terms & Conditions
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 m-0 bg-black/70">
          {/* Modal Container */}
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-yellow-300 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">TERMS AND CONDITIONS</h2>
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
                <p>
                  Welcome to StudAI. These Terms and Conditions govern your use of our website, and related services.  
                  By accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, please do not use our Service.
                </p>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">1. Eligibility</h3>
                  <p>
                    You must be at least 18 years old and a student of the University of Santo Tomas - College of Information and Computing Sciences to use this Service. By using the Service, you represent that you meet this age requirement and have the legal capacity to agree to these Terms.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">2. Account Registration</h3>
                  <p className="mb-2">
                    To access certain features, you may need to create an account.  
                    You agree to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Provide accurate, complete, and current information.</li>
                    <li>Keep your login credentials confidential.</li>
                    <li>Notify us immediately of any unauthorized access to your account.</li>
                  </ul>
                  <p className="mt-2">
                    We are not responsible for any loss or damage arising from your failure to safeguard your account credentials.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">3. Use of the Service</h3>
                  <p className="mb-2">
                    You agree to use the Service only for lawful purposes and in accordance with these Terms.  
                    You must not:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Violate any applicable laws or regulations.</li>
                    <li>Use the Service to transmit spam, malware, or harmful content.</li>
                    <li>Attempt to hack, reverse-engineer, or disrupt the Service's operation.</li>
                  </ul>
                  <p className="mt-2">
                    We reserve the right to suspend or terminate your access if we believe you have violated these Terms.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">4. Intellectual Property</h3>
                  <p className="mb-2">
                    All content, trademarks, logos, and software related to the Service are owned by or licensed to StudAI.  
                    You are granted a limited, non-exclusive, non-transferable license to use the Service for personal or internal business use only.
                  </p>
                  <p>
                    You may not copy, modify, or distribute any part of the Service without prior written consent from us.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">5. Termination</h3>
                  <p>
                    We may suspend or terminate your account at any time, with or without notice, if you violate these Terms or for any other reason at our discretion.  
                    You may terminate your account by deleting it or contacting us at [support email].
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">6. Disclaimer of Warranties</h3>
                  <p>
                    The Service is provided "as is" and "as available" without any warranties, express or implied.  
                    We do not guarantee that the Service will be uninterrupted, error-free, or secure.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">7. Limitation of Liability</h3>
                  <p>
                    To the maximum extent permitted by law, StudAI and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">8. Privacy</h3>
                  <p>
                    Your use of the Service is also governed by our Privacy Policy, which explains how we collect, use, and protect your information.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">9. Changes to These Terms</h3>
                  <p>
                    We may update these Terms from time to time.  
                    We will notify users of material changes by posting the new Terms on this page with an updated date.  
                    Continued use of the Service after changes means you accept the revised Terms.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">10. Governing Law</h3>
                  <p>
                    These Terms are governed by the laws of the Philippines, without regard to its conflict of laws principles.  
                    Any disputes shall be resolved in the courts located in the Philippines.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">11. Contact Us</h3>
                  <p>
                    If you have any questions or concerns about these Terms, please contact us at:  
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