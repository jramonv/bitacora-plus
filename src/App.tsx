import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SubjectsList from "./pages/SubjectsList";
import SubjectDetail from "./pages/SubjectDetail";
import TaskDetail from "./pages/TaskDetail";
import IncidentsList from "./pages/IncidentsList";
import IncidentDetail from "./pages/IncidentDetail";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<SubjectsList />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/incidents" element={<IncidentsList />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
