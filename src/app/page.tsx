import { redirect } from "next/navigation";

export default function Home() {
  // Authenticated users are redirected to /dashboard by SessionProvider
  // Unauthenticated users are redirected to /login by SessionProvider
  // This page should ideally not be reached by users.
  // If it is, we can redirect them to a default authenticated route.
  redirect("/dashboard");
}