import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ReglaFinanciacion, Moneda, PeriodicidadCuota } from "@/types/wizard";
import { format, addMonths, addYears, parse } from "date-fns";
import { es } from "date-fns/locale";

// --- Helper Functions ---

// Función para parsear fecha en formato DD/MM/YY a objeto Date
const parseDate = (dateString: string): Date => {
  try {
    // Intentar parsear en formato d/MM/yy
    return parse(dateString, "d/MM/yy", new Date());
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
};

// Helper: Parsear fecha en formato DD/MM/YY o ISO
const parseFechaVencimiento = (fechaStr: string): Date | null => {
  try {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const year = partes[2].length === 2 ? "20" + partes[2] : partes[2];
      return new Date(Number.parseInt(year), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]));
    }
    return new Date(fechaStr);
  } catch (error) {
    console.error("Error parsing expiration date:", error);
    return null;
  }
};

// Helper: Calcular siguiente fecha de vencimiento según periodicidad
const calcularSiguienteVencimiento = (
  fechaBase: Date,
  periodicidad: PeriodicidadCuota,
  numeroQuota: number
): Date | null => {
  switch (periodicidad) {
    case "Mensual": return addMonths(fechaBase, numeroQuota);
    case "Trimestral": return addMonths(fechaBase, numeroQuota * 3);
    case "Semestral": return addMonths(fechaBase, numeroQuota * 6);
    case "Anual": return addYears(fechaBase, numeroQuota);
    default: return null;
  }
};

// Helper: Contar cuotas pagadas antes de fecha límite
const contarCuotasPagadas = (
  fechaPrimerVencimiento: Date,
  periodicidad: PeriodicidadCuota,
  numCuotas: number,
  fechaLimite: Date
): number => {
  let cuotasPagadas = 1; // Primera cuota ya validada

  if (numCuotas <= 1) return cuotasPagadas;

  for (let i = 1; i < numCuotas; i++) {
    const siguienteFecha = calcularSiguienteVencimiento(fechaPrimerVencimiento, periodicidad, i);

    if (!siguienteFecha) break;

    if (siguienteFecha <= fechaLimite) {
      cuotasPagadas++;
    } else {
      break;
    }
  }

  return cuotasPagadas;
};

// Función para calcular cuánto se habrá pagado de una regla a la fecha de posesión
const calcularMontoPagadoAFechaPosesion = (regla: ReglaFinanciacion, fechaPosesion: Date): number => {

  try {
    // Parsear fecha de primer vencimiento
    const fechaPrimerVencimiento = parseFechaVencimiento(regla.primerVencimiento);

    if (!fechaPrimerVencimiento || Number.isNaN(fechaPrimerVencimiento.getTime())) {
      return 0;
    }


    // Early return: vencimiento posterior a posesión
    if (fechaPrimerVencimiento > fechaPosesion) {
      return 0;
    }

    // Early return: pago único
    if (regla.periodicidad === "Pago Único") {
      return regla.saldoFinanciar;
    }

    // Calcular cuotas pagadas para pagos periódicos
    const cuotasPagadas = contarCuotasPagadas(
      fechaPrimerVencimiento,
      regla.periodicidad,
      regla.numCuotas,
      fechaPosesion
    );

    // Calcular monto total pagado
    const montoPagado = Math.min(regla.saldoFinanciar, cuotasPagadas * regla.importeCuota);

    return montoPagado;
  } catch (error) {
    console.error("Error calculating paid amount:", error);
    return 0;
  }
};

// Formato de moneda
const formatCurrency = (value: number, moneda: Moneda = "ARS") => {
  const formattedValue = value.toLocaleString("es-AR", { minimumFractionDigits: 2 });
  if (moneda === "USD") return formattedValue + " USD";
  if (moneda === "MIX") return formattedValue + " MIX";
  return formattedValue; // ARS por defecto
};

// Formato de fecha de posesión: convierte de YYYY-MM-DD a DD/MM/YYYY
const formatFechaPosesion = (fechaIso: string | undefined): string => {
  if (!fechaIso) return "No definida";

  try {
    // Si ya está en formato DD/MM/YYYY o DD/MM/YY, devolverla tal cual
    if (fechaIso.includes("/")) return fechaIso;

    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaIso.split("-");
    if (!year || !month || !day) return fechaIso;

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting possession date:", error);
    return fechaIso;
  }
};

