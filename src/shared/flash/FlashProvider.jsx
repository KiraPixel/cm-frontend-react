import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { subscribeFlash } from "./flashBus";
import "./flash.css";

const AUTO_DISMISS_MS = 5000;
const EXIT_ANIMATION_MS = 220;
const FlashContext = createContext(null);

const normalizeFlash = (incoming) => {
    if (typeof incoming === "string") {
        return { type: "info", message: incoming };
    }

    return {
        type: incoming?.type || "info",
        message: incoming?.message || "Событие",
        title: incoming?.title || "",
    };
};

export function FlashProvider({ children }) {
    const idRef = useRef(0);
    const dismissTimersRef = useRef(new Map());
    const removeTimersRef = useRef(new Map());
    const [flashes, setFlashes] = useState([]);

    const hardRemoveFlash = useCallback((id) => {
        const dismissTimer = dismissTimersRef.current.get(id);
        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimersRef.current.delete(id);
        }

        const removeTimer = removeTimersRef.current.get(id);
        if (removeTimer) {
            clearTimeout(removeTimer);
            removeTimersRef.current.delete(id);
        }

        setFlashes((prev) => prev.filter((flash) => flash.id !== id));
    }, []);

    const removeFlash = useCallback((id) => {
        let shouldScheduleRemove = false;

        setFlashes((prev) => prev.map((flash) => {
            if (flash.id !== id) return flash;
            if (flash.isClosing) return flash;
            shouldScheduleRemove = true;
            return { ...flash, isClosing: true };
        }));

        if (shouldScheduleRemove) {
            const timer = setTimeout(() => hardRemoveFlash(id), EXIT_ANIMATION_MS);
            removeTimersRef.current.set(id, timer);
        }
    }, [hardRemoveFlash]);

    const addFlash = useCallback((incoming) => {
        const normalized = normalizeFlash(incoming);
        const id = ++idRef.current;

        setFlashes((prev) => [{ ...normalized, id, isClosing: false }, ...prev]);

        const dismissTimer = setTimeout(() => removeFlash(id), AUTO_DISMISS_MS);
        dismissTimersRef.current.set(id, dismissTimer);
    }, [removeFlash]);

    useEffect(() => subscribeFlash(addFlash), [addFlash]);

    useEffect(() => () => {
        dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
        removeTimersRef.current.forEach((timer) => clearTimeout(timer));
        dismissTimersRef.current.clear();
        removeTimersRef.current.clear();
    }, []);

    const api = useMemo(() => ({
        add: addFlash,
        info: (message, title = "") => addFlash({ type: "info", message, title }),
        success: (message, title = "") => addFlash({ type: "success", message, title }),
        warning: (message, title = "") => addFlash({ type: "warning", message, title }),
        error: (message, title = "") => addFlash({ type: "danger", message, title }),
    }), [addFlash]);

    return (
        <FlashContext.Provider value={api}>
            {children}
            <div className="flash-stack" aria-live="polite" aria-atomic="true">
                {flashes.map((flash) => (
                    <div
                        key={flash.id}
                        className={`alert alert-${flash.type} flash-item ${flash.isClosing ? "is-leaving" : ""}`}
                        role="alert"
                    >
                        <div className="flash-item-body">
                            {flash.title && <div className="flash-item-title">{flash.title}</div>}
                            <div>{flash.message}</div>
                        </div>
                        <button
                            type="button"
                            className="btn-close flash-close"
                            aria-label="Закрыть"
                            onClick={() => removeFlash(flash.id)}
                        />
                    </div>
                ))}
            </div>
        </FlashContext.Provider>
    );
}

export const useFlash = () => {
    const context = useContext(FlashContext);
    if (!context) {
        throw new Error("useFlash must be used within FlashProvider");
    }
    return context;
};
