export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Student Networking CRM - API Backend</h1>
      <p>This is an API-only backend. Available endpoints:</p>
      <ul style={{ marginTop: "1rem" }}>
        <li><code>POST /api/contacts</code> - Create contact</li>
        <li><code>GET /api/crm/contacts</code> - List contacts</li>
        <li><code>POST /api/hunter/find-email</code> - Find email via Hunter.io</li>
        <li><code>POST /api/personalization/generate</code> - Generate AI personalization</li>
        <li><code>GET /api/auth/session</code> - Auth session</li>
      </ul>
    </main>
  )
}
