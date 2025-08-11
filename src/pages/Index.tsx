import { Button } from "@/components/ui/button";
import { GraduationCap, Globe2, MessagesSquare, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const features = [
  { icon: <Globe2 />, title: "Guides d’intégration locale", desc: "Démarches, logement, santé, transport – toujours à jour." },
  { icon: <MessagesSquare />, title: "Traducteur IA instantané", desc: "Texte, documents et voix avec contexte académique." },
  { icon: <CalendarDays />, title: "Calendrier académique", desc: "Examens, devoirs, et rappels intelligents." },
  { icon: <MapPin />, title: "Carte interactive", desc: "Lieux utiles: campus, restos abordables, services publics." },
];

const Index = () => {
  const ambientRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ambientRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--x", `${x}%`);
      el.style.setProperty("--y", `${y}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="container py-6">
        <nav className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="text-primary" />
            <span>GlobalCampus</span>
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <a href="#features">Fonctionnalités</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="#ia">IA</a>
            </Button>
            <Button variant="hero">Commencer</Button>
          </div>
        </nav>
      </header>

      <main>
        <section ref={ambientRef} className="ambient relative">
          <div className="container relative z-10 py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-secondary text-sm">
              <Sparkles className="text-primary" /> Assistance 24/7 + Mode hors ligne
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-tight">
              L’app tout-en-un pour étudiants étrangers
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Guides locaux, traduction IA, lien social, carte, calendrier, FAQ et emplois – pour une intégration simple et sereine.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button variant="hero" size="lg">Créer mon compte</Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">Voir les fonctionnalités</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="container py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Fonctionnalités clés</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <article key={f.title} className="rounded-xl border bg-card p-6 shadow-elegant hover:shadow-glow transition-shadow">
                <div className="text-primary">{f.icon}</div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ia" className="container py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Conseiller IA multilingue</h2>
              <p className="mt-3 text-muted-foreground">
                Posez vos questions en 29+ langues, obtenez des traductions contextuelles académiques et des recommandations personnalisées.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>• Chatbot 24/7 (texte & voix)</li>
                <li>• Traduction de documents avec OCR</li>
                <li>• Recommandations d’événements et jobs</li>
              </ul>
              <div className="mt-6 flex gap-3">
                <Button variant="default">Essayer le chatbot</Button>
                <Button variant="secondary">Importer un document</Button>
              </div>
            </div>
            <div className="rounded-2xl border p-6 bg-card shadow-elegant">
              <div className="h-56 rounded-xl bg-gradient-primary opacity-90" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">Aperçu visuel – espace démo IA (prochaines étapes).</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-8 text-sm text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} GlobalCampus</span>
          <a href="#" className="hover:text-foreground">Politique de confidentialité</a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
