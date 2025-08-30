import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, LayoutDashboard, FileText } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
        <CheckSquare className="h-16 w-16 text-primary" />
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Bitácora</h1>
          <p className="text-xl text-muted-foreground">
            La forma sencilla de gestionar tus operaciones.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/jefe/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full">
              Soy Jefe
            </Button>
          </Link>
          <Link to="/operador/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              Soy Operador
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-12 bg-muted">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl font-bold">Beneficios</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <LayoutDashboard className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Visión centralizada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Controla tareas y avances desde un solo panel.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Documentación clara</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Mantén registros detallados y accesibles.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CheckSquare className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Cumplimiento asegurado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Mejora la trazabilidad y seguimiento de procesos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl font-bold">Casos de uso</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <FileText className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Registra intervenciones y controla tiempos de ejecución.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <LayoutDashboard className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Coordina equipos y tareas de forma eficiente.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CheckSquare className="mx-auto h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Operación diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Da seguimiento a actividades rutinarias y compromisos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;

