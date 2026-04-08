import { createContext, useContext, ReactNode } from "react";
import { useCustomerAuth, type Cliente } from "@/hooks/useCustomerAuth";
import type { User } from "@supabase/supabase-js";

type CustomerAuthContextType = {
  user: User | null;
  cliente: Cliente | null;
  loading: boolean;
  signup: (data: {
    telefone: string;
    senha: string;
    nome_completo: string;
    data_nascimento: string;
    endereco: string;
    email: string;
  }) => Promise<void>;
  login: (telefone: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useCustomerAuth();
  return (
    <CustomerAuthContext.Provider value={auth}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomer = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomer must be used within CustomerAuthProvider");
  return ctx;
};
