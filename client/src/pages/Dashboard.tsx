import { useAuth } from "../contexts/AuthContext";
import ClientDashboard from "./ClientDashboard";
import ReaderDashboard from "./ReaderDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Dashboard() {
  const { user, isLoading, isAdmin, isReader } = useAuth();
  if (isLoading) return <div className="page page-padded"><p>Loading...</p></div>;
  if (!user) return <div className="page page-padded"><p>Please log in to access your dashboard.</p></div>;
  if (isAdmin) return <AdminDashboard />;
  if (isReader) return <ReaderDashboard />;
  return <ClientDashboard />;
}
