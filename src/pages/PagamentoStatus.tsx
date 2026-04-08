import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageType = "sucesso" | "erro" | "pendente";

const PagamentoStatus = ({ tipo }: { tipo: PageType }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numeroPedido = searchParams.get("pedido") || "";
  const intervalRef = useRef<number | null>(null);
  const [polling, setPolling] = useState(tipo === "pendente");
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  // Store order code for tracking
  useEffect(() => {
    if (numeroPedido) {
      localStorage.setItem("pedido_codigo", numeroPedido);
    }
  }, [numeroPedido]);

  // For sucesso page, redirect immediately to confirmed
  useEffect(() => {
    if (tipo === "sucesso" && numeroPedido) {
      navigate(`/pedido-confirmado?pedido=${numeroPedido}`, { replace: true });
    }
  }, [tipo, numeroPedido, navigate]);

  // Polling for pendente page
  useEffect(() => {
    if (tipo !== "pendente" || !numeroPedido) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mp-check-status", {
          body: { numero_pedido: numeroPedido },
        });

        if (error) {
          console.error("Erro ao verificar status:", error);
          return;
        }

        if (data?.status_pagamento === "aprovado") {
          setPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          navigate(`/pedido-confirmado?pedido=${numeroPedido}`, { replace: true });
        } else if (data?.status_pagamento === "rejeitado") {
          setPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatusInfo("rejeitado");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Check immediately
    checkStatus();

    // Then every 5 seconds
    intervalRef.current = window.setInterval(checkStatus, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tipo, numeroPedido, navigate]);

  if (tipo === "sucesso") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tipo === "erro" || statusInfo === "rejeitado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-card rounded-xl p-8 shadow-lg">
          <XCircle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Pagamento não aprovado</h1>
          {numeroPedido && (
            <p className="text-lg font-semibold text-primary">Pedido #{numeroPedido}</p>
          )}
          <p className="text-muted-foreground">
            Houve um problema com seu pagamento. Tente novamente ou escolha outra forma de pagamento.
          </p>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    );
  }

  // Pendente with polling
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-card rounded-xl p-8 shadow-lg">
        <div className="relative mx-auto w-16 h-16">
          <Clock className="h-16 w-16 text-yellow-500" />
          {polling && (
            <Loader2 className="absolute -top-1 -right-1 h-6 w-6 animate-spin text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">Pagamento Pendente</h1>
        {numeroPedido && (
          <p className="text-lg font-semibold text-primary">Pedido #{numeroPedido}</p>
        )}
        <p className="text-muted-foreground">
          Seu pagamento está sendo processado. Esta página será atualizada automaticamente quando o pagamento for confirmado.
        </p>
        {polling && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando pagamento...
          </div>
        )}
        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          <Home className="h-4 w-4 mr-2" />
          Voltar ao Cardápio
        </Button>
      </div>
    </div>
  );
};

export const PagamentoSucesso = () => <PagamentoStatus tipo="sucesso" />;
export const PagamentoErro = () => <PagamentoStatus tipo="erro" />;
export const PagamentoPendente = () => <PagamentoStatus tipo="pendente" />;
