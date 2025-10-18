import { useState, useEffect } from "react";
import { AlertCircle, Video, Calendar, Clock, Trash2, ExternalLink, Copy, Play, Square, Users } from "lucide-react";

export default function Sessions() {
  const [loading, setLoading] = useState(false);
  const [zoomStatus, setZoomStatus] = useState({ authorized: false, expiresAt: null });
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    title: "",
    duration: 60,
    scheduled_start: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    checkZoomStatus();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get("zoom_connected") === "true") {
      setSuccess("Successfully connected to Zoom! You can now create sessions.");
      checkZoomStatus();
      loadSessions();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("error")) {
      setError(`Connection failed: ${params.get("error")}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkZoomStatus = async () => {
    try {
      const resp = await fetch("/api/zoom/status", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        setZoomStatus(data);
        if (data.authorized) {
          loadSessions();
        }
      }
    } catch (e) {
      console.error("Failed to check Zoom status:", e);
    }
  };

  const loadSessions = async () => {
    try {
      const resp = await fetch("/api/sessions", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data.sessions);
      } else if (resp.status === 401) {
        setZoomStatus({ authorized: false, expiresAt: null });
        setError("Your Zoom authorization has expired. Please reconnect.");
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  };

  const connectZoom = async () => {
    try {
      const resp = await fetch("/api/zoom/authorize", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        window.location.href = data.authUrl;
      } else {
        setError("Failed to initiate Zoom connection");
      }
    } catch (e) {
      setError("Error connecting to Zoom");
    }
  };

  const disconnectZoom = async () => {
    if (!confirm("Are you sure you want to disconnect your Zoom account?")) return;
    
    try {
      const resp = await fetch("/api/zoom/revoke", {
        method: "POST",
        credentials: "include"
      });
      if (resp.ok) {
        setZoomStatus({ authorized: false, expiresAt: null });
        setSessions([]);
        setSuccess("Zoom account disconnected successfully");
      }
    } catch (e) {
      setError("Failed to disconnect Zoom");
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSession)
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to create session");
      }

      const data = await resp.json();
      setSuccess(`Session "${data.session.title}" created successfully!`);
      setNewSession({ title: "", duration: 60, scheduled_start: "" });
      loadSessions();
    } catch (e) {
      setError(e.message || "Error creating session");
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (sessionId) => {
    try {
      const resp = await fetch(`/api/sessions/${sessionId}/start`, {
        method: "POST",
        credentials: "include"
      });

      if (resp.ok) {
        setSuccess("Session started!");
        loadSessions();
      } else {
        const data = await resp.json();
        throw new Error(data.error || "Failed to start session");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const endSession = async (sessionId) => {
    if (!confirm("Are you sure you want to end this session?")) return;

    try {
      const resp = await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
        credentials: "include"
      });

      if (resp.ok) {
        setSuccess("Session ended successfully");
        loadSessions();
      } else {
        const data = await resp.json();
        throw new Error(data.error || "Failed to end session");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const resp = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (resp.ok) {
        setSuccess("Session deleted successfully");
        loadSessions();
      } else {
        const data = await resp.json();
        throw new Error(data.error || "Failed to delete session");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label} copied to clipboard!`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Study Sessions</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">Zoom Integration</h2>
                <p className="text-sm text-gray-600">
                  {zoomStatus.authorized 
                    ? "Your Zoom account is connected" 
                    : "Connect your Zoom account to create sessions"}
                </p>
              </div>
            </div>
            
            {zoomStatus.authorized ? (
              <button
                onClick={disconnectZoom}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectZoom}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Connect Zoom
              </button>
            )}
          </div>
        </div>

        {!zoomStatus.authorized ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Authorization Required</h3>
                <p className="text-yellow-800 mb-4">
                  To create and manage study sessions with Zoom, you need to authorize StudAI to access your Zoom account. 
                  This allows us to create meetings on your behalf.
                </p>
                <button
                  onClick={connectZoom}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  Authorize Now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Create New Session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={newSession.title}
                    onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                    placeholder="e.g., Math Study Group"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={newSession.duration}
                      onChange={(e) => setNewSession({...newSession, duration: parseInt(e.target.value)})}
                      min="15"
                      max="480"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Start (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newSession.scheduled_start}
                      onChange={(e) => setNewSession({...newSession, scheduled_start: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={createSession}
                  disabled={loading || !newSession.title}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Creating..." : "Create Session"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Your Sessions</h2>
              
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No sessions created yet</p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.session_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{session.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>Session Code: <strong>{session.session_code}</strong></span>
                            </div>
                            {session.scheduled_start && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(session.scheduled_start).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{session.duration} minutes</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {session.status === 'scheduled' && (
                            <button
                              onClick={() => startSession(session.session_id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                              title="Start session"
                            >
                              <Play className="w-5 h-5" />
                            </button>
                          )}
                          {session.status === 'active' && (
                            <button
                              onClick={() => endSession(session.session_id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                              title="End session"
                            >
                              <Square className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteSession(session.session_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete session"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => copyToClipboard(session.session_code, "Session code")}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Code
                        </button>
                        <button
                          onClick={() => copyToClipboard(session.zoom_join_url, "Join link")}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Join Link
                        </button>
                        <a
                          href={session.zoom_join_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Join as Participant
                        </a>
                        <a
                          href={session.zoom_start_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition text-sm"
                        >
                          <Video className="w-4 h-4" />
                          Start as Host
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}