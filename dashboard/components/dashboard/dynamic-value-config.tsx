"use client";

import { cn } from "@/lib/utils";

export type ValueSource = "data_attribute" | "css_selector" | "json_ld";
export type ValueTransform = "as_is" | "strip_currency" | "parse_number";

interface DynamicValueConfigProps {
  source: ValueSource;
  selector: string;
  transform: ValueTransform;
  onChange: (config: {
    source: ValueSource;
    selector: string;
    transform: ValueTransform;
  }) => void;
}

const SOURCE_OPTIONS: { value: ValueSource; label: string }[] = [
  { value: "data_attribute", label: "Data attribute" },
  { value: "css_selector", label: "CSS selector" },
  { value: "json_ld", label: "JSON-LD path" },
];

const TRANSFORM_OPTIONS: { value: ValueTransform; label: string }[] = [
  { value: "as_is", label: "As-is" },
  { value: "strip_currency", label: "Strip currency symbols" },
  { value: "parse_number", label: "Parse number" },
];

const SELECTOR_PLACEHOLDER: Record<ValueSource, string> = {
  data_attribute: "data-price",
  css_selector: ".product-price",
  json_ld: "Product.offers.price",
};

const selectClass = cn(
  "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900",
  "focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
);

const inputClass = cn(
  "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900",
  "placeholder:text-slate-400",
  "focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
);

export function DynamicValueConfig({
  source,
  selector,
  transform,
  onChange,
}: DynamicValueConfigProps) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Source</label>
        <select
          value={source}
          onChange={(e) =>
            onChange({ source: e.target.value as ValueSource, selector, transform })
          }
          className={selectClass}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">
          {source === "data_attribute"
            ? "Attribute name"
            : source === "css_selector"
            ? "CSS selector"
            : "JSON-LD path"}
        </label>
        <input
          type="text"
          value={selector}
          placeholder={SELECTOR_PLACEHOLDER[source]}
          onChange={(e) =>
            onChange({ source, selector: e.target.value, transform })
          }
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Transform</label>
        <select
          value={transform}
          onChange={(e) =>
            onChange({ source, selector, transform: e.target.value as ValueTransform })
          }
          className={selectClass}
        >
          {TRANSFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
