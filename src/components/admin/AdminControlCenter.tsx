import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Users, Construction, ClipboardList, Activity, ShieldCheck, Wrench, BarChart3 } from "lucide-react";
import DatabaseTab from "./control-center/DatabaseTab";
import AdminUsersTab from "./control-center/AdminUsersTab";
import MaintenanceTab from "./control-center/MaintenanceTab";
import AuditTab from "./control-center/AuditTab";
import SystemHealthTab from "./control-center/SystemHealthTab";
import OrderProtectionTab from "./control-center/OrderProtectionTab";
import SelfHealingTab from "./control-center/SelfHealingTab";
import SalesAnalyticsTab from "./control-center/SalesAnalyticsTab";

const tabs = [
  { value: "database", label: "Banco de Dados", icon: Database },
  { value: "admins", label: "Administradores", icon: Users },
  { value: "maintenance", label: "Manutenção", icon: Construction },
  { value: "audit", label: "Auditoria", icon: ClipboardList },
  { value: "health", label: "Saúde", icon: Activity },
  { value: "protection", label: "Proteção", icon: ShieldCheck },
  { value: "healing", label: "Auto-Correção", icon: Wrench },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState("database");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Centro de Controle do Sistema</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs">
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === "database" && <TabsContent value="database" forceMount><DatabaseTab /></TabsContent>}
        {activeTab === "admins" && <TabsContent value="admins" forceMount><AdminUsersTab /></TabsContent>}
        {activeTab === "maintenance" && <TabsContent value="maintenance" forceMount><MaintenanceTab /></TabsContent>}
        {activeTab === "audit" && <TabsContent value="audit" forceMount><AuditTab /></TabsContent>}
        {activeTab === "health" && <TabsContent value="health" forceMount><SystemHealthTab /></TabsContent>}
        {activeTab === "protection" && <TabsContent value="protection" forceMount><OrderProtectionTab /></TabsContent>}
        {activeTab === "healing" && <TabsContent value="healing" forceMount><SelfHealingTab /></TabsContent>}
        {activeTab === "analytics" && <TabsContent value="analytics" forceMount><SalesAnalyticsTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
