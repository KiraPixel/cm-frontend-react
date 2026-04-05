const listeners = new Set();

export const subscribeFlash = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const pushFlash = (flash) => {
    listeners.forEach((listener) => listener(flash));
};
