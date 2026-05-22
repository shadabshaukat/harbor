import Link from "next/link";
import { signIn } from "@/app/actions/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container">
      <h1>Login</h1>
      {searchParams?.error ? <p style={{ color: "#b42318" }}>{searchParams.error}</p> : null}
      <form action={signIn} className="card" style={{ maxWidth: 460 }}>
        <label>Email</label>
        <input name="email" type="email" required style={{ width: "100%", marginBottom: 12 }} />
        <label>Password</label>
        <input name="password" type="password" required style={{ width: "100%", marginBottom: 16 }} />
        <button className="btn" type="submit">Sign in</button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        No account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
