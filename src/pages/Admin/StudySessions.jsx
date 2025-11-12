import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";

export default function StudySessions() {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await axios.get("http://localhost:4000/api/admin/sessions", {
                    withCredentials: true,
                });
                setSessions(res.data || []);
            } catch (err) {
                console.error("Failed to fetch study sessions:", err);
            }
        };
        fetchSessions();
    }, []);

    const handleEndSession = async (sessionId) => {
        if (!window.confirm("End this study session?")) return;
        try {
            await axios.put(
                `http://localhost:4000/api/admin/sessions/${sessionId}/end`,
                {},
                { withCredentials: true }
            );
            setSessions((prev) =>
                prev.map((s) =>
                    s.session_id === sessionId ? { ...s, status: "Ended" } : s
                )
            );
        } catch (err) {
            console.error("Failed to end session:", err);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden md:block fixed top-0 left-0 h-screen">

                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:ml-64">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                            Study Sessions
                        </h1>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Active & Past Sessions
                        </h2>

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
                                    {sessions.length > 0 ? (
                                        sessions.map((session) => (
                                            <tr key={session.session_id} className="border-b border-gray-100">
                                                <td className="py-2 px-3">{session.session_id}</td>
                                                <td className="py-2 px-3 font-medium">{session.host}</td>
                                                <td className="py-2 px-3">{session.participants}</td>
                                                <td className="py-2 px-3">{session.duration}</td>
                                                <td className="py-2 px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${session.status === "Active"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-200 text-gray-700"
                                                            }`}
                                                    >
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {session.status === "Active" ? (
                                                        <button
                                                            onClick={() => handleEndSession(session.session_id)}
                                                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                        >
                                                            End
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="bg-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs cursor-not-allowed"
                                                        >
                                                            Ended
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-gray-500">
                                                No study sessions found
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
