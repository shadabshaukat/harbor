import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container">
      <h1>Create account</h1>
      {searchParams?.error ? <p style={{ color: "#b42318" }}>{searchParams.error}</p> : null}
      <form action={signUp} className="card" style={{ maxWidth: 460 }}>
        <label>Email</label>
        <input name="email" type="email" required style={{ width: "100%", marginBottom: 12 }} />
        <label>Password</label>
        <input name="password" type="password" required style={{ width: "100%", marginBottom: 16 }} />
        <button className="btn" type="submit">Sign up</button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
