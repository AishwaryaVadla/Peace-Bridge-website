import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBlogs } from "../utils/blogAPI";
import "../index.css";

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getBlogs();
        setBlogs(data);
      } catch (e) {
        setErr(e.message || "Failed to load blogs");
      }
    })();
  }, []);

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Blogs</h1>
        <p className="subtle">
          Student reflections, academic write-ups, and lessons learned.
        </p>
        <Link className="btn" to="/blogs/new">New Post</Link>
      </div>

      {err && <div className="alert">{err}</div>}

      <div className="cardList">
        {blogs.map((b) => (
          <Link key={b.id} className="card" to={`/blogs/${b.id}`}>
            <h3>{b.title}</h3>
            <div className="meta">
              <span>{b.author || "Anonymous"}</span>
              <span>•</span>
              <span>{new Date(b.createdAt).toLocaleDateString()}</span>
            </div>
            {!!(b.tags || []).length && (
              <div className="tags">
                {b.tags.slice(0, 4).map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            )}
            <p className="excerpt">
              {(b.content || "").slice(0, 160)}
              {(b.content || "").length > 160 ? "..." : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
