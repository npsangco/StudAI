import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export default function Planner() {
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('plannerSelectedYear');
    if (saved) {
      const savedYear = parseInt(saved);
      // Check if saved year has ended
      if (savedYear < new Date().getFullYear()) {
        localStorage.removeItem('plannerSelectedYear');
        return null;
      }
      return savedYear;
    }
    return null;
  });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showIndicatorsInfo, setShowIndicatorsInfo] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    let timer;
    if (showIndicatorsInfo) {
      timer = setTimeout(() => {
        setShowIndicatorsInfo(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showIndicatorsInfo]);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/plans`, { withCredentials: true });
      setPlans(Array.isArray(res.data.plans) ? res.data.plans : []);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const getYearRange = () => {
    const years = [];
    for (let i = 0; i < 8; i++) {
      years.push(currentYear + i);
    }
    return years;
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    localStorage.setItem('plannerSelectedYear', year.toString());
  };

  const handleYearChange = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDate(null);
    localStorage.removeItem('plannerSelectedYear');
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getPlanIndicators = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayPlans = plans.filter(plan => {
      if (!plan.due_date) return false;
      const planDate = new Date(plan.due_date).toISOString().split('T')[0];
      return planDate === dateStr;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dayPlans.map(plan => {
      const dueDate = new Date(plan.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate - today;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays < 0) return 'red';
      if (diffDays <= 3) return 'yellow';
      return 'green';
    });
  };

  const getMonthIndicator = (year, month) => {
    const indicators = new Set();
    const daysInMonth = getDaysInMonth(year, month);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayIndicators = getPlanIndicators(year, month, day);
      dayIndicators.forEach(color => indicators.add(color));
    }

    return Array.from(indicators);
  };

  const addPlan = async () => {
    if (!title.trim() || !selectedDate) return;
    setError(null);

    const dueDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

    try {
      const res = await axios.post(
        `${API_BASE}/api/plans`,
        { 
          title: title.trim(), 
          description: desc.trim(), 
          due_date: dueDate 
        },
        { withCredentials: true }
      );

      if (res.data.plan) {
        setPlans(prev => [...prev, res.data.plan]);
      } else {
        await fetchPlans();
      }

      setTitle("");
      setDesc("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create plan:", err);
      setError("Failed to create plan");
    }
  };

  const deletePlan = async (planner_id) => {
    if (!planner_id) return;
    if (!window.confirm("Are you sure you want to delete this plan?")) return;

    setError(null);
    try {
      await axios.delete(`${API_BASE}/api/plans/${planner_id}`, { withCredentials: true });
      setPlans(prev => prev.filter(p => p.planner_id !== planner_id));
    } catch (err) {
      console.error("Failed to delete plan:", err);
      setError("Failed to delete plan");
    }
  };

  const getPlansForSelectedDate = () => {
    if (!selectedYear || selectedMonth === null || !selectedDate) return [];
    
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    return plans.filter(plan => {
      if (!plan.due_date) return false;
      const planDate = new Date(plan.due_date).toISOString().split('T')[0];
      return planDate === dateStr;
    });
  };

  const renderYearSelection = () => (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">Select Year</h1>
        <div className="grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-6">
          {getYearRange().map(year => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={`p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl border-4 text-xl sm:text-2xl md:text-3xl font-bold transition-all shadow-lg hover:shadow-xl ${
                year === new Date().getFullYear()
                  ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMonthSelection = () => (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-12">
            <div className="w-full sm:w-40"></div>
            <button
              onClick={handleYearChange}
              className="text-2xl sm:text-4xl font-bold text-center hover:text-blue-600 transition-colors cursor-pointer"
            >
              {selectedYear}
            </button>
            <div className="w-full sm:w-40"></div>
          </div>
        
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-1 gap-4 sm:gap-6">
          {months.map((month, idx) => {
            const indicators = getMonthIndicator(selectedYear, idx);
            const today = new Date();
            const isCurrentMonth = selectedYear === today.getFullYear() && idx === today.getMonth();
            
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(idx)}
                className={`p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl border-4 transition-all shadow-lg hover:shadow-xl ${
                  isCurrentMonth
                    ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3">{month}</div>
                <div className="flex justify-center gap-2 h-4">
                  {indicators.includes('green') && (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500"></div>
                  )}
                  {indicators.includes('yellow') && (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500"></div>
                  )}
                  {indicators.includes('red') && (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500"></div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDateSelection = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];
    const today = new Date();
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
    const currentDay = today.getDate();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4 sm:p-6 md:p-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const indicators = getPlanIndicators(selectedYear, selectedMonth, day);
      const isToday = isCurrentMonth && day === currentDay;
      const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
      const dayName = dayNames[dayOfWeek];
      
      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(day)}
          className={`p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-4 transition-all shadow-lg hover:shadow-xl relative min-h-[100px] sm:min-h-[120px] md:min-h-[140px] flex flex-col items-center justify-center ${
            isToday 
              ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs sm:text-sm font-semibold text-gray-500 mb-1">{dayName}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold">{day}</div>
          <div className="flex justify-center gap-1 mt-2 sm:mt-3 h-3">
            {indicators.includes('green') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
            )}
            {indicators.includes('yellow') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
            )}
            {indicators.includes('red') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
            )}
          </div>
        </button>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-12 relative">
            <div className="text-center order-1 sm:order-2">
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-2xl sm:text-4xl font-bold hover:text-blue-600 transition-colors cursor-pointer"
              >
                {months[selectedMonth]}
              </button>
              <button
                onClick={handleYearChange}
                className="text-2xl sm:text-4xl font-bold hover:text-blue-600 transition-colors cursor-pointer ml-2"
              >
                {selectedYear}
              </button>
            </div>
            <div className="relative w-full sm:w-auto order-3">
              <button
                onClick={() => setShowIndicatorsInfo(!showIndicatorsInfo)}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 text-base sm:text-lg font-semibold shadow-md flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>

              {showIndicatorsInfo && (
                <div className="absolute top-full right-0 mt-2 z-50 w-72 sm:w-80 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg sm:text-xl font-bold text-blue-900">Plan Indicators</h3>
                    <button
                      onClick={() => setShowIndicatorsInfo(false)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span className="text-sm sm:text-base text-gray-700">Due in <strong>more than 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <span className="text-sm sm:text-base text-gray-700">Due <strong>within 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                      <span className="text-sm sm:text-base text-gray-700"><strong>Overdue</strong> plans</span>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span className="text-sm sm:text-base text-gray-700"><strong>Today's date</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {days}
          </div>
        </div>
      </div>
    );
  };

  const renderPlanManagement = () => {
    const selectedDatePlans = getPlansForSelectedDate();

    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setSelectedDate(null)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 text-base sm:text-lg font-semibold shadow-md w-full sm:w-auto"
            >
              Back to Calendar
            </button>
            <div className="text-center">
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xl sm:text-2xl md:text-3xl font-bold hover:text-blue-600 transition-colors cursor-pointer"
              >
                {months[selectedMonth]} {selectedDate}, {selectedYear}
              </button>
            </div>
            <div className="w-full sm:w-40"></div>
          </div>

          {error && <div className="text-center text-base sm:text-lg text-red-500 mb-4 bg-red-50 p-3 sm:p-4 rounded-xl">{error}</div>}

          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {selectedDatePlans.length === 0 ? (
              <div className="text-center text-gray-500 py-8 sm:py-16 bg-white rounded-xl sm:rounded-2xl text-lg sm:text-xl shadow-md">
                No plans for this day
              </div>
            ) : (
              selectedDatePlans.map(plan => (
                <div
                  key={plan.planner_id}
                  className="bg-white border-2 border-gray-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{plan.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{plan.description}</p>
                  </div>
                  <button
                    onClick={() => deletePlan(plan.planner_id)}
                    className="bg-red-500 text-white px-4 sm:px-5 py-2 rounded-xl hover:bg-red-600 font-semibold text-base sm:text-lg w-full sm:w-auto shadow-md"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          {showForm ? (
            <div className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-md">
              <input
                type="text"
                placeholder="Plan Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl text-base sm:text-lg"
              />
              <textarea
                placeholder="Plan Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl min-h-[100px] sm:min-h-[120px] text-base sm:text-lg"
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={addPlan}
                  disabled={!title.trim()}
                  className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-base sm:text-lg font-semibold ${
                    title.trim()
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Create Plan
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setDesc("");
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 text-base sm:text-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-4 sm:px-8 py-3 sm:py-4 bg-white border-2 border-gray-300 rounded-xl sm:rounded-2xl hover:bg-gray-50 text-lg sm:text-xl font-semibold shadow-md"
            >
              + Add a plan
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {loading && (
        <div className="fixed top-4 right-4 bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg text-base sm:text-lg">
          Loading...
        </div>
      )}
      
      {!selectedYear && renderYearSelection()}
      {selectedYear && selectedMonth === null && renderMonthSelection()}
      {selectedYear && selectedMonth !== null && selectedDate === null && renderDateSelection()}
      {selectedYear && selectedMonth !== null && selectedDate && renderPlanManagement()}
    </>
  );
}