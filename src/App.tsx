import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import BusinessProcesses from "./pages/BusinessProcesses";
import Clients from "./pages/Clients";
import DataEntry from "./pages/DataEntry";
import DiagramViewer from "./pages/DiagramViewer";
import UploadExtract from "./pages/UploadExtract";
import ProcessDetails from "./pages/ProcessDetails";
import RisksControls from "./pages/RisksControls";
import Controls from "./pages/Controls";
import Regulations from "./pages/Regulations";
import Incidents from "./pages/Incidents";
import MainframeImports from "./pages/MainframeImports";
import ProcessingAnalysis from "./pages/ProcessingAnalysis";
import VisualAnalytics from "./pages/VisualAnalytics";
import AIReports from "./pages/AIReports";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import ProcessView from "./pages/ProcessView";
import BusinessScenarioAnalysis from "./pages/BusinessScenarioAnalysis";
import MainframeScenarioAnalysis from "./pages/MainframeScenarioAnalysis";
import MainframeAIAnalysis from "./pages/MainframeAIAnalysis";
import ClientReports from "./pages/ClientReports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/auth" element={<PublicOnly><Auth /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/processes" element={<ProtectedRoute><BusinessProcesses /></ProtectedRoute>} />
            <Route path="/process-details" element={<ProtectedRoute><ProcessDetails /></ProtectedRoute>} />
            <Route path="/risks" element={<ProtectedRoute><RisksControls /></ProtectedRoute>} />
            <Route path="/controls" element={<ProtectedRoute><Controls /></ProtectedRoute>} />
            <Route path="/regulations" element={<ProtectedRoute><Regulations /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
            <Route path="/imports" element={<ProtectedRoute><MainframeImports /></ProtectedRoute>} />
            <Route path="/processing-analysis" element={<ProtectedRoute><ProcessingAnalysis /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><VisualAnalytics /></ProtectedRoute>} />
            <Route path="/ai-reports" element={<ProtectedRoute><AIReports /></ProtectedRoute>} />
            <Route path="/business-scenario-analysis" element={<ProtectedRoute><BusinessScenarioAnalysis /></ProtectedRoute>} />
            <Route path="/mainframe-scenario-analysis" element={<ProtectedRoute><MainframeScenarioAnalysis /></ProtectedRoute>} />
            <Route path="/mainframe-ai-analysis" element={<ProtectedRoute><MainframeAIAnalysis /></ProtectedRoute>} />
            <Route path="/client-reports" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadExtract /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
            <Route path="/view/:id" element={<DiagramViewer />} />
            <Route path="/process-view/:id" element={<ProtectedRoute><ProcessView /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
