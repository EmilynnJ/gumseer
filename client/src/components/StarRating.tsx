interface Props { rating: number; interactive?: boolean; onChange?: (r: number) => void; size?: number; }

export default function StarRating({ rating, interactive = false, onChange, size = 18 }: Props) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= rating;
        const half = !filled && star - 0.5 <= rating;
        return (
          <button key={star} onClick={() => interactive && onChange?.(star)} disabled={!interactive}
            style={{ background: "none", border: "none", cursor: interactive ? "pointer" : "default", padding: 0, fontSize: size, color: filled ? "#D4AF37" : half ? "#D4AF37" : "#444" }}>
            {filled ? "★" : half ? "⯨" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
