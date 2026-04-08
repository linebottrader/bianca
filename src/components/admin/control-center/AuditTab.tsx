import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  description: string;
  created_at: string;
}

export default function AuditTab() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLogs = async (p = 0) => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from("system_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)
      );
      if (error) throw error;
      setLogs(data || []);
      setPage(p);
    } catch (err) {
      logAndToast(err, "Carregar Auditoria", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Logs de Auditoria</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro de auditoria encontrado</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{log.user_email || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate">{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => fetchLogs(page - 1)}>Anterior</Button>
              <span className="text-xs text-muted-foreground self-center">Página {page + 1}</span>
              <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => fetchLogs(page + 1)}>Próxima</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
