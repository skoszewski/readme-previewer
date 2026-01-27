import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Build API URL based on the current host
// This way it works when accessed from localhost, 127.0.0.1, IP address, or domain
const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = 3000;
  return `${protocol}//${hostname}:${port}`;
};

export default function MarkdownViewer({
  filePath,
  pollIntervalMs = 2000,
}: {
  filePath: string;
  pollIntervalMs?: number;
}) {
  const [content, setContent] = useState<string>("Loading...");
  const [apiUrl] = useState(getApiUrl());

  useEffect(() => {
    let mounted = true;

    const fetchFile = async () => {
      try {
        // Ensure path starts with /
        const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
        const url = `${apiUrl}/api/file?path=${encodeURIComponent(path)}`;

        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: res.statusText }));
          if (mounted) {
            setContent(
              `Error: ${error.error || error.message || "Failed to load file"}\n\nPath: ${path}`,
            );
          }
          return;
        }

        const text = await res.text();
        if (mounted) {
          setContent(text);
        }
      } catch (err) {
        if (mounted) {
          setContent(
            `Error: ${err instanceof Error ? err.message : String(err)}\n\nMake sure the markdown server is running on port 3000.`,
          );
        }
      }
    };

    fetchFile();
    const id = setInterval(fetchFile, pollIntervalMs);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [filePath, pollIntervalMs]);

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
