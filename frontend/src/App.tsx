import "./App.css";
import { QueryClientProvider } from "./query";
import { RouterProvider } from "./router";
import { ThemeProvider } from "./context/ThemeContext";

import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { SkipLink } from "./components/common/SkipLink";

function App() {
  return (
    <ErrorBoundary>
      <SkipLink />
      <ThemeProvider>
        <QueryClientProvider>
          <RouterProvider />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
