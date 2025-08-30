import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface EvidenceItem {
  id: string;
  latitude: number | null;
  longitude: number | null;
  file_path: string;
  created_at: string;
  created_by?: string | null;
  filename?: string;
}

interface MapViewProps {
  evidence: EvidenceItem[];
}

export const MapView = ({ evidence }: MapViewProps) => {
  const markers = evidence.filter(e => e.latitude !== null && e.longitude !== null);
  const center: [number, number] = markers.length > 0
    ? [markers[0].latitude as number, markers[0].longitude as number]
    : [0, 0];

  return (
    <MapContainer center={center} zoom={13} className="h-[400px] w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {markers.map((m) => {
        const { data } = supabase.storage.from("bitacora").getPublicUrl(m.file_path);
        const url = data.publicUrl;
        return (
          <Marker key={m.id} position={[m.latitude as number, m.longitude as number]}>
            <Popup>
              <div className="space-y-2">
                {url && (
                  <img src={url} alt={m.filename} className="w-32 h-32 object-cover rounded" />
                )}
                <p className="text-sm">Fecha: {format(new Date(m.created_at), 'Pp', { locale: es })}</p>
                {m.created_by && (
                  <p className="text-sm">Usuario: {m.created_by}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapView;
