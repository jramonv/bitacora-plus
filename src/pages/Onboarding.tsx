import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [role, setRole] = useState("viewer");
  const navigate = useNavigate();

  const nextStep = () => setStep((s) => s + 1);

  const finish = () => {
    const redirects: Record<string, string> = {
      owner: "/dashboard",
      editor: "/subjects",
      viewer: "/",
    };
    navigate(redirects[role] || "/");
  };

  return (
    <Layout>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="org">Nombre de la organización</Label>
                <Input
                  id="org"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Button onClick={nextStep}>Siguiente</Button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="team">Nombre del equipo</Label>
                <Input
                  id="team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="owner">Administrador</option>
                  <option value="editor">Miembro</option>
                  <option value="viewer">Observador</option>
                </select>
              </div>

              <Button onClick={finish}>Finalizar</Button>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Onboarding;

