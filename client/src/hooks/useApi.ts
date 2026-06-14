import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export function useApi() {
  const { getToken, logout } = useAuth();
  const request = useCallback(async (method: string, url: string, body?: any, config?: any) => {
    const token = await getToken();
    const headers: any = { ...config?.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    try { return (await axios({ method, url, data: body, ...config, headers })).data; }
    catch (err: any) { if (err.response?.status === 401) logout(); throw err; }
  }, [getToken, logout]);
  return { get: (url: string, c?: any) => request("GET", url, undefined, c), post: (url: string, b?: any, c?: any) => request("POST", url, b, c), patch: (url: string, b?: any, c?: any) => request("PATCH", url, b, c), del: (url: string, c?: any) => request("DELETE", url, undefined, c) };
}
