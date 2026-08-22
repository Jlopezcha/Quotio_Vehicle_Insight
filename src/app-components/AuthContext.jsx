import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }){
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("quotio_token");
        if (!token) {
            setLoading(false);
            return;
        }

    async function loadUser(){
        try{
            const res = await fetch("/api/users/me", {
                headers: { Authorization: `Bearer ${token}`},

            });

            if (res.ok){
                const data = await res.json();
                setUser(data);
            } else {
                localStorage.removeItem("quotio_token");
                localStorage.removeItem("quotio_session");
            }
        } catch {
            setLoading(false);
            return;

        } finally { 
            setLoading(false);
        }
    }
    loadUser();
}, []);
async function login({ token, email }) {
    localStorage.setItem("quotio_token", token);
    localStorage.setItem("quotio_session", email);
    setUser({ email });
    try {
        const res = await fetch("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data);
        }
    } catch {
        // optimistic email-only state is fine if fetch fails
    }
}

function logout(){
    localStorage.removeItem("quotio_token");
    localStorage.removeItem("quotio_session");
    setUser(null);
}

return(
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
