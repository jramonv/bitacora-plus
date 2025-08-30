import { Card } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationsPanel = () => {
  const { notifications } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <Card className="mb-4 p-4">
      <h2 className="mb-2 text-sm font-semibold">Notificaciones</h2>
      <ul className="space-y-1 text-sm">
        {notifications.map((n) => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </Card>
  );
};

export default NotificationsPanel;
