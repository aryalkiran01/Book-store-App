import { AppShell } from "../components/app-shell";
// import { ListBooks } from "../components/book/list-book";
import { Footer } from "./Footer";
import { Homebooks } from "../components/auth/home";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShell>
      
      </AppShell>
      <Homebooks/>

      <Footer />
    </div>
  );
}
