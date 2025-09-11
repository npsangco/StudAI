import { Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import LandingNavigation from "./components/LandingNavigation";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import QuizzesPage from "./pages/QuizzesPage";
import Sessions from "./pages/Sessions";
import Planner from "./pages/Planner";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import PassRecovery from "./pages/PassRecovery";
import Profile from "./pages/Profile";
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';


function App() {
  const location = useLocation();
  
  // Routes that should have NO navigation
  const noNavRoutes = ['/login', '/signup'];
  const shouldHideNav = noNavRoutes.includes(location.pathname);

  // Routes that should have landing navigation
  const landingRoutes = ['/', '/create'];
  const isLandingPage = landingRoutes.includes(location.pathname);
  
  // Routes that should have authenticated navigation
  const authenticatedRoutes = ['/dashboard', '/notes', '/quizzes', '/sessions', '/planner', '/profile'];
  const requiresAuth = authenticatedRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen">
      {/* Only show navigation if not on login/signup pages */}
      {!shouldHideNav && isLandingPage && <LandingNavigation />}
      {!shouldHideNav && requiresAuth && <Navigation />}
      
      <div className={requiresAuth ? "bg-gray-100" : ""}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
          <Route path="/passwordrecovery" element={<PassRecovery />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;