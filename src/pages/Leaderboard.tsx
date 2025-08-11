import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Leaderboard = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from('user_points').select('*').order('points', { ascending: false }).limit(50);
    setRows(data || []);
  })(); }, []);
  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Classement des membres</h1>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.user_id} className="border rounded p-2 flex justify-between">
            <span>#{i+1} — {r.user_id}</span>
            <span className="text-sm text-muted-foreground">{r.points} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
