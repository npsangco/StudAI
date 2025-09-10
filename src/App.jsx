import { Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import LandingNavigation from "./components/LandingNavigation";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Quizzes from "./pages/Quizzes";
import Sessions from "./pages/Sessions";
import Planner from "./pages/Planner";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

function App() {
  const location = useLocation();
  
  const landingRoutes = ['/', '/login', '/signup', '/create'];
  const isLandingPage = landingRoutes.includes(location.pathname);
  
  const authenticatedRoutes = ['/dashboard', '/notes', '/quizzes', '/sessions', '/planner'];
  const requiresAuth = authenticatedRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen">
      {isLandingPage && <LandingNavigation />}
      {requiresAuth && <Navigation />}
      
      <div className={requiresAuth ? "bg-gray-100" : ""}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/create" element={<CreatePage />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center mb-6">Log In</h1>
        <p className="text-center text-gray-600">Login form will go here</p>
      </div>
    </div>
  );
}

function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        <p className="text-center text-gray-600">Signup form will go here</p>
      </div>
    </div>
  );
}

function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <p className="text-center text-gray-600">Account creation form will go here</p>
      </div>
    </div>
  );
}

export default App;