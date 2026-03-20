"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ParamDef } from "@/lib/platform-events";
import { CURRENCY_CODES } from "@/lib/platform-events";
import {
  DynamicValueConfig,
  type ValueSource,
  type ValueTransform,
} from "./dynamic-value-config";

export interface EventParamFieldProps {
  param: ParamDef;
  value: string | number | boolean;
  valueSource?: "static" | "data_attribute" | "css_selector" | "json_ld";
  dynamicConfig?: {
    selector: string;
    transform: "as_is" | "strip_currency" | "parse_number";
  };
  onChange: (
    key: string,
    value: string | number | boolean,
    valueSource?: string,
    dynamicConfig?: object
  ) => void;
}

export function EventParamField({
  param,
  value,
  valueSource = "static",
  dynamicConfig,
  onChange,
}: EventParamFieldProps) {
  const id = `param-${param.key}`;

  // Determine initial mode for number fields
  const isDynamic =
    param.type === "number" &&
    valueSource !== "static" &&
    valueSource !== undefined;

  const [numberMode, setNumberMode] = useState<"static" | "dynamic">(
    isDynamic ? "dynamic" : "static"
  );

  // Dynamic config local state (seeded from props)
  const [dynSource, setDynSource] = useState<ValueSource>(
    (valueSource !== "static" ? valueSource : "data_attribute") as ValueSource
  );
  const [dynSelector, setDynSelector] = useState(
    dynamicConfig?.selector ?? ""
  );
  const [dynTransform, setDynTransform] = useState<ValueTransform>(
    dynamicConfig?.transform ?? "as_is"
  );

  const handleModeSwitch = (mode: "static" | "dynamic") => {
    setNumberMode(mode);
    if (mode === "static") {
      onChange(param.key, "", "static");
    } else {
      onChange(param.key, "", dynSource, {
        selector: dynSelector,
        transform: dynTransform,
      });
    }
  };

  const handleDynamicChange = (config: {
    source: ValueSource;
    selector: string;
    transform: ValueTransform;
  }) => {
    setDynSource(config.source);
    setDynSelector(config.selector);
    setDynTransform(config.transform);
    onChange(param.key, "", config.source, {
      selector: config.selector,
      transform: config.transform,
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">
          {param.label}
        </Label>
        {param.required && (
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
        )}
        {param.type === "number" && (
          <div className="ml-auto flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => handleModeSwitch("static")}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                numberMode === "static"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Static
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("dynamic")}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                numberMode === "dynamic"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Dynamic
            </button>
          </div>
        )}
      </div>

      {param.type === "currency" && (
        <select
          id={id}
          value={String(value || param.defaultValue || "")}
          onChange={(e) => onChange(param.key, e.target.value)}
          className={cn(
            "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900",
            "focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
          )}
        >
          <option value="">Select currency</option>
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      )}

      {param.type === "number" && numberMode === "static" && (
        <Input
          id={id}
          type="number"
          step="any"
          placeholder={param.placeholder}
          value={value === "" || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange(param.key, v === "" ? "" : Number(v), "static");
          }}
          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 rounded-lg"
        />
      )}

      {param.type === "number" && numberMode === "dynamic" && (
        <DynamicValueConfig
          source={dynSource}
          selector={dynSelector}
          transform={dynTransform}
          onChange={handleDynamicChange}
        />
      )}

      {param.type === "string" && (
        <Input
          id={id}
          type="text"
          placeholder={param.placeholder}
          value={String(value || "")}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 rounded-lg"
        />
      )}

      {param.type === "string_array" && (
        <Input
          id={id}
          type="text"
          placeholder={`${param.placeholder || "value1, value2"} (comma-separated)`}
          value={String(value || "")}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 rounded-lg"
        />
      )}

      {param.type === "boolean" && (
        <div className="flex items-center gap-2 pt-0.5">
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(param.key, checked)}
          />
          <span className="text-sm text-slate-500">
            {value ? "Enabled" : "Disabled"}
          </span>
        </div>
      )}
    </div>
  );
}
