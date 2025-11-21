import { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock, Menu } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { API_URL } from "../../config/api.config";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const usersPerPage = 14;

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/users`, {
                    withCredentials: true,
                });
                setUsers(res.data || []);
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

    const handleUserAction = async (userId, action) => {
        try {
            await axios.post(
                `${API_URL}/api/admin/users/${userId}/${action}`,
                {},
                { withCredentials: true }
            );
            setUsers((prev) =>
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

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(users.length / usersPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    return (
        <div className="flex w-full min-h-screen bg-gray-100 relative">
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
                                User Management
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                            User List
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed text-xs sm:text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-2 sm:px-3 w-20">User ID</th>
                                        <th className="py-2 px-2 sm:px-3 w-32 sm:w-40">Username</th>
                                        <th className="py-2 px-2 sm:px-3 w-40 sm:w-56">Email</th>
                                        <th className="py-2 px-2 sm:px-3 w-24 sm:w-28">Status</th>
                                        <th className="py-2 px-2 sm:px-3 w-32 sm:w-40">Last Activity</th>
                                        <th className="py-2 px-2 sm:px-3 w-28 sm:w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentUsers.length > 0 ? (
                                        currentUsers.map((user) => (
                                            <tr key={user.user_id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 sm:px-3 truncate">{user.user_id}</td>
                                                <td className="py-2 px-2 sm:px-3 font-medium truncate">{user.username}</td>
                                                <td className="py-2 px-2 sm:px-3 text-gray-600 truncate">{user.email}</td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === "Active"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-red-100 text-red-800"
                                                            }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 text-gray-500 truncate">
                                                    {user.lastActivity}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    {user.status === "Active" ? (
                                                        <button
                                                            onClick={() => handleUserAction(user.user_id, "lock")}
                                                            className="flex items-center bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                        >
                                                            <Lock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Lock</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUserAction(user.user_id, "unlock")}
                                                            className="flex items-center bg-green-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-green-600"
                                                        >
                                                            <Unlock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Unlock</span>
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
                                                No users found
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