import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action: ReactNode;
}

export const EmptyState = ({ icon: Icon, message, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {action}
    </div>
  );
};
