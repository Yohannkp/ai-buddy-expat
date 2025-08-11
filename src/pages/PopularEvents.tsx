import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PopularEvents = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.rpc('popular_events');
        if (data) setItems(data as any);
      } catch {}
    };
    load();
  }, []);
  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Événements populaires</h1>
      <ul className="space-y-2">
        {items?.map((e: any) => (
          <li key={e.id} className="border rounded p-3 flex justify-between">
            <span>{e.title}</span>
            <span className="text-sm text-muted-foreground">{e.likes} likes</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PopularEvents;
