import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";
import { useToast } from "../components/Toast";
import StarRating from "../components/StarRating";
import { MIN_BALANCE_FOR_READING } from "@soulseer/shared";
import type { User } from "@soulseer/shared";

interface ReaderProfile extends User { avgRating: number; reviewCount: number; recentReviews: Array<{ id: number; rating: number; review: string; createdAt: string }>; }

export default function ReaderProfile() {
  const { id } = useParams();
  const { isAuthenticated, login } = useAuth();
  const { balance, refreshBalance } = useBalance();
  const { addToast } = useToast();
  const [reader, setReader] = useState<ReaderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await axios.get(`/api/readers/${id}`); if (data.success) setReader(data.data); }
      catch { addToast("Reader not found", "error"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleStartReading = async (type: "chat" | "voice" | "video") => {
    if (!isAuthenticated) { login(); return; }
    const price = type === "chat" ? reader?.pricingChat : type === "voice" ? reader?.pricingVoice : reader?.pricingVideo;
    if (!price) { addToast("This reader does not offer this type", "error"); return; }
    if (balance < MIN_BALANCE_FOR_READING) { addToast(`Minimum $5 balance required. Yours: $${(balance / 100).toFixed(2)}`, "error"); return; }
    try {
      const token = localStorage.getItem("auth_token") || "";
      const { data } = await axios.post("/api/readings/on-demand", { type, readerId: Number(id) }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) { addToast("Reading request sent! Waiting for reader to accept.", "success"); await refreshBalance(); }
    } catch (err: any) { addToast(err.response?.data?.error?.message || "Failed to start reading", "error"); }
  };

  if (loading) return <div className="page page-padded"><div className="skeleton-profile" /></div>;
  if (!reader) return <div className="page page-padded"><p className="empty-state">Reader not found</p></div>;

  return (
    <div className="page page-padded reader-profile-page">
      <div className="profile-header">
        <div className="profile-image">
          {reader.profileImage ? <img src={reader.profileImage} alt={reader.fullName} /> : <div className="profile-image-placeholder">{reader.fullName[0]}</div>}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{reader.fullName}</h1>
          <div className="profile-rating"><StarRating rating={reader.avgRating} /> <span>({reader.reviewCount} reviews)</span></div>
          {reader.isOnline && <span className="online-badge" style={{ display: "inline-block", marginTop: 8 }}>● Available Now</span>}
          {reader.specialties && (
            <div className="specialty-tags" style={{ marginTop: 12 }}>
              {reader.specialties.map((s, i) => <span key={i} className="tag">{s}</span>)}
            </div>
          )}
        </div>
      </div>

      {reader.bio && <p className="profile-bio">{reader.bio}</p>}

      <div className="reading-types">
        {reader.pricingChat && (
          <div className="type-card"><h4>Chat Reading</h4><p>${(reader.pricingChat / 100).toFixed(2)} / min</p><button onClick={() => handleStartReading("chat")} className="btn-primary">Start Chat Reading</button></div>
        )}
        {reader.pricingVoice && (
          <div className="type-card"><h4>Voice Reading</h4><p>${(reader.pricingVoice / 100).toFixed(2)} / min</p><button onClick={() => handleStartReading("voice")} className="btn-primary">Start Voice Reading</button></div>
        )}
        {reader.pricingVideo && (
          <div className="type-card"><h4>Video Reading</h4><p>${(reader.pricingVideo / 100).toFixed(2)} / min</p><button onClick={() => handleStartReading("video")} className="btn-primary">Start Video Reading</button></div>
        )}
      </div>

      {reader.recentReviews && reader.recentReviews.length > 0 && (
        <section className="reviews-section">
          <h2 className="section-title">Recent Reviews</h2>
          {reader.recentReviews.map(r => (
            <div key={r.id} className="review-card">
              <StarRating rating={r.rating} />
              <p>{r.review}</p>
              <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
