import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";
import { useApi } from "../hooks/useApi";
import { useAgora } from "../hooks/useAgora";
import { useToast } from "../components/Toast";
import StarRating from "../components/StarRating";
import type { Reading } from "@soulseer/shared";

export default function ReadingSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, formatBalance, refreshBalance } = useBalance();
  const api = useApi();
  const { addToast } = useToast();

  const [reading, setReading] = useState<Reading | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cost, setCost] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const agora = useAgora(Number(id), reading?.type || "chat", user?.id || 0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/readings/${id}`);
        if (res.success) setReading(res.data);
      } catch { addToast("Reading not found", "error"); navigate("/dashboard"); }
    })();
  }, [id]);

  useEffect(() => {
    if (reading && !agora.isJoined && !agora.error) { agora.join(); }
  }, [reading, agora.isJoined, agora.error]);

  useEffect(() => {
    if (reading?.status === "in_progress" && reading.startedAt) {
      const update = () => {
        const start = new Date(reading.startedAt!).getTime();
        const now = Date.now();
        const secs = Math.floor((now - start) / 1000);
        setElapsed(secs);
        const mins = Math.ceil(secs / 60);
        setCost(mins * (reading.pricePerMinute || 0));
      };
      update();
      timerRef.current = setInterval(update, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reading?.status, reading?.startedAt, reading?.pricePerMinute]);

  const endSession = async () => {
    if (!window.confirm("End this reading session?")) return;
    try {
      await agora.leave();
      const res = await api.post(`/api/readings/${id}/end`);
      if (res.success) {
        setReading(res.data);
        setSessionEnded(true);
        await refreshBalance();
        addToast(`Session ended. Duration: ${res.data.duration} min, Cost: ${formatBalance(res.data.totalPrice)}`, "success");
      }
    } catch { addToast("Failed to end session", "error"); }
  };

  const submitRating = async () => {
    if (rating === 0) { addToast("Please select a rating", "error"); return; }
    try { await api.post(`/api/readings/${id}/rate`, { rating, review: review || undefined }); addToast("Thank you for your review!", "success"); setRatingSubmitted(true); }
    catch { addToast("Failed to submit rating", "error"); }
  };

  const formatTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const isLowBalance = reading ? balance < (reading.pricePerMinute * 2) : false;

  if (!reading) return <div className="page page-padded"><p>Loading reading session...</p></div>;

  if (sessionEnded) {
    return (
      <div className="page page-padded reading-page">
        <h1 className="page-title">Session Complete</h1>
        <div className="session-summary">
          <p>Duration: {reading.duration} minutes</p>
          <p>Total Cost: {formatBalance(reading.totalPrice || 0)}</p>
          <p>New Balance: {formatBalance(balance)}</p>
        </div>
        {reading.clientId === user?.id && !ratingSubmitted && !reading.rating && (
          <div className="rating-form">
            <h3>How was your reading?</h3>
            <StarRating rating={rating} interactive onChange={setRating} size={32} />
            <textarea placeholder="Write a review (optional)" value={review} onChange={e => setReview(e.target.value)} rows={3} />
            <button onClick={submitRating} className="btn-primary">Submit Review</button>
          </div>
        )}
        <button onClick={() => navigate("/dashboard")} className="btn-accent" style={{marginTop:20}}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="page reading-page">
      <div className="reading-header">
        <div className="timer-cost">
          <span className="timer">{formatTime(elapsed)}</span>
          <span className="cost">{formatBalance(cost)}</span>
        </div>
        <div className="balance-info">
          <span style={{color: isLowBalance ? "#F87171" : "#4ADE80"}}>Balance: {formatBalance(balance)}</span>
        </div>
      </div>

      {reading.type === "chat" && (
        <div className="chat-session">
          <div className="chat-messages">
            {agora.messages.map((m,i) => (
              <div key={i} className={`chat-bubble ${m.userId === user?.id ? "mine" : "theirs"}`}>
                <span className="msg-text">{m.text}</span>
                <span className="msg-time">{new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input placeholder="Type your message..." onKeyPress={e => { if(e.key==="Enter"){ agora.sendMessage((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=""; } }} />
            <button className="btn-primary btn-small">Send</button>
          </div>
        </div>
      )}

      {reading.type === "voice" && (
        <div className="voice-session">
          <div className="call-controls">
            <button onClick={agora.isMuted ? agora.unmute : agora.mute} className={`ctrl-btn ${agora.isMuted ? "muted" : ""}`}>{agora.isMuted ? "🔇 Unmute" : "🎤 Mute"}</button>
          </div>
          <p className="call-status">{agora.isJoined ? "Connected" : "Connecting..."}</p>
        </div>
      )}

      {reading.type === "video" && (
        <div className="video-session">
          <div className="video-grid">
            <div className="local-video"><p>You</p></div>
            <div className="remote-video"><p>Remote Participant</p></div>
          </div>
          <div className="video-controls">
            <button onClick={agora.isMuted ? agora.unmute : agora.mute} className={`ctrl-btn ${agora.isMuted ? "muted" : ""}`}>{agora.isMuted ? "🔇 Unmute" : "🎤 Mute"}</button>
            <button onClick={agora.toggleCamera} className={`ctrl-btn ${!agora.isCameraOn ? "muted" : ""}`}>{agora.isCameraOn ? "📹 Camera" : "📷 Camera Off"}</button>
          </div>
        </div>
      )}

      {agora.error && <p className="error-banner">Connection error: {agora.error}</p>}
      {isLowBalance && <p className="low-balance-warning">⚠️ Low balance — add funds soon</p>}

      <button onClick={endSession} className="btn-danger end-session-btn">End Session</button>
    </div>
  );
}
