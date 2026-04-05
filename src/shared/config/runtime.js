const rawApiDocsPath = import.meta.env.VITE_API_DOCS_PATH || "/api/";

export const API_DOCS_PATH = rawApiDocsPath.startsWith("/")
    ? rawApiDocsPath
    : `/${rawApiDocsPath}`;
