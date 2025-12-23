import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockSalesMaps } from "@/data/mock-data";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              Sales Maps Manager
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gestión profesional de mapas de ventas inmobiliarios con control de
            permisos y visualización interactiva
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {mockSalesMaps.map((map) => (
            <Card
              key={map.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/50"
              onClick={() => navigate(`/map/${map.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {map.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {map.units.length} unidades
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Creado:</span>
                  <span className="font-medium">
                    {new Date(map.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Última actualización:</span>
                  <span className="font-medium">
                    {new Date(map.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/map/${map.id}`);
                }}
              >
                Abrir Mapa
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Seleccione un mapa de ventas para comenzar a gestionar unidades
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
