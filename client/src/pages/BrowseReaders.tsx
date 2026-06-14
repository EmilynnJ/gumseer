import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ReaderCard from "../components/ReaderCard";
import type { User } from "@soulseer/shared";

export default function BrowseReaders() {
  const [readers, setReaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const fetchReaders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "12" });
      if (onlineOnly) params.set("online", "true");
      if (typeFilter) params.set("type", typeFilter);
      if (specialtyFilter) params.set("specialty", specialtyFilter);
      const { data } = await axios.get(`/api/readers?${params}`);
      if (data.success) { setReaders(data.data); setTotalPages(data.pagination.totalPages); }
    } catch {}
    finally { setLoading(false); }
  }, [page, onlineOnly, typeFilter, specialtyFilter]);

  useEffect(() => { fetchReaders(); }, [fetchReaders]);

  return (
    <div className="page page-padded">
      <h1 className="page-title">Browse Readers</h1>
      <div className="filters">
        <label><input type="checkbox" checked={onlineOnly} onChange={e => { setOnlineOnly(e.target.checked); setPage(1); }} /> Online Only</label>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="chat">Chat</option>
          <option value="voice">Voice</option>
          <option value="video">Video</option>
        </select>
        <input type="text" placeholder="Filter by specialty..." value={specialtyFilter} onChange={e => { setSpecialtyFilter(e.target.value); setPage(1); }} />
      </div>
      {loading ? (
        <div className="skeleton-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : readers.length === 0 ? (
        <p className="empty-state">No readers found matching your filters.</p>
      ) : (
        <>
          <div className="reader-grid">{readers.map(r => <ReaderCard key={r.id} reader={r} />)}</div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
