import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Construction } from "lucide-react";

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Sistema em manutenção. Voltaremos em breve.");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from("maintenance_mode").select("is_active, message").limit(1).single();
      if (!data?.is_active) {
        navigate("/", { replace: true });
      } else {
        setMessage(data.message || message);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-4">
        <Construction className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Em Manutenção</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
