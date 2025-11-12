import TermsModal from './TermsAndConditions';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Copyright */}
          <div className="text-base text-white">
            © {currentYear} Stud<span className="text-indigo-400">AI</span>. All rights reserved.
          </div>
          
          {/* Links */}
          <div className="flex space-x-8">
            <TermsModal />
            <button className="text-base text-gray-300 hover:text-white transition-colors">
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}