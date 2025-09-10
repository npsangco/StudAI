import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
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
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="bg-gray-50 min">
        <Routes>
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

export default App;