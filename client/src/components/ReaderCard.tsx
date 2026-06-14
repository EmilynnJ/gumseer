import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";
import { MIN_BALANCE_FOR_READING } from "@soulseer/shared";
import type { User } from "@soulseer/shared";

interface Props { reader: User; }

export default function ReaderCard({ reader }: Props) {
  const { isAuthenticated, login } = useAuth();
  const { balance } = useBalance();

  const rates: string[] = [];
  if (reader.pricingChat) rates.push(`Chat $${(reader.pricingChat / 100).toFixed(2)}/min`);
  if (reader.pricingVoice) rates.push(`Voice $${(reader.pricingVoice / 100).toFixed(2)}/min`);
  if (reader.pricingVideo) rates.push(`Video $${(reader.pricingVideo / 100).toFixed(2)}/min`);

  const handleStart = () => {
    if (!isAuthenticated) { login(); return; }
    if (balance < MIN_BALANCE_FOR_READING) { alert(`Minimum $5 balance required. Your balance: $${(balance / 100).toFixed(2)}`); return; }
  };

  return (
    <div className="reader-card">
      <div className="reader-card-image">
        {reader.profileImage ? (
          <img src={reader.profileImage} alt={reader.fullName} />
        ) : (
          <div className="reader-card-placeholder">{(reader.fullName || "R")[0]}</div>
        )}
        {reader.isOnline && <span className="online-badge">● Online</span>}
      </div>
      <div className="reader-card-body">
        <Link to={`/readers/${reader.id}`} style={{ textDecoration: "none" }}>
          <h3 className="reader-card-name">{reader.fullName}</h3>
        </Link>
        {reader.specialties && reader.specialties.length > 0 && (
          <div className="specialty-tags">
            {reader.specialties.slice(0, 3).map((s, i) => <span key={i} className="tag">{s}</span>)}
          </div>
        )}
        <div className="reader-card-rates">{rates.map((r, i) => <span key={i} className="rate-item">{r}</span>)}</div>
        <Link to={`/readers/${reader.id}`} className="btn-primary btn-small" onClick={handleStart}>Start Reading</Link>
      </div>
    </div>
  );
}
