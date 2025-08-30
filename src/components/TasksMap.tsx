import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

// Fix default icon paths so markers display correctly in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
});

interface MarkerItem {
  id: string;
  title: string;
  lat: number;
  lon: number;
  type: 'task' | 'subject';
}

const TasksMap = () => {
  const { data } = useQuery({
    queryKey: ['tasks-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, latitude, longitude, subject_id, subjects(id, title, latitude, longitude)');
      if (error) throw error;
      return data as any[];
    }
  });

  const markers: MarkerItem[] = useMemo(() => {
    if (!data) return [];
    const items: MarkerItem[] = [];
    for (const task of data) {
      const lat = task?.latitude ?? task?.subjects?.latitude;
      const lon = task?.longitude ?? task?.subjects?.longitude;
      if (typeof lat === 'number' && typeof lon === 'number') {
        const fromTask = task?.latitude && task?.longitude;
        items.push({
          id: fromTask ? task.id : task.subject_id,
          title: fromTask ? task.title : task.subjects?.title || 'Sin título',
          lat,
          lon,
          type: fromTask ? 'task' : 'subject',
        });
      }
    }
    return items;
  }, [data]);

  const center: [number, number] = markers.length
    ? [markers[0].lat, markers[0].lon]
    : [0, 0];

  return (
    <div className="h-[500px] w-full">
      <MapContainer center={center} zoom={markers.length ? 13 : 2} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(item => (
          <Marker key={`${item.type}-${item.id}`} position={[item.lat, item.lon]}>
            <Popup>
              <Link
                to={item.type === 'task' ? `/tasks/${item.id}` : `/subjects/${item.id}`}
                className="text-blue-500 underline"
              >
                {item.title}
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TasksMap;

