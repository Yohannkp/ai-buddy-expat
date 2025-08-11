import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, NavLink } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import XFeed from "./pages/XFeed";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="w-full bg-background border-b sticky top-0 z-50">
        <nav className="container flex flex-wrap gap-4 py-3 justify-center items-center">
          <NavLink to="/x" className={({ isActive }) => isActive ? "font-semibold text-primary underline" : "font-semibold hover:underline"}>Flux</NavLink>
          <NavLink to="/login" className={({ isActive }) => isActive ? "text-primary underline" : "hover:underline"}>Connexion</NavLink>
        </nav>
      </div>
        <Routes>
          <Route path="/" element={<XFeed />} />
          <Route path="/x" element={<XFeed />} />
          <Route path="/login" element={<Login />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
