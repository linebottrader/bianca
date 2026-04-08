import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  onClose: () => void;
};

const WhatsAppFallbackModal = ({ url, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[200]" />
      <div
        className="relative z-[210] w-full max-w-sm rounded-xl bg-card p-6 shadow-xl mx-4 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <MessageSquare className="h-12 w-12 mx-auto text-green-500" />
        <h3 className="text-lg font-semibold text-foreground">Abrir WhatsApp</h3>
        <p className="text-sm text-muted-foreground">
          Clique no botão abaixo para abrir o WhatsApp.
        </p>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "#25d366" }}
          onClick={onClose}
        >
          <MessageSquare className="h-4 w-4" />
          Abrir WhatsApp
        </a>

        <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppFallbackModal;
