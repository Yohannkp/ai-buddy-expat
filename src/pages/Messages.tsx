import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Messages = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');

  const load = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('id, created_at, conversation_participants!inner(user_id)')
      .eq('conversation_participants.user_id', user.id);
    setConversations(data || []);
  };

  useEffect(() => { load(); }, []);

  const startConversation = async () => {
    const user = (await supabase.auth.getUser()).data.user; if (!user) return;
    const { data: conv } = await supabase.from('conversations').insert({}).select('id').single();
    if (!conv?.id) return;
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: recipient }
    ]);
    await supabase.from('messages').insert({ conversation_id: conv.id, sender_id: user.id, content });
    setRecipient(''); setContent('');
    load();
  };

  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Messages privés</h1>
      <div className="border rounded p-3 mb-4">
        <div className="font-medium mb-2">Nouvelle conversation</div>
        <input className="border rounded px-3 py-2 w-full mb-2" placeholder="ID utilisateur du destinataire" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <textarea className="border rounded px-3 py-2 w-full mb-2" placeholder="Votre message" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="bg-primary text-white px-4 py-2 rounded" onClick={startConversation} disabled={!recipient || !content}>Envoyer</button>
      </div>
      <div>
        <div className="font-medium mb-2">Vos conversations</div>
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id} className="border rounded p-2">Conversation #{c.id}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Messages;
