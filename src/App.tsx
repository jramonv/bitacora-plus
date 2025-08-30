import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import JefeDashboard from "./pages/JefeDashboard";
import OperadorDashboard from "./pages/OperadorDashboard";
import SubjectsList from "./pages/SubjectsList";
import SubjectDetail from "./pages/SubjectDetail";
import TaskDetail from "./pages/TaskDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/dashboard"
            element={
              <Navigate
                to={
                  (localStorage.getItem('role') || 'operador') === 'jefe'
                    ? '/dashboard/jefe'
                    : '/dashboard/operador'
                }
                replace
              />
            }
          />
          <Route path="/dashboard/jefe" element={<JefeDashboard />} />
          <Route path="/dashboard/operador" element={<OperadorDashboard />} />
          <Route path="/subjects" element={<SubjectsList />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
