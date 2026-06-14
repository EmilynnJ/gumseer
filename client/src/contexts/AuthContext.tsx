import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import type { User } from "@soulseer/shared";

interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; isAdmin: boolean; isReader: boolean; isClient: boolean; login: () => void; logout: () => void; getToken: () => Promise<string | null>; }

const AuthContext = createContext<AuthState>({ user: null, isAuthenticated: false, isLoading: true, isAdmin: false, isReader: false, isClient: true, login: () => {}, logout: () => {}, getToken: async () => null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: auth0Loading, loginWithRedirect, logout: auth0Logout, getAccessTokenSilently, user: auth0User } = useAuth0();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth0Loading) { setLoading(true); return; }
    if (!isAuthenticated || !auth0User) { setUser(null); setLoading(false); return; }
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const { data } = await axios.post("/api/auth/sync", null, { headers: { Authorization: `Bearer ${token}` } });
        if (data.success) setUser(data.data);
      } catch (err) { console.error("Auth sync failed:", err); setUser(null); }
      finally { setLoading(false); }
    })();
  }, [isAuthenticated, auth0Loading, auth0User, getAccessTokenSilently]);

  const getToken = useCallback(async () => { try { return await getAccessTokenSilently(); } catch { return null; } }, [getAccessTokenSilently]);
  const login = useCallback(() => loginWithRedirect(), [loginWithRedirect]);
  const doLogout = useCallback(() => auth0Logout({ logoutParams: { returnTo: window.location.origin } }), [auth0Logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading: loading || auth0Loading, isAdmin: user?.role === "admin", isReader: user?.role === "reader", isClient: user?.role === "client" || !user, login, logout: doLogout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
