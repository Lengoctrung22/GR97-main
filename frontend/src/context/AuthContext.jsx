import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 60 * 1000; // Show warning 1 minute before logout

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  const token = localStorage.getItem("healthyai_token") || sessionStorage.getItem("healthyai_token");

  // Function to logout due to inactivity
  const logoutDueToInactivity = useCallback(() => {
    localStorage.removeItem("healthyai_token");
    sessionStorage.removeItem("healthyai_token");
    setUser(null);
    setShowTimeoutWarning(false);
    navigate("/login?reason=timeout");
  }, [navigate]);

  // Reset the inactivity timer - using ref to avoid dependency issues
  const resetInactivityTimer = useCallback(() => {
    setShowTimeoutWarning(false);
    
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (4 minutes from now)
    warningTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timeout (5 minutes from now)
    timeoutRef.current = setTimeout(() => {
      logoutDueToInactivity();
    }, INACTIVITY_TIMEOUT);
  }, [logoutDueToInactivity]);

  // Track user activity
  useEffect(() => {
    // Only start tracking if user is logged in
    if (!user) return;

    const handleActivity = () => {
      // Clear existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      // Set warning timeout (4 minutes from now)
      warningTimeoutRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      // Set logout timeout (5 minutes from now)
      timeoutRef.current = setTimeout(() => {
        logoutDueToInactivity();
      }, INACTIVITY_TIMEOUT);
    };

    const activities = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    
    activities.forEach((activity) => {
      document.addEventListener(activity, handleActivity);
    });

    handleActivity();

    return () => {
      activities.forEach((activity) => {
        document.removeEventListener(activity, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [user, logoutDueToInactivity]);

  // Extend session when user clicks "Stay logged in" button
  const extendSession = useCallback(() => {
    // Reset timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Restart timers
    warningTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    timeoutRef.current = setTimeout(() => {
      logoutDueToInactivity();
    }, INACTIVITY_TIMEOUT);

    setShowTimeoutWarning(false);
  }, [logoutDueToInactivity]);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch (error) {
        // Remove token on any auth error (401, 404, network error)
        const status = error?.response?.status;
        if (status === 401 || status === 404 || !error.response) {
          localStorage.removeItem("healthyai_token");
          sessionStorage.removeItem("healthyai_token");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [token]);

  const refreshUser = async () => {
    const existingToken = localStorage.getItem("healthyai_token") || sessionStorage.getItem("healthyai_token");
    if (!existingToken) return null;

    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  };

  // Update token in storage (called by api interceptor after successful refresh)
  const setToken = (newToken, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("healthyai_token", newToken);
  };

  const login = async (identifier, password, rememberMe = false) => {
    const { data } = await api.post("/auth/login", { identifier, password });
    
    // If rememberMe is false, use sessionStorage (cleared when browser closes)
    // If rememberMe is true, use localStorage (persists)
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("healthyai_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("healthyai_token", data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("healthyai_token");
    sessionStorage.removeItem("healthyai_token");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      setUser,
      setToken,
      showTimeoutWarning,
      extendSession,
    }),
    [user, loading, showTimeoutWarning, extendSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
