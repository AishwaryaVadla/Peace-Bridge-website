import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteBlog, getBlogById } from "../utils/blogAPI";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [blog, setBlog] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getBlogById(id);
        setBlog(data);
      } catch (e) {
        setErr(e.message || "Failed to load blog");
      }
    })();
  }, [id]);

  if (err) {
    return (
      <div className="page">
        <div className="alert">{err}</div>
        <Link className="link" to="/blogs">← Back to Blogs</Link>
      </div>
    );
  }

  if (!blog) return <div className="page subtle">Loading…</div>;

  const onDelete = async () => {
    if (!window.confirm("Delete this blog? This cannot be undone.")) return;
    try {
      await deleteBlog(id);
      nav("/blogs");
    } catch (e) {
      setErr(e.message || "Failed to delete");
    }
  };

  return (
    <div className="page">
      <Link className="link" to="/blogs">← Back to Blogs</Link>

      <div className="blogHeader">
        <h1>{blog.title}</h1>
        <div className="meta">
          <span>{blog.author || "Anonymous"}</span>
          <span>•</span>
          <span>{new Date(blog.createdAt).toLocaleString()}</span>
        </div>
        {!!(blog.tags || []).length && (
          <div className="tags">
            {blog.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Link className="btn" to={`/blogs/${id}/edit`}>Edit</Link>
          <button className="btn" style={{ background: "#c62828" }} onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="markdown card">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {blog.content || ""}
        </ReactMarkdown>
      </div>

      {!!(blog.attachments || []).length && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Attachments</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {blog.attachments.map((f) => (
              <li key={f.url} style={{ marginBottom: 8 }}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.name || f.url}
                </a>
                {f.type === "link" ? " (link)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
