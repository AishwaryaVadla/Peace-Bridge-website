import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createBlog } from "../utils/blogAPI";

export default function BlogNew() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const tagList = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!title.trim() || !content.trim()) {
      setErr("Title and content are required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createBlog({
        title: title.trim(),
        author: author.trim(),
        tags: tagList,
        content,
        links: links
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        files,
      });
      nav(`/blogs/${created.id}`);
    } catch (e2) {
      setErr(e2.message || "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Link className="link" to="/blogs">← Back to Blogs</Link>

      <div className="pageHeader">
        <h1>New Blog Post</h1>
        <p className="subtle">Markdown editor with live preview.</p>
      </div>

      {err && <div className="alert">{err}</div>}

      <form className="blogForm" onSubmit={onSubmit}>
        <label>
          Title *
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Author (optional)
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>

        <label>
          Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="conflict, teamwork, reflection" />
        </label>

        <label>
          Links (one per line)
          <textarea
            rows={3}
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="https://example.com/resource"
          />
        </label>

        <label>
          Attach files (images, pdf, etc.)
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          {!!files.length && (
            <div className="muted small" style={{ marginTop: 6 }}>
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </div>
          )}
        </label>

        <div className="split">
          <div>
            <label>
              Content (Markdown) *
              <textarea
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"Write in Markdown...\n\n## Heading\n- Bullet\n\n**Bold** and [link](https://...)"}
              />
            </label>

            <button className="btn" disabled={saving}>
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>

        <div className="preview">
            <div className="subtle" style={{ marginBottom: 8 }}>Preview</div>
            <div className="markdown card">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "_Start writing to see preview…_"}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
