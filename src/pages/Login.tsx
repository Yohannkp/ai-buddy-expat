import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [form, setForm] = useState({ email: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.email) {
      setError("L'email est obligatoire.");
      return;
    }
    const baseUrl = typeof window !== 'undefined'
      ? new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
      : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: { emailRedirectTo: baseUrl }
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Un lien de connexion a été envoyé à votre email.");
    }
  };

  const handleGoogle = async () => {
    setError("");
    const baseUrl = typeof window !== 'undefined'
      ? new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
      : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: baseUrl } });
    if (error) setError(error.message);
  };

  return (
    <div className="container max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Connexion / Inscription</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-muted p-6 rounded-lg">
        <input
          className="w-full border rounded px-3 py-2"
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {message && <div className="text-green-600 text-sm">{message}</div>}
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded w-full">Se connecter par email</button>
      </form>
      <div className="my-4 text-center text-muted-foreground">ou</div>
      <button onClick={handleGoogle} className="bg-white border px-4 py-2 rounded w-full flex items-center justify-center gap-2">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
        Se connecter avec Google
      </button>
    </div>
  );
};

export default Login;
