import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  htmlContent: string;
}

export function TableOfContents({ htmlContent }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Parse HTML y extraer headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");

    const items: TocItem[] = [];
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent || "";
      
      // Generar ID único si no tiene
      let id = heading.id;
      if (!id) {
        id = `heading-${index}-${text.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
        heading.id = id;
      }

      items.push({ id, text, level });
    });

    setTocItems(items);

    // Observer para detectar qué heading está visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -35% 0px" }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [htmlContent]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <List className="h-4 w-4" />
          Tabla de Contenidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-1">
            {tocItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`
                  w-full text-left text-sm py-1 px-2 rounded transition-colors
                  ${item.level === 1 ? "font-semibold" : ""}
                  ${item.level === 2 ? "pl-4" : ""}
                  ${item.level === 3 ? "pl-8" : ""}
                  ${item.level >= 4 ? "pl-12" : ""}
                  ${activeId === item.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover-elevate text-muted-foreground hover:text-foreground"
                  }
                `}
                data-testid={`toc-item-${item.id}`}
              >
                {item.text}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
