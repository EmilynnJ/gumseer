import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { useBalance } from "../contexts/BalanceContext";
import { useToast } from "./Toast";
import { PRESET_TOPUP_AMOUNTS, MIN_TOPUP } from "@soulseer/shared";

interface Props { onClose: () => void; }

export default function AddFundsModal({ onClose }: Props) {
  const api = useApi();
  const { refreshBalance } = useBalance();
  const { addToast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState("");

  const handleAdd = async (amount: number) => {
    setLoading(String(amount));
    try {
      const res = await api.post("/api/payments/create-intent", { amount });
      addToast(`Payment intent created for $${(amount / 100).toFixed(2)}. Stripe not configured in dev.`, "success");
      await refreshBalance();
      onClose();
    } catch (err: any) { addToast(err.response?.data?.error?.message || "Payment failed", "error"); }
    finally { setLoading(""); }
  };

  const handleCustom = () => {
    const amt = Math.round(parseFloat(customAmount) * 100);
    if (isNaN(amt) || amt < MIN_TOPUP) { addToast(`Minimum $${(MIN_TOPUP / 100).toFixed(2)}`, "error"); return; }
    handleAdd(amt);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Add Funds</h3>
        <div className="preset-amounts">
          {PRESET_TOPUP_AMOUNTS.map(a => (
            <button key={a} onClick={() => handleAdd(a)} disabled={loading !== ""} className="amount-btn">
              ${(a / 100).toFixed(0)}
            </button>
          ))}
        </div>
        <div className="custom-amount">
          <input type="number" min="5" step="1" placeholder="Custom amount ($)" value={customAmount} onChange={e => setCustomAmount(e.target.value)} />
          <button onClick={handleCustom} disabled={loading !== ""} className="btn-primary">Add ${customAmount || "0"}</button>
        </div>
        <button onClick={onClose} className="btn-secondary" style={{ marginTop: 12, width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}
