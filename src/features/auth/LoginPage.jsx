import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { useFlash } from "../../shared/flash/FlashProvider";
import "./LoginPage.css";

export function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const flash = useFlash();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await login(username, password);
            navigate("/", { replace: true });
        } catch {
            flash.error("Неверный логин или пароль", "Ошибка авторизации");
        }
    };

    return (
        <div className="login-page-wrapper">
            <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
            >
                <i className={`bi ${theme === "dark" ? "bi-moon-fill" : "bi-sun-fill"}`}></i>
            </button>

            <div className="login-container">
                <h3>Вход в ЦМ</h3>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Логин"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />

                    <button type="submit" className="btn-submit">
                        Войти
                    </button>
                </form>

                <footer>
                    <p>© {new Date().getFullYear()} Центр мониторинга ООО «АВРОРА»</p>
                </footer>
            </div>
        </div>
    );
}
