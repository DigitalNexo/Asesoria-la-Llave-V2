import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  BookOpen,
  Settings,
  LogOut,
  Shield
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "GESTOR", "LECTURA"],
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    roles: ["ADMIN", "GESTOR", "LECTURA"],
  },
  {
    title: "Impuestos",
    url: "/impuestos",
    icon: FileText,
    roles: ["ADMIN", "GESTOR", "LECTURA"],
  },
  {
    title: "Tareas",
    url: "/tareas",
    icon: CheckSquare,
    roles: ["ADMIN", "GESTOR", "LECTURA"],
  },
  {
    title: "Manuales",
    url: "/manuales",
    icon: BookOpen,
    roles: ["ADMIN", "GESTOR", "LECTURA"],
  },
  {
    title: "Auditoría",
    url: "/auditoria",
    icon: Shield,
    roles: ["ADMIN", "GESTOR"],
  },
  {
    title: "Administración",
    url: "/admin",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const filteredItems = menuItems.filter((item) => 
    user && item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-6">
          <h1 className="text-xl font-display font-bold text-primary">
            Asesoría La Llave
          </h1>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-3 pb-3 border-b">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
