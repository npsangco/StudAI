import { useState, useEffect } from "react";
import axios from "axios";
import { Menu, X } from "lucide-react"; // for hamburger + close icons
import Sidebar from "../../components/Sidebar";
import { API_URL } from "../../config/api.config";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false); // for mobile sidebar toggle
    const logsPerPage = 14;

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/audit-logs`, {
                    withCredentials: true,
                });
                setLogs(res.data || []);
            } catch (err) {
                console.error("Failed to fetch audit logs:", err);
            }
        };
        fetchLogs();
    }, []);

    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
    const totalPages = Math.ceil(logs.length / logsPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    return (
        <div className="flex w-full min-h-screen bg-gray-100 relative">
            <div className="hidden md:block fixed top-0 left-0 h-screen w-64 bg-yellow-400">
                <Sidebar />
            </div>

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
                    <Sidebar />
                </div>
            </div>

            <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
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
                                Audit Logs
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                            System Audit Logs
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed text-xs sm:text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-2 sm:px-3 w-20">Log ID</th>
                                        <th className="py-2 px-2 sm:px-3 w-36 sm:w-40">User</th>
                                        <th className="py-2 px-2 sm:px-3 w-32 sm:w-40">Action</th>
                                        <th className="py-2 px-2 sm:px-3 w-32 sm:w-40">Target</th>
                                        <th className="py-2 px-2 sm:px-3 w-28 sm:w-32">Target ID</th>
                                        <th className="py-2 px-2 sm:px-3 w-44 sm:w-56">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLogs.length > 0 ? (
                                        currentLogs.map((log, index) => (
                                            <tr key={index} className="border-b border-gray-100">
                                                <td className="py-2 px-2 sm:px-3 truncate">{log.log_id}</td>
                                                <td className="py-2 px-2 sm:px-3 font-medium truncate">
                                                    {log.User?.username || `User #${log.user_id}`}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{log.action}</td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{log.table_name}</td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{log.record_id}</td>
                                                <td className="py-2 px-2 sm:px-3 text-gray-600 truncate">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-gray-500">
                                                No audit logs found
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
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
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
