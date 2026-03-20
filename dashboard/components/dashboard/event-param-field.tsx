"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ParamDef } from "@/lib/platform-events";
import { CURRENCY_CODES } from "@/lib/platform-events";

export interface EventParamFieldProps {
  param: ParamDef;
  value: string | number | boolean;
  onChange: (key: string, value: string | number | boolean) => void;
}

export function EventParamField({ param, value, onChange }: EventParamFieldProps) {
  const id = `param-${param.key}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">
          {param.label}
        </Label>
        {param.required && (
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
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

      {param.type === "number" && (
        <Input
          id={id}
          type="number"
          step="any"
          placeholder={param.placeholder}
          value={value === "" || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange(param.key, v === "" ? "" : Number(v));
          }}
          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 rounded-lg"
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
