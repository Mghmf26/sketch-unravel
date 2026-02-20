import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import BusinessProcesses from "./pages/BusinessProcesses";
import Clients from "./pages/Clients";
import DataEntry from "./pages/DataEntry";
import DiagramViewer from "./pages/DiagramViewer";
import UploadExtract from "./pages/UploadExtract";
import ProcessDetails from "./pages/ProcessDetails";
import RisksControls from "./pages/RisksControls";
import Regulations from "./pages/Regulations";
import Incidents from "./pages/Incidents";
import MainframeImports from "./pages/MainframeImports";
import ProcessingAnalysis from "./pages/ProcessingAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/clients" element={<AppLayout><Clients /></AppLayout>} />
          <Route path="/processes" element={<AppLayout><BusinessProcesses /></AppLayout>} />
          <Route path="/process-details" element={<AppLayout><ProcessDetails /></AppLayout>} />
          <Route path="/risks" element={<AppLayout><RisksControls /></AppLayout>} />
          <Route path="/regulations" element={<AppLayout><Regulations /></AppLayout>} />
          <Route path="/incidents" element={<AppLayout><Incidents /></AppLayout>} />
          <Route path="/imports" element={<AppLayout><MainframeImports /></AppLayout>} />
          <Route path="/processing-analysis" element={<AppLayout><ProcessingAnalysis /></AppLayout>} />
          <Route path="/new" element={<AppLayout><DataEntry /></AppLayout>} />
          <Route path="/upload" element={<AppLayout><UploadExtract /></AppLayout>} />
          <Route path="/edit/:id" element={<AppLayout><DataEntry /></AppLayout>} />
          <Route path="/view/:id" element={<DiagramViewer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
