import { AppShell } from "../components/AppShell";
// import { ListBooks } from "../components/book/list-book";
import { Footer } from "./Footer";
// import { Homebooks } from "../components/auth/home";
import ShoppingCart from "../components/shoopingcart";

export function ShoppingCarts() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShell/>
      <ShoppingCart/>
      <Footer />
    </div>
  );
}
