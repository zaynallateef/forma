import { useState } from "react";
import { Search } from "lucide-react";
import { tools } from "../lib/tools";
import { ToolCard } from "../components/ToolCard";
export default function Tools() {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All tools");
  const filtered = tools.filter(
    (tool) =>
      (category === "All tools" || tool.category === category) &&
      `${tool.name} ${tool.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="wrap page-section">
      <span className="eyebrow">YOUR DOCUMENT TOOLKIT</span>
      <h1>
        Good tools. <em>Less work.</em>
      </h1>
      <p className="page-description">
        A simpler way to convert, organize, and make documents yours.
      </p>
      <div className="directory-controls">
        <div className="filter-row" aria-label="Tool categories">
          {[
            "All tools",
            "To PDF",
            "From PDF",
            "Organize",
            "Read & extract",
          ].map((item) => (
            <button
              className={category === item ? "filter active" : "filter"}
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Find a tool…"
            aria-label="Search tools"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="tools-grid">
        {filtered.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
      {!filtered.length && (
        <p role="status">
          No tools found. Try “PDF” or choose another category.
        </p>
      )}
    </section>
  );
}
