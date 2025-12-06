import React, { useState, useEffect } from 'react';
import { Calendar, Video, LogOut, Clock, Copy, Check, RefreshCw, Lock, Globe, Trash2, Eye, EyeOff } from 'lucide-react';
import ToastContainer from '../components/ToastContainer';
import AppLoader from '../components/AppLoader';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { API_URL } from '../config/api.config';
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { sessionsTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';

const Sessions = () => {
  const { toasts, toast, removeToast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('sessions');
  const [user, setUser] = useState(null);
  const [mySessions, setMySessions] = useState([]);
  const [publicSessions, setPublicSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [zoomConnected, setZoomConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('my-sessions');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockedSession, setUnlockedSession] = useState(null);
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
    const urlParams = new URLSearchParams(window.location.search);
    const zoomConnected = urlParams.get('zoom_connected');
    const error = urlParams.get('error');

    if (zoomConnected) {
      toast.success('Successfully connected to Zoom!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      toast.error(`Zoom connection failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const loadInitialData = async () => {
      await Promise.all([
        checkUserAndZoomStatus(),
        loadMySessions(),
        loadPublicSessions()
      ]);
      setInitialLoading(false);
    };

    loadInitialData();
  }, []);

  const checkUserAndZoomStatus = async () => {
    try {
      const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser({
          id: userData.user_id,
          email: userData.email,
          first_name: userData.username,
          last_name: ''
        });
        
        const zoomStatusResponse = await fetch(`${API_BASE_URL}/sessions/zoom/status`, {
          credentials: 'include'
        });
        
        if (zoomStatusResponse.ok) {
          const zoomStatus = await zoomStatusResponse.json();
          setZoomConnected(zoomStatus.connected);
        }
      }
    } catch (err) {
      
    }
  };

  const loadMySessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/my-sessions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMySessions(data.sessions || []);
      }
    } catch (err) {
      
    }
  };

  const loadPublicSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/public`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPublicSessions(data.sessions || []);
      }
    } catch (err) {
      
    }
  };

  const handleZoomConnect = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/zoom/connect`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate Zoom connection');
      }
      
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error('Failed to connect to Zoom. Please try again.');
      setLoading(false);
    }
  };

  const handleDisconnectZoom = async () => {
    await confirm({
      title: 'Disconnect Zoom',
      message: 'Are you sure you want to disconnect from Zoom? You will need to reconnect to create new sessions.',
      confirmText: 'Disconnect',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/sessions/zoom/disconnect`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (response.ok) {
            setZoomConnected(false);
            toast.success('Zoom disconnected successfully');
          }
        } catch (err) {
          toast.error('Failed to disconnect Zoom');
        }
      }
    });
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

    try {
      const response = await fetch(`${API_BASE_URL}/sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: sessionForm.topic,
          duration: sessionForm.duration,
          scheduled_start: sessionForm.start_time,
          is_private: sessionForm.is_private,
          session_password: sessionForm.session_password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      
      toast.success(data.message);
      
      // Reset form
      setSessionForm({
        topic: '',
        duration: 60,
        start_time: '',
        is_private: false,
        session_password: ''
      });
      
      // Reload sessions
      await loadMySessions();
      if (!sessionForm.is_private) {
        await loadPublicSessions();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_id: selectedSession.session_id,
          password: passwordInput
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Incorrect password');
      }

      const data = await response.json();
      setUnlockedSession(data.session);
      setShowPasswordModal(false);
      setPasswordInput('');
      toast.success('Session unlocked!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    await confirm({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this session? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Session deleted successfully');
            await loadMySessions();
            await loadPublicSessions();
          }
        } catch (err) {
          toast.error('Failed to delete session');
        }
      }
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  const refreshSessions = async () => {
    await loadMySessions();
    await loadPublicSessions();
    toast.success('Sessions refreshed!');
  };

  const renderSessionCard = (session, isMine = false) => {
    const isUnlocked = unlockedSession?.session_id === session.session_id;
    const isExpired = new Date(session.scheduled_end) < new Date();
    const isActive = new Date() >= new Date(session.scheduled_start) && new Date() <= new Date(session.scheduled_end);
    
    // Check if this is a private session and we don't have access to the URL
    const isPrivateLocked = session.is_private && !isMine && !isUnlocked && !session.zoom_join_url;

    return (
      <div
        key={session.session_id}
        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
          isExpired ? 'bg-gray-50 opacity-75' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-bold text-gray-900">{session.title}</h4>
          {session.is_private && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-full">
              <Lock className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-semibold">Private</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {new Date(session.scheduled_start).toLocaleString()} ({session.duration} min)
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isExpired ? 'bg-gray-500' :
              isActive ? 'bg-green-500' : 
              'bg-blue-500'
            }`} />
            <span className="capitalize">{session.status}</span>
          </div>

          {session.host_name && (
            <div className="text-xs text-gray-500">
              Host: {session.host_name}
            </div>
          )}
        </div>

        {!isExpired && (
          <>
            {isPrivateLocked ? (
              // Show unlock button for private sessions that haven't been unlocked yet
              <div className="space-y-2">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 mb-2">
                    🔒 This is a private session. Enter the password to view the meeting link.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSession(session);
                    setShowPasswordModal(true);
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Unlock Session
                </button>
              </div>
            ) : (
              // Show join URL for public sessions or unlocked private sessions
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={isUnlocked ? unlockedSession.zoom_join_url : session.zoom_join_url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs"
                  />
                  <button
                    onClick={() => copyToClipboard(
                      isUnlocked ? unlockedSession.zoom_join_url : session.zoom_join_url,
                      session.session_id
                    )}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    {copiedUrl === session.session_id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={isUnlocked ? unlockedSession.zoom_join_url : session.zoom_join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                    data-tutorial="join-session"
                  >
                    Join Session
                  </a>
                  
                  {isMine && (
                    <button
                      onClick={() => handleDeleteSession(session.session_id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {isExpired && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-500">Session has ended</p>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <Video className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Sessions</h1>
            <p className="text-gray-600">Please log in to create and manage study sessions</p>
          </div>
          <div className="text-center">
            <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return <AppLoader message="Loading Sessions..." />;
  }

  return (
    <div className="min-h-screen p-4">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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

      {showTutorial && (
        <TutorialOverlay
          steps={sessionsTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-gray-600 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${zoomConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-500">
                    Zoom {zoomConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {zoomConnected ? (
                <button
                  onClick={handleDisconnectZoom}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Zoom
                </button>
              ) : (
                <button
                  onClick={handleZoomConnect}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  data-tutorial="zoom-connect"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  Connect Zoom
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Session Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6" data-tutorial="create-session">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Create New Study Session
            </h3>

            {!zoomConnected && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You need to connect Zoom first to create sessions.
                </p>
              </div>
            )}

            <form onSubmit={createSession} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Topic *
                </label>
                <input
                  type="text"
                  name="topic"
                  value={sessionForm.topic}
                  onChange={handleInputChange}
                  placeholder="Study Group Session"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={!zoomConnected}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={sessionForm.start_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={!zoomConnected}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={sessionForm.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="480"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={!zoomConnected}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    name="is_private"
                    id="is_private"
                    checked={sessionForm.is_private}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!zoomConnected}
                  />
                  <label htmlFor="is_private" className="text-sm font-semibold text-gray-700">
                    Make this a private session
                  </label>
                </div>

                {sessionForm.is_private && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Session Password *
                    </label>
                    <input
                      type="password"
                      name="session_password"
                      value={sessionForm.session_password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required={sessionForm.is_private}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !zoomConnected || !sessionForm.topic || !sessionForm.start_time}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Create Session
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sessions List with Tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2" data-tutorial="my-sessions">
                <button
                  onClick={() => {
                    setActiveTab('my-sessions');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'my-sessions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  My Sessions ({mySessions.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('browse');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                    activeTab === 'browse'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Browse ({publicSessions.length})
                </button>
              </div>
              <button
                onClick={refreshSessions}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh sessions"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {activeTab === 'my-sessions' ? (
                mySessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No study sessions yet.</p>
                    {!zoomConnected && (
                      <p className="text-sm text-gray-400">Connect Zoom to create your first session!</p>
                    )}
                  </div>
                ) : (() => {
                  // Pagination logic for my sessions
                  const indexOfLastSession = currentPage * sessionsPerPage;
                  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
                  const currentSessions = mySessions.slice(indexOfFirstSession, indexOfLastSession);
                  return currentSessions.map((session) => renderSessionCard(session, true));
                })()
              ) : (
                publicSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No public sessions available.</p>
                  </div>
                ) : (() => {
                  // Pagination logic for public sessions
                  const indexOfLastSession = currentPage * sessionsPerPage;
                  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
                  const currentSessions = publicSessions.slice(indexOfFirstSession, indexOfLastSession);
                  return currentSessions.map((session) => renderSessionCard(session, false));
                })()
              )}
            </div>

            {/* Pagination Controls */}
            {(() => {
              const sessions = activeTab === 'my-sessions' ? mySessions : publicSessions;
              const totalPages = Math.ceil(sessions.length / sessionsPerPage);
              
              if (sessions.length === 0 || totalPages <= 1) return null;

              const indexOfLastSession = currentPage * sessionsPerPage;
              const indexOfFirstSession = indexOfLastSession - sessionsPerPage;

              return (
                <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t border-gray-200">
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
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordInput('');
          }}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-600" />
              Enter Session Password
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              This is a private session. Please enter the password to access the meeting link.
            </p>

            <div className="mb-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setSelectedSession(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={!passwordInput}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Button */}
      <TutorialButton onClick={startTutorial} />
    </div>
  );
};

export default Sessions;