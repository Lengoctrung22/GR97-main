import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import RouteTransition from "./components/RouteTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import TimeoutWarning from "./components/TimeoutWarning";
import AppointmentsPage from "./pages/AppointmentsPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import MedicalRecordsPage from "./pages/MedicalRecordsPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import PaymentPage from "./pages/PaymentPage";
import QRPaymentPage from "./pages/QRPaymentPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminDoctorsPage from "./pages/AdminDoctorsPage";
import AdminDoctorDetailPage from "./pages/AdminDoctorDetailPage";
import PatientSettingsPage from "./pages/PatientSettingsPage";
import AdminSchedulesPage from "./pages/AdminSchedulesPage";
import AdminStatsPage from "./pages/AdminStatsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminDoctorAccountPage from "./pages/AdminDoctorAccountPage";
import AuthLayout from "./layouts/AuthLayout";
import PortalLayout from "./layouts/PortalLayout";
import PatientWorkspaceLayout from "./layouts/PatientWorkspaceLayout";
import AdminLayout from "./layouts/AdminLayout";
import { useAuth } from "./context/AuthContext";
import MedicalImageAnalysis from "./components/MedicalImageAnalysis";
import VideoCallPage from "./pages/VideoCallPage";
import DoctorChatPage from "./pages/DoctorChatPage";

const App = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const defaultAuthRoute = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? defaultAuthRoute : "/login"} replace />}
        />

        <Route
          path="/login"
          element={
            <RouteTransition>
              <AuthLayout showRegisterHint>
                <LoginPage />
              </AuthLayout>
            </RouteTransition>
          }
        />
        <Route
          path="/register"
          element={
            <RouteTransition>
              <AuthLayout showLoginHint>
                <RegisterPage />
              </AuthLayout>
            </RouteTransition>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RouteTransition>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </RouteTransition>
          }
        />
        <Route
          path="/reset-password"
          element={
            <RouteTransition>
              <AuthLayout>
                <ResetPasswordPage />
              </AuthLayout>
            </RouteTransition>
          }
        />
        <Route
          path="/payment-result"
          element={
            <RouteTransition>
              <PaymentResultPage />
            </RouteTransition>
          }
        />
        <Route
          path="/payment-page"
          element={
            <RouteTransition>
              <PaymentPage />
            </RouteTransition>
          }
        />
        <Route
          path="/payment/checkout"
          element={
            <RouteTransition>
              <QRPaymentPage />
            </RouteTransition>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PortalLayout>
                  <DashboardPage />
                </PortalLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctors"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PortalLayout>
                  <AppointmentsPage />
                </PortalLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/appointments" element={<Navigate to="/doctors" replace />} />
        <Route path="/chat" element={<Navigate to="/diagnosis" replace />} />
        <Route
          path="/diagnosis"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PatientWorkspaceLayout>
                  <ChatPage />
                </PatientWorkspaceLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PatientWorkspaceLayout>
                  <MedicalRecordsPage />
                </PatientWorkspaceLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        {/* New: Medical Image Analysis with GPT-4 Vision */}
        <Route
          path="/analyze"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PatientWorkspaceLayout>
                  <MedicalImageAnalysis />
                </PatientWorkspaceLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        {/* New: Video Consultation with WebRTC */}
        <Route
          path="/video-call"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <VideoCallPage />
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        {/* New: Doctor Chat */}
        <Route
          path="/doctor-chat"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PatientWorkspaceLayout>
                  <DoctorChatPage />
                </PatientWorkspaceLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <PatientWorkspaceLayout>
                  <PatientSettingsPage />
                </PatientWorkspaceLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/doctors"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminDoctorsPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/doctors/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminDoctorDetailPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/doctors/:id/account"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminDoctorAccountPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/schedules"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminSchedulesPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminStatsPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RouteTransition>
                <AdminLayout>
                  <AdminSettingsPage />
                </AdminLayout>
              </RouteTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <RouteTransition>
              <NotFoundPage />
            </RouteTransition>
          }
        />
      </Routes>
      <TimeoutWarning />
    </AnimatePresence>
  );
};

export default App;
