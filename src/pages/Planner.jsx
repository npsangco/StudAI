import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export default function Planner() {
  const [plans, setPlans] = useState([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

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

  const formatDueDate = (dateStr) => {
    if (!dateStr) return "No deadline";

    const today = new Date();
    const selectedDate = new Date(dateStr);

    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    const diffTime = selectedDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === 2) return "in 2 days";
    if (diffDays === 3) return "in 3 days";

    return selectedDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const addPlan = async () => {
    if (!title.trim()) return;
    setError(null);

    try {
      const res = await axios.post(
        `${API_BASE}/api/plans`,
        { title: title.trim(), description: desc.trim(), due_date: deadline || null },
        { withCredentials: true }
      );

      const created = res.data.plan;
      if (created) {
        setPlans((prev) => [created, ...prev]);
      } else {
        fetchPlans();
      }

      setTitle("");
      setDesc("");
      setDeadline("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create plan:", err);
      setError("Failed to create plan");
    }
  };

  const deletePlan = async (planner_id) => {
    if (!planner_id) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this plan?");
    if (!confirmDelete) return;

    setError(null);

    try {
      await axios.delete(`${API_BASE}/api/plans/${planner_id}`, { withCredentials: true });
      setPlans((prev) => prev.filter((p) => p.planner_id !== planner_id));
    } catch (err) {
      console.error("Failed to delete plan:", err);
      setError("Failed to delete plan");
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-4xl p-10">
          <h2 className="text-2xl font-bold text-center mb-8">Plans</h2>

          {loading && <div className="mb-4 text-center text-sm text-gray-500">Loading plans...</div>}
          {error && <div className="mb-4 text-center text-sm text-red-500">{error}</div>}

          <div className="space-y-4 mb-8">
            {plans.length === 0 && !loading ? (
              <div className="text-center text-gray-500">No plans yet. Add one!</div>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.planner_id}
                  className="flex justify-between items-center border border-gray-200 p-4 rounded-xl"
                >
                  <div>
                    <h3 className="font-bold">{plan.title}</h3>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      Due <span className="font-bold">{formatDueDate(plan.due_date)}</span>
                    </span>
                    <button onClick={() => deletePlan(plan.planner_id)} className="bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600">
                      Delete
                    </button>

                  </div>
                </div>
              ))
            )}
          </div>

          {showForm && (
            <div className="border rounded-xl border-gray-200 p-4 space-y-3 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md border-gray-300 ${title.trim() ? "bg-white" : "bg-gray-100"}`}
                />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="px-3 py-2 border rounded-md border-gray-300"
                />
                <button
                  onClick={addPlan}
                  disabled={!title.trim()}
                  className={`px-4 py-2 rounded-md ${title.trim() ? "bg-black text-white hover:bg-gray-800" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                >
                  Create
                </button>
              </div>
              <textarea
                placeholder="Note Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md border-gray-300 min-h-[100px] ${desc.trim() ? "bg-white" : "bg-gray-100"}`}
              />
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setShowForm(true)} disabled={showForm}
              className={`px-6 py-2 border rounded-xl border-gray-300
                ${showForm
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "hover:bg-gray-100"}`}
            >
              Add a plan
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
