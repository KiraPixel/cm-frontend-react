import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { API_DOCS_PATH } from "../../shared/config/runtime";
import "./MobileBottomNav.css";

export function MobileBottomNav() {
    const { hasRole, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const hasTools = hasRole("voperator") || hasRole("dashboard") || hasRole("reports") || hasRole("search");

    return (
        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
            <div className="mobile-bottom-nav-inner">
                <NavLink to="/" end className="mobile-nav-link" title="Главная">
                    <i className="bi bi-house-door"></i>
                    <span>Главная</span>
                </NavLink>

                {hasRole("map") ? (
                    <NavLink to="/maps" className="mobile-nav-link" title="Карта">
                        <i className="bi bi-map"></i>
                        <span>Карта</span>
                    </NavLink>
                ) : (
                    <button type="button" className="mobile-nav-link mobile-nav-link-disabled" title="Нет доступа" disabled>
                        <i className="bi bi-map"></i>
                        <span>Карта</span>
                    </button>
                )}

                <div className="dropup">
                    <button
                        type="button"
                        className="mobile-nav-link mobile-nav-link-button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        title="Инструменты"
                    >
                        <i className="bi bi-tools"></i>
                        <span>Инструменты</span>
                    </button>
                    <ul className="dropdown-menu mobile-nav-dropdown">
                        {!hasTools && <li><span className="dropdown-item-text text-body-secondary">Нет доступных разделов</span></li>}

                        {hasRole("voperator") && (
                            <li>
                                <a className="dropdown-item" href="/virtual_operator">Диспетчер</a>
                            </li>
                        )}

                        {hasRole("dashboard") && (
                            <li>
                                <a className="dropdown-item" href="/dashboard">Дашборд</a>
                            </li>
                        )}

                        {hasRole("reports") && (
                            <li>
                                <a className="dropdown-item" href="/rep">Отчёты</a>
                            </li>
                        )}

                        {hasRole("search") && (
                            <li>
                                <a className="dropdown-item" href="/search">Поиск</a>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="dropup">
                    <button
                        type="button"
                        className="mobile-nav-link mobile-nav-link-button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        title="Профиль"
                    >
                        <i className="bi bi-person-circle"></i>
                        <span>Профиль</span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end mobile-nav-dropdown">
                        <li><a className="dropdown-item" href="/user_profile/">Профиль</a></li>

                        {hasRole("admin_panel") && (
                            <li><a className="dropdown-item" href="/admin">Админ-панель</a></li>
                        )}

                        <li><a className="dropdown-item" href={API_DOCS_PATH}>Документация API</a></li>
                        <li>
                            <button type="button" className="dropdown-item" onClick={toggleTheme}>
                                <i className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"} me-2`}></i>
                                Сменить тему
                            </button>
                        </li>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                            <button type="button" className="dropdown-item text-danger" onClick={logout}>
                                <i className="bi bi-box-arrow-right me-2"></i>
                                Выход
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}
