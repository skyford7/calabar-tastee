import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { MessageSquare, RefreshCw } from "lucide-react";

interface FeedbackEntry {
  Timestamp: string;
  Name: string;
  Phone: string;
  Email: string;
  Comment: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchFeedback() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbyiIME95w-TiSbOPYtQad7YNnYOLXIQueeUkP8Kx50NlT5FhZjQ78vBpQmVUEQmoJuf/exec?action=get");
      const data = await res.json();
      if (data.feedback) {
        setFeedback(data.feedback.reverse());
      } else {
        setFeedback([]);
      }
    } catch {
      setError("Could not fetch feedback. Make sure the Google Apps Script is deployed and accessible.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-500" /> Customer Feedback</h2>
        <button onClick={fetchFeedback} disabled={loading} className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="bg-amber-600/20 border border-amber-600/30 text-amber-400 p-3 rounded-lg text-sm">{error}</div>}

      {feedback.length === 0 && !error && !loading && (
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-8 text-center">
          <MessageSquare className="w-12 h-12 text-amber-100/20 mx-auto mb-4" />
          <p className="text-amber-100/40">No feedback yet</p>
          <p className="text-amber-100/30 text-sm mt-1">Customer feedback will appear here once submitted</p>
        </div>
      )}

      {loading && <div className="text-amber-100/40 text-center py-8">Loading feedback...</div>}

      <div className="space-y-4">
        {feedback.map((entry, i) => (
          <div key={i} className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="text-white font-semibold">{entry.Name || "Anonymous"}</span>
              {entry.Email && <a href={`mailto:${entry.Email}`} className="text-amber-500 text-sm hover:text-amber-400">{entry.Email}</a>}
              {entry.Phone && <span className="text-amber-100/40 text-sm">{entry.Phone}</span>}
              <span className="text-amber-100/30 text-xs ml-auto">{entry.Timestamp}</span>
            </div>
            <p className="text-amber-100/70 text-sm leading-relaxed">{entry.Comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
