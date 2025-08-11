import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import type { Database } from "@/integrations/supabase/types";
type EventPost = Database["public"]["Tables"]["events"]["Row"] & { author_name?: string };

const getUserName = (user: any) => user?.user_metadata?.full_name || user?.email || "Utilisateur";

const SocialFeed = () => {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "événement",
    tags: "",
    image: null as File | null,
    video: null as File | null,
    seats: "",
  co_organizers: "",
  poll_question: "",
  poll_options: "",
  lat: "",
  lng: ""
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, { content: string; parent_id?: string | null }>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userReactions, setUserReactions] = useState<Record<string, Set<string>>>({});
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({});
  const [trans, setTrans] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const targetLang = useMemo(() => (typeof navigator !== 'undefined' ? (navigator.language?.split('-')[0] || 'en') : 'en'), []);

  // Lier les setters pour le préchargement asynchrone
  useEffect(() => {
    (window as any).__setLikes = (likesCount: Record<string, number>, likedByUser: Record<string, boolean>) => {
      setLikes(likesCount);
      setLiked(likedByUser);
    };
    (window as any).__setReactions = (re: Record<string, Record<string, number>>, my: Record<string, Set<string>>) => {
      setReactions(re);
      setUserReactions(my);
    };
    (window as any).__setRegistrations = (reg: Record<string, boolean>) => {
      setRegistrations(reg);
    };
    return () => {
      delete (window as any).__setLikes;
      delete (window as any).__setReactions;
      delete (window as any).__setRegistrations;
    };
  }, []);

  // Actions
  const toggleLike = async (event_id: string) => {
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    if (liked[event_id]) {
      await supabase.from('likes').delete().eq('event_id', event_id).eq('user_id', u.id);
      setLiked((p) => ({ ...p, [event_id]: false }));
      setLikes((p) => ({ ...p, [event_id]: Math.max(0, (p[event_id] || 1) - 1) }));
    } else {
      await supabase.from('likes').insert({ event_id, user_id: u.id });
      setLiked((p) => ({ ...p, [event_id]: true }));
      setLikes((p) => ({ ...p, [event_id]: (p[event_id] || 0) + 1 }));
  try { await supabase.rpc('increment_points', { delta: 1 }); } catch {}
    }
  };
  const toggleComments = (event_id: string) => setCommentsOpen((p) => ({ ...p, [event_id]: !p[event_id] }));
  const loadComments = async (event_id: string) => {
    const { data } = await supabase.from('comments').select('*').eq('event_id', event_id).order('created_at');
    setComments((p) => ({ ...p, [event_id]: data || [] }));
  };
  const submitComment = async (event_id: string) => {
    const u = (await supabase.auth.getUser()).data.user; if (!u) return;
    const d = commentDraft[event_id]; if (!d?.content?.trim()) return;
    // Modération AI sur le commentaire
    try {
      const { data: mod } = await supabase.functions.invoke('moderate', {
        body: { text: d.content.trim() }
      });
      if ((mod as any)?.flagged) {
        alert(`Votre commentaire a été bloqué: ${(mod as any)?.reason || 'raison inconnue'}`);
        return;
      }
    } catch {}
    await supabase.from('comments').insert({ event_id, user_id: u.id, content: d.content.trim(), parent_id: d.parent_id || null });
    setCommentDraft((p) => ({ ...p, [event_id]: { content: '', parent_id: null } }));
    await loadComments(event_id);
  try { await supabase.rpc('increment_points', { delta: 2 }); } catch {}
  };
  const toggleReaction = async (event_id: string, emoji: string) => {
    const u = (await supabase.auth.getUser()).data.user; if (!u) return;
    const has = userReactions[event_id]?.has(emoji);
    if (has) {
      await supabase.from('reactions').delete().eq('event_id', event_id).eq('user_id', u.id).eq('emoji', emoji);
      setUserReactions((p) => {
        const s = new Set(p[event_id] || []);
        s.delete(emoji);
        return { ...p, [event_id]: s };
      });
      setReactions((p) => ({ ...p, [event_id]: { ...(p[event_id] || {}), [emoji]: Math.max(0, ((p[event_id]?.[emoji] || 1) - 1)) } }));
    } else {
      await supabase.from('reactions').insert({ event_id, user_id: u.id, emoji });
      setUserReactions((p) => {
        const s = new Set(p[event_id] || []);
        s.add(emoji);
        return { ...p, [event_id]: s };
      });
      setReactions((p) => ({ ...p, [event_id]: { ...(p[event_id] || {}), [emoji]: ((p[event_id]?.[emoji] || 0) + 1) } }));
    }
  };
  const registerToEvent = async (event_id: string) => {
    const { data } = await supabase.rpc('safe_register', { event_id });
    if (data?.[0]?.success) {
      setRegistrations((p) => ({ ...p, [event_id]: true }));
      // Optimistic seats_taken update
      setPosts((ps) => ps.map((p) => p.id === event_id ? { ...p, seats_taken: (p.seats_taken || 0) + 1 } : p));
      try { await supabase.rpc('increment_points', { delta: 3 }); } catch {}
    }
  };
  const cancelRegistration = async (event_id: string) => {
    const { data } = await supabase.rpc('safe_cancel_register', { event_id });
    if (data?.[0]?.success) {
      setRegistrations((p) => ({ ...p, [event_id]: false }));
      setPosts((ps) => ps.map((p) => p.id === event_id ? { ...p, seats_taken: Math.max(0, (p.seats_taken || 0) - 1) } : p));
    }
  };
  const repostEvent = async (post: EventPost) => {
    const u = (await supabase.auth.getUser()).data.user; if (!u) return;
    await supabase.from('events').insert({
      title: `Partage: ${post.title}`,
      description: `${post.description}\n\nLien: ${window.location.origin}/social?post=${post.id}`,
      date: post.date,
      location: post.location,
      user_id: u.id,
      category: 'partage',
      tags: post.tags || []
    });
    try { await supabase.rpc('increment_points', { delta: 2 }); } catch {}
  };
  const translatePost = async (event_id: string, text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { text, target_lang: targetLang }
      });
      if (!error && (data as any)?.translated) {
        setTrans((p) => ({ ...p, [event_id]: (data as any).translated }));
      }
    } catch {}
  };
  const sharePost = async (event_id: string) => {
    try {
      const url = `${window.location.origin}/social?post=${event_id}`;
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Événement', url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papiers');
      }
    } catch {}
  };

  // Récupérer la session utilisateur
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  // Charger les événements depuis Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles: user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = data.map((e: any) => ({ ...e, author_name: e.profiles?.full_name || e.profiles?.email || "Utilisateur" }));
        setPosts(mapped);
        await Promise.all([
          preloadLikes(mapped),
          preloadReactions(mapped),
          preloadRegistrations(mapped)
        ]);
      }
      setLoading(false);
    };
    fetchEvents();
    // Optionnel : abonnement temps réel
    const sub = supabase.channel('events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    if (name === "image" && files) setForm(f => ({ ...f, image: files[0] }));
    else if (name === "video" && files) setForm(f => ({ ...f, video: files[0] }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.description || !form.date || !form.location || !form.category) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (!user) {
      setError("Vous devez être connecté pour publier un événement.");
      return;
    }
    // Modération AI avant publication
    try {
      const { data: mod } = await supabase.functions.invoke('moderate', {
        body: { text: `${form.title}\n\n${form.description}` }
      });
      if ((mod as any)?.flagged) {
        setError(`Contenu refusé par la modération: ${(mod as any)?.reason || 'raison inconnue'}`);
        return;
      }
    } catch {}
    setLoading(true);
    let image_url = null;
    let video_url = null;
    if (form.image) {
      setUploading(true);
      const { data, error } = await supabase.storage.from("media").upload(`images/${Date.now()}_${form.image.name}`, form.image);
      setUploading(false);
      if (error) setError(error.message);
      else image_url = data?.path ? supabase.storage.from("media").getPublicUrl(data.path).data.publicUrl : null;
    }
    if (form.video) {
      setUploading(true);
      const { data, error } = await supabase.storage.from("media").upload(`videos/${Date.now()}_${form.video.name}`, form.video);
      setUploading(false);
      if (error) setError(error.message);
      else video_url = data?.path ? supabase.storage.from("media").getPublicUrl(data.path).data.publicUrl : null;
    }
    const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const coorgArr = form.co_organizers.split(",").map((t) => t.trim()).filter(Boolean);
  const seatsNum = form.seats ? parseInt(form.seats, 10) : null;
  const latNum = (form as any).lat ? parseFloat((form as any).lat) : null;
  const lngNum = (form as any).lng ? parseFloat((form as any).lng) : null;
    const { data: inserted, error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description,
      date: form.date,
      location: form.location,
      user_id: user.id,
      image_url,
      video_url,
      category: form.category,
      tags: tagsArr,
      seats: seatsNum,
  co_organizers: coorgArr.length ? coorgArr : null,
  lat: latNum,
  lng: lngNum
    }).select('id').single();
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      if (inserted?.id && form.poll_question && form.poll_options) {
        const options = form.poll_options.split(',').map((t) => t.trim()).filter(Boolean);
        const { data: poll, error: pollErr } = await supabase.from('polls').insert({ event_id: inserted.id, question: form.poll_question }).select('id').single();
        if (!pollErr && poll?.id && options.length) {
          await supabase.from('poll_options').insert(options.map((text) => ({ poll_id: poll.id, text })));
        }
      }
  setForm({ title: "", description: "", date: "", location: "", category: "événement", tags: "", image: null, video: null, seats: "", co_organizers: "", poll_question: "", poll_options: "", lat: "", lng: "" });
  try { await supabase.rpc('increment_points', { delta: 5 }); } catch {}
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-6">Fil d’actualités étudiants</h1>
        <p className="mb-4">Vous devez être connecté pour publier ou voir les événements.</p>
        <button className="bg-primary text-white px-4 py-2 rounded" onClick={() => navigate("/login")}>Se connecter</button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fil d’actualités étudiants</h1>
        <button className="text-sm text-muted-foreground underline" onClick={handleLogout}>Se déconnecter</button>
      </div>
      <form onSubmit={handleSubmit} className="mb-8 space-y-3 bg-muted p-4 rounded-lg" encType="multipart/form-data">
        <input
          className="w-full border rounded px-3 py-2"
          name="title"
          placeholder="Titre du post ou événement"
          value={form.title}
          onChange={handleChange}
        />
        <textarea
          className="w-full border rounded px-3 py-2"
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
          />
          <input
            className="border rounded px-3 py-2 flex-1"
            name="location"
            placeholder="Lieu"
            value={form.location}
            onChange={handleChange}
          />
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            name="poll_question"
            placeholder="Question de sondage (optionnel)"
            value={form.poll_question}
            onChange={handleChange}
          />
          <input
            className="border rounded px-3 py-2 flex-1"
            name="poll_options"
            placeholder="Options (séparées par virgule)"
            value={form.poll_options}
            onChange={handleChange}
          />
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            name="lat"
            type="number"
            step="any"
            placeholder="Latitude (optionnel)"
            value={(form as any).lat || ""}
            onChange={handleChange}
          />
          <input
            className="border rounded px-3 py-2 flex-1"
            name="lng"
            type="number"
            step="any"
            placeholder="Longitude (optionnel)"
            value={(form as any).lng || ""}
            onChange={handleChange}
          />
        </div>
        <div className="flex gap-2">
          <select name="category" className="border rounded px-3 py-2 flex-1" value={form.category} onChange={handleChange}>
            <option value="événement">Événement</option>
            <option value="bons plans">Bons plans</option>
            <option value="logement">Logement</option>
            <option value="entraide">Entraide scolaire</option>
            <option value="sorties">Sorties</option>
            <option value="autre">Autre</option>
          </select>
          <input
            className="border rounded px-3 py-2 flex-1"
            name="tags"
            placeholder="Tags (ex: #cours, #loisirs) séparés par virgule"
            value={form.tags}
            onChange={handleChange}
          />
        </div>
        <div className="flex gap-2">
          <input type="file" name="image" accept="image/*" onChange={handleChange} className="flex-1" />
          <input type="file" name="video" accept="video/*" onChange={handleChange} className="flex-1" />
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            name="seats"
            type="number"
            min="1"
            placeholder="Nombre de places (optionnel)"
            value={form.seats}
            onChange={handleChange}
          />
          <input
            className="border rounded px-3 py-2 flex-1"
            name="co_organizers"
            placeholder="Co-organisateurs (emails, virgule)"
            value={form.co_organizers}
            onChange={handleChange}
          />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded" disabled={loading || uploading}>{loading || uploading ? "Publication..." : "Publier"}</button>
      </form>
      <div className="space-y-4">
        {loading && <div>Chargement...</div>}
        {posts.map(post => (
          <div key={post.id} className="border rounded-lg p-4 bg-card shadow">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold">{post.title}</span>
              <span className="text-xs text-muted-foreground">{post.date}</span>
            </div>
            <div className="text-xs mb-1 text-muted-foreground">Catégorie : {post.category} | Tags : {post.tags?.join(", ")}</div>
            <div className="text-sm mb-2">
              {trans[post.id] || post.description}
              <button className="ml-2 text-xs underline" onClick={() => translatePost(post.id, post.description)}>Traduire</button>
            </div>
            {post.image_url && <img src={post.image_url} alt="illustration" className="max-h-48 rounded mb-2" />}
            {post.video_url && <video src={post.video_url} controls className="max-h-48 rounded mb-2 w-full" />}
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{post.location}</span>
              <span>par {post.author_name || "Utilisateur"}</span>
            </div>
            {post.seats && <div className="text-xs mt-1">Places : {post.seats}{typeof post.seats_taken === 'number' ? ` | Réservées: ${post.seats_taken}` : ''}</div>}
            {post.co_organizers && post.co_organizers.length > 0 && (
              <div className="text-xs mt-1">Co-organisateurs : {post.co_organizers.join(", ")}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 items-center text-sm">
              <button className="px-2 py-1 border rounded" onClick={() => toggleLike(post.id)}>
                {liked[post.id] ? '❤️ Unlike' : '🤍 Like'} ({likes[post.id] ?? 0})
              </button>
              <button className="px-2 py-1 border rounded" onClick={() => toggleComments(post.id)}>
                💬 Commentaires
              </button>
              <div className="flex items-center gap-1">
                {['👍','🔥','🎉','😂','😮'].map((e) => (
                  <button key={e} className={`px-2 py-1 border rounded ${userReactions[post.id]?.has(e) ? 'bg-muted-foreground/10' : ''}`} onClick={() => toggleReaction(post.id, e)}>
                    {e} {reactions[post.id]?.[e] ?? 0}
                  </button>
                ))}
              </div>
              <button className="px-2 py-1 border rounded" onClick={() => sharePost(post.id)}>Partager</button>
              <button className="px-2 py-1 border rounded" onClick={() => repostEvent(post)}>Reposter</button>
              <ReportButton target_type="event" target_id={post.id} />
              {post.seats ? (
                registrations[post.id] ? (
                  <button className="px-2 py-1 border rounded" onClick={() => cancelRegistration(post.id)}>Se désinscrire</button>
                ) : (
                  <button className="px-2 py-1 border rounded" disabled={typeof post.seats_taken === 'number' && post.seats_taken >= (post.seats || 0)} onClick={() => registerToEvent(post.id)}>
                    S'inscrire
                  </button>
                )
              ) : null}
            </div>
            <Poll eventId={post.id} userId={user?.id} />
            {commentsOpen[post.id] && (
              <div className="mt-3 border-t pt-3">
                <CommentThread
                  eventId={post.id}
                  comments={comments[post.id] || []}
                  onLoad={() => loadComments(post.id)}
                  draft={commentDraft[post.id] || { content: '', parent_id: null }}
                  onDraftChange={(d: any) => setCommentDraft((prev) => ({ ...prev, [post.id]: d }))}
                  onSubmit={() => submitComment(post.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialFeed;

// Helpers en dehors du composant principal
async function preloadLikes(items: EventPost[]) {
  const ids = items.map((p) => p.id);
  const likesCount: Record<string, number> = {};
  const likedByUser: Record<string, boolean> = {};
  const user = (await supabase.auth.getUser()).data.user;
  await Promise.all(ids.map(async (id) => {
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('event_id', id);
    likesCount[id] = count || 0;
    if (user) {
      const { data: l } = await supabase.from('likes').select('id').eq('event_id', id).eq('user_id', user.id).maybeSingle();
      likedByUser[id] = !!l;
    }
  }));
  (window as any).__setLikes?.(likesCount, likedByUser);
}

// Sondage et commentaires
const Poll = ({ eventId, userId }: { eventId: string; userId?: string }) => {
  const [poll, setPoll] = useState<any | null>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [vote, setVote] = useState<string | null>(null);
  const load = async () => {
    const { data: p } = await supabase.from('polls').select('*').eq('event_id', eventId).maybeSingle();
    if (!p) { setPoll(null); setOptions([]); return; }
    setPoll(p);
    const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', p.id);
    setOptions(opts || []);
    if (userId) {
      const { data: v } = await supabase.from('poll_votes').select('*').eq('poll_id', p.id).eq('user_id', userId).maybeSingle();
      setVote(v?.option_id || null);
    }
  };
  useEffect(() => { load(); }, [eventId, userId]);
  const cast = async (option_id: string) => {
    if (!userId || !poll) return;
    await supabase.from('poll_votes').upsert({ poll_id: poll.id, option_id, user_id: userId });
    setVote(option_id);
  };
  if (!poll) return null;
  return (
    <div className="mt-3 border rounded p-2">
      <div className="font-medium text-sm mb-2">🗳️ {poll.question}</div>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => cast(o.id)} className={`px-2 py-1 border rounded text-left ${vote === o.id ? 'bg-primary/10' : ''}`}>{o.text}</button>
        ))}
      </div>
    </div>
  );
};

const CommentThread = ({ eventId, comments, onLoad, draft, onDraftChange, onSubmit }: any) => {
  useEffect(() => { onLoad(); }, [eventId]);
  const tree = buildTree(comments);
  return (
    <div>
      <div className="mb-2 text-sm font-medium">Commentaires</div>
      <CommentList nodes={tree} onReply={(parent_id: string) => onDraftChange({ ...draft, parent_id })} />
      <div className="mt-2 flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" placeholder={draft.parent_id ? 'Répondre...' : 'Ajouter un commentaire...'} value={draft.content} onChange={(e) => onDraftChange({ ...draft, content: e.target.value })} />
        <button className="px-3 py-2 bg-primary text-white rounded" onClick={onSubmit} disabled={!draft.content.trim()}>Envoyer</button>
      </div>
    </div>
  );
};

const CommentList = ({ nodes, onReply }: any) => (
  <ul className="space-y-2">
    {nodes.map((n: any) => (
      <li key={n.id} className="border rounded p-2">
        <div className="text-sm">{n.content}</div>
        <div className="text-xs text-muted-foreground mt-1 flex gap-2">
          <button className="underline" onClick={() => onReply(n.id)}>Répondre</button>
          <ReportButton target_type="comment" target_id={n.id} />
        </div>
        {n.children?.length ? <div className="ml-4 mt-2"><CommentList nodes={n.children} onReply={onReply} /></div> : null}
      </li>
    ))}
  </ul>
);

const ReportButton = ({ target_type, target_id }: { target_type: 'event' | 'comment'; target_id: string }) => (
  <button
    className="underline"
    onClick={async () => {
      try {
        await supabase.from('reports').insert({ target_type, target_id, user_id: (await supabase.auth.getUser()).data.user?.id, reason: 'Inapproprié' });
        alert('Merci pour votre signalement');
      } catch {}
    }}
  >
    Signaler
  </button>
);

function buildTree(list: any[]) {
  const map: Record<string, any> = {};
  list.forEach((c) => (map[c.id] = { ...c, children: [] }));
  const roots: any[] = [];
  list.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
    else roots.push(map[c.id]);
  });
  return roots;
}

async function preloadReactions(items: EventPost[]) {
  const ids = items.map((p) => p.id);
  const reactions: Record<string, Record<string, number>> = {};
  const userReactions: Record<string, Set<string>> = {};
  const user = (await supabase.auth.getUser()).data.user;
  await Promise.all(ids.map(async (id) => {
    const { data } = await supabase.from('reactions').select('*').eq('event_id', id);
    const map: Record<string, number> = {};
    const my = new Set<string>();
    (data || []).forEach((r) => {
      map[r.emoji] = (map[r.emoji] || 0) + 1;
      if (user && r.user_id === user.id) my.add(r.emoji);
    });
    reactions[id] = map; userReactions[id] = my;
  }));
  (window as any).__setReactions?.(reactions, userReactions);
}

async function preloadRegistrations(items: EventPost[]) {
  const ids = items.map((p) => p.id);
  const reg: Record<string, boolean> = {};
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await Promise.all(ids.map(async (id) => {
    const { data } = await supabase.from('registrations').select('*').eq('event_id', id).eq('user_id', user.id).eq('status','registered').maybeSingle();
    reg[id] = !!data;
  }));
  (window as any).__setRegistrations?.(reg);
}
