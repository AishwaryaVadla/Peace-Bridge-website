import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogById, updateBlog } from "../utils/blogAPI";

export default function BlogEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBlogById(id);
        setTitle(data.title || "");
        setAuthor(data.author || "");
        setContent(data.content || "");
        setTags((data.tags || []).join(", "));
      } catch (e) {
        setErr(e.message || "Failed to load blog");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
      await updateBlog(id, {
        title: title.trim(),
        author: author.trim(),
        tags: tagList,
        content,
        files,
      });
      nav(`/blogs/${id}`);
    } catch (e2) {
      setErr(e2.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page subtle">Loading…</div>;

  return (
    <div className="page">
      <Link className="link" to={`/blogs/${id}`}>← Back to Blog</Link>

      <div className="pageHeader">
        <h1>Edit Blog Post</h1>
        <p className="subtle">Update content and add attachments.</p>
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
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
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
              />
            </label>

            <button className="btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="preview">
            <div className="subtle" style={{ marginBottom: 8 }}>Preview</div>
            <div className="markdown card">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "_Start editing to see preview…_"}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
