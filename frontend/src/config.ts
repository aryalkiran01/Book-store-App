export const env = {
  NODE_ENV: import.meta.env.MODE || "development",
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4000",
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173",
};

