import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Map = () => {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('events').select('*').not('lat','is', null).not('lng','is', null).order('created_at', { ascending: false });
      setEvents(data || []);
    };
    load();
  }, []);
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-4">Carte interactive</h1>
      <div className="h-[480px] w-full rounded overflow-hidden border">
        {(() => { const MC = MapContainer as unknown as any; const TL = TileLayer as unknown as any; return (
          <MC center={[48.8566, 2.3522]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TL url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {events.map((e) => (
            <Marker key={e.id} position={[e.lat, e.lng]}>
              <Popup>
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.location} — {e.date}</div>
              </Popup>
            </Marker>
          ))}
          </MC>
        );})()}
      </div>
    </div>
  );
};

export default Map;
