import React, { useState, useEffect } from 'react';
import { Calendar, Video, Clock, Copy, Check, Lock, Globe, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ToastContainer from '../components/ToastContainer';
import AppLoader from '../components/AppLoader';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { API_URL } from '../config/api.config';

const JitsiSessions = () => {
  const { toasts, toast, removeToast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
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
  
  const [sessionForm, setSessionForm] = useState({
    topic: '',
    duration: 60,
    start_time: '',
    is_private: false,
    session_password: ''
  });

  const API_BASE_URL = `${API_URL}/api`;

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        loadMySessions(),
        loadPublicSessions()
      ]);
      setInitialLoading(false);
    };

    loadInitialData();
  }, []);

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
            className="text-red-500 hover:text-red-700 transition-colors"
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
          className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
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
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Sessions</h1>
          <p className="text-gray-600">Create and join video study sessions powered by Jitsi Meet</p>
          <a href="/zoom-sessions" className="text-sm text-blue-600 hover:underline">
            Looking for Zoom sessions? Click here
          </a>
        </div>

        {/* Create Session Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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

            <div className="flex items-center gap-2">
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
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              <Video className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('my-sessions')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'my-sessions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Sessions ({mySessions.length})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'public'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Public Sessions ({publicSessions.length})
          </button>
        </div>

        {/* Sessions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'my-sessions' && mySessions.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No sessions yet. Create your first study session above!
            </div>
          )}
          {activeTab === 'my-sessions' && mySessions.map(session => (
            <SessionCard key={session.session_id} session={session} isMine={true} />
          ))}

          {activeTab === 'public' && publicSessions.filter(session => {
            const startTime = new Date(session.start_time);
            const endTime = new Date(startTime.getTime() + session.duration * 60000);
            return new Date() <= endTime;
          }).length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No public sessions available at the moment.
            </div>
          )}
          {activeTab === 'public' && publicSessions
            .filter(session => {
              const startTime = new Date(session.start_time);
              const endTime = new Date(startTime.getTime() + session.duration * 60000);
              return new Date() <= endTime;
            })
            .map(session => (
              <SessionCard key={session.session_id} session={session} isMine={false} />
            ))}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
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
