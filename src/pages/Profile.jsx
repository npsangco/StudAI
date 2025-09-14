import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { API_BASE } from "../components/api";

export default function Profile() {
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");
    const [photo, setPhoto] = useState(null);

    const fileInputRef = useRef(null);

    const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => 1950 + i);

    // Fetch user profile
    useEffect(() => {
        axios.get(`${API_BASE}/api/user/profile`, { withCredentials: true })
            .then((res) => {
                const user = res.data;
                setUsername(user.username || "");
                setEmail(user.email || "");
                setPhoto(user.profile_picture || null);

                if (user.birthday) {
                    const bday = new Date(user.birthday);
                    setMonth(bday.getMonth() + 1);
                    setDay(bday.getDate());
                    setYear(bday.getFullYear());
                }
            })
            .catch((err) => {
                console.error("Profile fetch error:", err);
                alert("You must log in to view your profile.");
            });
    }, []);

    const handleUpdate = async () => {
        try {
            const birthday = year && month && day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;

            await axios.put(
                `${API_BASE}/api/user/profile`,
                {
                    username,
                    password: password || null,
                    birthday,
                    profile_picture: photo, // sending base64 or URL
                },
                { withCredentials: true }
            );

            alert("Profile updated!");
            setPassword(""); // clear password field after update
        } catch (err) {
            console.error("Profile update error:", err);
            alert("Update failed");
        }
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                alert("File size must be less than 25MB");
                e.target.value = "";
                return;
            }

            // Convert file to base64 so backend can store it directly
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result); // base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="flex justify-center items-center py-12">
                <div className="bg-white rounded-2xl shadow-md w-full max-w-2xl p-10">
                    <h2 className="text-2xl font-bold text-center mb-8">Profile</h2>

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 bg-gray-200 rounded-full overflow-hidden">
                                {photo && <img src={photo} alt="Profile" className="w-full h-full object-cover" />}
                            </div>
                            <button
                                type="button"
                                className="mt-4 px-4 py-1 rounded-xl text-sm bg-black text-white hover:bg-gray-800 transition"
                                onClick={() => fileInputRef.current.click()}
                            >
                                Upload Photo
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handlePhotoSelect}
                            />
                        </div>

                        <div className="flex-1 space-y-6">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        className="w-full px-4 py-2 border rounded-xl border-gray-300 bg-gray-100"
                                        disabled
                                    />
                                    <Lock className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
                                </div>
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl border-gray-300"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-xl border-gray-300"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-500"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Birthday */}
                            <div>
                                <label className="block mb-2 font-semibold">Birthday</label>
                                <div className="flex gap-2 mb-3">
                                    <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700">
                                        <option value="">Month</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={i + 1}>{m}</option>
                                        ))}
                                    </select>

                                    <select value={day} onChange={(e) => setDay(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700">
                                        <option value="">Day</option>
                                        {days.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>

                                    <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700">
                                        <option value="">Year</option>
                                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="text-center">
                                <button
                                    onClick={handleUpdate}
                                    className="px-8 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
