import type { Filters } from "../types";

interface Props {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  categories: string[];
  onReset: () => void;
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "untagged", label: "⬜ No Status" },
  { value: "lead", label: "🎯 Lead" },
  { value: "not_a_lead", label: "❌ Not a Lead" },
  { value: "contacted", label: "📞 Contacted" },
  { value: "replied", label: "💬 Replied" },
  { value: "deal_closed", label: "🤝 Deal Closed" },
];

const selectCls =
  "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full";

export default function FilterBar({
  filters,
  setFilters,
  categories,
  onReset,
}: Props) {
  const set = (key: keyof Filters, value: unknown) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Category */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => set("category", e.target.value)}
            className={selectCls}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
            className={selectCls}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rating Range */}
        <div className="flex flex-col gap-1" style={{ minWidth: 200 }}>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Rating Range:{" "}
            <span className="text-white">
              {filters.minRating === 0 && filters.maxRating === 5
                ? "Any"
                : `⭐ ${filters.minRating} — ${filters.maxRating}`}
            </span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 28 }}>
                Min
              </span>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={filters.minRating}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  set("minRating", val);
                  if (val > filters.maxRating) set("maxRating", val);
                }}
                className="accent-blue-500 w-full"
              />
              <span
                style={{
                  fontSize: 12,
                  color: "#fff",
                  width: 24,
                  textAlign: "right",
                }}
              >
                {filters.minRating}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 28 }}>
                Max
              </span>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={filters.maxRating}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  set("maxRating", val);
                  if (val < filters.minRating) set("minRating", val);
                }}
                className="accent-blue-500 w-full"
              />
              <span
                style={{
                  fontSize: 12,
                  color: "#fff",
                  width: 24,
                  textAlign: "right",
                }}
              >
                {filters.maxRating}
              </span>
            </div>
          </div>
        </div>

        {/* Reviews Range */}
        <div className="flex flex-col gap-1" style={{ minWidth: 200 }}>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Reviews Range:{" "}
            <span className="text-white">
              {filters.minReviews === 0 && filters.maxReviews === 999999
                ? "Any"
                : `${filters.minReviews} — ${filters.maxReviews === 999999 ? "∞" : filters.maxReviews}`}
            </span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280" }}>Min</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={filters.minReviews || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  set("minReviews", val);
                  if (val > filters.maxReviews) set("maxReviews", val);
                }}
                style={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "#fff",
                  fontSize: 13,
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "#4b5563",
                paddingTop: 16,
              }}
            >
              —
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280" }}>Max</span>
              <input
                type="number"
                min={0}
                placeholder="∞"
                value={filters.maxReviews === 999999 ? "" : filters.maxReviews}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 999999;
                  set("maxReviews", val);
                  if (val < filters.minReviews) set("minReviews", val);
                }}
                style={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "#fff",
                  fontSize: 13,
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Has Website */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Website
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(["all", "yes", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => set("hasWebsite", v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${filters.hasWebsite === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {v === "all" ? "All" : v === "yes" ? "✅ Has" : "❌ None"}
              </button>
            ))}
          </div>
        </div>

        {/* Has Phone */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Phone
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(["all", "yes", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => set("hasPhone", v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.hasPhone === v
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {v === "all" ? "All" : v === "yes" ? "📞 Has" : "🚫 None"}
              </button>
            ))}
          </div>
        </div>

        {/* Has Social */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Social
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(["all", "yes", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => set("hasSocial", v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.hasSocial === v
                    ? "bg-pink-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {v === "all" ? "All" : v === "yes" ? "📸 Has" : "🚫 None"}
              </button>
            ))}
          </div>
        </div>

        {/* Open Now */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Open Now
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(["all", "yes", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => set("isOpenNow", v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${filters.isOpenNow === v ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {v === "all" ? "All" : v === "yes" ? "🟢 Open" : "🔴 Closed"}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 border border-gray-700 transition-colors self-end"
        >
          ↺ Reset All
        </button>
      </div>
    </div>
  );
}
