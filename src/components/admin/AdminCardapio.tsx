import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Package, Settings2, Star } from "lucide-react";
import AdminCategories from "./AdminCategories";
import AdminMenuItems from "./AdminMenuItems";
import AdminOptions from "./AdminOptions";
import AdminSectionsPremium from "./AdminSectionsPremium";

export default function AdminCardapio() {
  const [activeTab, setActiveTab] = useState("categories");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Cardápio</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="categories" className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            Opções
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            Seções Premium
          </TabsTrigger>
        </TabsList>

        {activeTab === "categories" && <TabsContent value="categories" forceMount><AdminCategories /></TabsContent>}
        {activeTab === "products" && <TabsContent value="products" forceMount><AdminMenuItems /></TabsContent>}
        {activeTab === "options" && <TabsContent value="options" forceMount><AdminOptions /></TabsContent>}
        {activeTab === "premium" && <TabsContent value="premium" forceMount><AdminSectionsPremium /></TabsContent>}
      </Tabs>
    </div>
  );
}
