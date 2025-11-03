import React, { useState, useEffect } from 'react';
import { Calendar, Video, LogOut, User, Clock, Copy, Check, RefreshCw } from 'lucide-react';

const Sessions = () => {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [zoomConnected, setZoomConnected] = useState(false);
  
  const [sessionForm, setSessionForm] = useState({
    topic: '',
    duration: 60,
    start_time: '',
    agenda: ''
  });

  const API_BASE_URL = 'http://localhost:4000/api';

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const zoomConnected = urlParams.get('zoom_connected');
    const error = urlParams.get('error');
    
    if (zoomConnected) {
      setSuccess('Successfully connected to Zoom!');
      setTimeout(() => setSuccess(''), 3000);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
      setError(`Zoom connection failed: ${error}`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load user from session and check Zoom status
    checkUserAndZoomStatus();
    loadSessions();
  }, []);

  const checkUserAndZoomStatus = async () => {
    try {
      // Check if user is logged in (you might need to adjust this based on your auth)
      const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser({
          id: userData.user_id,
          email: userData.email,
          first_name: userData.username, // Using username as first name
          last_name: '' // Adjust based on your user model
        });
        
        // Check Zoom connection status
        const zoomStatusResponse = await fetch(`${API_BASE_URL}/sessions/zoom/status`, {
          credentials: 'include'
        });
        
        if (zoomStatusResponse.ok) {
          const zoomStatus = await zoomStatusResponse.json();
          setZoomConnected(zoomStatus.connected);
        }
      }
    } catch (err) {
      console.log('User status check failed:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.log('Failed to load sessions:', err);
    }
  };

  const handleZoomConnect = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/zoom/connect`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate Zoom connection');
      }
      
      const data = await response.json();
      // Redirect to Zoom OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      setError('Failed to connect to Zoom. Please try again.');
      setLoading(false);
    }
  };

  const handleDisconnectZoom = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/zoom/disconnect`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setZoomConnected(false);
        setSuccess('Zoom disconnected successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to disconnect Zoom');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSessionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
          agenda: sessionForm.agenda
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      
      // Add the new session to the list
      setSessions(prev => [data.session, ...prev]);
      
      setSuccess(data.message);
      
      // Reset form
      setSessionForm({
        topic: '',
        duration: 60,
        start_time: '',
        agenda: ''
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  const refreshSessions = async () => {
    await loadSessions();
    setSuccess('Sessions refreshed!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <Video className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Study Sessions
            </h1>
            <p className="text-gray-600">
              Please log in to create and manage study sessions
            </p>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
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

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Session Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
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

            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Agenda
                </label>
                <textarea
                  name="agenda"
                  value={sessionForm.agenda}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="What will you study in this session..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  disabled={!zoomConnected}
                />
              </div>

              <button
                onClick={createSession}
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
            </div>
          </div>

          {/* Sessions List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Your Study Sessions ({sessions.length})
              </h3>
              <button
                onClick={refreshSessions}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh sessions"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No study sessions yet.</p>
                {!zoomConnected && (
                  <p className="text-sm text-gray-400">Connect Zoom to create your first session!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-bold text-gray-900 mb-2">{session.title}</h4>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {session.scheduled_start 
                          ? new Date(session.scheduled_start).toLocaleString() 
                          : 'No start time set'
                        } 
                        ({session.duration} min)
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'scheduled' ? 'bg-green-500' : 
                          session.status === 'completed' ? 'bg-blue-500' : 
                          'bg-gray-500'
                        }`} />
                        <span className="capitalize">{session.status}</span>
                      </div>
                    </div>

                    {session.zoom_join_url && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={session.zoom_join_url}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs"
                          />
                          <button
                            onClick={() => copyToClipboard(session.zoom_join_url, session.session_id)}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                          >
                            {copiedUrl === session.session_id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                        
                        <a
                          href={session.zoom_join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                        >
                          Join Session
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sessions;