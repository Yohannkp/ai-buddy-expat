import { useState } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (email: string, name: string) => {
    const newUser = { id: Date.now(), email, name };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return { user, login, logout };
}
