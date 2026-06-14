import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBalance } from "../contexts/BalanceContext";

export default function Navbar() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { balance, formatBalance } = useBalance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const linkStyle = (path: string) => ({ color: location.pathname === path ? "#D4AF37" : "#FFFFFF", textDecoration: "none", fontSize: "0.95rem", fontWeight: 500 });

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">SoulSeer</Link>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <Link to="/readers" style={linkStyle("/readers")}>Readers</Link>
          <Link to="/community" style={linkStyle("/community")}>Community</Link>
          <Link to="/about" style={linkStyle("/about")}>About</Link>
          <Link to="/help" style={linkStyle("/help")}>Help</Link>
          {!isLoading && (
            <div className="navbar-auth">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" style={{ color: "#D4AF37", textDecoration: "none", fontSize: "0.9rem" }}>
                    {formatBalance(balance)}
                  </Link>
                  <div className="user-dropdown" style={{ position: "relative" }}>
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{ background: "none", border: "1px solid #333", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
                      {user?.username || "Account"} ▼
                    </button>
                    {dropdownOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 0, background: "#13111A", border: "1px solid #333", borderRadius: 8, padding: 8, minWidth: 140, marginTop: 4, zIndex: 100 }}>
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)} style={{ display: "block", padding: "8px 12px", color: "#fff", textDecoration: "none" }}>Dashboard</Link>
                        <button onClick={() => { setDropdownOpen(false); logout(); }} style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: "0.95rem" }}>Logout</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={login} className="btn-primary">Login</button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
