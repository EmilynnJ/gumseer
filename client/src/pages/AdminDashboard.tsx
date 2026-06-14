import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/Toast";
import type { User, Reading, Transaction, ForumFlag } from "@soulseer/shared";

export default function AdminDashboard() {
  const api = useApi();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"users"|"readings"|"transactions"|"forum">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [flags, setFlags] = useState<ForumFlag[]>([]);

  // Create reader form
  const [crf, setCrf] = useState({ fullName:"",email:"",username:"",bio:"",specialties:"",pricingChat:"100",pricingVoice:"200",pricingVideo:"300" });

  useEffect(() => {
    if (tab === "users") api.get("/api/admin/users?pageSize=100").then(r => { if(r.success) setUsers(r.data); }).catch(()=>{});
    if (tab === "readings") api.get("/api/admin/readings?pageSize=100").then(r => { if(r.success) setReadings(r.data); }).catch(()=>{});
    if (tab === "transactions") api.get("/api/admin/transactions?pageSize=100").then(r => { if(r.success) setTransactions(r.data); }).catch(()=>{});
    if (tab === "forum") api.get("/api/admin/forum/flagged").then(r => { if(r.success) setFlags(r.data); }).catch(()=>{});
  }, [tab]);

  const createReader = async () => {
    const { fullName, email, username, bio, specialties, pricingChat, pricingVoice, pricingVideo } = crf;
    if (!fullName||!email||!username||!bio) { addToast("Fill all required fields","error"); return; }
    try {
      const res = await api.post("/api/admin/readers", {
        fullName, email, username, bio,
        specialties: specialties.split(",").map(s=>s.trim()).filter(Boolean),
        pricingChat: Math.round(parseFloat(pricingChat)*100),
        pricingVoice: Math.round(parseFloat(pricingVoice)*100),
        pricingVideo: Math.round(parseFloat(pricingVideo)*100),
      });
      if (res.success) { addToast(`Reader created! Initial password: ${res.data.initialPassword}`,"success"); setCrf({fullName:"",email:"",username:"",bio:"",specialties:"",pricingChat:"100",pricingVoice:"200",pricingVideo:"300"}); }
    } catch (err:any) { addToast(err.response?.data?.error?.message||"Failed","error"); }
  };

  const deleteFlagged = async (type:"post"|"comment", id:number) => {
    try { await api.del(`/api/forum/${type}s/${id}`); addToast("Deleted","success"); setFlags(f=>f.filter(fl=>fl.postId!==id&&fl.commentId!==id)); }
    catch { addToast("Failed to delete","error"); }
  };

  return (
    <div className="page page-padded admin-page">
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="tab-bar">
        {(["users","readings","transactions","forum"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={tab===t?"active":""}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==="users"&&(
        <div>
          <section className="create-reader">
            <h2>Create Reader</h2>
            <div className="form-grid">
              <input placeholder="Full Name" value={crf.fullName} onChange={e=>setCrf(s=>({...s,fullName:e.target.value}))} />
              <input placeholder="Email" type="email" value={crf.email} onChange={e=>setCrf(s=>({...s,email:e.target.value}))} />
              <input placeholder="Username" value={crf.username} onChange={e=>setCrf(s=>({...s,username:e.target.value}))} />
              <input placeholder="Bio" value={crf.bio} onChange={e=>setCrf(s=>({...s,bio:e.target.value}))} />
              <input placeholder="Specialties (comma-separated)" value={crf.specialties} onChange={e=>setCrf(s=>({...s,specialties:e.target.value}))} />
              <input placeholder="Chat rate ($/min)" type="number" value={crf.pricingChat} onChange={e=>setCrf(s=>({...s,pricingChat:e.target.value}))} />
              <input placeholder="Voice rate ($/min)" type="number" value={crf.pricingVoice} onChange={e=>setCrf(s=>({...s,pricingVoice:e.target.value}))} />
              <input placeholder="Video rate ($/min)" type="number" value={crf.pricingVideo} onChange={e=>setCrf(s=>({...s,pricingVideo:e.target.value}))} />
            </div>
            <button onClick={createReader} className="btn-primary">Create Reader</button>
          </section>
          <section className="user-list">
            <h2>All Users ({users.length})</h2>
            <div className="table-wrapper">
              <table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Balance</th></tr></thead>
                <tbody>{users.map(u=>(<tr key={u.id}><td>{u.id}</td><td>{u.fullName}</td><td>{u.email}</td><td>{u.role}</td><td>${(u.accountBalance/100).toFixed(2)}</td></tr>))}</tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab==="readings"&&(
        <div className="table-wrapper"><table><thead><tr><th>ID</th><th>Reader</th><th>Client</th><th>Type</th><th>Status</th><th>Cost</th><th>Date</th></tr></thead>
          <tbody>{readings.map(r=>(<tr key={r.id}><td>{r.id}</td><td>#{r.readerId}</td><td>#{r.clientId}</td><td>{r.type}</td><td>{r.status}</td><td>${((r.totalPrice||0)/100).toFixed(2)}</td><td>{new Date(r.createdAt).toLocaleDateString()}</td></tr>))}</tbody></table></div>
      )}

      {tab==="transactions"&&(
        <div className="table-wrapper"><table><thead><tr><th>ID</th><th>User</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>{transactions.map(t=>(<tr key={t.id}><td>{t.id}</td><td>#{t.userId}</td><td>{t.type}</td><td style={{color:t.amount>0?"#4ADE80":"#F87171"}}>${(t.amount/100).toFixed(2)}</td><td>{new Date(t.createdAt).toLocaleDateString()}</td></tr>))}</tbody></table></div>
      )}

      {tab==="forum"&&(
        <div>
          <h2>Flagged Content ({flags.length})</h2>
          {flags.length===0?<p className="empty-state">No flagged content</p>:
            flags.map(f=>(<div key={f.id} className="flag-item">
              <p>{f.reason} — by user #{f.reporterId}</p>
              {f.postId&&<button onClick={()=>deleteFlagged("post",f.postId!)} className="btn-danger">Delete Post #{f.postId}</button>}
              {f.commentId&&<button onClick={()=>deleteFlagged("comment",f.commentId!)} className="btn-danger">Delete Comment #{f.commentId}</button>}
            </div>))
          }
        </div>
      )}
    </div>
  );
}
