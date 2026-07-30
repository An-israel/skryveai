// useWallet — reads the current user's credit balance, ledger, reward rules and
// store items, and exposes buy/earn actions that surface a toast. All mutations
// go through the server RPCs; this hook never touches balances directly.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchBalance, fetchHistory, fetchRewardRules, fetchSpendItems,
  buyItem, earnCredits,
  type WalletBalance, type CreditTx, type RewardRule, type SpendItem,
  type EarnAction, type CreditResult,
} from "@/lib/credits/api";

export function useWallet() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [history, setHistory] = useState<CreditTx[]>([]);
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [items, setItems] = useState<SpendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, h] = await Promise.all([fetchBalance(), fetchHistory(50)]);
    setBalance(b);
    setHistory(h);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [b, h, r, i] = await Promise.all([
        fetchBalance(), fetchHistory(50), fetchRewardRules(), fetchSpendItems(),
      ]);
      if (!active) return;
      setBalance(b); setHistory(h); setRules(r); setItems(i);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const buy = useCallback(async (item: SpendItem): Promise<CreditResult> => {
    const res = await buyItem(item.item_key);
    if (res.ok) {
      toast.success(`${item.name} unlocked`, { description: `−${item.cost_credits} credits` });
      await reload();
    } else if (res.reason === "insufficient") {
      toast.error("Not enough credits", { description: `You need ${res.needed} more.` });
    } else {
      toast.error("Couldn't complete purchase", { description: "Please try again." });
    }
    return res;
  }, [reload]);

  const earn = useCallback(async (action: EarnAction, referenceId?: string): Promise<CreditResult> => {
    const res = await earnCredits(action, referenceId);
    if (res.ok && res.credited) {
      toast.success(`+${res.credited} credits`, { description: res.description ?? undefined });
      await reload();
    }
    return res;
  }, [reload]);

  return { balance, history, rules, items, loading, reload, buy, earn };
}
