import { useNavigate, useParams } from 'react-router-dom';
import { UnitEditForm } from '@/components/sales-map/UnitEditForm';
import { UnitCreationWizard } from "@/components/units/UnitCreationWizard";
import { Unit } from '@/types/supabase-types';

export default function UnitEditPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!unitId;

  const handleSaved = (unit: Unit) => {
    // Redirigir al mapa de ventas después de guardar
    navigate(`/map/${unit.proyecto}`);
  };

  // No need for local loading/unit state as UnitEditForm handles fetching

  // Si estamos creando una nueva unidad, usamos el Wizard
  if (!unitId) {
    return (
      <UnitCreationWizard />
    );
  }

  // Para edición, mantenemos el formulario anterior
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">
        Editar Unidad
      </h1>
      <UnitEditForm
        unitId={unitId}
        onSaved={handleSaved}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};
