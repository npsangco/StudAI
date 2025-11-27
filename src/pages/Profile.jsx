import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, Trophy, Camera } from "lucide-react";
import axios from "axios";
import { API_BASE } from "../components/api";
import AchievementsModal from "../components/AchievementsModal";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { profileTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';

export default function Profile() {
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");
    const [photo, setPhoto] = useState(null);
    const [savedPhoto, setSavedPhoto] = useState(null);
    const [profileKey, setProfileKey] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [originalProfile, setOriginalProfile] = useState(null);
    const [showAchievementsModal, setShowAchievementsModal] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [hadBirthday, setHadBirthday] = useState(false);
    const [memberSince, setMemberSince] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");
    
    const { toasts, removeToast, toast } = useToast();
    const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('profile');

    const fileInputRef = useRef(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => 1950 + i);

    useEffect(() => {
        axios.get(`${API_BASE}/api/user/profile`, { withCredentials: true })
            .then((res) => {
                const user = res.data;
                setUsername(user.username || "");
                setEmail(user.email || "");
                setPhoto(user.profile_picture || null);
                setSavedPhoto(user.profile_picture || null);
                
                // Set member since date
                if (user.createdAt) {
                    const createdDate = new Date(user.createdAt);
                    setMemberSince(createdDate.getFullYear());
                }
                
                // Set last updated to current date
                setLastUpdated("Recently");

                let bMonth = "";
                let bDay = "";
                let bYear = "";
                if (user.birthday) {
                    const bday = new Date(user.birthday);
                    bMonth = bday.getMonth() + 1;
                    bDay = bday.getDate();
                    bYear = bday.getFullYear();
                    setMonth(bMonth);
                    setDay(bDay);
                    setYear(bYear);
                    setHadBirthday(true);
                }

                setOriginalProfile({
                    username: user.username || "",
                    email: user.email || "",
                    photo: user.profile_picture || null,
                    month: bMonth,
                    day: bDay,
                    year: bYear,
                });
            })
            .catch((err) => {
                console.error("Profile fetch error:", err);
                toast.error("You must log in to view your profile.");
            });
    }, []);

    const handleUpdate = async () => {
        try {
            const birthday =
                year && month && day
                    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : null;

            if (password) {
                try {
                    await axios.post(
                        `${API_BASE}/api/user/request-password-update`,
                        { newPassword: password },
                        { withCredentials: true }
                    );
                    toast.info("A verification email has been sent. Please confirm to update your password.");
                } catch (err) {
                    console.error("Password update error:", err);

                    if (err.response && err.response.data && err.response.data.error) {
                        setPasswordMessage(err.response.data.error);
                    } else {
                        setPasswordMessage("Failed to update password.");
                    }

                    setPassword("");

                    return; 
                }
            }

            const payload = { username, birthday };
            if (profileKey) payload.profile_picture = profileKey;

            await axios.put(
                `${API_BASE}/api/user/profile`,
                payload,
                { withCredentials: true }
            );

            // If user set birthday for the first time, mark it as set
            if (!hadBirthday && birthday) {
                setHadBirthday(true);
            }

            setSavedPhoto(photo);
            setOriginalProfile({ username, email, photo, month, day, year });
            setPassword(""); 
            setPasswordMessage("");
            setLastUpdated("Just now"); 

            toast.success("Profile updated.");
            window.dispatchEvent(new CustomEvent("profileUpdated"));
        } catch (err) {
            console.error("Profile update error:", err);
            toast.error("Update failed");
        }
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            toast.error("File size must be less than 25MB");
            return;
        }

        const formData = new FormData();
        formData.append("profilePic", file);

        try {
            const res = await axios.post(`${API_BASE}/api/upload/profile`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Keep signed URL for immediate preview, but store the R2 key to save in DB
            setPhoto(res.data.photoUrl);
            setProfileKey(res.data.r2Key || res.data.key || null);
        } catch (err) {
            console.error("Upload error:", err);
            toast.error("Failed to upload photo");
        }
    };

    const isChanged = originalProfile && (
        username !== originalProfile.username ||
        photo !== originalProfile.photo ||
        month !== originalProfile.month ||
        day !== originalProfile.day ||
        year !== originalProfile.year ||
        password.length > 0
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            {showTutorial && (
                <TutorialOverlay
                    steps={profileTutorialSteps}
                    onComplete={completeTutorial}
                    onSkip={skipTutorial}
                />
            )}
            
            <AchievementsModal 
                isOpen={showAchievementsModal} 
                onClose={() => setShowAchievementsModal(false)} 
            />
            
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Card Header */}
                    <div className="px-6 py-8 sm:px-8 sm:py-8 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left">
                                Profile Settings
                            </h1>
                            
                            <button
                                onClick={() => setShowAchievementsModal(true)}
                                className="flex items-center gap-3 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                data-tutorial="achievements"
                            >
                                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                                <span className="font-semibold text-sm sm:text-base">Achievements</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 sm:p-8 lg:p-10">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                            {/* Profile Picture Section */}
                            <div className="flex flex-col items-center lg:items-start lg:w-1/3">
                                <div 
                                    className="relative mb-6 cursor-pointer group"
                                    onMouseEnter={() => setIsHovering(true)}
                                    onMouseLeave={() => setIsHovering(false)}
                                    onClick={() => fileInputRef.current.click()}
                                    data-tutorial="profile-picture"
                                >
                                    <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 bg-gray-200 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
                                        <img
                                            src={photo || "/uploads/profile_pictures/default-avatar.png"}
                                            alt="Profile"
                                            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-50"
                                        />
                                        
                                        {/* Hover Overlay */}
                                        <div className={`absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                                            isHovering ? 'opacity-100' : 'opacity-0'
                                        }`}>
                                            <Camera className="w-8 h-8 text-white mb-2" />
                                            <span className="text-white text-sm font-medium text-center px-2">
                                                Upload Image
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handlePhotoSelect}
                                />
                                
                                {/* Profile Stats */}
                                <div className="hidden lg:block mt-8 w-full">
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <h3 className="font-semibold text-gray-700 mb-4">Profile Info</h3>
                                        <div className="space-y-3 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Member since</span>
                                                <span className="font-medium">{memberSince || "2024"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Last updated</span>
                                                <span className="font-medium">{lastUpdated}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Form Section */}
                            <div className="flex-1 space-y-6 lg:space-y-8" data-tutorial="edit-profile">
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            disabled
                                        />
                                        <Lock className="absolute right-4 top-3.5 text-gray-400 w-5 h-5" />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter your username"
                                    />
                                </div>

                                {/* Password */}
                                <div data-tutorial="change-password">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {passwordMessage && (
                                        <p className="mt-2 text-sm text-red-600 font-medium">{passwordMessage}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Leave blank to keep current password
                                    </p>
                                </div>

                                {/* Birthday */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Birthday
                                        {hadBirthday && (
                                            <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>
                                        )}
                                        {!hadBirthday && (
                                            <span className="ml-2 text-xs text-blue-600">(Can be set once)</span>
                                        )}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                            disabled={hadBirthday}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="" className="text-gray-400">Month</option>
                                            {months.map((m, i) => (
                                                <option key={i} value={i + 1}>{m}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={day}
                                            onChange={(e) => setDay(e.target.value)}
                                            disabled={hadBirthday}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="" className="text-gray-400">Day</option>
                                            {days.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>

                                        <select
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            disabled={hadBirthday}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="" className="text-gray-400">Year</option>
                                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Update Button */}
                                <div className="pt-4">
                                    <button
                                        onClick={handleUpdate}
                                        disabled={!isChanged}
                                        className={`w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                            isChanged
                                                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500 shadow-lg hover:shadow-xl cursor-pointer"
                                                : "bg-gray-400 cursor-not-allowed shadow"
                                        }`}
                                    >
                                        Update Profile
                                    </button>
                                    {!isChanged && (
                                        <p className="mt-2 text-sm text-gray-500 text-center sm:text-left">
                                            Make changes to enable update button
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tutorial Button */}
            <TutorialButton onClick={startTutorial} />
        </div>
    );
}