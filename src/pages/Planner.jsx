import { useState } from "react";

export default function Planner() {
  const [plans, setPlans] = useState([
    { id: 1, title: "Capstone Defense", desc: "try to prepare before capstone...", due: "today" },
    { id: 2, title: "Web Dev Quiz", desc: "review before quiz", due: "in 2 weeks" },
  ]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showForm, setShowForm] = useState(false);

  const formatDueDate = (dateStr) => {
    if (!dateStr) return "No deadline";

    const today = new Date();
    const selectedDate = new Date(dateStr);

    // normalize (remove time)
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    const diffTime = selectedDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === 2) return "in 2 days";
    if (diffDays === 3) return "in 3 days";

    // otherwise return formatted date
    return selectedDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const addPlan = () => {
    if (!title.trim()) return;

    setPlans([
      ...plans,
      {
        id: Date.now(),
        title,
        desc,
        due: formatDueDate(deadline),
      },
    ]);

    setTitle("");
    setDesc("");
    setDeadline("");
    setShowForm(false);
  };

  const deletePlan = (id) => {
    setPlans(plans.filter((plan) => plan.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-4xl p-10">
          <h2 className="text-2xl font-bold text-center mb-8">Plans</h2>

          <div className="space-y-4 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex justify-between items-center border border-gray-200 p-4 rounded-xl"
              >
                <div>
                  <h3 className="font-bold">{plan.title}</h3>
                  <p className="text-gray-500 text-sm">{plan.desc}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    Due <span className="font-bold">{plan.due}</span>
                  </span>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="border rounded-xl border-gray-200 p-4 space-y-3 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md border-gray-300 ${title.trim() ? "bg-white" : "bg-gray-100"
                    }`}
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
                  className={`px-4 py-2 rounded-md ${title.trim()
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Create
                </button>
              </div>
              <textarea
                placeholder="Note Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md border-gray-300 min-h-[100px] ${desc.trim() ? "bg-white" : "bg-gray-100"
                  }`}
              />
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 border rounded-xl hover:bg-gray-100"
            >
              Add a plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}