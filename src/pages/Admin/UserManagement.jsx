import { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock } from "lucide-react";
import Sidebar from "../../components/Sidebar";

export default function UserManagement() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get("http://localhost:4000/api/admin/users", {
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
                `http://localhost:4000/api/admin/users/${userId}/${action}`,
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
                            User Management
                        </h1>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            User List
                        </h2>

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
                                    {users.length > 0 ? (
                                        users.map((user) => (
                                            <tr key={user.user_id} className="border-b border-gray-100">
                                                <td className="py-2 px-3">{user.user_id}</td>
                                                <td className="py-2 px-3 font-medium">{user.username}</td>
                                                <td className="py-2 px-3 text-gray-600">{user.email}</td>
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
                                                            onClick={() => handleUserAction(user.user_id, "lock")}
                                                            className="flex items-center bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                        >
                                                            <Lock className="w-4 h-4 mr-1" /> Lock
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUserAction(user.user_id, "unlock")}
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
                                                No users found
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
