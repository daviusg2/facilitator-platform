import { create } from "zustand";

interface OrgState {
  orgId: string;                   // replace with a real orgId
  setOrgId: (id: string) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  orgId: "66d55b0b95ab27f25a6b4c20", // TEMP: your test org _id
  setOrgId: (id) => set({ orgId: id }),
}));
