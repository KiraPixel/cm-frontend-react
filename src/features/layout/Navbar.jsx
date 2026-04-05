import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import logo from "../../assets/logo.png";
import logoBlack from "../../assets/logo_black.png";
import { API_DOCS_PATH } from "../../shared/config/runtime";
import "./Navbar.css";

export function Navbar() {
    const { user, logout, hasRole } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const brandLogo = theme === "dark" ? logoBlack : logo;

    return (
        <nav className="navbar navbar-expand-lg cm-navbar">
            <div className="container-fluid">
                <Link className="navbar-brand cm-brand" to="/">
                    <img src={brandLogo} alt="Логотип" className="cm-brand-logo" />
                </Link>

                <button
                    className="navbar-toggler cm-navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarContent"
                    aria-controls="navbarContent"
                    aria-expanded="false"
                    aria-label="Переключить навигацию"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarContent">
                    <ul className="navbar-nav mx-auto mb-2 mb-lg-0 cm-nav-links">
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/" end>
                                Главная
                            </NavLink>
                        </li>

                        {hasRole("map") && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/maps">
                                    Карта
                                </NavLink>
                            </li>
                        )}

                        {hasRole("voperator") && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/virtual_operator">
                                    Диспетчер
                                </NavLink>
                            </li>
                        )}

                        {hasRole("dashboard") && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/dashboard">
                                    Дашборд
                                </NavLink>
                            </li>
                        )}

                        {hasRole("reports") && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/rep">
                                    Отчёты
                                </NavLink>
                            </li>
                        )}

                    </ul>

                    <ul className="navbar-nav d-flex align-items-center cm-nav-actions">
                        {user ? (
                            <>
                                <li className="nav-item me-2">
                                    <button
                                        className="btn btn-link nav-link cm-theme-btn"
                                        onClick={toggleTheme}
                                        title="Переключить тему"
                                    >
                                        <i className={`bi ${theme === "dark" ? "bi-moon-fill" : "bi-sun-fill"}`}></i>
                                    </button>
                                </li>

                                <li className="nav-item dropdown">
                                    <a
                                        className="nav-link dropdown-toggle d-flex align-items-center cm-user-menu"
                                        href="#"
                                        id="userMenu"
                                        role="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <i className="bi bi-person-circle me-2"></i>
                                        {user.user}
                                    </a>
                                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
                                        <li><a className="dropdown-item" href="/user_profile/">Профиль</a></li>

                                        {hasRole("admin_panel") && (
                                            <li><a className="dropdown-item" href="/admin">Админ-панель</a></li>
                                        )}

                                        <li><a className="dropdown-item" href={API_DOCS_PATH}>Документация API</a></li>
                                        <li><hr className="dropdown-divider" /></li>
                                        <li>
                                            <button className="dropdown-item text-danger" onClick={logout}>
                                                <i className="bi bi-box-arrow-right me-2"></i>
                                                Выход
                                            </button>
                                        </li>
                                    </ul>
                                </li>
                            </>
                        ) : (
                            <li className="nav-item">
                                <a className="btn btn-primary" href="/login">Войти</a>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}
