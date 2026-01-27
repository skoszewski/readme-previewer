import express from "express";
import { promises as fs } from "fs";
import { resolve, normalize } from "path";
import chokidar from "chokidar";

const app = express();
const PORT = 3000;

// Get markdown root from environment or use current directory
const markdownRoot = normalize(
  resolve(process.env.MARKDOWN_ROOT || process.cwd()),
);

console.log(`[markdown-server] Serving markdown files from: ${markdownRoot}`);

// Middleware to parse JSON
app.use(express.json());

// CORS headers for dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", markdownRoot });
});

// API endpoint for markdown files using query parameter
// GET /api/file?path=... - query parameter approach
app.get("/api/file", async (req, res) => {
  try {
    let filePath = req.query.path;

    // Default to root if no path provided
    if (!filePath || filePath === "/" || filePath === "") {
      filePath = ".";
    }

    // Remove leading slashes to prevent absolute path resolution
    if (typeof filePath === "string") {
      filePath = filePath.replace(/^\/+/, "");
    }

    // Normalize the requested path
    const normalizedPath = normalize(filePath);

    // Resolve relative to markdown root
    const fullPath = resolve(markdownRoot, normalizedPath);

    // Security: Prevent directory traversal attacks
    if (!fullPath.startsWith(markdownRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if it's a directory - try README.md then index.md
    let fileToRead = fullPath;
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        // Try README.md first
        try {
          await fs.access(resolve(fullPath, "README.md"));
          fileToRead = resolve(fullPath, "README.md");
        } catch {
          // Try index.md
          try {
            await fs.access(resolve(fullPath, "index.md"));
            fileToRead = resolve(fullPath, "index.md");
          } catch {
            return res.status(404).json({
              error: "No README.md or index.md found in directory",
              path: filePath,
            });
          }
        }
      }
    } catch (err) {
      // File doesn't exist
      return res.status(404).json({ error: "File not found", path: filePath });
    }

    // Read the file
    const content = await fs.readFile(fileToRead, "utf-8");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(content);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Failed to read file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function watchMarkdownFiles() {
  const watcher = chokidar.watch(markdownRoot, {
    ignored: /(^|[\/\\])\.|node_modules/,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  });

  watcher.on("change", (path) => {
    if (path.endsWith(".md")) {
      console.log(`[markdown-server] File changed: ${path}`);
    }
  });

  watcher.on("add", (path) => {
    if (path.endsWith(".md")) {
      console.log(`[markdown-server] File added: ${path}`);
    }
  });

  watcher.on("unlink", (path) => {
    if (path.endsWith(".md")) {
      console.log(`[markdown-server] File removed: ${path}`);
    }
  });

  watcher.on("error", (error) => {
    console.error("[markdown-server] Watcher error:", error);
  });
}

// Start watching
watchMarkdownFiles();

// Start server - listen on all interfaces so it's accessible from other devices
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[markdown-server] Server running on http://0.0.0.0:${PORT}`);
  console.log(
    `[markdown-server] API endpoint: http://0.0.0.0:${PORT}/api/files/*`,
  );
});
