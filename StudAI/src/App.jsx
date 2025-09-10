import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Quizzes from "./pages/Quizzes";
import Sessions from "./pages/Sessions";
import Planner from "./pages/Planner";

function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/planner" element={<Planner />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;