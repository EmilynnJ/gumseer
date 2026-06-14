import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ReaderCard from "../components/ReaderCard";
import { useToast } from "../components/Toast";
import type { User } from "@soulseer/shared";

export default function Home() {
  const [readers, setReaders] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    const fetchReaders = async () => {
      try { const { data } = await axios.get("/api/readers/online"); if (data.success) setReaders(data.data); }
      catch {}
    };
    fetchReaders();
    const interval = setInterval(fetchReaders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/forum/newsletter", { email });
      addToast("Subscribed to newsletter!", "success");
      setEmail("");
    } catch { addToast("Failed to subscribe", "error"); }
  };

  return (
    <div className="page home-page">
      <section className="hero-section">
        <h1 className="hero-title">SoulSeer</h1>
        <img src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg" alt="SoulSeer Hero" className="hero-image" />
        <p className="hero-tagline">A Community of Gifted Psychics</p>
      </section>

      <section className="online-readers">
        <h2 className="section-title">Available Now</h2>
        {readers.length === 0 ? (
          <p className="empty-state">No readers are currently online. Check back soon!</p>
        ) : (
          <div className="reader-grid">
            {readers.map(r => <ReaderCard key={r.id} reader={r} />)}
          </div>
        )}
        <Link to="/readers" className="btn-accent" style={{ marginTop: 20, display: "inline-block" }}>Browse All Readers</Link>
      </section>

      <section className="newsletter-section">
        <h2 className="section-title">Stay Connected</h2>
        <form onSubmit={handleNewsletter} className="newsletter-form">
          <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary">Subscribe</button>
        </form>
      </section>

      <section className="community-links">
        <h2 className="section-title">Join Our Community</h2>
        <div className="comm-buttons">
          <a href="https://facebook.com/soulseer" target="_blank" rel="noopener noreferrer" className="btn-community fb">Facebook Group</a>
          <a href="https://discord.gg/soulseer" target="_blank" rel="noopener noreferrer" className="btn-community discord">Discord Server</a>
        </div>
      </section>
    </div>
  );
}
