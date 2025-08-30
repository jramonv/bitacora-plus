// Update this page (the content is just a fallback if you fail to update the page)

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, FileText, CheckSquare } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md mx-auto text-center space-y-8">
        <div className="flex justify-center">
          <CheckSquare className="h-16 w-16 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-4">Bitácora</h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestión Operativa</p>
        </div>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <Link to="/dashboard">
              <Button className="w-full" size="lg">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Ir al Dashboard
              </Button>
            </Link>
            <Link to="/subjects">
              <Button variant="outline" className="w-full" size="lg">
                <FileText className="mr-2 h-4 w-4" />
                Ver Órdenes de Trabajo
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
