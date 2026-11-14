"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useRange } from "@/hooks/range-context";
import { useApp } from "@/hooks/app-context";
import { useStats } from "@/hooks/useStats";
import { RangeBar } from "@/components/RangeBar";
import { Button, Card, CardTitle, PageHeader, Segmented, fmt } from "@/components/ui";
import { localTz } from "@/lib/ranges";

const SCOPES = [
  { id: "combined", title: "Combined statistics", desc: "Totals plus every key and mouse button." },
  { id: "keyboard", title: "Keyboard statistics", desc: "Per-key counts, categories and share." },
  { id: "mouse", title: "Mouse statistics", desc: "Button clicks and scroll directions." },
  { id: "hourly", title: "Hourly breakdown", desc: "Totals per hour in the selected range." },
  { id: "daily", title: "Daily breakdown", desc: "Totals per day." },
  { id: "weekly", title: "Weekly breakdown", desc: "Totals per ISO week (Monday start)." },
  { id: "monthly", title: "Monthly breakdown", desc: "Totals per calendar month." },
  { id: "quarterly", title: "Quarterly breakdown", desc: "Totals per calendar quarter." },
  { id: "yearly", title: "Yearly breakdown", desc: "Totals per calendar year." },
];

export default function ReportsPage() {
  const { params, resolved } = useRange();
  const { toast } = useApp();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const { data } = useStats(params);

  const download = (scope: string) => {
    const q = new URLSearchParams({ scope, format, to: params.to, tz: localTz() });
    if (params.from) q.set("from", params.from);
    const a = document.createElement("a");
    a.href = `/api/export?${q}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(`Exporting ${scope} report as ${format.toUpperCase()}`, "success");
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Export real aggregated values from your local database." right={<RangeBar showUnit={false} />} />
      <Card hover={false} className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted">Report period</div>
            <div className="text-[15px] font-semibold">{resolved.label}</div>
            <div className="mt-1 text-xs text-muted">
              {data ? `${fmt(data.totals.events)} events · ${fmt(data.totals.keys)} key presses · ${fmt(data.totals.clicks)} clicks · ${fmt(data.totals.scrolls)} scrolls` : "Loading…"}
            </div>
          </div>
          <Segmented
            id="fmt"
            value={format}
            onChange={setFormat}
            options={[
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SCOPES.map((s) => (
          <Card key={s.id}>
            <CardTitle title={s.title} hint={s.desc} />
            <Button variant="primary" onClick={() => download(s.id)} className="w-full">
              {format === "csv" ? <FileSpreadsheet size={15} /> : <FileJson size={15} />}
              <Download size={14} />
              Download {format.toUpperCase()}
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Files are saved through your browser&apos;s download flow. The packaged desktop build would use a native Windows save dialog.
      </p>
    </div>
  );
}
