import React, { useState, useEffect } from 'react';
import { Calendar, Video, Clock, Copy, Check, Lock, Globe, Trash2, Eye, EyeOff, AlertCircle, Search } from 'lucide-react';
import ToastContainer from '../components/ToastContainer';
import AppLoader from '../components/AppLoader';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { API_URL } from '../config/api.config';
import TutorialOverlay from '../components/TutorialOverlay';
import TutorialButton from '../components/TutorialButton';
import { useTutorial } from '../hooks/useTutorial';
import { jitsiTutorialSteps } from '../config/tutorialSteps';

const JitsiSessions = () => {
  const { toasts, toast, removeToast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('jitsi');
  const [mySessions, setMySessions] = useState([]);
  const [publicSessions, setPublicSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState('');
  const [activeTab, setActiveTab] = useState('my-sessions');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [publishingDelay, setPublishingDelay] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 6;
  
  const [sessionForm, setSessionForm] = useState({
    topic: '',
    duration: 60,
    start_time: '',
    is_private: false,
    session_password: ''
  });

  const API_BASE_URL = `${API_URL}/api`;

  useEffect(() => {
    // Check if user already accepted Jitsi terms
    const consent = localStorage.getItem('jitsiConsent');
    if (consent === 'true') {
      setHasConsented(true);
      loadInitialData();
    } else {
      setShowConsentForm(true);
      setInitialLoading(false);
    }
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadMySessions(),
      loadPublicSessions()
    ]);
    setInitialLoading(false);
  };

  const handleConsent = () => {
    if (consentChecked) {
      localStorage.setItem('jitsiConsent', 'true');
      setHasConsented(true);
      setShowConsentForm(false);
      setInitialLoading(true);
      loadInitialData();
      
      // Start tutorial after accepting terms
      setTimeout(() => {
        startTutorial();
      }, 1500);
    } else {
      toast.error('Please read and accept the terms to continue');
    }
  };

  const handleDeclineConsent = () => {
    toast.info('You must accept the terms to use Jitsi Sessions');
    window.location.href = '/dashboard';
  };

  const loadMySessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jitsi/sessions/my`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('My Sessions Response:', data);
        setMySessions(data.sessions || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load my sessions:', response.status, errorData);
        toast.error('Failed to load your sessions');
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      toast.error('Error loading sessions');
    }
  };

  const loadPublicSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jitsi/sessions/public`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Public Sessions Response:', data);
        setPublicSessions(data.sessions || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load public sessions:', response.status, errorData);
      }
    } catch (err) {
      console.error('Failed to load public sessions:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSessionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const createSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPublishingDelay(true);

    try {
      const response = await fetch(`${API_BASE_URL}/jitsi/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(sessionForm)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Session created! Opening meeting room...');
        
        // Open the meeting link in a new tab
        if (data.session && data.session.jitsi_url) {
          window.open(data.session.jitsi_url, '_blank');
        }
        
        setSessionForm({
          topic: '',
          duration: 60,
          start_time: '',
          is_private: false,
          session_password: ''
        });

        // Switch to My Sessions tab and reload
        setActiveTab('my-sessions');
        setCurrentPage(1);
        await loadMySessions();
        
        // Show publishing delay message
        setTimeout(() => {
          setPublishingDelay(false);
          loadPublicSessions();
        }, 60000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create session');
      }
    } catch (err) {
      toast.error('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (url, sessionId) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(sessionId);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  const joinSession = (session) => {
    if (session.session_password && !session.unlocked) {
      setSelectedSession(session);
      setShowPasswordModal(true);
    } else {
      window.open(session.jitsi_url, '_blank');
    }
  };

  const verifyPassword = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jitsi/sessions/${selectedSession.session_id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password: passwordInput })
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.jitsi_url, '_blank');
        setShowPasswordModal(false);
        setPasswordInput('');
        toast.success('Password verified!');
      } else {
        toast.error('Incorrect password');
      }
    } catch (err) {
      toast.error('Failed to verify password');
    }
  };

  const deleteSession = async (sessionId) => {
    await confirm({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this session? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/jitsi/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (response.ok) {
            toast.success('Session deleted successfully');
            await loadMySessions();
            await loadPublicSessions();
          } else {
            toast.error('Failed to delete session');
          }
        } catch (err) {
          toast.error('Failed to delete session');
        }
      }
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const SessionCard = ({ session, isMine }) => {
    // Check if session has expired
    const startTime = new Date(session.start_time);
    const endTime = new Date(startTime.getTime() + session.duration * 60000);
    const isExpired = new Date() > endTime;
    
    return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{session.topic}</h3>
            {session.is_private ? (
              <Lock className="w-4 h-4 text-orange-500" />
            ) : (
              <Globe className="w-4 h-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-600">Created by: {session.creator?.username || 'Unknown'}</p>
        </div>
        {isMine && (
          <button
            onClick={() => deleteSession(session.session_id)}
            className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(session.start_time)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{session.duration} minutes</span>
        </div>
        {!session.is_published && (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            <span>Publishing in progress (1 min delay)...</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => joinSession(session)}
          disabled={isExpired}
          className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            isExpired 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={isExpired ? 'This session has ended' : ''}
        >
          <Video className="w-4 h-4" />
          {isExpired ? 'Session Ended' : 'Join Meeting'}
        </button>
        <button
          onClick={() => copyToClipboard(session.jitsi_url, session.session_id)}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
        >
          {copiedUrl === session.session_id ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
    );
  };

  if (initialLoading) {
    return <AppLoader />;
  }

  // Show consent form if user hasn't consented
  if (showConsentForm && !hasConsented) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={handleDeclineConsent}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <Video className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Jitsi Meet - Terms of Use</h2>
                  <p className="text-blue-100 text-sm mt-1">Please read carefully before proceeding</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* What is Jitsi Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  What is Jitsi Meet?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Jitsi Meet is a <strong>free, open-source video conferencing platform</strong> provided by 8x8, Inc. 
                  StudAI uses Jitsi's public service to facilitate video study sessions between users. When you join a 
                  session, you will be redirected to <code className="bg-gray-100 px-2 py-1 rounded">meet.jit.si</code>, 
                  which is a third-party service not owned or controlled by StudAI.
                </p>
              </div>

              {/* How It Works Section */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  How It Works
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">1.</span>
                    <span>You create or join a study session on this page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">2.</span>
                    <span>Your StudAI username and email are passed to Jitsi to identify you in the meeting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">3.</span>
                    <span>A new browser tab opens to the Jitsi Meet website</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">4.</span>
                    <span>You'll need to allow camera/microphone access in your browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">5.</span>
                    <span>The meeting is hosted entirely on Jitsi's servers, not on StudAI</span>
                  </li>
                </ul>
              </div>

              {/* Data & Privacy Section */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Data Sharing & Privacy
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span><strong>Information Shared:</strong> Your StudAI username and email address will be shared with Jitsi Meet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span><strong>Video/Audio:</strong> All video and audio is processed by Jitsi's servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span><strong>Recording:</strong> Other participants may be able to record the session using Jitsi's features or third-party tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span><strong>Jitsi Privacy:</strong> Please review <a href="https://jitsi.org/meet-jit-si-privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Jitsi's Privacy Policy</a></span>
                  </li>
                </ul>
              </div>

              {/* Disclaimer Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Important Disclaimer
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span><strong>Third-Party Service:</strong> StudAI is NOT responsible for Jitsi Meet's availability, security, or data handling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span><strong>No Liability:</strong> We are not liable for any issues, data breaches, or problems that occur within Jitsi Meet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span><strong>User Conduct:</strong> You are responsible for your behavior and content shared in video sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span><strong>Session Recordings:</strong> Always assume sessions may be recorded by other participants</span>
                  </li>
                </ul>
              </div>

              {/* Your Responsibilities Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Responsibilities</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Ensure your browser allows camera and microphone access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Use a modern browser (Chrome, Firefox, Safari, or Edge recommended)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Be respectful and follow community guidelines in video sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Do not share sensitive or confidential information in public sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Inform other participants if you are recording the session</span>
                  </li>
                </ul>
              </div>

              {/* Consent Checkbox */}
              <div className="bg-white border-2 border-blue-500 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 flex-shrink-0"
                  />
                  <span className="text-gray-900 font-medium">
                    I understand and agree that:
                    <ul className="mt-2 space-y-1 text-sm font-normal text-gray-700">
                      <li>• I will be using a third-party service (Jitsi Meet) hosted by 8x8, Inc.</li>
                      <li>• My username and email will be shared with Jitsi Meet</li>
                      <li>• StudAI is not responsible for Jitsi Meet's service or data handling</li>
                      <li>• I have read and understand the information above</li>
                    </ul>
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="border-t p-6 bg-gray-50 rounded-b-lg flex gap-3">
              <button
                onClick={handleDeclineConsent}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Decline & Go Back
              </button>
              <button
                onClick={handleConsent}
                disabled={!consentChecked}
                className={`flex-1 py-3 px-6 rounded-md transition-colors font-medium ${
                  consentChecked
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      {confirmState.isOpen && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          variant={confirmState.variant}
        />
      )}

      {showTutorial && (
        <TutorialOverlay
          steps={jitsiTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}

      <TutorialButton onClick={startTutorial} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">Study Sessions</h1>
        </div>
        
        <div className="mb-8" data-tutorial="jitsi-header">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600">Create and join video study sessions powered by Jitsi Meet</p>
              <a href="/zoom-sessions" className="text-sm text-blue-600 hover:underline">
                Looking for Zoom sessions? Click here
              </a>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('jitsiConsent');
                window.location.reload();
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
              title="Review Jitsi Terms & Privacy"
              data-tutorial="jitsi-notice"
            >
              Review Terms
            </button>
          </div>
        </div>

        {/* Create Session Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8" data-tutorial="create-jitsi-session">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Session</h2>
          <form onSubmit={createSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Topic *
                </label>
                <input
                  type="text"
                  name="topic"
                  value={sessionForm.topic}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Math Study Group"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={sessionForm.start_time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={sessionForm.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="240"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password (optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="session_password"
                    value={sessionForm.session_password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty for no password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2" data-tutorial="session-privacy">
              <input
                type="checkbox"
                id="is_private"
                name="is_private"
                checked={sessionForm.is_private}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_private" className="text-sm font-medium text-gray-700">
                Make this session private (won't appear in public list)
              </label>
            </div>

            {publishingDelay && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Your session is being created. It will appear in the public list after 1 minute, giving you time to set up your meeting room.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-slate-800 transition-all py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium cursor-pointer"
            >
              <Video className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b" data-tutorial="session-tabs">
          <button
            onClick={() => {
              setActiveTab('my-sessions');
              setCurrentPage(1);
            }}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'my-sessions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Sessions
          </button>
          <button
            onClick={() => {
              setActiveTab('public');
              setCurrentPage(1);
            }}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'public'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Public Sessions
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
          />
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tutorial="session-cards">
            {activeTab === 'my-sessions' && (() => {
              // Filter sessions based on search term
              const filteredSessions = mySessions
                .filter(session =>
                  session.topic.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time));
              
              if (filteredSessions.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    {searchTerm ? 'No sessions found.' : 'No sessions yet. Create your first study session above!'}
                  </div>
                );
              }
              
              // Pagination logic for filtered my sessions
              const indexOfLastSession = currentPage * sessionsPerPage;
              const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
              const currentSessions = filteredSessions.slice(indexOfFirstSession, indexOfLastSession);

              return currentSessions.map(session => (
                <SessionCard key={session.session_id} session={session} isMine={true} />
              ));
            })()}

            {activeTab === 'public' && (() => {
              // Filter non-expired sessions and apply search
              const activePublicSessions = publicSessions.filter(session => {
                const startTime = new Date(session.start_time);
                const endTime = new Date(startTime.getTime() + session.duration * 60000);
                return new Date() <= endTime;
              });
              
              const filteredSessions = activePublicSessions
                .filter(session =>
                  session.topic.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time));

              if (filteredSessions.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    {searchTerm ? 'No sessions found.' : 'No public sessions available at the moment.'}
                  </div>
                );
              }

              // Pagination logic for filtered sessions
              const indexOfLastSession = currentPage * sessionsPerPage;
              const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
              const currentSessions = filteredSessions.slice(indexOfFirstSession, indexOfLastSession);

              return currentSessions.map(session => (
                <SessionCard key={session.session_id} session={session} isMine={false} />
              ));
            })()}
          </div>

          {/* Pagination Controls */}
          {(() => {
            const sessions = activeTab === 'my-sessions' 
              ? mySessions 
              : publicSessions.filter(session => {
                  const startTime = new Date(session.start_time);
                  const endTime = new Date(startTime.getTime() + session.duration * 60000);
                  return new Date() <= endTime;
                });

            const totalPages = Math.ceil(sessions.length / sessionsPerPage);

            if (sessions.length === 0 || totalPages <= 1) return null;

            const indexOfLastSession = currentPage * sessionsPerPage;
            const indexOfFirstSession = indexOfLastSession - sessionsPerPage;

            return (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-md font-medium transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Next
                </button>

                <span className="ml-4 text-sm text-gray-600">
                  Showing {indexOfFirstSession + 1}-{Math.min(indexOfLastSession, sessions.length)} of {sessions.length}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordInput('');
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Session Password</h3>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter password"
            />
            <div className="flex gap-3">
              <button
                onClick={verifyPassword}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Join
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JitsiSessions;
