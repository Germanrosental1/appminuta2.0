import React from "react";
import { useWizard } from "@/context/WizardContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TestTube2 } from "lucide-react";

export const DemoModeToggle: React.FC = () => {
  const { demoMode, setDemoMode } = useWizard();
  

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <TestTube2 className="w-5 h-5 text-warning" />
      <div className="flex-1">
        <Label htmlFor="demo-mode" className="text-sm font-medium cursor-pointer">
          Modo Demo
        </Label>
        <p className="text-xs text-muted-foreground">
          Simular generación sin conectar al webhook
        </p>
      </div>
      <Switch
        id="demo-mode"
        checked={demoMode}
        onCheckedChange={setDemoMode}
      />
    </div>
  );
};
