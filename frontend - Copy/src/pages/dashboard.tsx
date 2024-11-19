import { AppShell } from "../components/app-shell";
import { CreateBook } from "../components/book/create-book";
import { ListBooks } from "../components/book/list-books";
import { Footer } from "./Footer";
export function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
    <AppShell>
     <CreateBook/>
      <ListBooks />
    </AppShell>
    <Footer/>
    </div>
  );
}
