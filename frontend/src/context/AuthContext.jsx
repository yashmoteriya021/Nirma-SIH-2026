import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile when token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
      } else {
        // Token might be expired
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken, userData) => {
    setToken(newToken);
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
