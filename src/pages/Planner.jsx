import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft, Plus, Trash2, Info, X, Calendar } from "lucide-react";

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
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Planner</h1>
        <div className="text-center mb-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">Select Year</h1>
          <p className="text-lg text-gray-600">Choose a year to start planning</p>
        </div>
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4 sm:gap-6">
          {getYearRange().map(year => {
            const isCurrent = year === currentYear;
            return (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`group relative p-8 sm:p-10 rounded-2xl border-2 text-2xl sm:text-3xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  isCurrent
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 shadow-lg'
                }`}
              >
                {year}
                {isCurrent && (
                  <span className="absolute top-3 right-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMonthSelection = () => (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={handleYearChange}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700"
            aria-label="Back to year selection"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-800">
            {selectedYear}
          </h2>
          <div className="w-28"></div>
        </div>
        
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4 sm:gap-6">
          {months.map((month, idx) => {
            const indicators = getMonthIndicator(selectedYear, idx);
            const today = new Date();
            const isCurrentMonth = selectedYear === today.getFullYear() && idx === today.getMonth();
            
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(idx)}
                className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  isCurrentMonth
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 shadow-lg'
                }`}
              >
                <div className="text-xl sm:text-2xl font-bold mb-4">{month}</div>
                <div className="flex justify-center gap-2 min-h-[24px]">
                  {indicators.length > 0 ? (
                    <>
                      {indicators.includes('green') && (
                        <div className="w-4 h-4 rounded-full bg-green-500 shadow-md" title="Has upcoming plans"></div>
                      )}
                      {indicators.includes('yellow') && (
                        <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-md" title="Has urgent plans"></div>
                      )}
                      {indicators.includes('red') && (
                        <div className="w-4 h-4 rounded-full bg-red-500 shadow-md" title="Has overdue plans"></div>
                      )}
                    </>
                  ) : (
                    <span className={`text-sm ${isCurrentMonth ? 'text-white/70' : 'text-gray-400'}`}>No plans</span>
                  )}
                </div>
                {isCurrentMonth && (
                  <span className="absolute top-3 right-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    Current
                  </span>
                )}
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
      days.push(<div key={`empty-${i}`} className="p-4"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const indicators = getPlanIndicators(selectedYear, selectedMonth, day);
      const isToday = isCurrentMonth && day === currentDay;
      const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
      const dayName = dayNames[dayOfWeek];
      const hasPlan = indicators.length > 0;
      
      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(day)}
          className={`group relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl min-h-[100px] sm:min-h-[120px] flex flex-col items-center justify-center ${
            isToday 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl' 
              : hasPlan
              ? 'bg-white border-indigo-200 hover:border-indigo-400 shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-md'
          }`}
        >
          <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
            {dayName}
          </div>
          <div className="text-xl sm:text-2xl font-bold mb-2">{day}</div>
          <div className="flex justify-center gap-1 min-h-[16px]">
            {indicators.includes('green') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 shadow-sm"></div>
            )}
            {indicators.includes('yellow') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400 shadow-sm"></div>
            )}
            {indicators.includes('red') && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 shadow-sm"></div>
            )}
          </div>
          {isToday && (
            <span className="absolute top-2 right-2 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
              Today
            </span>
          )}
        </button>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700"
              aria-label="Back to month selection"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
                {months[selectedMonth]} {selectedYear}
              </h2>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowIndicatorsInfo(!showIndicatorsInfo)}
                className="p-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
                aria-label="Show indicator legend"
              >
                <Info className="w-5 h-5 text-gray-700" />
              </button>

              {showIndicatorsInfo && (
                <div className="absolute top-full right-0 mt-4 z-50 w-80 bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Info className="w-5 h-5 text-indigo-600" />
                      Plan Indicators
                    </h3>
                    <button
                      onClick={() => setShowIndicatorsInfo(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-green-500 shadow-md flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">Due in <strong>more than 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-md flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">Due <strong>within 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-red-500 shadow-md flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Overdue</strong> plans</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-t-2 border-blue-200">
                      <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Today's date</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {days}
          </div>
        </div>
      </div>
    );
  };

  const renderPlanManagement = () => {
    const selectedDatePlans = getPlansForSelectedDate();
    const dateString = `${months[selectedMonth]} ${selectedDate}, ${selectedYear}`;

    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700"
              aria-label="Back to calendar"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {dateString}
              </h2>
            </div>
            <div className="w-28"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-center shadow-lg">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-8">
            {selectedDatePlans.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl text-gray-400 font-medium">No plans for this day</p>
                <p className="text-sm text-gray-400 mt-2">Add a plan to get started</p>
              </div>
            ) : (
              selectedDatePlans.map(plan => {
                const indicators = getPlanIndicators(selectedYear, selectedMonth, selectedDate);
                const planIndicator = indicators[selectedDatePlans.indexOf(plan)];
                
                return (
                  <div
                    key={plan.planner_id}
                    className={`bg-white border-2 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start gap-4 shadow-lg hover:shadow-xl transition-all ${
                      planIndicator === 'red' ? 'border-red-200 bg-red-50/50' :
                      planIndicator === 'yellow' ? 'border-yellow-200 bg-yellow-50/50' :
                      'border-green-200 bg-green-50/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${
                          planIndicator === 'red' ? 'bg-red-500' :
                          planIndicator === 'yellow' ? 'bg-yellow-400' :
                          'bg-green-500'
                        }`}></div>
                        <h3 className="text-xl font-bold text-gray-800">{plan.title}</h3>
                      </div>
                      {plan.description && (
                        <p className="text-gray-600 ml-5">{plan.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deletePlan(plan.planner_id)}
                      className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl hover:bg-red-600 font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {showForm ? (
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Plan</h3>
              <input
                type="text"
                placeholder="Plan Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-indigo-400 focus:outline-none transition-colors"
                autoFocus
              />
              <textarea
                placeholder="Plan Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl min-h-[120px] text-base focus:border-indigo-400 focus:outline-none transition-colors resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={addPlan}
                  disabled={!title.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all shadow-lg ${
                    title.trim()
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  Create Plan
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setDesc("");
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 text-base font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-dashed border-indigo-300 rounded-2xl hover:bg-indigo-50 hover:border-indigo-400 text-lg font-semibold text-gray-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-6 h-6" />
              Add a plan
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {loading && (
        <div className="fixed top-4 right-4 bg-white px-6 py-3 rounded-xl shadow-2xl border-2 border-indigo-200 text-base font-semibold text-gray-700 z-50 animate-pulse">
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