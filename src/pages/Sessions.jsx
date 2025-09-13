// src/pages/Sessions.jsx
import React, { useState } from "react";

export default function Sessions() {
  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const createMeeting = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/zoom/create-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Study Session with the Team",
          duration: 45,
          timezone: "Asia/Manila"
        })
      });
      if (!resp.ok) throw new Error("Failed to create meeting");
      const data = await resp.json();
      setMeeting(data);
    } catch (e) {
      alert(e.message || "Error creating meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Sessions</h2>
      <button onClick={createMeeting} disabled={loading} className="mt-4 px-4 py-2 rounded bg-blue-600 text-white">
        {loading ? "Creating..." : "Create Zoom Meeting"}
      </button>

      {meeting && (
        <div className="mt-4">
          <p><strong>Topic:</strong> {meeting.topic}</p>
          <p><strong>Start URL (host):</strong> <code>{meeting.start_url}</code></p>
          <p>
            <strong>Join URL:</strong>{" "}
            <a href={meeting.join_url} target="_blank" rel="noreferrer" className="underline text-blue-600">
              Open meeting
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
