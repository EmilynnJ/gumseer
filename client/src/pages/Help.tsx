import { useState } from "react";

const faqs = [
  { q: "How do readings work?", a: "Browse our readers, select one that resonates with you, and start a chat, voice, or video reading. You're charged per minute at the reader's rate." },
  { q: "How much do readings cost?", a: "Each reader sets their own per-minute rates for chat, voice, and video readings. You can see rates on each reader's profile. The minimum balance to start any reading is $5." },
  { q: "How do I add funds?", a: "Click 'Add Funds' from your dashboard or the navigation bar. Choose a preset amount or enter a custom amount (minimum $5). Funds are available immediately." },
  { q: "Can I get a refund?", a: "You only pay for the minutes you actually use. If you experience technical issues, contact us and we'll review your session." },
  { q: "How do readers get paid?", a: "Readers earn 70% of each reading. They can request a payout once their balance reaches $15." },
  { q: "What happens if I disconnect?", a: "We provide a 2-minute grace period. If you reconnect within that time, your session resumes. After 2 minutes, the session ends and you're only charged for the time connected." },
  { q: "Community Guidelines", a: "Be respectful and kind. Flag any inappropriate content in the forum. Harassment, hate speech, and spam are not tolerated." },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="page page-padded help-page">
      <h1 className="page-title">Help & FAQ</h1>
      <div className="faq-list">
        {faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${openIdx === i ? "open" : ""}`}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="faq-question">{faq.q} <span>{openIdx === i ? "−" : "+"}</span></button>
            {openIdx === i && <div className="faq-answer"><p>{faq.a}</p></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
