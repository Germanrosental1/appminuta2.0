import { useState } from "react";
import { User, UserPermission, UserRole } from "@/types/sales-map";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Construction } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PermissionsTabProps {
  mapId: string;
  users: User[];
  permissions: UserPermission[];
  onSavePermissions: (permissions: UserPermission[]) => void;
}

const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case "Super Admin":
      return "bg-primary text-primary-foreground";
    case "Editor":
      return "bg-blue-500 text-white";
    case "Visitante":
      return "bg-gray-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getRoleDescription = (role: UserRole) => {
  switch (role) {
    case "Super Admin":
      return "Control total: gestión de mapas, unidades y permisos";
    case "Editor":
      return "Puede editar unidades, no puede gestionar permisos";
    case "Visitante":
      return "Solo lectura, sin permisos de edición";
    case "Sin acceso":
      return "No tiene acceso a este mapa de ventas";
  }
};

// Mock data as requested by user
const MOCK_USERS_STATIC = [
  { name: "Juan Pérez", email: "juan.perez@empresa.com", role: "Sin acceso" as UserRole },
  { name: "María González", email: "maria.gonzalez@empresa.com", role: "Sin acceso" as UserRole },
  { name: "Ana Martínez", email: "ana.martinez@empresa.com", role: "Sin acceso" as UserRole },
  { name: "Carlos López", email: "carlos.lopez@empresa.com", role: "Sin acceso" as UserRole },
  { name: "Laura Sánchez", email: "laura.sanchez@empresa.com", role: "Sin acceso" as UserRole },
];

export function PermissionsTab({
  mapId,
  users,
  permissions,
  onSavePermissions,
}: PermissionsTabProps) {
  // Ignore props, use static state for display
  const [staticUsers, setStaticUsers] = useState(MOCK_USERS_STATIC);

  const updateRole = (email: string, newRole: UserRole) => {
    setStaticUsers((prev) =>
      prev.map((u) => (u.email === email ? { ...u, role: newRole } : u))
    );
  };

  const handleSave = () => {
    toast.info("Modo demostración: Los cambios no se guardarán permanentemente.");
  };

  return (
    <div className="space-y-6 relative">

      {/* Standby / Construction Notice */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <Construction className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Vista en Construcción (Standby)</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Esta sección se encuentra en desarrollo. Los datos mostrados son de ejemplo y la funcionalidad está limitada.
        </AlertDescription>
      </Alert>

      <div className="opacity-90 pointer-events-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Gestión de Permisos
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure quién puede acceder y editar este mapa de ventas
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Permisos
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden mt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead>Asignar Rol</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staticUsers.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        updateRole(user.email, value as UserRole)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Visitante">Visitante</SelectItem>
                        <SelectItem value="Sin acceso">Sin acceso</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getRoleDescription(user.role)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-card p-6 mt-6">
          <h4 className="font-semibold mb-4">Descripción de Roles</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge className="bg-primary text-primary-foreground mt-0.5">
                Super Admin
              </Badge>
              <p className="text-muted-foreground">
                Control total sobre todos los mapas de ventas. Puede crear,
                editar y eliminar mapas, gestionar todas las unidades y asignar
                roles a otros usuarios.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-500 text-white mt-0.5">Editor</Badge>
              <p className="text-muted-foreground">
                Puede ver y editar unidades en los mapas asignados. No puede
                eliminar mapas ni modificar permisos de otros usuarios.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-gray-500 text-white mt-0.5">
                Visitante
              </Badge>
              <p className="text-muted-foreground">
                Acceso de solo lectura. Puede visualizar el mapa y las unidades
                pero no realizar cambios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
