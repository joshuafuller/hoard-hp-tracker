/**
 * Dice tray — user-flow e2e for the roll → result → apply WIRING (#170).
 *
 * SCOPE / BOUNDARY: this runs under `prefers-reduced-motion`, which routes the tray
 * through `rollHeadless` (the parser path) — NO WebGL physics and NO
 * `recordFromPhysical`/`bindTray` reconcile. So a green run here proves the tray's UI
 * wiring (open → type → throw → result renders → Apply changes HP) and close/reopen
 * state safety. It does NOT cover the WebGL reconcile path (the modifier-composition
 * P2s on `dice.ts` — `1d6!p`, `4d6r1!`); that needs a fake `DiceBoxLike` integration
 * test driving `onRollComplete`, tracked separately under #161. Don't read this green
 * as "the real physics path is covered."
 */
import { test, expect } from "./fixtures";

test.describe("dice tray — roll → result → apply (reduced-motion / headless path)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Reduced-motion settles the hub/tray instantly (reliable clicks) and selects the
    // deterministic headless roll path. See the file header for what this does/doesn't cover.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".hp-tracker").waitFor({ state: "visible" });
  });

  // The fan + tray sit over the WebGL orb canvas, which confuses Playwright's pointer
  // hit-test; dispatch the chip click straight to its handler (same workaround as the
  // layout guard).
  async function openTray(page: import("@playwright/test").Page) {
    await page.getByLabel("Actions").click();
    const dice = page.getByRole("button", { name: "Dice", exact: true });
    // Assert the fan actually OPENED (the chip is visible, not inert/aria-hidden)
    // before the dispatch workaround — so a regression where the hub fails to open
    // still fails this test, instead of being masked by dispatchEvent bypassing
    // actionability (Copilot #187). We only bypass the WebGL hit-test false-negative,
    // not the visible/open check.
    await expect(dice).toBeVisible();
    await dice.dispatchEvent("click");
    await page.getByLabel("Dice notation").waitFor({ state: "visible" });
  }

  async function roll(page: import("@playwright/test").Page, expr: string) {
    await page.getByLabel("Dice notation").fill(expr);
    await page.getByRole("button", { name: "Throw", exact: true }).click();
  }

  // Relative damage of `n` via the keypad (10 → 10-n).
  async function damage(page: import("@playwright/test").Page, n: number) {
    await page.getByLabel("Edit current HP").click();
    const kp = page.getByRole("dialog");
    for (const d of String(n)) await kp.getByRole("button", { name: d, exact: true }).click();
    await kp.getByRole("button", { name: /^damage/i }).click();
  }

  const hpCurrent = (page: import("@playwright/test").Page) => page.getByTestId("hp-current");
  const readHp = async (page: import("@playwright/test").Page) =>
    Number((await hpCurrent(page).textContent())?.trim());

  test("rolls an ad-hoc expression and applies the total as heal (exact, non-clamped)", async ({ page }) => {
    // Damage to 4/10 first AND keep the roll's MAX (1d4+1 = 5) below the missing HP (6),
    // so Apply-as-heal is never clamped at max — otherwise the assertion passes for any
    // heal ≥ missing and proves nothing (advisor + Codex #187).
    await damage(page, 6);
    await expect.poll(() => readHp(page)).toBe(4);

    await openTray(page);
    await roll(page, "1d4+1");

    const total = page.locator(".dice-result__total");
    await expect(total).toBeVisible();
    const value = Number((await total.textContent())?.trim());
    expect(value).toBeGreaterThanOrEqual(2); // 1d4+1 min
    expect(value).toBeLessThanOrEqual(5); // 1d4+1 max (< 6 missing → never clamped)

    await page.getByRole("button", { name: /apply as heal/i }).click();
    // Exact arithmetic: HP rose by precisely the rolled total, no clamp involved.
    await expect.poll(() => readHp(page)).toBe(4 + value);
  });

  test("an exploding expression resolves to a result without hanging", async ({ page }) => {
    await openTray(page);
    await roll(page, "8d6!");
    // The parser resolves explosions synchronously here; the assertion is that a result
    // renders at all (no hang). The WebGL per-settle truncation guard (#149) is a
    // separate, physics-path concern — not what this proves.
    const total = page.locator(".dice-result__total");
    await expect(total).toBeVisible();
    expect(Number((await total.textContent())?.trim())).toBeGreaterThanOrEqual(8); // 8×d6 min
  });

  test("closing after a result, then reopening, starts clean (no stale dice, no double-apply)", async ({ page }) => {
    // Damage first so HP has headroom — at full HP a wrongful close-apply would clamp to
    // max and hide the bug. With 1d4+1 (≤5) below the missing 7, an erroneous apply would
    // raise HP detectably (Codex #187).
    await damage(page, 7);
    await expect.poll(() => readHp(page)).toBe(3);

    await openTray(page);
    await roll(page, "1d4+1");
    await expect(page.locator(".dice-result__total")).toBeVisible();

    // Closing must NOT apply the roll to HP (only Apply-as-heal does).
    await page.getByLabel("Close dice").click();
    await expect(page.locator(".dice-tray")).toHaveAttribute("data-open", "false");

    // Deterministic settle that also catches a LATE phantom heal: `hp.heal()` is an async
    // Dexie write, so reading HP the instant `data-open` flips could miss an accidental
    // close-as-apply landing just after (Codex #187). A follow-up damage of 1 reads +
    // rewrites HP through the store, serialising any pending write — from 3, −1 must be
    // EXACTLY 2; a phantom heal would have left 3+heal, making this 2+heal ≠ 2.
    await damage(page, 1);
    await expect.poll(() => readHp(page)).toBe(2);

    // Reopening starts clean — no stale result plate carried over.
    await openTray(page);
    await expect(page.locator(".dice-result")).toHaveCount(0);
  });

  // #189 — the roll log's scrollbar must not overlap the right-aligned result totals.
  test("roll log: the scrollbar never overlaps the result totals (#189)", async ({ page }) => {
    await openTray(page);
    await roll(page, "2d6");
    await expect(page.locator(".dice-result__total").first()).toBeVisible();

    // Open the roll log. Assert the button is actually visible BEFORE the dispatch
    // workaround — dispatchEvent only bypasses the WebGL-canvas hit-test, not the
    // visible check, so a regression where it never appears still fails (Copilot #201).
    const logBtn = page.getByLabel("Roll log");
    await expect(logBtn).toBeVisible();
    await logBtn.dispatchEvent("click");
    const list = page.locator(".dice-history__list");
    await expect(list).toBeVisible();

    // `DiceTray` fires `history.record(...)` without awaiting, so the row can lag the
    // log opening — wait for the total to render before measuring (else count() races
    // to 0; Copilot #201).
    const totals = page.locator(".dice-history__total");
    await expect(totals.first()).toBeVisible();

    // Force the list to overflow so a scrollbar is present regardless of row count.
    await page.addStyleTag({ content: ".dice-history__list { max-height: 32px !important; }" });

    const listBox = await list.boundingBox();
    if (!listBox) throw new Error("roll-log list has no layout box");
    const count = await totals.count();
    for (let i = 0; i < count; i++) {
      const tb = await totals.nth(i).boundingBox();
      if (!tb) throw new Error(`roll-log total #${i} has no layout box`);
      // The total's right edge must stay inside the list's right edge — clear of the
      // scrollbar gutter (classic) / overlay thumb (inline-end padding). Pre-fix ~0px.
      const clearance = listBox.x + listBox.width - (tb.x + tb.width);
      expect(clearance, `total #${i} clears the scrollbar`).toBeGreaterThanOrEqual(8);
    }
  });
});
