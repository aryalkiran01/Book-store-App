import { AppShell } from "../components/AppShell";
import { RegisterForm } from "../components/auth/register-form";
import { Footer } from "./Footer";

export function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <AppShell />
      <div className="flex-1 flex items-center justify-center max-w-3xl mx-auto px-4 w-full">
        <RegisterForm />
      </div>
      <Footer />
    </div>
  );
}

export default RegisterPage;
