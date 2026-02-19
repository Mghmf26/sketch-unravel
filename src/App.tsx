import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import BusinessProcesses from "./pages/BusinessProcesses";
import DataEntry from "./pages/DataEntry";
import DiagramViewer from "./pages/DiagramViewer";
import UploadExtract from "./pages/UploadExtract";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Pages with sidebar layout */}
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/processes" element={<AppLayout><BusinessProcesses /></AppLayout>} />
          <Route path="/new" element={<AppLayout><DataEntry /></AppLayout>} />
          <Route path="/upload" element={<AppLayout><UploadExtract /></AppLayout>} />
          <Route path="/edit/:id" element={<AppLayout><DataEntry /></AppLayout>} />
          {/* Full-screen pages (no sidebar) */}
          <Route path="/view/:id" element={<DiagramViewer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
