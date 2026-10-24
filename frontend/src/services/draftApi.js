/**
 * draftApi.js — shared auto-save/resume for ALL product customizers.
 *
 * Guests  -> localStorage key `customDraft_<editor>_<productId>`
 *            (draft JSON + revision + timestamp)
 * Users   -> server: PUT/GET/DELETE /api/drafts/:editor/:productId
 *            (customization_drafts table, per-user, 30-day expiry)
 *
 * A draft stores ONLY design state — never cart, orders, auth
 * tokens, or payment data.
 */

import { API_URL } from "./apiConfig";

export const DRAFT_EXPIRY_DAYS = 30;

const localKey = (editor, productId) =>
  `customDraft_${editor}_${productId}`;

const hasToken = () =>
  !!localStorage.getItem("authToken");

const token = () => localStorage.getItem("authToken");

/* ---------- local (guest / offline fallback) ---------- */

export function readLocalDraft(editor, productId) {
  try {
    const raw = localStorage.getItem(localKey(editor, productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.draft) return null;

    /* expired drafts are dead — surface nothing, clean up */
    const ageMs =
      Date.now() - new Date(parsed.updatedAt || 0).getTime();
    if (ageMs > DRAFT_EXPIRY_DAYS * 86400000) {
      localStorage.removeItem(localKey(editor, productId));
      return null;
    }
    return {
      draft: parsed.draft,
      revision: parsed.revision || 1,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeLocalDraft(editor, productId, draft, revision) {
  try {
    localStorage.setItem(
      localKey(editor, productId),
      JSON.stringify({
        draft,
        revision,
        updatedAt: new Date().toISOString(),
      })
    );
    return { ok: true };
  } catch (e) {
    /* quota/full storage — surface it, don't pretend saved */
    return { ok: false, error: e?.name || "storage error" };
  }
}

export function removeLocalDraft(editor, productId) {
  try {
    localStorage.removeItem(localKey(editor, productId));
  } catch {
    /* ignore */
  }
}

/* ---------- server (logged-in) ---------- */

async function apiGet(editor, productId) {
  const res = await fetch(
    `${API_URL}/drafts/${encodeURIComponent(editor)}/${encodeURIComponent(productId)}`,
    { headers: { Authorization: `Bearer ${token()}` } }
  );
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success)
    throw new Error(data.message || "draft load failed");
  return {
    draft: data.draft,
    revision: data.revision,
    updatedAt: data.updatedAt,
  };
}

async function apiPut(editor, productId, draft, revision) {
  const res = await fetch(
    `${API_URL}/drafts/${encodeURIComponent(editor)}/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ draft, revision }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (res.status === 409)
    return { ok: false, conflict: true, current: data.currentRevision };
  if (!res.ok || !data.success)
    return { ok: false, error: data.message || `HTTP ${res.status}` };
  return { ok: true, revision: data.revision };
}

async function apiDelete(editor, productId) {
  try {
    await fetch(
      `${API_URL}/drafts/${encodeURIComponent(editor)}/${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      }
    );
  } catch {
    /* best-effort */
  }
}

/* ---------- public API ---------- */

/**
 * Load draft: server for logged-in users, localStorage for
 * guests. Returns { draft, revision, updatedAt } | null.
 */
export async function getDraft(editor, productId) {
  if (hasToken()) {
    try {
      return await apiGet(editor, productId);
    } catch {
      /* offline — fall back to any local copy */
      return readLocalDraft(editor, productId);
    }
  }
  return readLocalDraft(editor, productId);
}

/**
 * Save draft. Logged-in users also keep a local copy as an
 * offline safety net. Returns { ok, revision?, error? }.
 */
export async function saveDraft(editor, productId, draft, revision) {
  /* local copy first — instant + offline-proof */
  writeLocalDraft(editor, productId, draft, revision);

  if (!hasToken()) return { ok: true, revision };

  const res = await apiPut(editor, productId, draft, revision);
  return res;
}

export async function deleteDraft(editor, productId) {
  removeLocalDraft(editor, productId);
  if (hasToken()) await apiDelete(editor, productId);
}

/**
 * After login: push every local draft to the account, keeping
 * the newer revision on conflict, then clear local copies.
 */
export async function mergeLocalDraftsToServer() {
  if (!hasToken()) return;

  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const m = key && key.match(/^customDraft_([^_]+)_(.+)$/);
    if (!m) continue;
    const found = readLocalDraft(m[1], m[2]);
    if (found)
      items.push({
        editor: m[1],
        productId: m[2],
        draft: found.draft,
        revision: found.revision,
      });
  }

  if (!items.length) return;

  try {
    const res = await fetch(`${API_URL}/drafts/merge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ drafts: items }),
    });
    if (res.ok) {
      for (const item of items)
        removeLocalDraft(item.editor, item.productId);
    }
  } catch {
    /* keep local drafts — will retry next login */
  }
}

/**
 * Legacy key migration: the old silent restore used
 * `savedDesign_<productId>` / `businessCardDesign-<id>` —
 * fold them into the draft format once.
 */
export function migrateLegacyDraft(editor, productId, legacyKey) {
  try {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    /* one-time migration — release the storage it held
       (old payloads carried giant dataURL images) */
    try { localStorage.removeItem(legacyKey); } catch {}
    if (!draft || typeof draft !== "object") return null;
    return { draft, revision: 1, updatedAt: null };
  } catch {
    return null;
  }
}
