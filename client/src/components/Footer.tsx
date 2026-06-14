import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">SoulSeer</span>
          <p className="footer-tagline">A Community of Gifted Psychics</p>
        </div>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/help">Help / FAQ</Link>
          <Link to="/community">Community</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <div className="footer-social">
          <a href="https://facebook.com/soulseer" target="_blank" rel="noopener noreferrer" className="social-link fb">Facebook</a>
          <a href="https://discord.gg/soulseer" target="_blank" rel="noopener noreferrer" className="social-link discord">Discord</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} SoulSeer. All rights reserved.</p>
      </div>
    </footer>
  );
}
