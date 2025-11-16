import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "./components/Navigation";
import LandingNavigation from "./components/LandingNavigation";
import AppLoader from "./components/AppLoader";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import ResetPassword from "./components/ResetPassword";
import PassRecovery from "./components/PassRecovery";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Quizzes from "./pages/Quizzes";
import Sessions from "./pages/Sessions";
import Planner from "./pages/Planner";
import Profile from "./pages/Profile";
import EmailStatus from "./components/confirmations/EmailStatus";
import PasswordStatus from "./components/confirmations/PasswordStatus";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import UserManagement from "./pages/Admin/UserManagement";
import QuizManagement from "./pages/Admin/QuizManagement";
import StudySessions from "./pages/Admin/StudySessions";
import AuditLogs from "./pages/Admin/AuditLogs";
import Footer from "./components/Footer";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

function App() {
  const location = useLocation();
  const [hideNavbar, setHideNavbar] = useState(false);

  // Check if body has hide-navbar class
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHideNavbar(document.body.classList.contains('hide-navbar'));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Routes that should have NO navigation
  const noNavRoutes = ['/login', '/signup'];
  const shouldHideNav = noNavRoutes.includes(location.pathname);

  // Routes that should have landing navigation
  const landingRoutes = ['/', '/create'];
  const isLandingPage = landingRoutes.includes(location.pathname);

  // Routes that should have authenticated navigation
  const authenticatedRoutes = ['/dashboard', '/notes', '/quizzes', '/sessions', '/planner', '/profile'];
  const requiresAuth = authenticatedRoutes.includes(location.pathname);

  // Routes that should have NO footer
  const noFooterRoutes = ['/login', '/signup'];
  const shouldHideFooter = noFooterRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Only show navigation if not on login/signup pages and not hidden by quiz game */}
      {!shouldHideNav && !hideNavbar && isLandingPage && <LandingNavigation />}
      {!shouldHideNav && !hideNavbar && requiresAuth && <Navigation />}

      <div className={`flex-1 ${requiresAuth ? "bg-gray-100" : ""}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
          <Route path="/passwordrecovery" element={<PassRecovery />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/users" element={<ProtectedAdminRoute><UserManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/quizzes" element={<ProtectedAdminRoute><QuizManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/sessions" element={<ProtectedAdminRoute><StudySessions /></ProtectedAdminRoute>} />
          <Route path="/admin/logs" element={<ProtectedAdminRoute><AuditLogs /></ProtectedAdminRoute>} />

          <Route path="/verify-status" element={<EmailStatus />} />
          <Route path="/password-updated" element={<PasswordStatus type="success" />} />
          <Route path="/password-link-expired" element={<PasswordStatus type="error" />} />
        </Routes>
      </div>

      {/* Show footer on all pages except login/signup and during quiz games */}
      {!shouldHideFooter && !hideNavbar && <Footer />}
    </div>
  );
}

export default App;