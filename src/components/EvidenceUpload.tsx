import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, AlertTriangle } from "lucide-react";
import CryptoJS from "crypto-js";
import { EvidenceKind } from "@/types/database";

export const getEvidenceThumbnailUrl = (filePath: string) =>
  supabase.storage
    .from("bitacora")
    .getPublicUrl(filePath, { transform: { width: 150 } }).data.publicUrl;

export const getEvidencePublicUrl = (filePath: string) =>
  supabase.storage.from("bitacora").getPublicUrl(filePath).data.publicUrl;

interface EvidenceUploadProps {
  taskId: string;
  tenantId: string;
  subjectId: string;
  onUploadComplete: () => void;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
  checksum?: string;
}

export const EvidenceUpload = ({ taskId, tenantId, subjectId, onUploadComplete, disabled }: EvidenceUploadProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();

  const calculateChecksum = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const checkDuplicate = async (checksum: string): Promise<boolean> => {
    const { data } = await supabase
      .from('evidence')
      .select('id')
      .eq('task_id', taskId)
      .eq('checksum', checksum)
      .single();
    
    return !!data;
  };

  const getEvidenceKind = (file: File): EvidenceKind => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type === 'application/pdf') return 'pdf';
    return 'photo'; // default fallback
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      const { file } = uploadingFile;
      
      // Calculate checksum
      const checksum = await calculateChecksum(file);
      
      // Check for duplicates
      const isDuplicate = await checkDuplicate(checksum);
      if (isDuplicate) {
        throw new Error(`El archivo "${file.name}" ya fue subido anteriormente`);
      }

      // Update checksum in state
      setUploadingFiles(prev => 
        prev.map(uf => uf.file === file ? { ...uf, checksum } : uf)
      );

      const filename = `${Date.now()}_${file.name}`;
      const filePath = `${tenantId}/${subjectId}/${taskId}/${filename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('bitacora')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update progress to 100% after successful upload
      setUploadingFiles(prev => 
        prev.map(uf => uf.file === file ? { ...uf, progress: 100 } : uf)
      );

      // Get file metadata (including geolocation if available)
      const metadata: Record<string, unknown> = {
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        checksum
      };

      // Try to extract GPS data from EXIF (basic implementation)
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (file.type.startsWith('image/') && navigator.geolocation) {
        // For now, we'll use current location if available
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          // Geolocation failed or was denied
        }
      }

      // Save evidence record
      const { error: dbError } = await supabase
        .from('evidence')
        .insert({
          tenant_id: tenantId,
          task_id: taskId,
          filename: file.name,
          file_path: filePath,
          kind: getEvidenceKind(file),
          latitude,
          longitude,
          metadata,
          checksum
        });

      if (dbError) throw dbError;

      // Remove from uploading files
      setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
      
      toast({
        title: "Archivo subido",
        description: `${file.name} se subió correctamente.`,
      });

      onUploadComplete();

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadingFiles(prev =>
        prev.map(uf => uf.file === uploadingFile.file ? { ...uf, error: message } : uf)
      );

      toast({
        title: "Error al subir archivo",
        description: message,
        variant: "destructive",
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Start uploads
    newUploads.forEach(uploadFile);
  }, [disabled, taskId, tenantId, subjectId]);

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    disabled
  });

  return (
    <div className="space-y-4">
      {!disabled && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {isDragActive 
              ? 'Suelta los archivos aquí...' 
              : 'Arrastra archivos aquí o haz clic para seleccionar'
            }
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Formatos permitidos: JPG, PNG, GIF, PDF
          </p>
          <Button variant="outline" type="button">
            Seleccionar Archivos
          </Button>
        </div>
      )}

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Subiendo archivos...</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{uploadingFile.file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar archivo"
                    onClick={() => removeUpload(uploadingFile.file)}
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
                {uploadingFile.error ? (
                  <div className="flex items-center space-x-1 text-destructive">
                    <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                    <span className="text-xs">{uploadingFile.error}</span>
                  </div>
                ) : (
                  <Progress value={uploadingFile.progress} className="h-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};