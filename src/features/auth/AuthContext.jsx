import { createContext, useContext, useState } from "react";
import { api } from "../../shared/api/client";

const AuthContext = createContext();

const decodeJwtPayload = (token) => {
    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) return null;
        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
};

const parseUserFromToken = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp <= nowInSeconds) {
        return null;
    }

    const rolesFromToken = Array.isArray(payload.roles)
        ? payload.roles.map((role) => (typeof role === "string" ? role : role?.name)).filter(Boolean)
        : [];

    return {
        id: payload.id ?? payload.user_id ?? null,
        user: payload.name ?? payload.username ?? payload.sub ?? "Пользователь",
        roles: rolesFromToken,
        is_admin: payload.is_admin ?? payload.isAdmin ?? false,
    };
};

const getInitialUser = () => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token) return null;

    if (savedUser) {
        try {
            return JSON.parse(savedUser);
        } catch {
            localStorage.removeItem("user");
        }
    }

    const userFromToken = parseUserFromToken(token);
    if (!userFromToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
    }

    localStorage.setItem("user", JSON.stringify(userFromToken));
    return userFromToken;
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getInitialUser);

    const login = async (username, password) => {
        try {
            const { data } = await api.post("/jwt/login", {
                username,
                password,
            }, {
                skipGlobalErrorFlash: true,
            });

            const payload = data.message;

            localStorage.setItem("token", payload.token);

            const rolesList = payload.roles ? payload.roles.map((r) => r.name) : [];

            const userData = {
                id: payload.id,
                user: payload.name,
                roles: rolesList,
                is_admin: payload.is_admin,
            };

            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    const hasRole = (requiredRole) => {
        if (!user) return false;

        if (user.is_admin === 1 || user.is_admin === true) return true;

        return user.roles?.includes(requiredRole);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
