import { ReactNode } from "react";
import { TableRow, TableCell } from "@/components/ui/table";

interface EmptyStateProps {
  title: string;
  description: string;
  button: ReactNode;
}

const EmptyState = ({ title, description, button }: EmptyStateProps) => (
  <TableRow>
    <TableCell colSpan={6} className="py-8">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {button}
      </div>
    </TableCell>
  </TableRow>
);

export default EmptyState;
