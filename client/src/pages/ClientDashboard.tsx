import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";
import BalanceDisplay from "../components/BalanceDisplay";
import StarRating from "../components/StarRating";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/Toast";
import type { Reading, Transaction } from "@soulseer/shared";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { balance, formatBalance } = useBalance();
  const api = useApi();
  const { addToast } = useToast();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<"readings" | "transactions">("readings");

  useEffect(() => {
    (async () => {
      try { const res = await api.get("/api/readings/client"); if (res.success) setReadings(res.data); } catch {}
      try { const res = await api.get("/api/transactions"); if (res.success) setTransactions(res.data); } catch {}
    })();
  }, []);

  const activeReadings = readings.filter(r => r.status === "pending" || r.status === "accepted" || r.status === "in_progress");
  const completedReadings = readings.filter(r => r.status === "completed");

  return (
    <div className="page page-padded dashboard-page">
      <h1 className="page-title">My Dashboard</h1>
      <BalanceDisplay />

      {activeReadings.length > 0 && (
        <section>
          <h2 className="section-title">Active Readings</h2>
          {activeReadings.map(r => (
            <div key={r.id} className="reading-item">
              <span>{r.type} reading — {r.status}</span>
              <span>${((r.pricePerMinute || 0) / 100).toFixed(2)}/min</span>
            </div>
          ))}
        </section>
      )}

      <div className="tab-bar">
        <button onClick={() => setTab("readings")} className={tab === "readings" ? "active" : ""}>Reading History</button>
        <button onClick={() => setTab("transactions")} className={tab === "transactions" ? "active" : ""}>Transactions</button>
      </div>

      {tab === "readings" && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Reader</th><th>Type</th><th>Date</th><th>Duration</th><th>Cost</th><th>Rating</th></tr></thead>
            <tbody>
              {completedReadings.map(r => (
                <tr key={r.id}>
                  <td>Reader #{r.readerId}</td>
                  <td>{r.type}</td>
                  <td>{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "-"}</td>
                  <td>{r.duration} min</td>
                  <td>{formatBalance(r.totalPrice || 0)}</td>
                  <td>{r.rating ? <StarRating rating={r.rating} /> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {completedReadings.length === 0 && <p className="empty-state">No completed readings yet.</p>}
        </div>
      )}

      {tab === "transactions" && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.type}</td>
                  <td style={{color: t.amount > 0 ? "#4ADE80" : "#F87171"}}>{t.amount > 0 ? "+" : ""}{formatBalance(t.amount)}</td>
                  <td>{formatBalance(t.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="empty-state">No transactions yet.</p>}
        </div>
      )}
    </div>
  );
}
