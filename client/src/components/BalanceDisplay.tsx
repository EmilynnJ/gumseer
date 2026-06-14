import { useState } from "react";
import { useBalance } from "../contexts/BalanceContext";
import { MIN_BALANCE_FOR_READING } from "@soulseer/shared";
import AddFundsModal from "./AddFundsModal";

export default function BalanceDisplay() {
  const { balance, formatBalance, isLoading } = useBalance();
  const [showModal, setShowModal] = useState(false);
  const isLow = balance < MIN_BALANCE_FOR_READING;

  return (
    <>
      <div className="balance-display" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <span style={{ fontSize: "0.85rem", color: "#A0A0B0" }}>Balance</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: isLow ? "#F87171" : "#4ADE80" }}>{isLoading ? "..." : formatBalance(balance)}</div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-accent">Add Funds</button>
      </div>
      {isLow && <p style={{ color: "#F87171", fontSize: "0.8rem", marginTop: 4 }}>Low balance — add funds to start readings</p>}
      {showModal && <AddFundsModal onClose={() => setShowModal(false)} />}
    </>
  );
}
