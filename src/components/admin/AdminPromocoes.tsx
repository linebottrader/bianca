import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Zap, Megaphone } from "lucide-react";
import CuponsTab from "./promocoes/CuponsTab";
import AutomacaoTab from "./promocoes/AutomacaoTab";
import CampanhasTab from "./promocoes/CampanhasTab";

const AdminPromocoes = () => {
  const [tab, setTab] = useState("cupons");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Promoções e Cupons</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="cupons" className="flex items-center gap-1.5">
            <Ticket className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="automacao" className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cupons"><CuponsTab /></TabsContent>
        <TabsContent value="automacao"><AutomacaoTab /></TabsContent>
        <TabsContent value="campanhas"><CampanhasTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPromocoes;
