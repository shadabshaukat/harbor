import { DashboardNav } from "@/app/dashboard/_components/nav";
import { InviteStaffForm } from "@/app/dashboard/team/invite-staff-form";
import { requireOnboardedUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { supabase } = await requireOnboardedUser();

  const [{ data: staff }, { data: invites }, { data: stores }] = await Promise.all([
    supabase
      .from("users_profile")
      .select("id,full_name,role,is_active,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_invites")
      .select("id,invited_email,role,status,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("stores")
      .select("id,name")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
  ]);

  return (
    <main className="app-shell">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Harbor Team</p>
          <h1>Team and Workspace Access</h1>
        </div>
      </header>

      <DashboardNav />

      <InviteStaffForm stores={stores ?? []} />

      <section className="panel team-section">
        <h2>Employee Directory</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Active</th><th>Joined</th></tr></thead>
            <tbody>
              {(staff ?? []).map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name ?? "-"}</td>
                  <td>{member.role}</td>
                  <td>{member.is_active ? "Yes" : "No"}</td>
                  <td>{new Date(member.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel team-section">
        <h2>Recent Invites</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th></tr></thead>
            <tbody>
              {(invites ?? []).map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.invited_email}</td>
                  <td>{invite.role}</td>
                  <td>{invite.status}</td>
                  <td>{new Date(invite.expires_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
