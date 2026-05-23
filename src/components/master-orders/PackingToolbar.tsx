"use client";

import { useTranslations } from "next-intl";

export default function PackingToolbar() {
  const t = useTranslations("MasterPacking");

  return (
    <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: "10px 24px",
          background: "#0f172a",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {t("print_btn")}
      </button>
      <button
        onClick={() => window.history.back()}
        style={{
          padding: "10px 24px",
          background: "#e2e8f0",
          color: "#0f172a",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {t("back_btn")}
      </button>
    </div>
  );
}