// Helper: Convertir totales a moneda base (ARS) según moneda B
const convertirATotalesEnMonedaBase = (totalFinanciarArs: number, totalFinanciarUsd: number, monedaB: string, tcValor: number): number => {
  if (monedaB === "USD") {
    const totalBEnArs = totalFinanciarUsd * (tcValor || 1);
    return totalFinanciarArs + totalBEnArs;
  }
  return totalFinanciarArs + totalFinanciarUsd;
};

// Helper: Calcular total de anticipos en moneda base (ARS)
const calcularTotalAnticipos = (data: any): number => {
  // Anticipos en ARS
  const anticipoArsTotal = (data.anticipoArsA || 0) + (data.anticipoArsB || 0);

  // Anticipos en USD convertidos a ARS
  const anticipoUsdTotal = (data.anticipoUsdA || 0) + (data.anticipoUsdB || 0);
  const anticiposUsdEnArs = anticipoUsdTotal * (data.tcValor || 1);

  return anticipoArsTotal + anticiposUsdEnArs;
};


// Helper para calcular porcentaje pagado logic, pure function
const calcularPorcentajePagadoHelper = (
  reglasA: ReglaFinanciacion[],
  reglasB: ReglaFinanciacion[],
  data: any
) => {
  // Early return: sin financiación ni anticipos
  const hayAnticipos = (data.anticipoArsA || 0) > 0 || (data.anticipoArsB || 0) > 0 ||
    (data.anticipoUsdA || 0) > 0 || (data.anticipoUsdB || 0) > 0;

  if (!hayAnticipos && reglasA.length === 0 && reglasB.length === 0) {
    return 0;
  }

  // Early return: sin fecha de posesión
  if (!data.fechaPosesion) return 85;

  // Parsear fecha de posesión usando helper reutilizado
  const fechaFormateada = formatFechaPosesion(data.fechaPosesion);
  let fechaPosesion = parseFechaVencimiento(fechaFormateada);

  if (!fechaPosesion || Number.isNaN(fechaPosesion.getTime())) {
    // Fallback: fecha un año en el futuro
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
    fechaPosesion = fechaFutura;
  }

  // Early return: posesión ya pasó
  if (fechaPosesion < new Date()) return 100;

  // Calcular total a financiar en moneda base
  const totalFinanciar = convertirATotalesEnMonedaBase(
    data.totalFinanciarArs || 0,
    data.totalFinanciarUsd || 0,
    data.monedaB,
    data.tcValor || 1
  );

  if (totalFinanciar === 0) return 100;

  // Calcular anticipos
  const totalAnticipos = calcularTotalAnticipos(data);

  // Calcular el total pagado a fecha de posesión para las reglas de la parte A
  let totalPagadoA = 0;

  // Procesar cada regla de la parte A
  reglasA.forEach(regla => {
    if (!regla.activa) return;

    // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
    // fechaPosesion is guaranteed to be a Date here because of the fallback above
    const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);

    // Si la regla está en USD, convertir a ARS usando el tipo de cambio
    if (regla.moneda === "USD") {
      const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
      totalPagadoA += montoPagadoConvertido;
    } else {
      totalPagadoA += montoPagado;
    }
  });


  // Calcular el total pagado a fecha de posesión para las reglas de la parte B
  let totalPagadoB = 0;

  // Procesar cada regla de la parte B
  reglasB.forEach(regla => {
    if (!regla.activa) return;

    // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
    const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);

    // Convertir todos los montos a ARS para tener una base común
    if (regla.moneda === "USD") {
      // Si la regla está en USD, convertir a ARS
      const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
      totalPagadoB += montoPagadoConvertido;
    } else {
      // Si la regla está en ARS, usar directamente
      totalPagadoB += montoPagado;
    }
  });

  // Sumar los anticipos a los pagos de las reglas
  const totalPagado = totalPagadoA + totalPagadoB + totalAnticipos;

  // El porcentaje pagado es lo que se pagará antes de la fecha de posesión dividido por el total a financiar
  let porcentajePagado = 0;
  if (totalFinanciar > 0) {
    porcentajePagado = (totalPagado / totalFinanciar) * 100;
  }

  // Asegurarse de que el porcentaje esté entre 0 y 100
  return Math.max(0, Math.min(100, Math.round(porcentajePagado * 100) / 100));
};


