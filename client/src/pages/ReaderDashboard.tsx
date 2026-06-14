import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/Toast";
import StarRating from "../components/StarRating";
import { PAYOUT_THRESHOLD } from "@soulseer/shared";
import type { Reading, Transaction } from "@soulseer/shared";

export default function ReaderDashboard() {
  const { user, isLoading } = useAuth();
  const { balance, formatBalance, refreshBalance } = useBalance();
  const api = useApi();
  const { addToast } = useToast();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rates, setRates] = useState({ chat: "", voice: "", video: "" });
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);

  useEffect(() => {
    if (!user) return;
    setIsOnline(user.isOnline);
    setRates({
      chat: user.pricingChat ? String(user.pricingChat / 100) : "",
      voice: user.pricingVoice ? String(user.pricingVoice / 100) : "",
      video: user.pricingVideo ? String(user.pricingVideo / 100) : "",
    });
  }, [user]);

  useEffect(() => {
    (async () => {
      try { const res = await api.get("/api/readings/reader"); if (res.success) setReadings(res.data); } catch {}
    })();
  }, []);

  const toggleOnline = async () => {
    try { const res = await api.patch("/api/readers/status"); if (res.success) { setIsOnline(res.data.isOnline); addToast(res.data.isOnline ? "You are now online" : "You are now offline", "success"); } }
    catch { addToast("Failed to toggle status", "error"); }
  };

  const updateRates = async () => {
    const c = Math.round(parseFloat(rates.chat) * 100);
    const v = Math.round(parseFloat(rates.voice) * 100);
    const vi = Math.round(parseFloat(rates.video) * 100);
    if (isNaN(c) || isNaN(v) || isNaN(vi)) { addToast("Please enter valid rates", "error"); return; }
    try { await api.patch("/api/readers/pricing", { pricingChat: c, pricingVoice: v, pricingVideo: vi }); addToast("Rates updated!", "success"); }
    catch { addToast("Failed to update rates", "error"); }
  };

  const completedReadings = readings.filter(r => r.status === "completed");
  const todayEarnings = completedReadings.filter(r => r.completedAt && new Date(r.completedAt).toDateString() === new Date().toDateString()).reduce((sum, r) => sum + Math.floor((r.totalPrice || 0) * 0.7), 0);

  return (
    <div className="page page-padded dashboard-page">
      <h1 className="page-title">Reader Dashboard</h1>

      <div className="status-toggle">
        <button onClick={toggleOnline} className={isOnline ? "btn-online" : "btn-offline"}>{isOnline ? "● Online" : "○ Offline"}</button>
      </div>

      <section className="rate-settings">
        <h2 className="section-title">Per-Minute Rates</h2>
        <div className="rates-form">
          <label>Chat ($/min): <input type="number" min="0" step="0.01" value={rates.chat} onChange={e => setRates(r => ({...r, chat: e.target.value}))} /></label>
          <label>Voice ($/min): <input type="number" min="0" step="0.01" value={rates.voice} onChange={e => setRates(r => ({...r, voice: e.target.value}))} /></label>
          <label>Video ($/min): <input type="number" min="0" step="0.01" value={rates.video} onChange={e => setRates(r => ({...r, video: e.target.value}))} /></label>
          <button onClick={updateRates} className="btn-primary">Save Rates</button>
        </div>
      </section>

      <section className="earnings">
        <h2 className="section-title">Earnings</h2>
        <div className="earnings-grid">
          <div className="earning-card"><span className="earn-label">Today</span><span className="earn-value">{formatBalance(todayEarnings)}</span></div>
          <div className="earning-card"><span className="earn-label">Available Balance</span><span className="earn-value">{formatBalance(balance)}</span></div>
          <div className="earning-card"><span className="earn-label">Payout Threshold</span><span className="earn-value">{formatBalance(PAYOUT_THRESHOLD)}</span></div>
        </div>
      </section>

      <section className="session-history">
        <h2 className="section-title">Session History</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Duration</th><th>Earnings</th><th>Rating</th></tr></thead>
            <tbody>
              {completedReadings.map(r => (
                <tr key={r.id}>
                  <td>Client #{r.clientId}</td>
                  <td>{r.type}</td>
                  <td>{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "-"}</td>
                  <td>{r.duration} min</td>
                  <td style={{color: "#4ADE80"}}>{formatBalance(Math.floor((r.totalPrice || 0) * 0.7))}</td>
                  <td>{r.rating ? <StarRating rating={r.rating} /> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {completedReadings.length === 0 && <p className="empty-state">No completed sessions yet.</p>}
      </section>

      <section className="reviews-section">
        <h2 className="section-title">Reviews Received</h2>
        {completedReadings.filter(r => r.review).map(r => (
          <div key={r.id} className="review-card">
            <StarRating rating={r.rating || 0} />
            <p>{r.review}</p>
          </div>
        ))}
        {completedReadings.filter(r => r.review).length === 0 && <p className="empty-state">No reviews yet.</p>}
      </section>
    </div>
  );
}
