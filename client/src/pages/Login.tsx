import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { login(); }
    else if (isAuthenticated) { navigate("/dashboard"); }
  }, [isAuthenticated, isLoading, login, navigate]);

  return (
    <div className="page login-page">
      <div className="login-card">
        <h1 className="hero-title" style={{ textAlign: "center" }}>SoulSeer</h1>
        <p className="hero-tagline">Redirecting to login...</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
}
