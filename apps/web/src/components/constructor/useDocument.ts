"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Data, Edits, RenderedDoc, Template } from "@/lib/template";
import { withDefaults } from "@/lib/template";

export type SavedDoc = { id: string; title: string; templateSlug: string; data: Data; edits: Edits; updatedAt: string };

type Draft = { data: Data; edits: Edits; docId?: string; title?: string };

const draftKey = (slug: string) => `draft:${slug}`;

function loadDraft(slug: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/**
 * Holds questionnaire data + accepted edits, autosaves the draft in the
 * browser and keeps a debounced server-rendered preview in sync.
 */
export function useDocument(t: Template, docId: string | null) {
  const [data, setData] = useState<Data>(() => withDefaults(t, {}));
  const [edits, setEdits] = useState<Edits>({});
  const [savedId, setSavedId] = useState<string | null>(docId);
  const [title, setTitle] = useState(t.title);
  const [doc, setDoc] = useState<RenderedDoc | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const seq = useRef(0);

  // Initial load: saved document (by id) or the browser draft.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (docId) {
        try {
          const r = await api<{ document: SavedDoc }>(`/documents/${docId}`);
          if (cancelled) return;
          setData(withDefaults(t, r.document.data));
          setEdits(r.document.edits ?? {});
          setTitle(r.document.title);
          setSavedId(r.document.id);
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : "Не удалось открыть документ");
        }
      } else {
        const d = loadDraft(t.slug);
        if (d) {
          setData(withDefaults(t, d.data));
          setEdits(d.edits ?? {});
          if (d.docId) setSavedId(d.docId);
          if (d.title) setTitle(d.title);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [t, docId]);

  // Autosave the draft locally (debounced).
  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(t.slug), JSON.stringify({ data, edits, docId: savedId ?? undefined, title }));
      } catch {
        /* quota or blocked */
      }
    }, 400);
    return () => clearTimeout(h);
  }, [data, edits, savedId, title, ready, t.slug]);

  // Live preview (debounced, latest response wins).
  useEffect(() => {
    if (!ready) return;
    const my = ++seq.current;
    const h = setTimeout(async () => {
      try {
        const r = await api<{ document: RenderedDoc; errors: Record<string, string> }>(`/templates/${t.slug}/preview`, {
          method: "POST",
          json: { data, edits },
        });
        if (my === seq.current) {
          setDoc(r.document);
          setErrors(r.errors ?? {});
        }
      } catch {
        /* keep last preview */
      }
    }, doc ? 220 : 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, edits, ready, t.slug]);

  const setField = useCallback((id: string, v: unknown) => setData((d) => ({ ...d, [id]: v })), []);

  const save = useCallback(async (): Promise<string> => {
    const body = { title, data, edits };
    if (savedId) {
      try {
        await api(`/documents/${savedId}`, { method: "PATCH", json: body });
        return savedId;
      } catch (e) {
        // The saved document may belong to another account or be deleted.
        if (!(e instanceof Error) || !("status" in e) || (e as { status: number }).status !== 404) throw e;
      }
    }
    const r = await api<{ document: SavedDoc }>("/documents", { method: "POST", json: { templateSlug: t.slug, ...body } });
    setSavedId(r.document.id);
    return r.document.id;
  }, [savedId, title, data, edits, t.slug]);

  const reset = useCallback(() => {
    setData(withDefaults(t, {}));
    setEdits({});
    setSavedId(null);
    setTitle(t.title);
    try {
      localStorage.removeItem(draftKey(t.slug));
    } catch {
      /* ignore */
    }
  }, [t]);

  return { data, setData, setField, edits, setEdits, doc, errors, ready, loadError, savedId, title, setTitle, save, reset };
}
