import axios from "axios";
import { pushFlash } from "../flash/flashBus";

export const api = axios.create({
    baseURL: "/api"
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const shouldSkip = error?.config?.skipGlobalErrorFlash;
        if (!shouldSkip) {
            const status = error?.response?.status;
            const method = (error?.config?.method || "request").toUpperCase();
            const url = error?.config?.url || "";
            const serverMessage = error?.response?.data?.message;
            const fallback = status
                ? `Ошибка ${status} при ${method} ${url}`
                : `Сетевая ошибка при ${method} ${url}`;

            pushFlash({
                type: "danger",
                title: "Ошибка API",
                message: serverMessage || fallback,
            });
        }

        return Promise.reject(error);
    }
);
