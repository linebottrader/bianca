import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const SearchBar = ({ value, onChange }: Props) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--d-color-text-light)" }} />
      <input
        type="text"
        placeholder="Digite para buscar um item"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2"
        style={{
          borderRadius: "var(--d-card-radius)",
          border: "1px solid var(--d-cart-border-color)",
          background: "var(--d-card-bg)",
          color: "var(--d-color-text-main)",
          // @ts-ignore
          "--tw-ring-color": "var(--d-color-primary)",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
          style={{ color: "var(--d-color-text-light)" }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
