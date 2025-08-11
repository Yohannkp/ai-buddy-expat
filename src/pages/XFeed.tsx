import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

// Réactions disponibles globalement
const REACTION_SET = ['👍','🎉','💡','😮'] as const;

type Post = {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  reply_to_id: string | null;
  quoted_post_id?: string | null;
  created_at: string;
  campus?: string | null;
  city?: string | null;
  categories?: string[];
  is_event?: boolean | null;
  event_at?: string | null;
  location_name?: string | null;
  link_url?: string | null;
  promos?: string[];
  fields?: string[];
  author?: { full_name?: string | null; email?: string | null };
  like_count?: number;
  repost_count?: number;
  reply_count?: number;
  liked_by_me?: boolean;
  reposted_by_me?: boolean;
  bookmarked_by_me?: boolean;
  reactions?: Record<string, number>;
  my_reactions?: Set<string>;
};

export default function XFeed() {
  const [tab, setTab] = useState<'following'|'foryou'>('following');
  const [user, setUser] = useState<any>(null);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [feed, setFeed] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 30;
  const maxChars = 500;

  // Composer: ciblage et options avancées
  const [campus, setCampus] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isEvent, setIsEvent] = useState(false);
  const [eventAt, setEventAt] = useState(''); // ISO local string
  const [locationName, setLocationName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [promos, setPromos] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [isPoll, setIsPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Filtres
  const [filterCampus, setFilterCampus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterPromos, setFilterPromos] = useState<string[]>([]);
  const [filterFields, setFilterFields] = useState<string[]>([]);

  const CATEGORIES = ['soirée','atelier','conférence','job','sport','culture','colocation','stage','tutorat'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const canPost = useMemo(() => !!user && content.trim().length > 0 && content.length <= maxChars, [user, content]);

  const loadFollowing = async () => {
    if (!user) { setFollowingIds([]); return; }
    const { data } = await supabase.from('follows').select('followee_id').eq('follower_id', user.id);
    setFollowingIds([user.id, ...(data?.map(d => d.followee_id) || [])]);
  };

  const enrich = async (items: Post[]) => {
    const ids = items.map(p => p.id);
    const [likes, reposts, replies, reactions] = await Promise.all([
      supabase.from('post_likes').select('post_id', { count: 'exact', head: false }).in('post_id', ids),
      supabase.from('post_reposts').select('post_id', { count: 'exact', head: false }).in('post_id', ids),
      supabase.from('posts').select('reply_to_id', { count: 'exact', head: false }).in('reply_to_id', ids),
      supabase.from('post_reactions').select('post_id,emoji').in('post_id', ids)
    ]);
    const likeCounts: Record<string, number> = {};
    const repostCounts: Record<string, number> = {};
    const replyCounts: Record<string, number> = {};
    const reactionCounts: Record<string, Record<string, number>> = {};
    (likes.data || []).forEach((r: any) => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1; });
    (reposts.data || []).forEach((r: any) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
    (replies.data || []).forEach((r: any) => { if (r.reply_to_id) replyCounts[r.reply_to_id] = (replyCounts[r.reply_to_id] || 0) + 1; });
    (reactions.data || []).forEach((r: any) => {
      reactionCounts[r.post_id] = reactionCounts[r.post_id] || {};
      reactionCounts[r.post_id][r.emoji] = (reactionCounts[r.post_id][r.emoji] || 0) + 1;
    });
    let likedByMe: Set<string> = new Set();
    let repostedByMe: Set<string> = new Set();
    let bookmarkedByMe: Set<string> = new Set();
    let myReactions: Record<string, Set<string>> = {};
    if (user) {
      const [myLikes, myReposts, myBookmarks, mineReacts] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('post_reposts').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('post_reactions').select('post_id,emoji').eq('user_id', user.id).in('post_id', ids)
      ]);
      likedByMe = new Set((myLikes.data || []).map((r: any) => r.post_id));
      repostedByMe = new Set((myReposts.data || []).map((r: any) => r.post_id));
      bookmarkedByMe = new Set((myBookmarks.data || []).map((r: any) => r.post_id));
      (mineReacts.data || []).forEach((r: any) => {
        if (!myReactions[r.post_id]) myReactions[r.post_id] = new Set();
        myReactions[r.post_id].add(r.emoji);
      });
    }
    let enriched = items.map(p => ({
      ...p,
      like_count: likeCounts[p.id] || 0,
      repost_count: repostCounts[p.id] || 0,
      reply_count: replyCounts[p.id] || 0,
      liked_by_me: likedByMe.has(p.id),
      reposted_by_me: repostedByMe.has(p.id),
      bookmarked_by_me: bookmarkedByMe.has(p.id),
      reactions: reactionCounts[p.id] || {},
      my_reactions: myReactions[p.id] || new Set<string>()
    }));
    // Ranking for "Pour vous"
    if (tab === 'foryou') {
      const score = (p: Post) => {
        const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
        const recency = Math.max(0, 48 - ageHours); // decay after 48h
        return (p.like_count||0)*2 + (p.repost_count||0)*3 + (p.reply_count||0)*1 + recency*0.2;
      };
      enriched = enriched.sort((a,b)=> score(b)-score(a));
    }
    return enriched;
  };

  const loadFeed = async (reset = true) => {
    if (loading) return;
    setLoading(true);
    if (reset) setHasMore(true);
    await loadFollowing();
    const from = reset ? 0 : feed.length;
    const to = from + pageSize - 1;
    let query = supabase.from('posts').select('id,user_id,content,media_urls,reply_to_id,quoted_post_id,created_at,campus,city,categories,is_event,event_at,location_name,link_url,promos,fields, profiles: user_id (full_name,email)').order('created_at', { ascending: false }).range(from, to);
    if (tab === 'following' && followingIds.length) {
      query = query.in('user_id', followingIds as any);
    }
    // Filters
    if (filterCampus) query = query.eq('campus', filterCampus);
    if (filterCity) query = query.eq('city', filterCity);
    if (filterCategories.length) query = (query as any).overlaps('categories', filterCategories);
    if (filterPromos.length) query = (query as any).overlaps('promos', filterPromos);
    if (filterFields.length) query = (query as any).overlaps('fields', filterFields);
    const { data } = await query;
    const mapped: Post[] = (data || []).map((r: any) => ({ ...r, author: { full_name: r.profiles?.full_name, email: r.profiles?.email } }));
    const enriched = await enrich(mapped);
    setFeed(prev => reset ? enriched : [...prev, ...enriched]);
    if (!data || data.length < pageSize) setHasMore(false);
    setLoading(false);
  };

  useEffect(() => { loadFeed(true); /* eslint-disable-next-line */ }, [tab, user?.id, JSON.stringify(followingIds)]);

  useEffect(() => {
    // realtime new posts
    const ch = supabase.channel('posts_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const p: any = payload.new;
        if (tab === 'following' && followingIds.length && ![...followingIds].includes(p.user_id)) return;
        setFeed(prev => [{ ...p }, ...prev]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab, JSON.stringify(followingIds)]);

  const post = async () => {
    if (!canPost) return;
    try {
      const { data: mod } = await supabase.functions.invoke('moderate', { body: { text: content } });
      if ((mod as any)?.flagged) { alert(`Bloqué: ${(mod as any)?.reason || 'raison inconnue'}`); return; }
    } catch {}
    setPosting(true);
    let media_urls: string[] | null = null;
    if (image) {
      const path = `posts/${Date.now()}_${image.name}`;
      const { data, error } = await supabase.storage.from('media').upload(path, image);
      if (!error && data?.path) {
        const url = supabase.storage.from('media').getPublicUrl(data.path).data.publicUrl;
        media_urls = [url];
      }
    }
    // Insert post and capture ID
    const insertPayload: any = { user_id: user.id, content: content.trim(), media_urls };
    if (campus) insertPayload.campus = campus;
    if (city) insertPayload.city = city;
    if (categories.length) insertPayload.categories = categories;
    if (promos.length) insertPayload.promos = promos;
    if (fields.length) insertPayload.fields = fields;
    if (isEvent) {
      insertPayload.is_event = true;
      if (eventAt) insertPayload.event_at = new Date(eventAt).toISOString();
      if (locationName) insertPayload.location_name = locationName;
      if (linkUrl) insertPayload.link_url = linkUrl;
    }
    const inserted = await supabase.from('posts').insert(insertPayload).select('id').single();
    const postId = (inserted.data as any)?.id;
    // Store hashtags
    if (postId) {
      const tags = Array.from(new Set((content.match(/#(\w+)/g) || []).map(t=>t.slice(1).toLowerCase())));
      if (tags.length) await supabase.from('post_tags').insert(tags.map(tag=>({ post_id: postId, tag })) as any);
      if (isPoll && pollQuestion.trim() && pollOptions.filter(o=>o.trim()).length>=2) {
        const { data: poll } = await supabase.from('post_polls').insert({ post_id: postId, question: pollQuestion.trim() }).select('id').single();
        const opts = pollOptions.filter(o=>o.trim()).map(text=>({ poll_id: (poll as any).id, text }));
        if (opts.length) await supabase.from('post_poll_options').insert(opts as any);
      }
    }
    setContent(''); setImage(null); setPosting(false);
    setCampus(''); setCity(''); setCategories([]); setPromos([]); setFields([]);
    setIsEvent(false); setEventAt(''); setLocationName(''); setLinkUrl('');
    setIsPoll(false); setPollQuestion(''); setPollOptions(['','']);
    loadFeed();
  };

  const toggleLike = async (p: Post) => {
    if (!user) return;
    if (p.liked_by_me) {
      await supabase.from('post_likes').delete().eq('post_id', p.id).eq('user_id', user.id);
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, liked_by_me: false, like_count: Math.max(0, (x.like_count||1)-1) } : x));
    } else {
      await supabase.from('post_likes').insert({ post_id: p.id, user_id: user.id });
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, liked_by_me: true, like_count: (x.like_count||0)+1 } : x));
    }
  };

  const toggleRepost = async (p: Post) => {
    if (!user) return;
    if (p.reposted_by_me) {
      await supabase.from('post_reposts').delete().eq('post_id', p.id).eq('user_id', user.id);
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, reposted_by_me: false, repost_count: Math.max(0, (x.repost_count||1)-1) } : x));
    } else {
      await supabase.from('post_reposts').insert({ post_id: p.id, user_id: user.id });
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, reposted_by_me: true, repost_count: (x.repost_count||0)+1 } : x));
    }
  };

  const toggleBookmark = async (p: Post) => {
    if (!user) return;
    if (p.bookmarked_by_me) {
      await supabase.from('post_bookmarks').delete().eq('post_id', p.id).eq('user_id', user.id);
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, bookmarked_by_me: false } : x));
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: p.id, user_id: user.id });
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, bookmarked_by_me: true } : x));
    }
  };

  const toggleReaction = async (p: Post, emoji: string) => {
    if (!user) return;
    const has = p.my_reactions?.has(emoji);
    if (has) {
      await supabase.from('post_reactions').delete().eq('post_id', p.id).eq('user_id', user.id).eq('emoji', emoji);
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, my_reactions: new Set([...(x.my_reactions||new Set())].filter(e=>e!==emoji)), reactions: { ...(x.reactions||{}), [emoji]: Math.max(0, ((x.reactions||{})[emoji]||1)-1) } } : x));
    } else {
      await supabase.from('post_reactions').insert({ post_id: p.id, user_id: user.id, emoji });
      setFeed(fs => fs.map(x => x.id === p.id ? { ...x, my_reactions: new Set([...(x.my_reactions||new Set()), emoji]), reactions: { ...(x.reactions||{}), [emoji]: ((x.reactions||{})[emoji]||0)+1 } } : x));
    }
  };

  const reportPost = async (p: Post) => {
    if (!user) return;
    const reason = prompt('Pourquoi signalez-vous ce post ?');
    if (!reason) return;
    await supabase.from('post_reports').insert({ post_id: p.id, user_id: user.id, reason });
    alert('Merci pour votre signalement');
  };

  const suggestHashtags = async () => {
    if (!content.trim()) return;
    try {
      const { data } = await supabase.functions.invoke('suggest', { body: { text: content } });
      const hashtags: string[] = (data as any)?.hashtags || [];
      const current = new Set((content.match(/#(\w+)/g) || []).map(t=>t.toLowerCase()));
      const toAdd = hashtags.map(h=> h.startsWith('#')?h:`#${h}`).filter(h=>!current.has(h.toLowerCase()));
      if (toAdd.length) setContent(prev => prev + '\n' + toAdd.join(' '));
    } catch {}
  };

  const sharePost = async (p: Post) => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL || '/'}#/x/${p.id}`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'Post', url });
      else { await navigator.clipboard.writeText(url); alert('Lien copié'); }
    } catch {}
  };

  const reply = async (p: Post, text: string) => {
    if (!user || !text.trim()) return;
    try {
      const { data: mod } = await supabase.functions.invoke('moderate', { body: { text } });
      if ((mod as any)?.flagged) { alert('Réponse bloquée'); return; }
    } catch {}
    await supabase.from('posts').insert({ user_id: user.id, content: text.trim(), reply_to_id: p.id });
    setFeed(fs => fs.map(x => x.id === p.id ? { ...x, reply_count: (x.reply_count||0)+1 } : x));
  };

  const toggleFollow = async (authorId: string, follow: boolean) => {
    if (!user || user.id === authorId) return;
    if (follow) {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: authorId });
    } else {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', authorId);
    }
    loadFollowing();
    loadFeed();
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      <div className="flex gap-2 border-b">
        <button className={`flex-1 py-3 ${tab==='following'?'font-semibold border-b-2 border-primary':''}`} onClick={() => setTab('following')}>Abonnements</button>
        <button className={`flex-1 py-3 ${tab==='foryou'?'font-semibold border-b-2 border-primary':''}`} onClick={() => setTab('foryou')}>Pour vous</button>
      </div>
      <div className="p-3 border-b">
        <textarea className="w-full resize-none outline-none" placeholder="Quoi de neuf ?" maxLength={maxChars} rows={3} value={content} onChange={e=>setContent(e.target.value)} />
        <div className="flex items-center justify-between mt-2 text-sm">
          <input type="file" accept="image/*,video/*" onChange={e=>setImage(e.target.files?.[0]||null)} />
          <div className="flex items-center gap-3">
            <button className="underline" onClick={suggestHashtags}>Suggestions IA</button>
            <div className={content.length>maxChars?'text-red-500':''}>{content.length}/{maxChars}</div>
          </div>
        </div>
        {/* ciblage */}
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <input className="border rounded px-2 py-1" placeholder="Campus" value={campus} onChange={e=>setCampus(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Ville" value={city} onChange={e=>setCity(e.target.value)} />
          <input className="border rounded px-2 py-1 col-span-2" placeholder="Catégories (séparées par virgules)" value={categories.join(',')} onChange={e=>setCategories(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
          <input className="border rounded px-2 py-1" placeholder="Promos (ex: L1,L2)" value={promos.join(',')} onChange={e=>setPromos(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
          <input className="border rounded px-2 py-1" placeholder="Filières (ex: Info, eco)" value={fields.join(',')} onChange={e=>setFields(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
        </div>
        {/* événement */}
        <div className="mt-2 text-sm flex flex-col gap-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isEvent} onChange={e=>setIsEvent(e.target.checked)} /> C'est un évènement</label>
          {isEvent && (
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-2 py-1" type="datetime-local" value={eventAt} onChange={e=>setEventAt(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Lieu" value={locationName} onChange={e=>setLocationName(e.target.value)} />
              <input className="border rounded px-2 py-1 col-span-2" placeholder="Lien (inscription / infos)" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} />
            </div>
          )}
        </div>
        {/* sondage */}
        <div className="mt-2 text-sm flex flex-col gap-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isPoll} onChange={e=>setIsPoll(e.target.checked)} /> Ajouter un sondage</label>
          {isPoll && (
            <div className="flex flex-col gap-2">
              <input className="border rounded px-2 py-1" placeholder="Question" value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} />
              {pollOptions.map((opt, i)=> (
                <div key={i} className="flex gap-2 items-center">
                  <input className="border rounded px-2 py-1 flex-1" placeholder={`Option ${i+1}`} value={opt} onChange={e=>setPollOptions(arr=>{ const a=[...arr]; a[i]=e.target.value; return a; })} />
                  {pollOptions.length>2 && <button className="text-xs underline" onClick={()=>setPollOptions(arr=>arr.filter((_,idx)=>idx!==i))}>Supprimer</button>}
                </div>
              ))}
              {pollOptions.length<4 && <button className="text-xs underline self-start" onClick={()=>setPollOptions(arr=>[...arr, ''])}>Ajouter une option</button>}
            </div>
          )}
        </div>
        <div className="text-right mt-2"><button disabled={!canPost || posting} className="bg-primary text-white px-4 py-2 rounded" onClick={post}>{posting? 'Publication…':'Publier'}</button></div>
      </div>
      {/* Filtres */}
      <div className="p-3 border-b text-sm grid grid-cols-2 gap-2">
        <input className="border rounded px-2 py-1" placeholder="Filtrer campus" value={filterCampus} onChange={e=>setFilterCampus(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder="Filtrer ville" value={filterCity} onChange={e=>setFilterCity(e.target.value)} />
        <input className="border rounded px-2 py-1 col-span-2" placeholder="Filtrer catégories (virgules)" value={filterCategories.join(',')} onChange={e=>setFilterCategories(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
        <input className="border rounded px-2 py-1" placeholder="Filtrer promos" value={filterPromos.join(',')} onChange={e=>setFilterPromos(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
        <input className="border rounded px-2 py-1" placeholder="Filtrer filières" value={filterFields.join(',')} onChange={e=>setFilterFields(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
        <button className="col-span-2 border rounded px-2 py-1" onClick={()=>loadFeed(true)}>Appliquer les filtres</button>
      </div>
      <div>
        {feed.map(p => (
          <PostItem key={p.id} p={p} onLike={()=>toggleLike(p)} onRepost={()=>toggleRepost(p)} onBookmark={()=>toggleBookmark(p)} onShare={()=>sharePost(p)} onReply={(t)=>reply(p,t)} onFollow={(f)=>toggleFollow(p.user_id, f)} onReact={(e)=>toggleReaction(p,e)} onReport={()=>reportPost(p)} meId={user?.id} />
        ))}
        <div className="p-3 text-center">
          {hasMore ? <button className="px-4 py-2 border rounded" disabled={loading} onClick={()=>loadFeed(false)}>{loading? 'Chargement…':'Voir plus'}</button> : <span className="text-sm text-muted-foreground">Fin du fil</span>}
        </div>
      </div>
    </div>
  );
}

function linkify(text: string) {
  // very light linkify for hashtags and mentions
  return text
    .replace(/(https?:\/\/\S+)/g, '<a class="underline" target="_blank" rel="noopener" href="$1">$1<\/a>')
    .replace(/#(\w+)/g, '<a class="underline" href="#/x?q=%23$1">#$1<\/a>')
    .replace(/@(\w+)/g, '<a class="underline" href="#/x?q=@$1">@$1<\/a>');
}

function PostItem({ p, onLike, onRepost, onBookmark, onShare, onReply, onFollow, onReact, onReport, meId }: { p: Post; onLike: ()=>void; onRepost: ()=>void; onBookmark: ()=>void; onShare: ()=>void; onReply: (t:string)=>void; onFollow:(follow:boolean)=>void; onReact:(emoji:string)=>void; onReport:()=>void; meId?: string }){
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [translated, setTranslated] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const authorName = p.author?.full_name || p.author?.email || 'Utilisateur';
  const isMe = meId === p.user_id;
  const addToCalendar = () => {
    if (!p.event_at) return;
    const start = new Date(p.event_at);
    const end = new Date(start.getTime() + 2*60*60*1000);
    const title = (p.content || '').slice(0, 60);
    const details = p.link_url || '';
    const loc = p.location_name || '';
    // Google Calendar link
    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}/${end.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(loc)}`;
    window.open(gUrl, '_blank');
  };
  const downloadIcs = () => {
    if (!p.event_at) return;
    const start = new Date(p.event_at);
    const end = new Date(start.getTime() + 2*60*60*1000);
    const title = (p.content || '').slice(0, 60);
    const details = p.link_url || '';
    const loc = p.location_name || '';
    const dt = (d:Date)=> d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${dt(start)}\nDTEND:${dt(end)}\nSUMMARY:${title}\nDESCRIPTION:${details}\nLOCATION:${loc}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'event.ics'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  }
  const translate = async () => {
    const target = (navigator.language || 'en').split('-')[0];
    const { data } = await supabase.functions.invoke('translate', { body: { text: p.content, target_lang: target } });
    setTranslated((data as any)?.translated || '');
  };
  const summarize = async () => {
    const { data } = await supabase.functions.invoke('summarize', { body: { text: p.content } });
    setSummary((data as any)?.summary || '');
  };
  const isVideo = (u?: string) => !!u && /(\.mp4|\.webm|\.ogg)$/i.test(u);
  return (
    <div className="p-3 border-b">
      <div className="flex justify-between items-center">
        <div className="font-medium">{authorName}</div>
        <div className="flex items-center gap-3">
          {!isMe && <button className="text-xs underline" onClick={()=>onFollow(true)}>Suivre</button>}
          <button className="text-xs underline" onClick={onReport}>Signaler</button>
        </div>
      </div>
  <div className="whitespace-pre-wrap mt-1 text-sm" dangerouslySetInnerHTML={{ __html: linkify(p.content) }} />
  {p.quoted_post_id && <div className="mt-2 border rounded p-2 text-xs text-muted-foreground">Post cité: {p.quoted_post_id}</div>}
      {p.media_urls?.[0] && (
        isVideo(p.media_urls[0])
          ? <video className="mt-2 rounded" controls src={p.media_urls[0]} />
          : <img src={p.media_urls[0]} alt="media" className="mt-2 rounded" />
      )}
      {(p.is_event && p.event_at) && (
        <div className="mt-2 text-xs flex gap-3 items-center">
          <span className="font-medium">Evènement:</span>
          <span>{new Date(p.event_at).toLocaleString()}</span>
          {p.location_name && <span>• {p.location_name}</span>}
          <button className="underline" onClick={addToCalendar}>Google</button>
          <button className="underline" onClick={downloadIcs}>iCal</button>
        </div>
      )}
      {(p.campus || p.city || (p.categories && p.categories.length)) && (
        <div className="mt-1 text-xs text-muted-foreground">
          {p.campus && <span>Campus: {p.campus} • </span>}
          {p.city && <span>Ville: {p.city} • </span>}
          {p.categories && p.categories.length>0 && <span>Catégories: {p.categories.join(', ')}</span>}
        </div>
      )}
      <div className="flex gap-4 text-sm mt-2">
        <button onClick={()=>setReplyOpen(v=>!v)}>💬 {p.reply_count||0}</button>
        <button onClick={onRepost}>{p.reposted_by_me?'🔁':'🔄'} {p.repost_count||0}</button>
        <button onClick={onLike}>{p.liked_by_me?'❤️':'🤍'} {p.like_count||0}</button>
        <button onClick={onBookmark}>{p.bookmarked_by_me ? '🔖' : '📑'}</button>
        <button onClick={onShare}>↗️</button>
      </div>
      <div className="flex gap-2 text-lg mt-2">
        {REACTION_SET.map(e => (
          <button key={e} className={`${p.my_reactions?.has(e)?'':'opacity-60'}`} onClick={()=>onReact(e)}>
            {e} <span className="text-xs">{(p.reactions||{})[e]||0}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        <button className="underline" onClick={translate}>Traduire</button>
        <button className="underline" onClick={summarize}>Résumé</button>
        {p.link_url && <a className="underline" href={p.link_url} target="_blank" rel="noopener">Lien</a>}
      </div>
      {translated && <div className="mt-2 text-sm bg-muted p-2 rounded">{translated}</div>}
      {summary && <div className="mt-2 text-sm bg-muted p-2 rounded">{summary}</div>}
      {/* sondage display */}
      <PollBlock postId={p.id} />
      {replyOpen && (
        <div className="mt-2 flex gap-2">
          <input className="flex-1 border rounded px-2" value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Répondre…" />
          <button className="px-3 py-1 border rounded" onClick={()=>{ onReply(replyText); setReplyText(''); setReplyOpen(false); }}>Envoyer</button>
        </div>
      )}
      {!replyOpen && <button className="text-xs underline mt-2" onClick={()=>setReplyOpen(true)}>Répondre</button>}
    </div>
  );
}

function PollBlock({ postId }: { postId: string }){
  const [poll, setPoll] = useState<any | null>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      setLoading(true);
      const { data: p } = await supabase.from('post_polls').select('id,question').eq('post_id', postId).maybeSingle();
      if (!mounted) return;
      if (!p) { setLoading(false); return; }
      setPoll(p);
      const { data: opts } = await supabase.from('post_poll_options').select('id,text').eq('poll_id', (p as any).id);
      if (!mounted) return;
      setOptions(opts||[]);
      const { data: v } = await supabase.from('post_poll_votes').select('option_id').eq('poll_id', (p as any).id);
      const counts: Record<string, number> = {};
      (v||[]).forEach((r:any)=>{ counts[r.option_id] = (counts[r.option_id]||0)+1; });
      setVotes(counts);
      setLoading(false);
    })();
    return ()=>{ mounted=false };
  }, [postId]);
  const total = Object.values(votes).reduce((a,b)=>a+b,0);
  const vote = async (optionId: string) => {
    await supabase.from('post_poll_votes').insert({ poll_id: poll.id, option_id: optionId });
    setVotes(v=>({ ...v, [optionId]: (v[optionId]||0)+1 }));
    setHasVoted(true);
  };
  if (loading || !poll) return null;
  return (
    <div className="mt-3 border rounded p-2 text-sm">
      <div className="font-medium mb-2">🗳️ {poll.question}</div>
      <div className="flex flex-col gap-2">
        {options.map((o:any)=>{
          const count = votes[o.id]||0; const pct = total? Math.round(100*count/total):0;
          return (
            <button key={o.id} onClick={()=>vote(o.id)} className="text-left border rounded px-2 py-1 relative">
              <span>{o.text}</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">{pct}% ({count})</span>
              <span className="block h-1 bg-primary/30 rounded mt-1" style={{ width: `${pct}%` }} />
            </button>
          );
        })}
      </div>
      {hasVoted && <div className="text-xs text-muted-foreground mt-1">Merci pour votre vote</div>}
    </div>
  );
}
