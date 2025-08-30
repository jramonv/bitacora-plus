import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Upload, FileText, Download, Lock, CheckCircle, AlertTriangle, MapPin, Signature } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { TaskStatus, RequiredEvidence, castRequiredEvidence } from "@/types/database";
import { EvidenceUpload } from "@/components/EvidenceUpload";

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Fetch task details
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subjects (
            id,
            title,
            status
          ),
          checklist_runs (
            id,
            result,
            completed_at,
            checklist_templates (
              id,
              name,
              items
            )
          ),
          evidence (
            id,
            filename,
            file_path,
            kind,
            latitude,
            longitude,
            created_at
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Initialize form data when task loads
      setFormData({
        title: data.title,
        description: data.description,
        due_date: data.due_date ? new Date(data.due_date) : null,
        assigned_to: data.assigned_to,
        required_evidence: data.required_evidence || {}
      });
      
      return data;
    },
    enabled: !!id
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      setIsEditing(false);
      toast({
        title: "Task actualizada",
        description: "Los cambios se guardaron correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la task.",
        variant: "destructive",
      });
    }
  });

  // Close task mutation
  const closeTaskMutation = useMutation({
    mutationFn: async () => {
      // First validate the task can be closed
      const validation = validateTaskClosure();
      if (!validation.canClose) {
        throw new Error(validation.errors.join('; '));
      }

      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed' as TaskStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (taskError) throw taskError;

      // Create log entry for status change
      const { error: logError } = await supabase
        .from('log_entries')
        .insert({
          tenant_id: task?.tenant_id,
          subject_id: task?.subject_id,
          task_id: id,
          event_type: 'status_change',
          message: 'Task cerrada exitosamente',
          metadata: {
            previousValue: task?.status,
            newValue: 'completed',
            userId: 'current_user' // This should be the actual user ID
          }
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast({
        title: "Task cerrada",
        description: "La task se cerró exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "No se puede cerrar la task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    const updateData: any = {
      title: formData.title,
      description: formData.description,
      assigned_to: formData.assigned_to,
      required_evidence: formData.required_evidence
    };

    if (formData.due_date) {
      updateData.due_date = formData.due_date.toISOString();
    }

    updateTaskMutation.mutate(updateData);
  };

  const handleClose = () => {
    const validation = validateTaskClosure();
    if (!validation.canClose) {
      validation.errors.forEach(error => {
        toast({
          title: "Requisitos faltantes",
          description: error,
          variant: "destructive",
        });
      });
      return;
    }
    closeTaskMutation.mutate();
  };

  const validateTaskClosure = () => {
    if (!task) return { canClose: false, errors: ['Task no encontrada'] };
    
    const errors: string[] = [];
    const evidence = task.evidence || [];
    const required = castRequiredEvidence(task.required_evidence);
    
    // 1. Check minimum photos
    const photoCount = evidence.filter(e => e.kind === 'photo').length;
    const minPhotos = required.min_photos || 3;
    if (photoCount < minPhotos) {
      errors.push(`Faltan ${minPhotos - photoCount} fotos (${photoCount}/${minPhotos})`);
    }
    
    // 2. Check geotag requirement
    if (required.geotag_required) {
      const hasGeotag = evidence.some(e => e.latitude && e.longitude);
      if (!hasGeotag) {
        errors.push('Se requiere al menos una evidencia con geolocalización');
      }
    }
    
    // 3. Check signature requirement  
    if (required.signature_required) {
      const hasSignature = evidence.some(e => e.kind === 'pdf');
      if (!hasSignature) {
        errors.push('Se requiere firma o documento firmado (PDF)');
      }
    }
    
    // 4. Check checklist requirement
    if (required.checklist_id && task.checklist_runs && task.checklist_runs.length > 0) {
      const checklistRun = task.checklist_runs[0];
      if (!checklistRun.completed_at) {
        errors.push('Debe completar el checklist antes de cerrar');
      }
      // Check score if available
      const result = checklistRun.result as any;
      if (result && typeof result.score === 'number' && result.score < 0) {
        errors.push('El checklist debe tener una puntuación válida');
      }
    }
    
    return { canClose: errors.length === 0, errors };
  };

  const canClose = () => {
    const validation = validateTaskClosure();
    return validation.canClose;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { variant: 'secondary' as const, label: 'Pendiente' },
      'in_progress': { variant: 'default' as const, label: 'En Progreso' },
      'closed': { variant: 'default' as const, label: 'Cerrada' },
      'blocked': { variant: 'destructive' as const, label: 'Bloqueada' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportToPDF = async () => {
    // TODO: Implement PDF export functionality
    console.log('Exporting task to PDF...');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <Clock className="mr-2 h-4 w-4 animate-spin" />
          Cargando detalles de la task...
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Task no encontrada</p>
        </div>
      </Layout>
    );
  }

  const evidence = task.evidence || [];
  const required = castRequiredEvidence(task.required_evidence);
  const photoCount = evidence.filter(e => e.kind === 'photo').length;
  const hasGeotag = evidence.some(e => e.latitude && e.longitude);
  const hasSignature = evidence.some(e => e.kind === 'pdf');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-bold">{task.title}</h1>
              {getStatusBadge(task.status)}
            </div>
            <p className="text-muted-foreground">
              OT: <span className="font-medium">{task.subjects?.title}</span>
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            {task.status !== 'completed' && (
              <Button 
                onClick={handleClose} 
                disabled={!canClose()}
                className={canClose() ? '' : 'opacity-50 cursor-not-allowed'}
              >
                {canClose() ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Cerrar Task
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Cerrar Task
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Task Form */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Detalles de la Task</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                      {updateTaskMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  {isEditing ? (
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{task.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm">{task.description || 'Sin descripción'}</p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Vencimiento</label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.due_date ? format(formData.due_date, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={(date) => setFormData({ ...formData, due_date: date })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm">
                      {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Sin fecha'}
                    </p>
                  )}
                </div>

                {/* Required Evidence Config */}
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium">Configuración de Evidencias</h4>
                  
                  {/* Min Photos */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Mínimo de fotos</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        className="w-20"
                        value={castRequiredEvidence(formData.required_evidence).min_photos || 3}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          required_evidence: { 
                            ...formData.required_evidence, 
                            min_photos: parseInt(e.target.value) 
                          }
                        })}
                      />
                    ) : (
                      <span className="text-sm">{castRequiredEvidence(required).min_photos || 3}</span>
                    )}
                  </div>

                  {/* Geotag Required */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Geotag requerido</label>
                    {isEditing ? (
                      <Checkbox
                        checked={castRequiredEvidence(formData.required_evidence).geotag_required || false}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          required_evidence: { 
                            ...formData.required_evidence, 
                            geotag_required: checked 
                          }
                        })}
                      />
                    ) : (
                      <span className="text-sm">{castRequiredEvidence(required).geotag_required ? 'Sí' : 'No'}</span>
                    )}
                  </div>

                  {/* Signature Required */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Firma requerida</label>
                    {isEditing ? (
                      <Checkbox
                        checked={castRequiredEvidence(formData.required_evidence).signature_required || false}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          required_evidence: { 
                            ...formData.required_evidence, 
                            signature_required: checked 
                          }
                        })}
                      />
                    ) : (
                      <span className="text-sm">{castRequiredEvidence(required).signature_required ? 'Sí' : 'No'}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            {task.checklist_runs && task.checklist_runs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Checklist: {task.checklist_runs[0].checklist_templates?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(task.checklist_runs[0].checklist_templates?.items as any[])?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Checkbox 
                          checked={task.checklist_runs[0].result?.[idx]?.checked || false}
                          disabled={task.status === 'completed'}
                        />
                        <label className="text-sm">{item.text}</label>
                      </div>
                    ))}
                  </div>
                  {task.checklist_runs[0].completed_at && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Completado: {format(new Date(task.checklist_runs[0].completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Evidence & Compliance */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Cumplimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Photos */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Fotos ({photoCount}/{castRequiredEvidence(required).min_photos || 3})</span>
                    </div>
                    {photoCount >= (castRequiredEvidence(required).min_photos || 3) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>

                  {/* Geotag */}
                  {castRequiredEvidence(required).geotag_required && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">Geolocalización</span>
                      </div>
                      {hasGeotag ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  )}

                  {/* Signature */}
                  {castRequiredEvidence(required).signature_required && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Signature className="h-4 w-4" />
                        <span className="text-sm">Firma</span>
                      </div>
                      {hasSignature ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Evidence Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Evidencias</CardTitle>
              </CardHeader>
              <CardContent>
                <EvidenceUpload
                  taskId={id!}
                  tenantId={task.tenant_id}
                  subjectId={task.subject_id}
                  onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['task', id] })}
                  disabled={task.status === 'completed'}
                />

                {/* Evidence List */}
                <div className="space-y-2 mt-4">
                  {evidence.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No hay evidencias subidas
                    </p>
                  ) : (
                    evidence.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          {item.kind === 'photo' ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              {item.latitude && item.longitude && (
                                <span className="ml-2 text-green-600">📍 Geotagged</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TaskDetail;