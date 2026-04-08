import { useCategories, type DBCategory } from "@/hooks/useStoreData";

type Props = {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  categories?: DBCategory[];
};

const CategoryNav = ({ activeCategory, onCategoryChange, categories: propCategories }: Props) => {
  const { data: fetchedCategories } = useCategories();
  const categories = propCategories ?? fetchedCategories;

  return (
    <nav className="sticky top-0 z-20 border-b border-border backdrop-blur-sm" style={{ background: "var(--d-bg-container)", opacity: 0.98 }}>
      <div className="container">
        <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          <button
            onClick={() => onCategoryChange("all")}
            className="shrink-0 px-4 py-2 text-sm font-semibold transition"
            style={{
              borderRadius: "var(--d-category-radius)",
              background: activeCategory === "all" ? "var(--d-category-active-bg)" : "var(--d-category-bg)",
              color: activeCategory === "all" ? "var(--d-category-active-text)" : "var(--d-category-text)",
            }}
          >
            Topo
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className="shrink-0 px-4 py-2 text-sm font-semibold transition"
              style={{
                borderRadius: "var(--d-category-radius)",
                background: activeCategory === cat.id ? "var(--d-category-active-bg)" : "var(--d-category-bg)",
                color: activeCategory === cat.id ? "var(--d-category-active-text)" : "var(--d-category-text)",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default CategoryNav;
