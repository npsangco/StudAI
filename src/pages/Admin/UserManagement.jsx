import { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock, Menu, Search } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { API_URL } from "../../config/api.config";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const usersPerPage = 10;

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
            setIsSubmitting(true);
            await axios.post(
                `${API_URL}/api/admin/users/${userId}/${action}`,
                { reason },
                { withCredentials: true }
            );
            setUsers((prev) =>
                prev.map((u) =>
                    u.user_id === userId
                        ? { ...u, status: action === "lock" ? "Locked" : "Active" }
                        : u
                )
            );
            setShowModal(false);
            setReason("");
            setSelectedUser(null);
            setActionType(null);
        } catch (err) {
            console.error(`Failed to ${action} user:`, err);
            alert(`Failed to ${action} user. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openActionModal = (user, action) => {
        setSelectedUser(user);
        setActionType(action);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setReason("");
        setSelectedUser(null);
        setActionType(null);
    };

    // Filter and search 
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.user_id?.toString().includes(searchTerm);
        const matchesFilter = filterStatus === "All" || user.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                                User List
                            </h2>

                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
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
                                    <option value="Locked">Locked</option>
                                </select>
                            </div>
                        </div>

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
                                                            onClick={() => openActionModal(user, "lock")}
                                                            className="flex items-center bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                        >
                                                            <Lock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Lock</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openActionModal(user, "unlock")}
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

            {/* Action Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                            {actionType === "lock" ? "Lock User Account" : "Unlock User Account"}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {actionType === "lock" 
                                ? `You are about to lock the account for ${selectedUser.username}.`
                                : `You are about to unlock the account for ${selectedUser.username}.`
                            }
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={actionType === "lock" 
                                    ? "Enter the reason for locking this account (will be sent to the user via email)..."
                                    : "Enter the reason for unlocking this account (will be sent to the user via email)..."
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                                rows="4"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                This reason will be included in the email notification sent to {selectedUser.email}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUserAction(selectedUser.user_id, actionType)}
                                disabled={!reason.trim() || isSubmitting}
                                className={`flex-1 ${
                                    actionType === "lock" 
                                        ? "bg-red-500 hover:bg-red-600" 
                                        : "bg-green-500 hover:bg-green-600"
                                } text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isSubmitting 
                                    ? "Processing..." 
                                    : actionType === "lock" 
                                        ? "Lock Account" 
                                        : "Unlock Account"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}