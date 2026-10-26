import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tool } from "../lib/tools";
export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      className="tool-card"
      to={
        tool.category === "Read & extract"
          ? `/studio?tool=${tool.id}`
          : `/tools/${tool.id}`
      }
    >
      <div className="card-top">
        <span className={`tool-icon ${tool.tone}`}>
          <Icon size={23} strokeWidth={1.5} />
        </span>
        <ArrowUpRight className="card-arrow" size={18} />
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
    </Link>
  );
}
