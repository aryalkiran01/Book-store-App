
import { AppShell } from "../components/AppShell";
import { LoginForm } from "../components/auth/login-form";
import { Footer } from "./Footer";
export function LoginPage() {

  return (
    <div className="flex flex-col min-h-screen">
    <AppShell>
      <div className="max-w-3xl mx-auto">
      
        <LoginForm />
      </div>
    </AppShell>
    <Footer/>
    </div>
  );
}
