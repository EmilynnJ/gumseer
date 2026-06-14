import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BrowseReaders from "./pages/BrowseReaders";
import ReaderProfile from "./pages/ReaderProfile";
import About from "./pages/About";
import Community from "./pages/Community";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReadingSession from "./pages/ReadingSession";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/readers" element={<BrowseReaders />} />
          <Route path="/readers/:id" element={<ReaderProfile />} />
          <Route path="/about" element={<About />} />
          <Route path="/community" element={<Community />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reading/:id" element={<ReadingSession />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