export const Step6ReglasFinanciacion: React.FC = () => {
  const { data, updateData } = useWizard();
  const fechaActual = new Date();
  const fechaProximoMes = format(addMonths(fechaActual, 1), "d/MM/yy");

  const [nuevaReglaA, setNuevaReglaA] = useState<Partial<ReglaFinanciacion>>({
    moneda: "ARS",
    primerVencimiento: fechaProximoMes
  });
  const [nuevaReglaB, setNuevaReglaB] = useState<Partial<ReglaFinanciacion>>({
    primerVencimiento: fechaProximoMes
  });

  // Inicializar moneda B según la selección del paso 3
  useEffect(() => {
    setNuevaReglaB(prev => ({ ...prev, moneda: data.monedaB }));
  }, [data.monedaB]);
  const [mostrarFormA, setMostrarFormA] = useState(false);
  const [mostrarFormB, setMostrarFormB] = useState(false);

  // Calcular totales a financiar
  const totalFinanciarArs = data.totalFinanciarArs || 0;
  const totalFinanciarUsd = data.totalFinanciarUsd || 0;

  // Calcular saldos restantes
  const calcularSaldoRestanteA = () => {
    const totalReglasA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // Si la regla está en USD, convertir a ARS usando el tipo de cambio
        if (regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        return sum + regla.saldoFinanciar;
      }, 0);
    return Math.max(totalFinanciarArs - totalReglasA, 0);
  };

  const calcularSaldoRestanteB = () => {
    const totalReglasB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // Si la moneda de B es ARS pero la regla está en USD, convertir a ARS
        if (data.monedaB === "ARS" && regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        // Si la moneda de B es USD pero la regla está en ARS, convertir a USD
        else if (data.monedaB === "USD" && regla.moneda === "ARS") {
          return sum + (regla.saldoFinanciar / (data.tcValor || 1));
        }
        // Si las monedas coinciden o es MIX, no hacer conversión
        return sum + regla.saldoFinanciar;
      }, 0);
    return Math.max(totalFinanciarUsd - totalReglasB, 0);
  };

  // Wrapper for calculation using current component state or overrides
  const calcularPorcentajePagado = (reglasA?: ReglaFinanciacion[], reglasB?: ReglaFinanciacion[]) => {
    const reglasFinanciacionA = reglasA || data.reglasFinanciacionA || [];
    const reglasFinanciacionB = reglasB || data.reglasFinanciacionB || [];
    return calcularPorcentajePagadoHelper(reglasFinanciacionA, reglasFinanciacionB, data);
  };

  // Agregar nueva regla A
  const agregarReglaA = () => {
    if (!nuevaReglaA.saldoFinanciar || !nuevaReglaA.numCuotas || !nuevaReglaA.moneda || !nuevaReglaA.primerVencimiento) return;

    // Usar la fecha seleccionada por el usuario o la fecha actual + 1 mes
    const primerVencimiento = nuevaReglaA.primerVencimiento;

    // Parsear la fecha del primer vencimiento
    const fechaPrimerVencimiento = parseDate(primerVencimiento);

    let ultimoVencimiento;
    if (nuevaReglaA.periodicidad === "Mensual") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, Number(nuevaReglaA.numCuotas) - 1), "d/MM/yy");
    } else if (nuevaReglaA.periodicidad === "Trimestral") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, (Number(nuevaReglaA.numCuotas) - 1) * 3), "d/MM/yy");
    } else if (nuevaReglaA.periodicidad === "Semestral") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, (Number(nuevaReglaA.numCuotas) - 1) * 6), "d/MM/yy");
    } else if (nuevaReglaA.periodicidad === "Anual") {
      ultimoVencimiento = format(addYears(fechaPrimerVencimiento, Number(nuevaReglaA.numCuotas) - 1), "d/MM/yy");
    } else {
      ultimoVencimiento = primerVencimiento;
    }

    const importeCuota = nuevaReglaA.periodicidad === "Pago Único"
      ? Number(nuevaReglaA.saldoFinanciar)
      : Number(nuevaReglaA.saldoFinanciar) / Number(nuevaReglaA.numCuotas);

    // Calcular el monto en la moneda correcta para los porcentajes
    let montoEnMonedaBase = Number(nuevaReglaA.saldoFinanciar);
    if (nuevaReglaA.moneda === "USD") {
      // Si la regla está en USD, convertir a ARS para calcular porcentajes
      montoEnMonedaBase = montoEnMonedaBase * (data.tcValor || 1);
    }

    // Calcular el total de reglas existentes para la parte A y total
    const totalReglasExistentesA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        if (regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        return sum + regla.saldoFinanciar;
      }, 0);

    const totalReglasExistentesB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => sum + regla.saldoFinanciar, 0);

    // Sumar el monto de la nueva regla al total existente
    const totalReglasA = totalReglasExistentesA + montoEnMonedaBase;
    const totalReglas = totalReglasA + totalReglasExistentesB;

    // Calcular los porcentajes como la cobertura de la deuda
    const porcentajeDeudaTotal = totalFinanciarArs + totalFinanciarUsd > 0 ?
      (totalReglas / (totalFinanciarArs + totalFinanciarUsd)) * 100 : 0;
    const porcentajeDeudaA = totalFinanciarArs > 0 ?
      (totalReglasA / totalFinanciarArs) * 100 : 0;

    const nuevaRegla: ReglaFinanciacion = {
      id: uuidv4(),
      moneda: nuevaReglaA.moneda,
      saldoFinanciar: Number(nuevaReglaA.saldoFinanciar),
      numCuotas: Number(nuevaReglaA.numCuotas),
      periodicidad: nuevaReglaA.periodicidad,
      importeCuota: importeCuota,
      primerVencimiento,
      ultimoVencimiento,
      valorBien: nuevaReglaA.valorBien || "",
      cargo: nuevaReglaA.cargo || "",
      porcentajeDeudaTotal: Math.round(porcentajeDeudaTotal * 100) / 100,
      porcentajeDeudaParte: Math.round(porcentajeDeudaA * 100) / 100,
      activa: true
    };

    // Calcular el nuevo porcentaje pagado considerando la nueva regla
    const nuevasReglas = [...(data.reglasFinanciacionA || []), nuevaRegla];

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(nuevasReglas, data.reglasFinanciacionB || [], data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionA: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Resetear el formulario
    setNuevaReglaA({
      moneda: "ARS",
      primerVencimiento: fechaProximoMes
    });
    setMostrarFormA(false);

    // Log para depuración
  };

  // Agregar nueva regla B
  const agregarReglaB = () => {
    if (!nuevaReglaB.saldoFinanciar || !nuevaReglaB.numCuotas || !nuevaReglaB.moneda || !nuevaReglaB.primerVencimiento) return;

    // Usar la fecha seleccionada por el usuario o la fecha actual + 1 mes
    const primerVencimiento = nuevaReglaB.primerVencimiento;

    // Parsear la fecha del primer vencimiento
    const fechaPrimerVencimiento = parseDate(primerVencimiento);

    let ultimoVencimiento;
    if (nuevaReglaB.periodicidad === "Mensual") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, Number(nuevaReglaB.numCuotas) - 1), "d/MM/yy");
    } else if (nuevaReglaB.periodicidad === "Trimestral") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, (Number(nuevaReglaB.numCuotas) - 1) * 3), "d/MM/yy");
    } else if (nuevaReglaB.periodicidad === "Semestral") {
      ultimoVencimiento = format(addMonths(fechaPrimerVencimiento, (Number(nuevaReglaB.numCuotas) - 1) * 6), "d/MM/yy");
    } else if (nuevaReglaB.periodicidad === "Anual") {
      ultimoVencimiento = format(addYears(fechaPrimerVencimiento, Number(nuevaReglaB.numCuotas) - 1), "d/MM/yy");
    } else {
      ultimoVencimiento = primerVencimiento;
    }

    const importeCuota = nuevaReglaB.periodicidad === "Pago Único"
      ? Number(nuevaReglaB.saldoFinanciar)
      : Number(nuevaReglaB.saldoFinanciar) / Number(nuevaReglaB.numCuotas);

    // Calcular el total de reglas existentes para la parte B y total
    const totalReglasExistentesA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        if (regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        return sum + regla.saldoFinanciar;
      }, 0);

    const totalReglasExistentesB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => sum + regla.saldoFinanciar, 0);

    // Calcular el monto en la moneda correcta para los porcentajes
    let montoEnMonedaB = Number(nuevaReglaB.saldoFinanciar);

    // Si la moneda de B es ARS pero la regla está en USD, convertir a ARS
    if (data.monedaB === "ARS" && nuevaReglaB.moneda === "USD") {
      montoEnMonedaB = montoEnMonedaB * (data.tcValor || 1);
    }
    // Si la moneda de B es USD pero la regla está en ARS, convertir a USD
    else if (data.monedaB === "USD" && nuevaReglaB.moneda === "ARS") {
      montoEnMonedaB = montoEnMonedaB / (data.tcValor || 1);
    }

    // Sumar el monto de la nueva regla al total existente
    const totalReglasB = totalReglasExistentesB + montoEnMonedaB;
    const totalReglas = totalReglasExistentesA + totalReglasB;

    // Calcular los porcentajes como la cobertura de la deuda
    const porcentajeDeudaTotal = totalFinanciarArs + totalFinanciarUsd > 0 ?
      (totalReglas / (totalFinanciarArs + totalFinanciarUsd)) * 100 : 0;
    const porcentajeDeudaB = totalFinanciarUsd > 0 ?
      (totalReglasB / totalFinanciarUsd) * 100 : 0;

    const nuevaRegla: ReglaFinanciacion = {
      id: uuidv4(),
      moneda: nuevaReglaB.moneda,
      saldoFinanciar: Number(nuevaReglaB.saldoFinanciar),
      numCuotas: Number(nuevaReglaB.numCuotas),
      periodicidad: nuevaReglaB.periodicidad,
      importeCuota: importeCuota,
      primerVencimiento,
      ultimoVencimiento,
      valorBien: nuevaReglaB.valorBien || "",
      cargo: nuevaReglaB.cargo || "",
      porcentajeDeudaTotal: Math.round(porcentajeDeudaTotal * 100) / 100,
      porcentajeDeudaParte: Math.round(porcentajeDeudaB * 100) / 100,
      activa: true
    };

    // Calcular el nuevo porcentaje pagado considerando la nueva regla
    const nuevasReglas = [...(data.reglasFinanciacionB || []), nuevaRegla];

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], nuevasReglas, data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionB: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Resetear el formulario
    setNuevaReglaB({
      moneda: data.monedaB,
      primerVencimiento: fechaProximoMes
    });
    setMostrarFormB(false);

    // Log para depuración
  };

  // Eliminar regla
  const eliminarReglaA = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionA || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(nuevasReglas, data.reglasFinanciacionB || [], data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionA: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
  };

  const eliminarReglaB = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionB || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], nuevasReglas, data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionB: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
  };

  // Actualizar porcentaje pagado cuando cambian las reglas, la fecha de posesión o los anticipos
  useEffect(() => {
    // Si no hay fecha de posesión, no hacer cálculos detallados
    if (!data.fechaPosesion) {
      const porcentajeCalculado = calcularPorcentajePagadoHelper([], [], data);
      updateData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
      return;
    }


    // Convertir la fecha de posesión a un objeto Date
    let fechaPosesion;
    try {
      // Asegurar que la fecha esté en formato DD/MM/YYYY si viene en formato ISO
      const fechaFormateada = formatFechaPosesion(data.fechaPosesion);

      // Parsear la fecha en formato DD/MM/YYYY
      const partes = fechaFormateada.split('/');
      if (partes.length === 3) {
        // Formato DD/MM/YYYY o DD/MM/YY
        const year = partes[2].length === 2 ? "20" + partes[2] : partes[2]; // Manejar años en formato YY
        fechaPosesion = new Date(Number.parseInt(year), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]));
      } else {
        // Intentar parsear como fecha ISO
        fechaPosesion = new Date(data.fechaPosesion);
      }

      // Verificar si la fecha es válida
      if (Number.isNaN(fechaPosesion.getTime())) {
        return;
      }
    } catch (error) {
      console.error("Error parsing possession date:", error);
      return;
    }

    // Forzar la actualización del porcentaje pagado
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], data.reglasFinanciacionB || [], data);

    // Actualizar el estado solo si el porcentaje ha cambiado
    if (porcentajeCalculado !== data.porcentajePagadoFechaPosesion) {
      updateData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
    }
  }, [data.reglasFinanciacionA, data.reglasFinanciacionB, data.fechaPosesion, totalFinanciarArs, totalFinanciarUsd, data.anticipoArsA, data.anticipoArsB, data.anticipoUsdA, data.anticipoUsdB, data.tcValor, data.porcentajePagadoFechaPosesion]);

  // Obtener el porcentaje pagado a fecha posesión
  const porcentajePagado = data.porcentajePagadoFechaPosesion || calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], data.reglasFinanciacionB || [], data);

  // Verificar si hay saldos restantes
  const haySaldoRestanteA = calcularSaldoRestanteA() > 0;
  const haySaldoRestanteB = calcularSaldoRestanteB() > 0;
  const haySaldosPendientes = haySaldoRestanteA || haySaldoRestanteB;

  return (
    <div className="space-y-8">
      <div className="bg-muted p-4 rounded-lg">
        <h2 className="text-xl font-bold text-blue-600">07. Reglas de Financiación F/SB</h2>
      </div>

      {haySaldosPendientes && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="text-red-600 text-2xl mr-3">⚠️</div>
            <div>
              <h3 className="font-bold text-red-700">Atención: Saldos pendientes de financiar</h3>
              <p className="text-red-600 mt-1">
                Para poder continuar al siguiente paso, debe cubrir el 100% del saldo a financiar con reglas de financiación.
                {haySaldoRestanteA && (
                  <span className="block mt-1">• Saldo pendiente en Parte F: ${formatCurrency(calcularSaldoRestanteA())}</span>
                )}
                {haySaldoRestanteB && (
                  <span className="block mt-1">• Saldo pendiente en Parte SB: ${formatCurrency(calcularSaldoRestanteB(), data.monedaB)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
        <div>
          <h3 className="text-sm font-medium text-blue-700">Total a Financiar en ARS:</h3>
          <p className="text-xl font-bold">${formatCurrency(totalFinanciarArs)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-700">Total a Financiar en {data.monedaB}:</h3>
          <p className="text-xl font-bold">${formatCurrency(totalFinanciarUsd, data.monedaB)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-700">Fecha de Posesión:</h3>
          <p className="text-xl font-bold">{formatFechaPosesion(data.fechaPosesion) || "No definida"}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-700">% pagado a fecha Posesión:</h3>
          <p className={`text-xl font-bold ${porcentajePagado < 50 ? "text-red-600" : "text-green-600"}`}>{porcentajePagado}%</p>
        </div>
      </div>

      {/* Sección A - ARS */}
      <Card className="border-2 border-blue-500">
        <CardHeader className="bg-blue-500 text-white">
          <CardTitle className="text-xl">Financiación Parte F (ARS)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* Reglas existentes */}
          {(data.reglasFinanciacionA || []).length > 0 && (
            <div className="space-y-4 mb-6">
              {(data.reglasFinanciacionA || []).map((regla, index) => (
                <Card key={regla.id} className="border border-gray-200">
                  <CardHeader className="bg-blue-50 py-2 px-4 flex justify-between items-center">
                    <CardTitle className="text-lg">Regla {index + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarReglaA(regla.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="p-3 text-left font-medium text-sm">Concepto</th>
                          <th className="p-3 text-right font-medium text-sm" colSpan={2}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Saldo a Financiar (IVA incluido):</td>
                          <td className="p-3 bg-yellow-50 text-right font-bold">
                            {formatCurrency(regla.saldoFinanciar, regla.moneda)}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-500">${regla.moneda}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Nº de cuotas:</td>
                          <td className="p-3 bg-yellow-50 text-right font-bold" colSpan={2}>
                            {regla.numCuotas}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Periodicidad cuotas:</td>
                          <td className="p-3 bg-yellow-50 text-right font-bold" colSpan={2}>
                            {regla.periodicidad}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Importe cuota:</td>
                          <td className="p-3 text-right font-bold">
                            {formatCurrency(regla.importeCuota, regla.moneda)}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-500">${regla.moneda}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">1º Vencimiento:</td>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.primerVencimiento}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Último Vencimiento:</td>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.ultimoVencimiento}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Valor bien:</td>
                          <td className="p-3 text-right font-medium" colSpan={2}>
                            {regla.valorBien}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Cargo:</td>
                          <td className="p-3 text-right font-medium" colSpan={2}>
                            {regla.cargo}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">% Cobertura Total:</td>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.porcentajeDeudaTotal}%
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">% Cobertura F:</td>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.porcentajeDeudaParte}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Saldo restante */}
          <div className={`p-4 rounded-lg mb-4 ${calcularSaldoRestanteA() > 0 ? 'bg-red-50' : 'bg-blue-50'}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Saldo restante a financiar:</h3>
              <p className={`text-xl font-bold ${calcularSaldoRestanteA() > 0 ? 'text-red-600' : ''}`}>${formatCurrency(calcularSaldoRestanteA())}</p>
            </div>
            {calcularSaldoRestanteA() > 0 && (
              <div className="mt-2 text-red-600 text-sm">
                <p>⚠️ Debe cubrir el 100% del saldo a financiar con reglas de financiación para poder continuar.</p>
              </div>
            )}
          </div>

          {/* Formulario para agregar nueva regla */}
          {mostrarFormA ? (
            <Card className="border border-dashed border-gray-300 p-4">
              <CardHeader className="px-0 pt-0">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Nueva regla de financiación</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setMostrarFormA(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="saldoFinanciarA">Saldo a Financiar</Label>
                    <div className="flex gap-2">
                      <CurrencyInput
                        id="saldoFinanciarA"
                        value={nuevaReglaA.saldoFinanciar}
                        onChange={(value) => setNuevaReglaA({ ...nuevaReglaA, saldoFinanciar: value })}
                        max={calcularSaldoRestanteA()}
                        prefix="$"
                        className="flex-1"
                      />
                      <Select
                        value={nuevaReglaA.moneda as string || "ARS"}
                        onValueChange={(value) => setNuevaReglaA({ ...nuevaReglaA, moneda: value as Moneda })}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="ARS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="numCuotasA">Número de cuotas</Label>
                    <Input
                      id="numCuotasA"
                      type="number"
                      placeholder="12"
                      value={nuevaReglaA.numCuotas || ""}
                      onChange={(e) => setNuevaReglaA({ ...nuevaReglaA, numCuotas: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="periodicidadA">Periodicidad</Label>
                    <Select
                      value={nuevaReglaA.periodicidad as string || ""}
                      onValueChange={(value) => setNuevaReglaA({ ...nuevaReglaA, periodicidad: value as PeriodicidadCuota })}
                    >
                      <SelectTrigger id="periodicidadA">
                        <SelectValue placeholder="Seleccionar periodicidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                        <SelectItem value="Pago Único">Pago Único</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="primerVencimientoA">Primer vencimiento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !nuevaReglaA.primerVencimiento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {nuevaReglaA.primerVencimiento ? nuevaReglaA.primerVencimiento : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={nuevaReglaA.primerVencimiento ? parseDate(nuevaReglaA.primerVencimiento) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const formattedDate = format(date, "d/MM/yy");
                              setNuevaReglaA({ ...nuevaReglaA, primerVencimiento: formattedDate });
                            }
                          }}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valorBienA">Valor bien (opcional)</Label>
                    <Input
                      id="valorBienA"
                      placeholder="Descripción del bien"
                      value={nuevaReglaA.valorBien || ""}
                      onChange={(e) => setNuevaReglaA({ ...nuevaReglaA, valorBien: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cargoA">Cargo (opcional)</Label>
                    <Input
                      id="cargoA"
                      placeholder="Descripción del cargo"
                      value={nuevaReglaA.cargo || ""}
                      onChange={(e) => setNuevaReglaA({ ...nuevaReglaA, cargo: e.target.value })}
                    />
                  </div>
                </div>


                <div className="flex justify-end">
                  <Button
                    onClick={agregarReglaA}
                    disabled={!nuevaReglaA.saldoFinanciar || !nuevaReglaA.numCuotas || !nuevaReglaA.periodicidad || !nuevaReglaA.moneda}
                  >
                    <Check className="w-4 h-4 mr-2" /> Guardar regla
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={() => setMostrarFormA(true)}
                className="flex items-center gap-2"
                disabled={calcularSaldoRestanteA() <= 0}
              >
                <PlusCircle className="w-4 h-4" /> Agregar regla de financiación
              </Button>
            </div>
          )}
        </CardContent>
      </Card >

      {/* Sección B - Moneda según paso 3 */}
      < Card className="border-2 border-purple-500" >
        <CardHeader className="bg-purple-500 text-white">
          <CardTitle className="text-xl">Financiación Parte SB ({data.monedaB})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* Reglas existentes */}
          {(data.reglasFinanciacionB || []).length > 0 && (
            <div className="space-y-4 mb-6">
              {(data.reglasFinanciacionB || []).map((regla, index) => (
                <Card key={regla.id} className="border border-gray-200">
                  <CardHeader className="bg-purple-50 py-2 px-4 flex justify-between items-center">
                    <CardTitle className="text-lg">Regla {index + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarReglaB(regla.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Saldo a Financiar (IVA incluido):</th>
                          <td className="p-3 bg-yellow-50 text-right font-bold">
                            {formatCurrency(regla.saldoFinanciar, regla.moneda)}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-500">${regla.moneda}</td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Nº de cuotas:</th>
                          <td className="p-3 bg-yellow-50 text-right font-bold" colSpan={2}>
                            {regla.numCuotas}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Periodicidad cuotas:</th>
                          <td className="p-3 bg-yellow-50 text-right font-bold" colSpan={2}>
                            {regla.periodicidad}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Importe cuota:</th>
                          <td className="p-3 text-right font-bold">
                            {formatCurrency(regla.importeCuota, regla.moneda)}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-500">${regla.moneda}</td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">1º Vencimiento:</th>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.primerVencimiento}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Último Vencimiento:</th>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.ultimoVencimiento}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Valor bien:</th>
                          <td className="p-3 text-right font-medium" colSpan={2}>
                            {regla.valorBien}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">Cargo:</th>
                          <td className="p-3 text-right font-medium" colSpan={2}>
                            {regla.cargo}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th scope="row" className="p-3 font-medium text-left">% Cobertura Total:</th>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.porcentajeDeudaTotal}%
                          </td>
                        </tr>
                        <tr>
                          <th scope="row" className="p-3 font-medium text-left">% Cobertura SB:</th>
                          <td className="p-3 text-right font-bold" colSpan={2}>
                            {regla.porcentajeDeudaParte}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Saldo restante */}
          <div className={`p-4 rounded-lg mb-4 ${calcularSaldoRestanteB() > 0 ? 'bg-red-50' : 'bg-purple-50'}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Saldo restante a financiar:</h3>
              <p className={`text-xl font-bold ${calcularSaldoRestanteB() > 0 ? 'text-red-600' : ''}`}>${formatCurrency(calcularSaldoRestanteB(), data.monedaB)}</p>
            </div>
            {calcularSaldoRestanteB() > 0 && (
              <div className="mt-2 text-red-600 text-sm">
                <p>⚠️ Debe cubrir el 100% del saldo a financiar con reglas de financiación para poder continuar.</p>
              </div>
            )}
          </div>

          {/* Formulario para agregar nueva regla */}
          {mostrarFormB ? (
            <Card className="border border-dashed border-gray-300 p-4">
              <CardHeader className="px-0 pt-0">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Nueva regla de financiación</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setMostrarFormB(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="saldoFinanciarB">Saldo a Financiar</Label>
                    <div className="flex gap-2">
                      <CurrencyInput
                        id="saldoFinanciarB"
                        value={nuevaReglaB.saldoFinanciar}
                        onChange={(value) => setNuevaReglaB({ ...nuevaReglaB, saldoFinanciar: value })}
                        max={calcularSaldoRestanteB()}
                        prefix="$"
                        className="flex-1"
                      />
                      <Select
                        value={nuevaReglaB.moneda as string || data.monedaB}
                        onValueChange={(value) => setNuevaReglaB({ ...nuevaReglaB, moneda: value as Moneda })}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder={data.monedaB} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          {data.monedaB === "MIX" && <SelectItem value="MIX">MIX</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="numCuotasB">Número de cuotas</Label>
                    <Input
                      id="numCuotasB"
                      type="number"
                      placeholder="12"
                      value={nuevaReglaB.numCuotas || ""}
                      onChange={(e) => setNuevaReglaB({ ...nuevaReglaB, numCuotas: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="periodicidadB">Periodicidad</Label>
                    <Select
                      value={nuevaReglaB.periodicidad as string || ""}
                      onValueChange={(value) => setNuevaReglaB({ ...nuevaReglaB, periodicidad: value as PeriodicidadCuota })}
                    >
                      <SelectTrigger id="periodicidadB">
                        <SelectValue placeholder="Seleccionar periodicidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                        <SelectItem value="Pago Único">Pago Único</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="primerVencimientoB">Primer vencimiento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !nuevaReglaB.primerVencimiento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {nuevaReglaB.primerVencimiento ? nuevaReglaB.primerVencimiento : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={nuevaReglaB.primerVencimiento ? parseDate(nuevaReglaB.primerVencimiento) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const formattedDate = format(date, "d/MM/yy");
                              setNuevaReglaB({ ...nuevaReglaB, primerVencimiento: formattedDate });
                            }
                          }}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valorBienB">Valor bien (opcional)</Label>
                    <Input
                      id="valorBienB"
                      placeholder="Descripción del bien"
                      value={nuevaReglaB.valorBien || ""}
                      onChange={(e) => setNuevaReglaB({ ...nuevaReglaB, valorBien: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cargoB">Cargo (opcional)</Label>
                    <Input
                      id="cargoB"
                      placeholder="Descripción del cargo"
                      value={nuevaReglaB.cargo || ""}
                      onChange={(e) => setNuevaReglaB({ ...nuevaReglaB, cargo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={agregarReglaB}
                    disabled={!nuevaReglaB.saldoFinanciar || !nuevaReglaB.numCuotas || !nuevaReglaB.periodicidad || !nuevaReglaB.moneda}
                  >
                    <Check className="w-4 h-4 mr-2" /> Guardar regla
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={() => setMostrarFormB(true)}
                className="flex items-center gap-2"
                disabled={calcularSaldoRestanteB() <= 0}
              >
                <PlusCircle className="w-4 h-4" /> Agregar regla de financiación
              </Button>
            </div>
          )}
        </CardContent>
      </Card >
    </div >
  );
};
