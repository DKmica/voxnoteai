import { voxnoteDb } from "@/data/idb/voxnoteDb";
import type { UserEntitlements } from "@/domain/models";

export const entitlementsRepository = {
  async get(): Promise<UserEntitlements | undefined> {
    return voxnoteDb.getEntitlements();
  },
  async put(e: UserEntitlements) {
    await voxnoteDb.putEntitlements(e);
  },
};
