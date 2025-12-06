import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./api";
import {
    LayoutDashboard,
    Users,
    FileQuestion,
    Clock,
    FileText,
    LogOut,
    User,
    X
} from "lucide-react";
import ToastContainer from "./ToastContainer";
import { useToast } from "../hooks/useToast";

const navigation = [
    {
        name: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard
    },
    {
        name: "User Management",
        href: "/admin/users",
        icon: Users
    },
    {
        name: "Quiz Management",
        href: "/admin/quizzes",
        icon: FileQuestion
    },
    {
        name: "Study Sessions",
        href: "/admin/sessions",
        icon: Clock
    },
    {
        name: "Audit Logs",
        href: "/admin/logs",
        icon: FileText
    },
];

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [userPhoto, setUserPhoto] = useState(null);
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");

    const { toasts, removeToast, toast } = useToast();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/user/profile`, {
                    withCredentials: true,
                });
                if (res.data?.profile_picture) {
                    const pic = res.data.profile_picture;
                    setUserPhoto(pic.startsWith("http") ? pic : `${API_BASE}${pic}`);
                } else {
                    setUserPhoto(null);
                }
                setUserName(res.data?.username || "Admin");
                setUserRole(res.data?.role || "Administrator");
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setUserPhoto(null);
            }
        };

        fetchUser();

        const handleProfileUpdate = () => fetchUser();
        window.addEventListener("profileUpdated", handleProfileUpdate);
        return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post(`${API_BASE}/api/auth/logout`, {}, { withCredentials: true });
            // Clear any cached data including JWT tokens
            sessionStorage.clear();
            localStorage.removeItem('lastVisited');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Force navigate and replace history
            navigate("/login", { replace: true });
            // Reload to clear all state
            window.location.reload();
        } catch (err) {
            console.error("Logout error:", err);
            // Even if logout fails on server, clear client and redirect
            sessionStorage.clear();
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            navigate("/login", { replace: true });
            window.location.reload();
        }
    };

    const handleLinkClick = () => {
        // Close sidebar on mobile when a link is clicked
        if (onClose) {
            onClose();
        }
    };

    return (
        <>
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            <div className="flex flex-col h-screen w-64 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-xl">
                {/* Logo Section */}
                <div className="px-6 py-6 border-b border-black/10">
                    {/* Close button for mobile */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-900" />
                        </button>
                    )}

                    <Link
                        to="/admin/dashboard"
                        className="flex items-center justify-center group"
                        onClick={handleLinkClick}
                    >
                        <img
                            src="/StudAI_Logo-black.png"
                            alt="StudAI Logo"
                            className="h-16 w-auto drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
                        />
                    </Link>
                    <div className="mt-4 text-center">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            Admin Panel
                        </h2>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                    {navigation.map((item) => {
                        const isCurrent = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={handleLinkClick}
                                className={classNames(
                                    isCurrent
                                        ? "bg-black text-white shadow-lg"
                                        : "text-gray-900 hover:bg-white/30 hover:text-black",
                                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 group"
                                )}
                            >
                                <Icon className={classNames(
                                    isCurrent ? "text-yellow-400" : "text-gray-700",
                                    "w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform"
                                )} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="border-t border-black/10 p-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <img
                                    src={userPhoto || "/default-avatar.png"}
                                    alt="Profile"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                    onError={(e) => {
                                        if (e.target.src !== "/default-avatar.png") {
                                            e.target.src = "/default-avatar.png";
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                    {userName}
                                </p>
                                <p className="text-xs text-gray-700 truncate">
                                    {userRole}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-xs text-gray-800 opacity-70">
                            © 2025 StudAI
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}