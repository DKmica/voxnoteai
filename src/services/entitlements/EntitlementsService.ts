import { brand } from "@/config/brand";
import type { UserEntitlements } from "@/domain/models";
import { entitlementsRepository } from "@/data/entitlementsRepository";
import { loadPreferences } from "@/state/preferences";

function startOfNextMonth(t: number) {
  const d = new Date(t);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export const EntitlementsService = {
  async ensureFresh(): Promise<UserEntitlements> {
    const prefs = loadPreferences();
    const existing = await entitlementsRepository.get();
    const now = Date.now();

    const base: UserEntitlements = existing ?? {
      id: "me",
      isPro: false,
      minutesUsedThisMonth: 0,
      momentCardsUsedThisMonth: 0,
      resetAt: startOfNextMonth(now),
    };

    const resetNeeded = now >= base.resetAt;
    const merged: UserEntitlements = {
      ...base,
      isPro: prefs.proEnabled || base.isPro,
      minutesUsedThisMonth: resetNeeded ? 0 : base.minutesUsedThisMonth,
      momentCardsUsedThisMonth: resetNeeded ? 0 : base.momentCardsUsedThisMonth,
      resetAt: resetNeeded ? startOfNextMonth(now) : base.resetAt,
    };

    if (!existing || resetNeeded || merged.isPro !== base.isPro) {
      await entitlementsRepository.put(merged);
    }

    return merged;
  },

  async canConsumeTranscription(durationMs: number): Promise<boolean> {
    const e = await this.ensureFresh();
    if (e.isPro) return true;
    const minutes = Math.max(1, Math.ceil(durationMs / 60_000));
    return e.minutesUsedThisMonth + minutes <= brand.limits.freeMinutesPerMonth;
  },

  async consumeTranscription(durationMs: number): Promise<UserEntitlements> {
    const e = await this.ensureFresh();
    if (e.isPro) return e;
    const minutes = Math.max(1, Math.ceil(durationMs / 60_000));
    const next = {
      ...e,
      minutesUsedThisMonth: e.minutesUsedThisMonth + minutes,
    };
    await entitlementsRepository.put(next);
    return next;
  },

  async canCreateMomentCard(): Promise<boolean> {
    const e = await this.ensureFresh();
    if (e.isPro) return true;
    return (
      e.momentCardsUsedThisMonth < brand.limits.freeMomentCardsPerMonth
    );
  },

  async consumeMomentCard(): Promise<UserEntitlements> {
    const e = await this.ensureFresh();
    if (e.isPro) return e;
    const next = {
      ...e,
      momentCardsUsedThisMonth: e.momentCardsUsedThisMonth + 1,
    };
    await entitlementsRepository.put(next);
    return next;
  },
};
