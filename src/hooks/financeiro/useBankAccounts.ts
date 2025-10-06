import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBankAccounts(companyId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!companyId) return;

    setLoading(true);
    const { data: result, error } = await supabase
      .schema('financeiro')
      .from("bank_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error && result) {
      setData(result);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  return { data, loading, refetch: fetchData };
}
