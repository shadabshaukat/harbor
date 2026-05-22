import Link from "next/link";
import { signIn } from "@/app/actions/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container auth-wrap">
      <h1>Login</h1>
      {searchParams?.error ? <p className="error">{searchParams.error}</p> : null}
      <form action={signIn} className="card form">
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
        <label className="label">Password</label>
        <input className="input" name="password" type="password" required />
        <button className="btn" type="submit">Sign in</button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        No account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
