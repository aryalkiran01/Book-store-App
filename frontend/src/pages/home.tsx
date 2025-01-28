import { AppShell } from "../components/AppShell";
// import { ListBooks } from "../components/book/list-book";
import { Footer } from "./Footer";
// import { Homebooks } from "../components/auth/home";
import UserListBooks from "../components/book/list-book";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShell>
 
        <>
       
        </>
      </AppShell>

      <UserListBooks />

      <Footer />
    </div>
  );
}
