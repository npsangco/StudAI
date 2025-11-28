import { useState, useEffect } from "react";
import axios from "axios";
import { Menu, Search } from "lucide-react";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [showEndModal, setShowEndModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [endReason, setEndReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const sessionsPerPage = 13;

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

    useEffect(() => {
        fetchSessions();
        
        // Poll for updates every 30 seconds to catch status changes
        const interval = setInterval(() => {
            fetchSessions();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const openEndSessionModal = (session) => {
        setSelectedSession(session);
        setShowEndModal(true);
    };

    const closeEndModal = () => {
        setShowEndModal(false);
        setEndReason("");
        setSelectedSession(null);
    };

    const handleEndSession = async () => {
        try {
            setIsSubmitting(true);
            await axios.put(
                `${API_URL}/api/admin/sessions/${selectedSession.session_id}/end`,
                { reason: endReason || "Session ended by administrator" },
                { withCredentials: true }
            );
            
            // Remove session from local state immediately for better UX
            setSessions(prev => prev.filter(s => s.session_id !== selectedSession.session_id));
            
            closeEndModal();
            toast.success("Session ended successfully!");
        } catch (err) {
            console.error("Failed to end session:", err);
            toast.error("Failed to end session. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper function to check if session has expired
    const isSessionExpired = (session) => {
        if (!session.start_time || !session.duration) return false;
        const startTime = new Date(session.start_time);
        const endTime = new Date(startTime.getTime() + session.duration * 60000);
        return new Date() > endTime;
    };

    // Helper function to get actual session status
    const getActualStatus = (session) => {
        const isExpired = isSessionExpired(session);
        if (isExpired && (session.status?.toLowerCase() === "active" || session.status?.toLowerCase() === "scheduled")) {
            return "Completed";
        }
        return session.status;
    };

    // Filter and search
    const filteredSessions = sessions.filter((session) => {
        const actualStatus = getActualStatus(session);
        const matchesSearch =
            session.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.session_id?.toString().includes(searchTerm);
        const matchesFilter = filterStatus === "All" || actualStatus?.toLowerCase() === filterStatus.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const indexOfLastSession = currentPage * sessionsPerPage;
    const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
    const currentSessions = filteredSessions.slice(indexOfFirstSession, indexOfLastSession);
    const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                                Active Study Sessions
                            </h2>

                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search sessions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-full sm:w-64"
                                    />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>

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
                                        currentSessions.map((session) => {
                                            const actualStatus = getActualStatus(session);
                                            const isExpired = isSessionExpired(session);
                                            
                                            return (
                                            <tr key={session.session_id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 sm:px-3 truncate">{session.session_id}</td>
                                                <td className="py-2 px-2 sm:px-3 font-medium truncate">{session.host}</td>
                                                <td className="py-2 px-2 sm:px-3 truncate" title={session.topic}>
                                                    {session.topic}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{session.duration}</td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            actualStatus?.toLowerCase() === "active"
                                                                ? "bg-green-100 text-green-800"
                                                                : actualStatus?.toLowerCase() === "scheduled"
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : actualStatus?.toLowerCase() === "completed"
                                                                        ? "bg-gray-200 text-gray-700"
                                                                        : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {actualStatus}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    {!isExpired && (actualStatus?.toLowerCase() === "active" || actualStatus?.toLowerCase() === "scheduled") ? (
                                                        <button
                                                            onClick={() => openEndSessionModal(session)}
                                                            className="bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-red-600 transition-colors"
                                                        >
                                                            End
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="bg-gray-300 text-gray-600 px-2 sm:px-3 py-1.5 rounded-lg text-xs cursor-not-allowed"
                                                            title={isExpired ? "Session has ended" : "Session completed"}
                                                        >
                                                            {isExpired ? "Ended" : "Ended"}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })
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

            {/* End Session Modal */}
            {showEndModal && selectedSession && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
                    onClick={closeEndModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 sm:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                End Study Session
                            </h2>
                            <p className="text-gray-600 mb-6">
                                You are about to end the session "{selectedSession.topic}" hosted by {selectedSession.host}.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={endReason}
                                    onChange={(e) => setEndReason(e.target.value)}
                                    placeholder="Enter the reason for ending this session (will be sent to the user via email)..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                                    rows="4"
                                    maxLength={150}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    This reason will be included in the email notification sent to {selectedSession.host} ({endReason.length}/150 characters)
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={closeEndModal}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEndSession}
                                    disabled={!endReason.trim() || isSubmitting}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Ending Session..." : "End Session"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        
                        @keyframes scaleIn {
                            from {
                                opacity: 0;
                                transform: scale(0.95);
                            }
                            to {
                                opacity: 1;
                                transform: scale(1);
                            }
                        }

                        .animate-fadeIn {
                            animation: fadeIn 0.2s ease-out;
                        }

                        .animate-scaleIn {
                            animation: scaleIn 0.2s ease-out;
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}