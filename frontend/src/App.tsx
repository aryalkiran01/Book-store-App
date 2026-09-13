import "./App.css";
import { QueryClientProvider } from "./query";
import { RouterProvider } from "./router";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider>
        <RouterProvider />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
