import MarkdownViewer from "./MarkdownViewer";

export default function App() {
  return <MarkdownViewer url="/README.md" pollIntervalMs={1500} />;
}