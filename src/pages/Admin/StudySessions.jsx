import { useState, useEffect } from "react";
import axios from "axios";
import { Menu } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import ToastContainer from "../../components/ToastContainer";
import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import { API_URL } from "../../config/api.config";

export default function StudySessions() {
    const { toasts, toast, removeToast } = useToast();
    const { confirmState, confirm, closeConfirm } = useConfirm();
    const [sessions, setSessions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sessionsPerPage = 13;

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/sessions`, {
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
        await confirm({
            title: 'End Session',
            message: 'Are you sure you want to end this study session?',
            confirmText: 'End Session',
            cancelText: 'Cancel',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    await axios.put(
                        `${API_URL}/api/admin/sessions/${sessionId}/end`,
                        {},
                        { withCredentials: true }
                    );
                    setSessions((prev) =>
                        prev.map((s) =>
                            s.session_id === sessionId ? { ...s, status: "Completed" } : s
                        )
                    );
                    toast.success("Session ended successfully!");
                } catch (err) {
                    console.error("Failed to end session:", err);
                    toast.error("Failed to end session. Please try again.");
                }
            }
        });
    };

    const indexOfLastSession = currentPage * sessionsPerPage;
    const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
    const currentSessions = sessions.slice(indexOfFirstSession, indexOfLastSession);
    const totalPages = Math.ceil(sessions.length / sessionsPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    return (
        <div className="flex w-full min-h-screen bg-gray-100 relative">
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

            {/* Desktop Sidebar */}
            <div className="hidden md:block fixed top-0 left-0 h-screen w-64 bg-yellow-400">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-40 z-50 md:hidden transition-opacity ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                onClick={() => setSidebarOpen(false)}
            >
                <div
                    className={`absolute top-0 left-0 h-full w-64 bg-yellow-400 shadow-lg transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-6 h-6 text-gray-800" />
                            </button>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                                Study Sessions
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                            Active & Past Sessions
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed text-xs sm:text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-2 sm:px-3 w-20">ID</th>
                                        <th className="py-2 px-2 sm:px-3 w-32">Host</th>
                                        <th className="py-2 px-2 sm:px-3 w-40">Topic</th>
                                        <th className="py-2 px-2 sm:px-3 w-24">Duration</th>
                                        <th className="py-2 px-2 sm:px-3 w-24">Status</th>
                                        <th className="py-2 px-2 sm:px-3 w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSessions.length > 0 ? (
                                        currentSessions.map((session) => (
                                            <tr key={session.session_id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 sm:px-3 truncate">{session.session_id}</td>
                                                <td className="py-2 px-2 sm:px-3 font-medium truncate">{session.host}</td>
                                                <td className="py-2 px-2 sm:px-3 truncate" title={session.topic}>
                                                    {session.topic}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{session.duration}</td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${session.status === "Active"
                                                                ? "bg-green-100 text-green-800"
                                                                : session.status === "Scheduled"
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : session.status === "Completed"
                                                                        ? "bg-gray-200 text-gray-700"
                                                                        : "bg-red-100 text-red-800"
                                                            }`}
                                                    >
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    {session.status === "Active" || session.status === "Scheduled" ? (
                                                        <button
                                                            onClick={() => handleEndSession(session.session_id)}
                                                            className="bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-red-600 transition-colors"
                                                        >
                                                            End
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="bg-gray-300 text-gray-600 px-2 sm:px-3 py-1.5 rounded-lg text-xs cursor-not-allowed"
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

                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:p-2 gap-3">
                            <button
                                onClick={handlePrev}
                                disabled={currentPage === 1}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}