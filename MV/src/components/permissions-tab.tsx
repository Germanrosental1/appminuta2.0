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
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";

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
      return "bg-info text-info-foreground";
    case "Visitante":
      return "bg-muted text-muted-foreground";
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

export function PermissionsTab({
  mapId,
  users,
  permissions,
  onSavePermissions,
}: PermissionsTabProps) {
  const [localPermissions, setLocalPermissions] = useState<UserPermission[]>(
    users.map((user) => {
      const existing = permissions.find(
        (p) => p.userId === user.id && p.mapId === mapId
      );
      return (
        existing || {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role: "Sin acceso" as UserRole,
          mapId,
        }
      );
    })
  );

  const updateRole = (userId: string, newRole: UserRole) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, role: newRole } : p))
    );
  };

  const handleSave = () => {
    onSavePermissions(localPermissions);
    toast.success("Permisos actualizados correctamente");
  };

  return (
    <div className="space-y-6">
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

      <div className="border rounded-lg overflow-hidden">
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
            {localPermissions.map((permission) => (
              <TableRow key={permission.userId}>
                <TableCell className="font-medium">
                  {permission.userName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {permission.userEmail}
                </TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(permission.role)}>
                    {permission.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={permission.role}
                    onValueChange={(value) =>
                      updateRole(permission.userId, value as UserRole)
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
                  {getRoleDescription(permission.role)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border bg-card p-6">
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
            <Badge className="bg-info text-info-foreground mt-0.5">Editor</Badge>
            <p className="text-muted-foreground">
              Puede ver y editar unidades en los mapas asignados. No puede
              eliminar mapas ni modificar permisos de otros usuarios.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-muted text-muted-foreground mt-0.5">
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
  );
}
