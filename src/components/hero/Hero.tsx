import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

const Hero = () => {
  return (
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
  );
};

export default Hero;

