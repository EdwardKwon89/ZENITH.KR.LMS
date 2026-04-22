"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ZenInput } from "@/components/ui/ZenUI";
import { Search, AlertTriangle, Filter } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

export default function InventoryFilterBar({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    router.push(`${pathname}?${createQueryString("search", value)}`);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handleToggleLowStock = () => {
    const newValue = !lowStockOnly;
    setLowStockOnly(newValue);
    router.push(`${pathname}?${createQueryString("lowStock", newValue.toString())}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-sm">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <ZenInput
          placeholder="Search by SKU or Item Name..."
          value={search}
          onChange={handleSearchChange}
          className="pl-12 bg-white border-slate-200 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleLowStock}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-sm font-semibold ${
            lowStockOnly
              ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle size={16} />
          Low Stock Only
        </button>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm font-semibold">
          <Filter size={16} />
          Filters
        </button>
      </div>
    </div>
  );
}
