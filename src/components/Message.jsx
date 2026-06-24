export default function Message({ role, content, loading = false }) {
  return (
    <div className={`message-row ${role}`}>
      <article className={`message ${role} ${loading ? "loading" : ""}`}>
        {loading ? "Pensando sin streaming..." : content}
      </article>
    </div>
  );
}
