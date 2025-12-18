import { useNavigate, useParams } from 'react-router-dom';
import { UnitEditForm } from '@/components/sales-map/UnitEditForm';
import { Unit } from '@/types/supabase-types';

export default function UnitEditPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!unitId;

  const handleSaved = (unit: Unit) => {
    // Redirigir al mapa de ventas después de guardar
    navigate(`/map/${unit.proyecto}`);
  };

  const handleCancel = () => {
    // Redirigir atrás al cancelar
    navigate(-1);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {isEditing ? 'Editar Unidad' : 'Nueva Unidad'}
        </h1>
        
        <div className="bg-card border rounded-lg shadow-sm p-6">
          <UnitEditForm 
            unitId={unitId} 
            onSaved={handleSaved} 
            onCancel={handleCancel} 
          />
        </div>
      </div>
    </div>
  );
}
