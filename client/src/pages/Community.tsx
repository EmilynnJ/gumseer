import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { FORUM_CATEGORIES } from "@soulseer/shared";
import type { ForumPost, ForumComment } from "@soulseer/shared";

interface PostWithMeta extends ForumPost { comments?: Array<ForumComment & { authorName: string }>; }

export default function Community() {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedPost, setExpandedPost] = useState<PostWithMeta | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [commentText, setCommentText] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), category });
      const { data } = await axios.get(`/api/forum/posts?${params}`);
      if (data.success) { setPosts(data.data); setTotalPages(data.pagination.totalPages); }
    } catch {}
  }, [page, category]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const expandPost = async (postId: number) => {
    if (expandedId === postId) { setExpandedId(null); setExpandedPost(null); return; }
    try {
      const { data } = await axios.get(`/api/forum/posts/${postId}`);
      if (data.success) { setExpandedPost(data.data); setExpandedId(postId); }
    } catch { addToast("Failed to load post", "error"); }
  };

  const createPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) { addToast("Title and content required", "error"); return; }
    const token = localStorage.getItem("auth_token") || "";
    try {
      await axios.post("/api/forum/posts", { title: newTitle, content: newContent, category: newCategory }, { headers: { Authorization: `Bearer ${token}` } });
      addToast("Post created!", "success");
      setShowCreate(false); setNewTitle(""); setNewContent("");
      fetchPosts();
    } catch (err: any) { addToast(err.response?.data?.error?.message || "Failed to create post", "error"); }
  };

  const addComment = async () => {
    if (!commentText.trim() || !expandedId) return;
    try {
      await axios.post(`/api/forum/posts/${expandedId}/comments`, { content: commentText }, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      addToast("Comment added!", "success");
      setCommentText("");
      expandPost(expandedId);
    } catch (err: any) { addToast(err.response?.data?.error?.message || "Failed to comment", "error"); }
  };

  const flagContent = async (type: "post" | "comment", id: number) => {
    try {
      await axios.post(`/api/forum/${type}s/${id}/flag`, { reason: "Inappropriate content" }, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      addToast("Content flagged for review", "success");
    } catch { addToast("Failed to flag", "error"); }
  };

  return (
    <div className="page page-padded community-page">
      {/* Community Links */}
      <section className="community-links-section">
        <h1 className="page-title">Community Hub</h1>
        <div className="comm-buttons">
          <a href="https://facebook.com/soulseer" target="_blank" rel="noopener noreferrer" className="btn-community fb">Join our Facebook Group</a>
          <a href="https://discord.gg/soulseer" target="_blank" rel="noopener noreferrer" className="btn-community discord">Join our Discord Server</a>
        </div>
      </section>

      {/* Forum */}
      <section className="forum-section">
        <div className="forum-header">
          <h2 className="section-title">Public Forum</h2>
          {isAuthenticated && <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">{showCreate ? "Cancel" : "New Post"}</button>}
        </div>

        {showCreate && (
          <div className="create-post">
            <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea placeholder="Content" value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>{FORUM_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            <button onClick={createPost} className="btn-primary">Create Post</button>
          </div>
        )}

        <div className="category-tabs">
          {["all", ...FORUM_CATEGORIES].map(c => (
            <button key={c} onClick={() => { setCategory(c); setPage(1); }} className={`tab ${category === c ? "active" : ""}`}>{c}</button>
          ))}
        </div>

        <div className="forum-posts">
          {posts.length === 0 ? <p className="empty-state">No posts yet. Start the conversation!</p> :
            posts.map(post => (
              <div key={post.id} className={`forum-post-card ${post.category === "Announcements" ? "announcement" : ""}`}>
                <div onClick={() => expandPost(post.id)} style={{cursor: "pointer"}}>
                  <h3>{post.title}</h3>
                  <div className="post-meta">
                    <span className="post-category">{post.category}</span>
                    <span>by {post.authorName || "Anonymous"}</span>
                    <span>{post.commentCount ?? 0} comments</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === post.id && expandedPost && (
                  <div className="post-expanded">
                    <p className="post-content">{expandedPost.content}</p>
                    {expandedPost.comments && expandedPost.comments.map(c => (
                      <div key={c.id} className="comment">
                        <strong>{c.authorName}</strong>
                        <p>{c.content}</p>
                        <button onClick={() => flagContent("comment", c.id)} className="btn-text">Flag</button>
                      </div>
                    ))}
                    {isAuthenticated && (
                      <div className="add-comment">
                        <input placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
                        <button onClick={addComment} className="btn-primary btn-small">Post</button>
                      </div>
                    )}
                    <button onClick={() => flagContent("post", post.id)} className="btn-text">Flag Post</button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </section>
    </div>
  );
}
