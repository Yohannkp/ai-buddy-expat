const Rules = () => (
  <div className="container py-10 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold mb-4">Règles de la communauté</h1>
    <ul className="list-disc ml-6 space-y-2">
      <li>Respect et bienveillance envers tous.</li>
      <li>Pas de propos haineux, harcèlement, ni spam.</li>
      <li>Pas d’arnaques ni de contenu illégal.</li>
      <li>Publiez dans la bonne catégorie et utilisez des tags pertinents.</li>
      <li>Les organisateurs d’événements s’engagent à donner des informations exactes.</li>
    </ul>
    <p className="mt-4 text-muted-foreground text-sm">La modération peut retirer tout contenu non conforme et suspendre les comptes récidivistes.</p>
  </div>
);

export default Rules;
