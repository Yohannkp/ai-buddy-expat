import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, NavLink } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import Guides from "./pages/Guides";
import SocialFeed from "./pages/SocialFeed";
import Login from "./pages/Login";
import { useAuthProvider } from "@/hooks/useAuth";
import Translation from "./pages/Translation";
import Community from "./pages/Community";
import Calendar from "./pages/Calendar";
import Map from "./pages/Map";
import FAQ from "./pages/FAQ";
import Jobs from "./pages/Jobs";
import Documents from "./pages/Documents";
import Wellbeing from "./pages/Wellbeing";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Rules from "./pages/Rules";
import PopularEvents from "./pages/PopularEvents";
import Leaderboard from "./pages/Leaderboard";
import XFeed from "./pages/XFeed";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
  <div className="w-full bg-background border-b sticky top-0 z-50">
          <nav className="container flex flex-wrap gap-2 py-3 justify-center items-center">
            <NavLink to="/" end className={({ isActive }) => isActive ? "font-semibold text-primary underline" : "font-semibold hover:underline"}>Accueil</NavLink>
            <NavLink to="/guides" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Guides</NavLink>
            <NavLink to="/social" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Fil social</NavLink>
            <NavLink to="/translation" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Traduction</NavLink>
            <NavLink to="/community" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Communauté</NavLink>
            <NavLink to="/calendar" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Calendrier</NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Carte</NavLink>
            <NavLink to="/faq" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>FAQ</NavLink>
            <NavLink to="/jobs" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Emplois</NavLink>
            <NavLink to="/documents" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Documents</NavLink>
            <NavLink to="/wellbeing" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Bien-être</NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Profil</NavLink>
            <NavLink to="/login" className={({ isActive }) => isActive ? "text-primary underline ml-4" : "hover:underline ml-4"}>Connexion</NavLink>
            <NavLink to="/messages" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Messages</NavLink>
            <NavLink to="/rules" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Règles</NavLink>
            <NavLink to="/popular" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Populaires</NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Classement</NavLink>
            <NavLink to="/x" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>X</NavLink>
          </nav>
        </div>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/social" element={<SocialFeed />} />
          <Route path="/translation" element={<Translation />} />
          <Route path="/community" element={<Community />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/map" element={<Map />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/wellbeing" element={<Wellbeing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/popular" element={<PopularEvents />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/x" element={<XFeed />} />
          <Route path="/login" element={<Login />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
