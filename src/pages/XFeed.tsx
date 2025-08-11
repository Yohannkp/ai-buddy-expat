import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

type Post = {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  reply_to_id: string | null;
  quoted_post_id?: string | null;
  created_at: string;
  author?: { full_name?: string | null; email?: string | null };
  like_count?: number;
  repost_count?: number;
  reply_count?: number;
  liked_by_me?: boolean;
  reposted_by_me?: boolean;
  bookmarked_by_me?: boolean;
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
  const maxChars = 280;

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
    const [likes, reposts, replies] = await Promise.all([
      supabase.from('post_likes').select('post_id', { count: 'exact', head: false }).in('post_id', ids),
      supabase.from('post_reposts').select('post_id', { count: 'exact', head: false }).in('post_id', ids),
      supabase.from('posts').select('reply_to_id', { count: 'exact', head: false }).in('reply_to_id', ids)
    ]);
    const likeCounts: Record<string, number> = {};
    const repostCounts: Record<string, number> = {};
    const replyCounts: Record<string, number> = {};
    (likes.data || []).forEach((r: any) => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1; });
    (reposts.data || []).forEach((r: any) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
    (replies.data || []).forEach((r: any) => { if (r.reply_to_id) replyCounts[r.reply_to_id] = (replyCounts[r.reply_to_id] || 0) + 1; });
    let likedByMe: Set<string> = new Set();
    let repostedByMe: Set<string> = new Set();
    let bookmarkedByMe: Set<string> = new Set();
    if (user) {
      const [myLikes, myReposts, myBookmarks] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('post_reposts').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', ids)
      ]);
      likedByMe = new Set((myLikes.data || []).map((r: any) => r.post_id));
      repostedByMe = new Set((myReposts.data || []).map((r: any) => r.post_id));
      bookmarkedByMe = new Set((myBookmarks.data || []).map((r: any) => r.post_id));
    }
    return items.map(p => ({
      ...p,
      like_count: likeCounts[p.id] || 0,
      repost_count: repostCounts[p.id] || 0,
      reply_count: replyCounts[p.id] || 0,
      liked_by_me: likedByMe.has(p.id),
      reposted_by_me: repostedByMe.has(p.id),
      bookmarked_by_me: bookmarkedByMe.has(p.id)
    }));
  };

  const loadFeed = async (reset = true) => {
    if (loading) return;
    setLoading(true);
    if (reset) setHasMore(true);
    await loadFollowing();
    const from = reset ? 0 : feed.length;
    const to = from + pageSize - 1;
    let query = supabase.from('posts').select('id,user_id,content,media_urls,reply_to_id,quoted_post_id,created_at, profiles: user_id (full_name,email)').order('created_at', { ascending: false }).range(from, to);
    if (tab === 'following' && followingIds.length) {
      query = query.in('user_id', followingIds as any);
    }
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
    await supabase.from('posts').insert({ user_id: user.id, content: content.trim(), media_urls });
    setContent(''); setImage(null); setPosting(false);
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
          <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]||null)} />
          <div className={content.length>maxChars?'text-red-500':''}>{content.length}/{maxChars}</div>
        </div>
        <div className="text-right mt-2"><button disabled={!canPost || posting} className="bg-primary text-white px-4 py-2 rounded" onClick={post}>{posting? 'Publication…':'Publier'}</button></div>
      </div>
      <div>
        {feed.map(p => (
          <PostItem key={p.id} p={p} onLike={()=>toggleLike(p)} onRepost={()=>toggleRepost(p)} onBookmark={()=>toggleBookmark(p)} onShare={()=>sharePost(p)} onReply={(t)=>reply(p,t)} onFollow={(f)=>toggleFollow(p.user_id, f)} meId={user?.id} />
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

function PostItem({ p, onLike, onRepost, onBookmark, onShare, onReply, onFollow, meId }: { p: Post; onLike: ()=>void; onRepost: ()=>void; onBookmark: ()=>void; onShare: ()=>void; onReply: (t:string)=>void; onFollow:(follow:boolean)=>void; meId?: string }){
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const authorName = p.author?.full_name || p.author?.email || 'Utilisateur';
  const isMe = meId === p.user_id;
  return (
    <div className="p-3 border-b">
      <div className="flex justify-between items-center">
        <div className="font-medium">{authorName}</div>
        {!isMe && <button className="text-xs underline" onClick={()=>onFollow(true)}>Suivre</button>}
      </div>
  <div className="whitespace-pre-wrap mt-1 text-sm" dangerouslySetInnerHTML={{ __html: linkify(p.content) }} />
  {p.quoted_post_id && <div className="mt-2 border rounded p-2 text-xs text-muted-foreground">Post cité: {p.quoted_post_id}</div>}
      {p.media_urls?.[0] && <img src={p.media_urls[0]} alt="media" className="mt-2 rounded" />}
      <div className="flex gap-4 text-sm mt-2">
        <button onClick={()=>setReplyOpen(v=>!v)}>💬 {p.reply_count||0}</button>
        <button onClick={onRepost}>{p.reposted_by_me?'🔁':'🔄'} {p.repost_count||0}</button>
        <button onClick={onLike}>{p.liked_by_me?'❤️':'🤍'} {p.like_count||0}</button>
        <button onClick={onBookmark}>{p.bookmarked_by_me ? '🔖' : '📑'}</button>
        <button onClick={onShare}>↗️</button>
      </div>
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
