import { useState, useEffect } from "react";
import axios from "axios";
import { Users, FileText, PlayCircle, StickyNote, Lock, Unlock, Clock, Menu, X, } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { API_URL } from "../../config/api.config";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuizzes: 0,
        activeSessions: 0,
        totalNotes: 0,
    });
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentSessions, setRecentSessions] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ for mobile toggle

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/stats`, {
                    withCredentials: true,
                });
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            }
        };

        const fetchRecentUsers = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/admin/recent-users`,
                    {
                        withCredentials: true,
                    }
                );
                setRecentUsers(res.data.users || []);
            } catch (err) {
                console.error("Failed to fetch recent users:", err);
            }
        };

        const fetchRecentSessions = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/admin/recent-sessions`,
                    {
                        withCredentials: true,
                    }
                );
                setRecentSessions(res.data.sessions || []);
            } catch (err) {
                console.error("Failed to fetch recent sessions:", err);
            }
        };

        fetchStats();
        fetchRecentUsers();
        fetchRecentSessions();
    }, []);

    const handleUserAction = async (userId, action) => {
        try {
            await axios.post(
                `${API_URL}/api/admin/users/${userId}/${action}`,
                {},
                { withCredentials: true }
            );
            setRecentUsers((prev) =>
                prev.map((u) =>
                    u.user_id === userId
                        ? { ...u, status: action === "lock" ? "Locked" : "Active" }
                        : u
                )
            );
        } catch (err) {
            console.error(`Failed to ${action} user:`, err);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* ✅ Sidebar for large screens */}
            <div className="hidden md:block fixed top-0 left-0 h-screen">
                <Sidebar />
            </div>

            {/* ✅ Mobile Sidebar (drawer style) */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="w-64 bg-white shadow-lg">
                        <Sidebar />
                    </div>
                    <div
                        className="flex-1 bg-black bg-opacity-40"
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                </div>
            )}

            {/* ✅ Main Content Area */}
            <div className="flex-1 flex flex-col md:ml-64">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {/* Mobile Toggle Button */}
                            <button
                                className="md:hidden text-gray-700"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                {sidebarOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                                Administrator Dashboard
                            </h1>
                        </div>

                    </div>
                </div>

                {/* Main Dashboard Content */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
                    {/* Stats Boxes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <span className="text-xs text-gray-500">Users</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalUsers}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Total Users</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <FileText className="w-5 h-5 text-yellow-600" />
                                <span className="text-xs text-gray-500">Quizzes</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalQuizzes}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Total Quizzes</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <PlayCircle className="w-5 h-5 text-green-600" />
                                <span className="text-xs text-gray-500">Sessions</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.activeSessions}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Active Sessions</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <StickyNote className="w-5 h-5 text-blue-600" />
                                <span className="text-xs text-gray-500">Notes</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalNotes}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Notes Created</p>
                        </div>
                    </div>

                    {/* Recent User Activity */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Recent User Activity
                            </h2>
                            <button className="text-sm bg-yellow-400 text-black font-medium px-4 py-1.5 rounded-lg hover:bg-yellow-500 transition">
                                View All Users
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-3">User ID</th>
                                        <th className="py-2 px-3">Username</th>
                                        <th className="py-2 px-3">Email</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Last Activity</th>
                                        <th className="py-2 px-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentUsers.length > 0 ? (
                                        recentUsers.map((user) => (
                                            <tr key={user.user_id} className="border-b border-gray-100">
                                                <td className="py-2 px-3">{user.user_id}</td>
                                                <td className="py-2 px-3 font-medium">
                                                    {user.username}
                                                </td>
                                                <td className="py-2 px-3 text-gray-600">
                                                    {user.email}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === "Active"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                            }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-500">
                                                    {user.lastActivity}
                                                </td>
                                                <td className="py-2 px-3">
                                                    {user.status === "Active" ? (
                                                        <button
                                                            onClick={() =>
                                                                handleUserAction(user.user_id, "lock")
                                                            }
                                                            className="flex items-center bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                        >
                                                            <Lock className="w-4 h-4 mr-1" /> Lock
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                handleUserAction(user.user_id, "unlock")
                                                            }
                                                            className="flex items-center bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600"
                                                        >
                                                            <Unlock className="w-4 h-4 mr-1" /> Unlock
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="text-center py-4 text-gray-500"
                                            >
                                                No recent user activity
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Study Sessions */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Recent Study Sessions
                            </h2>
                            <button className="text-sm bg-yellow-400 text-black font-medium px-4 py-1.5 rounded-lg hover:bg-yellow-500 transition">
                                View All Sessions
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-3">Session ID</th>
                                        <th className="py-2 px-3">Host</th>
                                        <th className="py-2 px-3">Participants</th>
                                        <th className="py-2 px-3">Duration</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSessions.length > 0 ? (
                                        recentSessions.map((s) => (
                                            <tr
                                                key={s.session_id}
                                                className="border-b border-gray-100"
                                            >
                                                <td className="py-2 px-3">{s.session_id}</td>
                                                <td className="py-2 px-3">{s.host}</td>
                                                <td className="py-2 px-3">{s.participants}</td>
                                                <td className="py-2 px-3">{s.duration}</td>
                                                <td className="py-2 px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "Active"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-200 text-gray-700"
                                                            }`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {s.status === "Active" ? (
                                                        <button className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 flex items-center">
                                                            <Clock className="w-4 h-4 mr-1" /> End
                                                        </button>
                                                    ) : (
                                                        <button className="bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center cursor-default">
                                                            <Clock className="w-4 h-4 mr-1" /> Ended
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="text-center py-4 text-gray-500"
                                            >
                                                No recent sessions
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
