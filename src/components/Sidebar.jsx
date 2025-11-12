import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./api";
import { PowerIcon } from "@heroicons/react/24/outline";

const navigation = [
    { name: "Dashboard", href: "/admin/dashboard" },
    { name: "User Management", href: "/admin/users" },
    { name: "Quiz Management", href: "/admin/quizzes" },
    { name: "Study Sessions", href: "/admin/sessions" },
    { name: "Audit Logs", href: "/admin/logs" },
];

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [userPhoto, setUserPhoto] = useState(null);
    const [collapsed, setCollapsed] = useState(false);

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
            navigate("/login");
        } catch (err) {
            console.error("Logout error:", err);
            alert("Failed to log out");
        }
    };

    return (
        <div
            className={classNames(
                "flex flex-col h-screen bg-yellow-300 text-black transition-all duration-300",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-black/20">
                <Link
                    to="/admin/dashboard"
                    className="text-2xl font-bold tracking-tight text-black hover:text-white transition-colors"
                >
                    {collapsed ? (
                        <span className="text-indigo-500">A</span>
                    ) : (
                        <>
                            Stud<span className="text-indigo-500">AI</span>
                        </>
                    )}
                </Link>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-gray-700 hover:text-black focus:outline-none"
                >
                    {collapsed ? "»" : "«"}
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navigation.map((item) => {
                    const isCurrent = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={classNames(
                                isCurrent
                                    ? "bg-gray-950/50 text-white"
                                    : "text-black hover:bg-white/10 hover:text-white",
                                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
                            )}
                        >
                            {!collapsed && item.name}
                            {collapsed && (
                                <span className="mx-auto text-lg" title={item.name}>
                                    {item.name.charAt(0)}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div className="border-t border-white/20 p-4 flex flex-col items-center">
                <img
                    src={userPhoto || `${API_BASE}/uploads/profile_pictures/default-avatar.png`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover mb-2"
                />
                {!collapsed && (
                    <button
                        onClick={handleLogout}
                        className="mt-2 flex items-center text-sm text-gray-800 hover:text-red-600 transition-colors"
                    >
                        <PowerIcon className="w-4 h-4 mr-1" />
                        Logout
                    </button>
                )}
            </div>
        </div>
    );
}
