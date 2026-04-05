import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/`;
};

const getInitialTheme = () => {
    const fromAttr = document.documentElement.getAttribute("data-bs-theme");
    if (fromAttr === "dark" || fromAttr === "light") return fromAttr;

    const fromCookie = getCookie("theme");
    if (fromCookie === "dark" || fromCookie === "light") return fromCookie;

    return "light";
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute("data-bs-theme", theme);
        document.documentElement.style.colorScheme = theme;
        setCookie("theme", theme, 365);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
