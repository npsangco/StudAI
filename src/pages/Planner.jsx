import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Info, X, Calendar, Check, Pencil } from "lucide-react";
import { plannerService } from "../utils/syncService";
import { petApi } from "../api/api";
import ToastContainer from "../components/ToastContainer";
import AppLoader from "../components/AppLoader";
import { useToast } from "../hooks/useToast";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { plannerTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';

export default function Planner() {
  const [currentYear] = useState(new Date().getFullYear());
  const [accountCreatedYear, setAccountCreatedYear] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showIndicatorsInfo, setShowIndicatorsInfo] = useState(false);
  
  const { toasts, removeToast, toast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('planner');
  const [dailyTaskStatus, setDailyTaskStatus] = useState({ used: 0, remaining: 3, max: 3 });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchPlans();
    fetchUserCreationYear();
  }, []);

  const fetchUserCreationYear = async () => {
    try {
      const response = await petApi.getUserProfile();
      if (response.data.createdAt) {
        const createdDate = new Date(response.data.createdAt);
        setAccountCreatedYear(createdDate.getFullYear());
      }
    } catch (error) {
      console.error('Failed to fetch user creation year:', error);
    }
  };

  useEffect(() => {
    // Update daily task status whenever plans change
    updateDailyTaskStatus();
  }, [plans]);

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
    try {
      const fetchedPlans = await plannerService.getAllPlans();
      setPlans(Array.isArray(fetchedPlans) ? fetchedPlans : []);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDailyTaskStatus = () => {
    // Count incomplete tasks created TODAY
    const today = new Date().toISOString().split('T')[0];
    const incompleteTasks = plans.filter(plan => 
      !plan.completed && 
      plan.created_at && 
      plan.created_at.startsWith(today)
    ).length;
    
    setDailyTaskStatus({
      used: incompleteTasks,
      remaining: Math.max(0, 3 - incompleteTasks),
      max: 3
    });
  };

  const getYearRange = () => {
    const years = [];
    // Show 4 years starting from account creation year (or current year if not available)
    const startYear = accountCreatedYear || currentYear;
    for (let i = 0; i < 4; i++) {
      years.push(startYear + i);
    }
    return years;
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
  };

  const handleYearChange = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDate(null);
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
      if (!plan.due_date || plan.completed) return false;
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

    // Check daily task limit
    if (dailyTaskStatus.remaining <= 0) {
      setShowLimitModal(true);
      return;
    }

    // Use the dueDate from state, or fall back to selected date
    const dueDateValue = dueDate || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

    try {
      const result = await plannerService.addPlan({
        title: title.trim(),
        description: desc.trim(),
        due_date: dueDateValue
      });

      if (result.success) {
        setPlans(prev => [...prev, result.plan]);
        
        if (result.queued) {
          toast.info('📱 Offline: Task will sync when back online');
        } else {
          toast.success('Task created successfully!');
          // Trigger quest refresh
          window.dispatchEvent(new Event('questActivity'));
        }

        setTitle("");
        setDesc("");
        setDueDate("");
        setShowForm(false);
      } else {
        // Handle validation errors (like daily limit)
        if (result.error) {
          toast.error(`Error: ${result.error}`);
          if (result.error.includes('Daily task limit reached')) {
            setShowLimitModal(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error('Failed to create task. Please try again.');
    }
  };

  const startEditingPlan = (plan) => {
    if (!plan) return;
    const planId = plan.planner_id || plan.id;
    if (!planId) return;
    setEditingPlanId(planId);
    setEditTitle(plan.title || "");
    setEditDesc(plan.description || "");
    // Extract date in YYYY-MM-DD format for date input
    const dueDateStr = plan.due_date ? new Date(plan.due_date).toISOString().split('T')[0] : "";
    setEditDueDate(dueDateStr);
  };

  const cancelEditing = () => {
    setEditingPlanId(null);
    setEditTitle("");
    setEditDesc("");
    setEditDueDate("");
  };

  const savePlanEdits = async () => {
    if (!editingPlanId || !editTitle.trim()) return;
    setIsSavingEdit(true);

    const updates = {
      title: editTitle.trim(),
      description: editDesc.trim(),
      due_date: editDueDate || null,
    };

    try {
      const result = await plannerService.updatePlan(editingPlanId, updates);

      if (result.success) {
        const updatedData = result.plan || updates;
        setPlans(prev => prev.map(plan =>
          (plan.planner_id === editingPlanId || plan.id === editingPlanId)
            ? { ...plan, ...updatedData }
            : plan
        ));

        if (result.queued) {
          toast.info('📱 Offline: Changes will sync when back online');
        } else {
          toast.success('Task updated successfully!');
        }

        cancelEditing();
      } else if (result.error) {
        toast.error(`Error: ${result.error}`);
      } else {
        toast.error('Failed to update task. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Mark as done function
  const markAsDone = async (planner_id) => {
    if (!planner_id) return;
    
    await confirm({
      title: 'Complete Task',
      message: 'Mark this task as completed?',
      confirmText: 'Complete',
      cancelText: 'Cancel',
      variant: 'info',
      onConfirm: async () => {
        try {
          const result = await plannerService.updatePlan(planner_id, {
            completed: true,
            completed_at: new Date().toISOString()
          });
          
          if (result.success) {
            setPlans(prev => prev.map(p => 
              (p.planner_id === planner_id || p.id === planner_id) 
                ? { ...p, completed: true, completed_at: new Date().toISOString() }
                : p
            ));
            
            if (result.queued) {
              toast.info('📱 Offline: Completion will sync when back online');
            } else {
              toast.success('Task marked as completed!');
              // Trigger quest refresh
              window.dispatchEvent(new Event('questActivity'));
            }
          } else {
            if (result.error) {
              toast.error(`Error: ${result.error}`);
            }
          }
        } catch (err) {
          console.error("Failed to mark task as done:", err);
          toast.error('Failed to update task. Please try again.');
        }
      }
    });
  };

  const getPlansForSelectedDate = () => {
    if (!selectedYear || selectedMonth === null || !selectedDate) return [];
    
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    const datePlans = plans.filter(plan => {
      if (!plan.due_date) return false;
      const planDate = new Date(plan.due_date).toISOString().split('T')[0];
      return planDate === dateStr;
    });
    
    // Sort: incomplete first, then completed
    return datePlans.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
  };

  const renderYearSelection = () => (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12" data-tutorial="calendar-view">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-indigo-600" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-2">Select Year</h1>
          <p className="text-base sm:text-lg text-gray-600">Choose a year to start planning</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {getYearRange().map(year => {
            const isCurrent = year === currentYear;
            return (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`group relative p-8 sm:p-10 md:p-12 lg:p-14 rounded-3xl border-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 shadow-lg'
                }`}
              >
                {year}
                {isCurrent && (
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 px-3 sm:px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-semibold">
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
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <button
            onClick={handleYearChange}
            className="flex items-center gap-2 px-3 sm:px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700 cursor-pointer"
            aria-label="Back to year selection"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
            {selectedYear}
          </h2>
          <div className="w-12 sm:w-28"></div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {months.map((month, idx) => {
            const indicators = getMonthIndicator(selectedYear, idx);
            const today = new Date();
            const isCurrentMonth = selectedYear === today.getFullYear() && idx === today.getMonth();
            
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(idx)}
                className={`group relative p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer ${
                  isCurrentMonth
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-xl'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 shadow-lg'
                }`}
              >
                <div className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{month}</div>
                <div className="flex justify-center gap-2 min-h-[24px]">
                  {indicators.length > 0 ? (
                    <>
                      {indicators.includes('green') && (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 shadow-md" title="Has upcoming plans"></div>
                      )}
                      {indicators.includes('yellow') && (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 shadow-md" title="Has urgent plans"></div>
                      )}
                      {indicators.includes('red') && (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-md" title="Has overdue plans"></div>
                      )}
                    </>
                  ) : (
                    <span className={`text-xs sm:text-sm ${isCurrentMonth ? 'text-white/70' : 'text-gray-400'}`}>No plans</span>
                  )}
                </div>
                {isCurrentMonth && (
                  <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
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
      days.push(<div key={`empty-${i}`} className="p-2 sm:p-4"></div>);
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
          className={`group relative p-3 sm:p-4 md:p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl min-h-[80px] sm:min-h-[100px] md:min-h-[120px] flex flex-col items-center justify-center cursor-pointer ${
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
          <div className="text-lg sm:text-xl md:text-2xl font-bold mb-2">{day}</div>
          <div className="flex justify-center gap-1 min-h-[16px]">
            {indicators.includes('green') && (
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 shadow-sm"></div>
            )}
            {indicators.includes('yellow') && (
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400 shadow-sm"></div>
            )}
            {indicators.includes('red') && (
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 shadow-sm"></div>
            )}
          </div>
          {isToday && (
            <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
              Today
            </span>
          )}
        </button>
      );
    }

    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 sm:mb-12 gap-2">
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-2 px-3 sm:px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700 cursor-pointer"
              aria-label="Back to month selection"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="text-center flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
                {months[selectedMonth]} {selectedYear}
              </h2>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowIndicatorsInfo(!showIndicatorsInfo)}
                className="p-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                aria-label="Show indicator legend"
              >
                <Info className="w-5 h-5 text-gray-700" />
              </button>

              {showIndicatorsInfo && (
                <div className="absolute top-full right-0 mt-4 z-50 w-72 sm:w-80 bg-white border-2 border-indigo-200 rounded-2xl p-4 sm:p-6 shadow-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      Plan Indicators
                    </h3>
                    <button
                      onClick={() => setShowIndicatorsInfo(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-green-50 rounded-lg">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 shadow-md flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700">Due in <strong>more than 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-yellow-50 rounded-lg">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 shadow-md flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700">Due <strong>within 3 days</strong></span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-red-50 rounded-lg">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-md flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700"><strong>Overdue</strong> plans</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-yellow-50 rounded-lg border-t-2 border-yellow-200">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500 shadow-md flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700"><strong>Today's date</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
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
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2 cursor-pointer">
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-2 px-3 sm:px-6 py-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-semibold text-gray-700"
              aria-label="Back to calendar"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="text-center flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                {dateString}
              </h2>
            </div>
            <div className="w-12 sm:w-28"></div>
          </div>

          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {selectedDatePlans.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
                <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-lg sm:text-xl text-gray-400 font-medium">No plans for this day</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">Add a plan to get started</p>
              </div>
            ) : (
              selectedDatePlans.map(plan => {
                const indicators = getPlanIndicators(selectedYear, selectedMonth, selectedDate);
                const planIndicator = indicators[selectedDatePlans.indexOf(plan)];
                const isTemp = typeof plan.id === 'string' && plan.id.startsWith('temp_');
                const planId = plan.planner_id || plan.id;
                const isEditing = editingPlanId === planId;
                const editDisabled = isTemp || (editingPlanId && editingPlanId !== planId);
                
                return (
                  <div
                    key={planId}
                    className={`bg-white border-2 p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 shadow-lg hover:shadow-xl transition-all ${
                      plan.completed 
                        ? 'opacity-60 bg-gray-50 border-gray-200' 
                        : planIndicator === 'red' 
                          ? 'border-red-200 bg-red-50/50' 
                          : planIndicator === 'yellow' 
                            ? 'border-yellow-200 bg-yellow-50/50' 
                            : 'border-green-200 bg-green-50/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-3" data-tutorial="task-indicators">
                          {!plan.completed && (
                            <div className={`w-3 h-3 rounded-full shadow-sm flex-shrink-0 ${
                              planIndicator === 'red' ? 'bg-red-500' :
                              planIndicator === 'yellow' ? 'bg-yellow-400' :
                              'bg-green-500'
                            }`}></div>
                          )}
                          <span className="text-sm font-semibold text-indigo-700 flex items-center gap-1">
                            <Pencil className="w-4 h-4" />
                            Editing plan
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Plan Title *"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-indigo-200 rounded-xl text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors"
                        />
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Plan Description"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-indigo-200 rounded-xl min-h-[100px] sm:min-h-[120px] text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors resize-none mt-3"
                        />
                        <div className="mt-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-indigo-200 rounded-xl text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <button
                            onClick={savePlanEdits}
                            disabled={!editTitle.trim() || isSavingEdit}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all shadow-lg cursor-pointer ${
                              editTitle.trim() && !isSavingEdit
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isSavingEdit ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={isSavingEdit}
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 border-2 rounded-xl text-sm sm:text-base font-semibold transition-all cursor-pointer ${
                              isSavingEdit
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 w-full sm:w-auto">
                          <div className="flex items-center gap-2 mb-2 flex-wrap" data-tutorial="task-indicators">
                            {!plan.completed && (
                              <div className={`w-3 h-3 rounded-full shadow-sm flex-shrink-0 ${
                                planIndicator === 'red' ? 'bg-red-500' :
                                planIndicator === 'yellow' ? 'bg-yellow-400' :
                                'bg-green-500'
                              }`}></div>
                            )}
                            <h3 className={`text-lg sm:text-xl font-bold break-words ${
                              plan.completed ? 'text-gray-500 line-through' : 'text-gray-800'
                            }`}>
                              {plan.title}
                            </h3>
                            {isTemp && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-300">
                                Pending Sync
                              </span>
                            )}
                            {plan.completed && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-300">
                                Completed
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className={`text-sm sm:text-base break-words ml-0 sm:ml-5 mb-2 ${
                              plan.completed ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {plan.description}
                            </p>
                          )}
                          {plan.due_date && (
                            <div className={`flex items-center gap-2 ml-0 sm:ml-5 text-xs sm:text-sm ${
                              plan.completed ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">
                                Due: {new Date(plan.due_date).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              {!plan.completed && (() => {
                                const dueDate = new Date(plan.due_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                const diffTime = dueDate - today;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                  return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Overdue</span>;
                                } else if (diffDays === 0) {
                                  return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">Today</span>;
                                } else if (diffDays === 1) {
                                  return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">Tomorrow</span>;
                                } else if (diffDays <= 3) {
                                  return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">{diffDays} days</span>;
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          {!plan.completed ? (
                            <button
                              onClick={() => markAsDone(planId)}
                              className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-green-600 font-semibold transition-all shadow-md hover:shadow-lg w-full sm:w-auto text-sm sm:text-base cursor-pointer"
                              data-tutorial="complete-task"
                            >
                              <Check className="w-4 h-4" />
                              Mark Done
                            </button>
                          ) : (
                            <span className="flex items-center justify-center gap-2 bg-gray-400 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold w-full sm:w-auto text-sm sm:text-base">
                              <Check className="w-4 h-4" />
                              Completed
                            </span>
                          )}
                          <button
                            onClick={() => startEditingPlan(plan)}
                            disabled={editDisabled}
                            className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold border-2 transition-all w-full sm:w-auto text-sm sm:text-base cursor-pointer ${
                              editDisabled
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 shadow-md'
                            }`}
                            title={
                              isTemp
                                ? 'Plan is pending sync. Try again once it is saved online.'
                                : editingPlanId && editingPlanId !== planId
                                  ? 'Finish your current edit first.'
                                  : 'Edit plan'
                            }
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {showForm ? (
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-xl" data-tutorial="add-task">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Add New Plan</h3>
              <input
                type="text"
                placeholder="Plan Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors"
                autoFocus
              />
              <textarea
                placeholder="Plan Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl min-h-[100px] sm:min-h-[120px] text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors resize-none"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:border-indigo-400 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Defaults to selected date, editable to any future date</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={addPlan}
                  disabled={!title.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all shadow-lg cursor-pointer ${
                    title.trim()
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create Plan
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setDesc("");
                    setDueDate("");
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 text-sm sm:text-base font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              disabled={dailyTaskStatus.remaining <= 0}
              className={`w-full flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold transition-all shadow-lg hover:shadow-xl cursor-pointer ${
                dailyTaskStatus.remaining > 0
                  ? "bg-white border-2 border-dashed border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 text-gray-700"
                  : "bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
              {dailyTaskStatus.remaining > 0 ? "Add a plan" : "Daily limit reached"}
            </button>
          )}
        </div>

        {/* Limit Modal */}
        {showLimitModal && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLimitModal(false)}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Daily Task Limit Reached</h3>
                <p className="text-gray-600 mb-4">
                  You've reached your daily limit of 3 tasks. Complete existing tasks or wait until tomorrow to add more.
                </p>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
      {loading && <AppLoader message="Loading Planner..." />}

      {showTutorial && (
        <TutorialOverlay
          steps={plannerTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      {!selectedYear && renderYearSelection()}
      {selectedYear && selectedMonth === null && renderMonthSelection()}
      {selectedYear && selectedMonth !== null && selectedDate === null && renderDateSelection()}
      {selectedYear && selectedMonth !== null && selectedDate && renderPlanManagement()}

      {/* Tutorial Button */}
      <TutorialButton onClick={startTutorial} />
    </>
  );
}
