import { AppShell } from "../components/app-shell";
import { RegisterForm } from "../components/auth/register-form";
import { Footer } from "./Footer";
export function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen">
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <RegisterForm />
      </div>
    </AppShell>
    <Footer />
    </div>
  );
}
