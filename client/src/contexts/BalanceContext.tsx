import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";

interface BalanceState { balance: number; isLoading: boolean; refreshBalance: () => Promise<void>; formatBalance: (cents: number) => string; }
const BalanceContext = createContext<BalanceState>({ balance: 0, isLoading: true, refreshBalance: async () => {}, formatBalance: (c: number) => `$${(c / 100).toFixed(2)}` });

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getToken } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!isAuthenticated) { setBalance(0); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/user/balance", { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setBalance(data.data.balance);
    } catch (err) { console.error("Balance fetch error:", err); }
    finally { setLoading(false); }
  }, [isAuthenticated, getToken]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  return (
    <BalanceContext.Provider value={{ balance, isLoading: loading, refreshBalance, formatBalance: (c: number) => `$${(c / 100).toFixed(2)}` }}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalance = () => useContext(BalanceContext);
