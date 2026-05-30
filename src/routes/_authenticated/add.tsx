import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { estimateProtein } from "@/lib/protein.functions";
import { toast } from "sonner";
import { Sparkles, Pencil, ArrowLeft, ImagePlus, X } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Add log — Whey" }] }),
  component: AddPage,
});

type Item = { food_name: string; protein_g: number };

function AddPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [foodName, setFoodName] = useState("");
  const [protein, setProtein] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const estimate = useServerFn(estimateProtein);

  function onPickImage(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("image_too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function runEstimate() {
    if (!description.trim() && !imageDataUrl) return;
    setBusy(true);
    try {
      const result = await estimate({
        data: { description, image_data_url: imageDataUrl ?? undefined },
      });
      setItems(result.items);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("estimate_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveItems(
    rows: Array<{ food_name: string; protein_g: number; quantity?: string | null }>,
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("food_log")
      .insert(rows.map((r) => ({ ...r, user_id: user.id })));
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("logged_ok"));
    navigate({ to: "/home" });
  }

  async function saveManual() {
    if (!foodName || !protein) return;
    setBusy(true);
    await saveItems([
      { food_name: foodName, protein_g: Number(protein), quantity: quantity || null },
    ]);
    setBusy(false);
  }

  return (
    <div>
      <header className="pt-8 pb-6 px-6 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="size-9 rounded-full bg-surface grid place-items-center"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("add_protein")}</h1>
      </header>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-2 bg-surface p-1.5 rounded-2xl mb-6">
          <button
            onClick={() => {
              setMode("ai");
              setItems(null);
            }}
            className={`rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${mode === "ai" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            <Sparkles className="size-4" /> {t("ai_estimate")}
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${mode === "manual" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            <Pencil className="size-4" /> {t("manual")}
          </button>
        </div>

        {mode === "ai" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("describe_ate")}
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("describe_placeholder")}
                className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none resize-none"
              />
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onPickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {imageDataUrl ? (
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-border">
                <img
                  src={imageDataUrl}
                  alt="food preview"
                  className="w-full max-h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageDataUrl(null)}
                  className="absolute top-2 right-2 size-8 rounded-full bg-background/90 grid place-items-center ring-1 ring-border"
                  aria-label={t("remove_photo")}
                >
                  <X className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
                >
                  {t("change_photo")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl bg-surface ring-1 ring-border py-3.5 font-medium flex items-center justify-center gap-2 text-muted-foreground"
              >
                <ImagePlus className="size-4" /> {t("add_photo")}
              </button>
            )}

            <button
              disabled={busy || (!description.trim() && !imageDataUrl)}
              onClick={runEstimate}
              className="w-full rounded-2xl bg-foreground text-brand py-3.5 font-semibold disabled:opacity-50"
            >
              {busy ? t("estimating") : t("estimate_protein")}
            </button>

            {items && (
              <div className="space-y-3 pt-4">
                <div className="text-sm font-semibold">{t("estimated_breakdown")}</div>
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="bg-surface rounded-2xl p-3 ring-1 ring-black/5 flex gap-2 items-center"
                  >
                    <input
                      value={it.food_name}
                      onChange={(e) =>
                        setItems((cur) =>
                          cur!.map((x, j) => (j === i ? { ...x, food_name: e.target.value } : x)),
                        )
                      }
                      className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                    />
                    <input
                      type="number"
                      value={it.protein_g}
                      onChange={(e) =>
                        setItems((cur) =>
                          cur!.map((x, j) =>
                            j === i ? { ...x, protein_g: Number(e.target.value) } : x,
                          ),
                        )
                      }
                      className="w-16 bg-background rounded-lg px-2 py-1 text-sm text-right"
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-2 pt-2">
                  <span className="text-sm text-muted-foreground">{t("total")}</span>
                  <span className="font-bold text-brand-ink">
                    {Math.round(items.reduce((s, i) => s + i.protein_g, 0))}g
                  </span>
                </div>
                <button
                  onClick={() => saveItems(items)}
                  className="w-full rounded-2xl bg-brand text-brand-ink py-3.5 font-semibold"
                >
                  {t("save_n_items", {
                    n: items.length,
                    label: items.length === 1 ? t("item") : t("items"),
                  })}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("food")}
              </span>
              <input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder={t("food_placeholder")}
                className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("protein_g_label")}
                </span>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="30"
                  className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("qty_optional")}
                </span>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={t("qty_placeholder")}
                  className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
                />
              </label>
            </div>
            <button
              disabled={busy || !foodName || !protein}
              onClick={saveManual}
              className="w-full rounded-2xl bg-foreground text-brand py-3.5 font-semibold disabled:opacity-50"
            >
              {busy ? t("saving") : t("log_it")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
