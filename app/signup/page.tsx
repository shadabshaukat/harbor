import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container auth-wrap">
      <h1>Create account</h1>
      {searchParams?.error ? <p className="error">{searchParams.error}</p> : null}
      <form action={signUp} className="card form">
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
        <label className="label">Password</label>
        <input className="input" name="password" type="password" required />
        <button className="btn" type="submit">Sign up</button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
