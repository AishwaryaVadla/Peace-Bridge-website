const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    // Try to parse JSON error; otherwise return status text
    let errMsg = `HTTP ${res.status}`;
    if (contentType.includes("application/json")) {
      const errBody = await res.json().catch(() => ({}));
      errMsg = errBody.error || errMsg;
    } else {
      const text = await res.text().catch(() => "");
      if (text) errMsg = text;
    }
    throw new Error(errMsg);
  }

  if (!contentType.includes("application/json")) {
    // Received HTML (likely a 404 page) instead of JSON
    const text = await res.text().catch(() => "");
    throw new Error(text || "Unexpected non-JSON response");
  }

  return res.json();
}

export async function getBlogs() {
  return fetchJson("/api/blogs");
}

export async function getBlogById(id) {
  return fetchJson(`/api/blogs/${id}`);
}

export async function createBlog(payload) {
  const fd = new FormData();
  fd.append("title", payload.title || "");
  fd.append("author", payload.author || "");
  fd.append("content", payload.content || "");
  fd.append("tags", JSON.stringify(payload.tags || []));
  fd.append("links", JSON.stringify(payload.links || []));
  (payload.files || []).forEach((f) => fd.append("files", f));

  return fetchJson("/api/blogs", {
    method: "POST",
    body: fd,
  });
}

export async function updateBlog(id, payload) {
  const hasFiles = payload?.files?.length;
  if (hasFiles) {
    const fd = new FormData();
    if (payload.title !== undefined) fd.append("title", payload.title);
    if (payload.author !== undefined) fd.append("author", payload.author);
    if (payload.content !== undefined) fd.append("content", payload.content);
    if (payload.tags !== undefined) fd.append("tags", JSON.stringify(payload.tags));
    if (payload.links !== undefined) fd.append("links", JSON.stringify(payload.links));
    payload.files.forEach((f) => fd.append("files", f));
    return fetchJson(`/api/blogs/${id}`, {
      method: "PUT",
      body: fd,
    });
  }

  return fetchJson(`/api/blogs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      author: payload.author,
      content: payload.content,
      tags: payload.tags,
      links: payload.links,
    }),
  });
}

export async function deleteBlog(id) {
  return fetchJson(`/api/blogs/${id}`, { method: "DELETE" });
}
