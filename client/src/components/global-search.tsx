import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { SearchIcon, UserIcon, CheckSquareIcon, FileTextIcon, BookOpenIcon } from "lucide-react";
import { useLocation } from "wouter";

interface SearchResults {
  clientes: any[];
  tareas: any[];
  impuestos: any[];
  manuales: any[];
  total: number;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: results } = useQuery<SearchResults>({
    queryKey: ['/api/search', search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Error en búsqueda');
      return response.json();
    },
  });

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setSearch("");
    
    if (type === 'cliente') {
      setLocation('/clientes');
    } else if (type === 'tarea') {
      setLocation('/tareas');
    } else if (type === 'manual') {
      setLocation(`/manuales/${id}`);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <SearchIcon className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Buscar clientes, tareas, impuestos, manuales..." 
          value={search}
          onValueChange={setSearch}
          data-testid="input-global-search"
        />
        <CommandList>
          <CommandEmpty>
            {search.length < 2 ? 'Escribe al menos 2 caracteres para buscar' : 'No se encontraron resultados'}
          </CommandEmpty>

          {results && results.clientes.length > 0 && (
            <CommandGroup heading="Clientes">
              {results.clientes.map((cliente: any) => (
                <CommandItem
                  key={cliente.id}
                  onSelect={() => handleSelect('cliente', cliente.id)}
                  data-testid={`search-result-client-${cliente.id}`}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{cliente.razonSocial}</span>
                    <span className="text-xs text-muted-foreground">{cliente.nifCif}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.tareas.length > 0 && (
            <CommandGroup heading="Tareas">
              {results.tareas.map((tarea: any) => (
                <CommandItem
                  key={tarea.id}
                  onSelect={() => handleSelect('tarea', tarea.id)}
                  data-testid={`search-result-task-${tarea.id}`}
                >
                  <CheckSquareIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{tarea.titulo}</span>
                    <span className="text-xs text-muted-foreground">{tarea.estado}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {null}

          {results && results.manuales.length > 0 && (
            <CommandGroup heading="Manuales">
              {results.manuales.map((manual: any) => (
                <CommandItem
                  key={manual.id}
                  onSelect={() => handleSelect('manual', manual.id)}
                  data-testid={`search-result-manual-${manual.id}`}
                >
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{manual.titulo}</span>
                    <span className="text-xs text-muted-foreground">{manual.categoria}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
