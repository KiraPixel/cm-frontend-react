import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { Navbar } from "./features/layout/Navbar";
import { ThemeProvider } from "./features/theme/ThemeContext";
import { MapsPage } from "./pages/maps/MapsPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { SearchPage } from "./pages/search/SearchPage";
import { VirtualOperatorPage } from "./pages/virtualOperator/VirtualOperatorPage";
import { UserProfilePage } from "./pages/userProfile/UserProfilePage";
import { CarPage } from "./pages/car/CarPage";
import "./features/layout/Footer.css";
import { FlashProvider } from "./shared/flash/FlashProvider";
import { MobileBottomNav } from "./features/layout/MobileBottomNav";

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="cm-footer mt-auto flex-shrink-0 desktop-only">
            <div className="cm-footer-inner container-fluid">
                <div className="cm-footer-brand">
                    <span className="cm-footer-dot" aria-hidden="true"></span>
                    <span className="cm-footer-title">Центр мониторинга</span>
                    <span className="cm-footer-company">ООО «АВРОРА»</span>
                </div>
                <div className="cm-footer-meta">© {year}. Все права защищены.</div>
            </div>
        </footer>
    );
}

function ProtectedLayout({ children }) {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="d-flex flex-column vh-100 overflow-hidden">
            <header className="flex-shrink-0 desktop-only">
                <Navbar />
            </header>

            <main className="flex-grow-1 d-flex flex-column overflow-hidden position-relative mobile-main">
                {children}
            </main>

            <Footer />
            <MobileBottomNav />
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <FlashProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route path="/" element={
                            <ProtectedLayout>
                                <SearchPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/maps" element={
                            <ProtectedLayout>
                                <MapsPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/rep" element={
                            <ProtectedLayout>
                                <ReportsPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/virtual_operator" element={
                            <ProtectedLayout>
                                <VirtualOperatorPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/search" element={
                            <ProtectedLayout>
                                <SearchPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/admin" element={
                            <ProtectedLayout>
                                <AdminPage />
                            </ProtectedLayout>
                        } />

                        <Route path="/user_profile" element={
                            <ProtectedLayout>
                                <UserProfilePage />
                            </ProtectedLayout>
                        } />

                        <Route path="/car/:carId" element={
                            <ProtectedLayout>
                                <CarPage />
                            </ProtectedLayout>
                        } />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </FlashProvider>
        </ThemeProvider>
    );
}
