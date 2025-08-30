import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SignaturePadProps {
  taskId: string;
  tenantId: string;
  subjectId: string;
  onSave: () => void;
  disabled?: boolean;
}

export const SignaturePad = ({ taskId, tenantId, subjectId, onSave, disabled }: SignaturePadProps) => {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const { toast } = useToast();

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast({
        title: "No hay firma",
        description: "Por favor firme antes de guardar",
        variant: "destructive",
      });
      return;
    }

    try {
      const canvas = sigCanvas.current.getTrimmedCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const filename = `signature-${Date.now()}.png`;
      const filePath = `${tenantId}/${subjectId}/${taskId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("bitacora")
        .upload(filePath, blob);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("evidence").insert({
        tenant_id: tenantId,
        task_id: taskId,
        filename,
        file_path: filePath,
        kind: "signature",
      });
      if (dbError) throw dbError;

      toast({
        title: "Firma guardada",
        description: "La firma se guardó correctamente",
      });

      onSave();
      clear();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        canvasProps={{ className: "border w-full h-48 bg-white" }}
      />
      <div className="flex space-x-2">
        <Button variant="outline" type="button" onClick={clear} disabled={disabled}>
          Limpiar
        </Button>
        <Button type="button" onClick={save} disabled={disabled}>
          Guardar Firma
        </Button>
      </div>
    </div>
  );
};
