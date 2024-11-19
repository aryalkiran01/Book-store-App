import { AppShell } from "../components/app-shell";
// import { ListBooks } from "../components/book/list-book";
import { Footer } from "./Footer";
import { Homebooks } from "../components/auth/home";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShell>
        {/* Pass any content here or leave it empty */}
        <>
          {/* Additional content for AppShell can be added here */}
        </>
      </AppShell>
      <Homebooks />
      <Footer />
    </div>
  );
}
