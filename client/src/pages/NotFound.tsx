import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page not-found-page" style={{textAlign:"center",padding:"80px 20px"}}>
      <h1 style={{fontFamily:"'Alex Brush',cursive",fontSize:"4rem",color:"#D4AF37"}}>404</h1>
      <p style={{fontSize:"1.2rem",margin:"16px 0"}}>The stars could not align for this page.</p>
      <Link to="/" className="btn-accent">Return Home</Link>
    </div>
  );
}
