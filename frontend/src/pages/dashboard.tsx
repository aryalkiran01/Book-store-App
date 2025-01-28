import { AppShell } from "../components/AppShell";
import { CreateBook } from "../components/book/create-book";
import { UserListBooks } from "../components/book/list-books";
import { Footer } from "./Footer";
export function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShell/>
     <CreateBook/>
      <UserListBooks />
   
    <Footer/>
    </div>
  );
}
