import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2, Edit, Check, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ReglaFinanciacion, Moneda, PeriodicidadCuota } from "@/types/wizard";
import { format, addMonths, addYears, parse } from "date-fns";
import { es } from "date-fns/locale";

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

export const Step6ReglasFinanciacion: React.FC = () => {
  const { data, setData, resetWizard } = useWizard();
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

  // Función para calcular cuánto se habrá pagado de una regla a la fecha de posesión
  const calcularMontoPagadoAFechaPosesion = (regla: ReglaFinanciacion, fechaPosesion: Date): number => {
    console.log("Calculando monto pagado para regla:", regla.id, "con saldo:", regla.saldoFinanciar);
    console.log("Primer vencimiento:", regla.primerVencimiento, "Fecha posesión:", fechaPosesion);

    try {
      // Si el primer vencimiento es posterior a la fecha de posesión, no se paga nada
      let fechaPrimerVencimiento;
      try {
        // Intentar parsear la fecha en formato DD/MM/YY
        const partes = regla.primerVencimiento.split('/');
        if (partes.length === 3) {
          // Formato DD/MM/YYYY o DD/MM/YY
          const year = partes[2].length === 2 ? "20" + partes[2] : partes[2]; // Manejar años en formato YY
          fechaPrimerVencimiento = new Date(parseInt(year), parseInt(partes[1]) - 1, parseInt(partes[0]));
        } else {
          // Intentar parsear como fecha ISO
          fechaPrimerVencimiento = new Date(regla.primerVencimiento);
        }
      } catch (error) {
        console.error("Error al parsear primer vencimiento:", error);
        return 0;
      }

      console.log("Fecha primer vencimiento parseada:", fechaPrimerVencimiento);

      // Si la fecha de primer vencimiento es inválida, no se paga nada
      if (isNaN(fechaPrimerVencimiento.getTime())) {
        console.error("Fecha de primer vencimiento inválida:", regla.primerVencimiento);
        return 0;
      }

      // Si el primer vencimiento es posterior a la fecha de posesión, no se paga nada
      if (fechaPrimerVencimiento > fechaPosesion) {
        console.log("Primer vencimiento posterior a fecha posesión, no se paga nada");
        return 0;
      }

      // Si es pago único y el vencimiento es anterior a la fecha de posesión, se paga todo
      if (regla.periodicidad === "Pago Único") {
        console.log("Es pago único y vence antes de posesión, se paga todo:", regla.saldoFinanciar);
        return regla.saldoFinanciar;
      }

      // Para pagos periódicos, calcular cuántas cuotas se pagarán antes de la fecha de posesión
      let intervaloMeses;
      switch (regla.periodicidad) {
        case "Mensual": intervaloMeses = 1; break;
        case "Trimestral": intervaloMeses = 3; break;
        case "Semestral": intervaloMeses = 6; break;
        case "Anual": intervaloMeses = 12; break;
        default:
          console.log("Periodicidad no reconocida:", regla.periodicidad);
          return 0;
      }

      // Calcular la fecha del último vencimiento antes de la posesión
      let cuotasPagadas = 0;
      let fechaVencimiento = new Date(fechaPrimerVencimiento.getTime());

      // Para el primer vencimiento, ya sabemos que es anterior o igual a la fecha de posesión
      // Contamos la primera cuota como pagada
      cuotasPagadas = 1;
      console.log("Primera cuota pagada, fecha:", fechaPrimerVencimiento);

      // Si es una sola cuota, ya terminamos
      if (regla.numCuotas <= 1) {
        console.log("Solo hay una cuota, ya está pagada");
      } else {
        // Para las siguientes cuotas, verificar cuáles se pagarían antes de la posesión
        let siguienteFechaVencimiento;

        // Verificar cada fecha de vencimiento hasta la fecha de posesión
        for (let i = 1; i < regla.numCuotas; i++) {
          // Calcular la siguiente fecha de vencimiento
          if (regla.periodicidad === "Mensual") {
            siguienteFechaVencimiento = addMonths(fechaPrimerVencimiento, i);
          } else if (regla.periodicidad === "Trimestral") {
            siguienteFechaVencimiento = addMonths(fechaPrimerVencimiento, i * 3);
          } else if (regla.periodicidad === "Semestral") {
            siguienteFechaVencimiento = addMonths(fechaPrimerVencimiento, i * 6);
          } else if (regla.periodicidad === "Anual") {
            siguienteFechaVencimiento = addYears(fechaPrimerVencimiento, i);
          } else {
            break; // Si no reconocemos la periodicidad, salimos
          }

          console.log(`Evaluando cuota #${i + 1}, vencimiento:`, siguienteFechaVencimiento);

          // Si la siguiente fecha de vencimiento es anterior o igual a la fecha de posesión,
          // contamos esa cuota como pagada
          if (siguienteFechaVencimiento <= fechaPosesion) {
            cuotasPagadas++;
            console.log(`Cuota #${i + 1} pagada, total pagadas:`, cuotasPagadas);
          } else {
            console.log(`Cuota #${i + 1} posterior a posesión, no se cuenta`);
            break; // No seguimos verificando más cuotas
          }
        }
      }

      // Calcular el monto pagado (número de cuotas * importe por cuota)
      const montoPagado = Math.min(regla.saldoFinanciar, cuotasPagadas * regla.importeCuota);
      console.log("Monto pagado calculado:", montoPagado, "(", cuotasPagadas, "cuotas de", regla.importeCuota, ")");
      return montoPagado;
    } catch (error) {
      console.error("Error al calcular monto pagado:", error);
      return 0;
    }
  };

  // Calcular porcentaje pagado a fecha posesión
  // Esta función puede recibir reglas personalizadas para cálculos inmediatos
  const calcularPorcentajePagado = (reglasA?: ReglaFinanciacion[], reglasB?: ReglaFinanciacion[]) => {
    // Usar las reglas proporcionadas o las del estado actual
    const reglasFinanciacionA = reglasA || data.reglasFinanciacionA || [];
    const reglasFinanciacionB = reglasB || data.reglasFinanciacionB || [];

    console.log("Calculando porcentaje pagado con:", {
      reglasA: reglasFinanciacionA.length,
      reglasB: reglasFinanciacionB.length
    });
    // Verificar si hay anticipos o reglas de financiación
    const hayAnticipos = (data.anticipoArsA || 0) > 0 || (data.anticipoArsB || 0) > 0 ||
      (data.anticipoUsdA || 0) > 0 || (data.anticipoUsdB || 0) > 0;

    // Si no hay reglas de financiación ni anticipos, devolver 0%
    if (!hayAnticipos && reglasFinanciacionA.length === 0 && reglasFinanciacionB.length === 0) {
      console.log("No hay anticipos ni reglas de financiación, devolviendo 0%");
      return 0;
    }

    // Si no hay fecha de posesión, devolver el valor por defecto
    if (!data.fechaPosesion) return 85;

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
        fechaPosesion = new Date(parseInt(year), parseInt(partes[1]) - 1, parseInt(partes[0]));
      } else {
        // Intentar parsear como fecha ISO
        fechaPosesion = new Date(data.fechaPosesion);
      }

      // Verificar si la fecha es válida
      if (isNaN(fechaPosesion.getTime())) {
        // Si no podemos parsear la fecha, usar una fecha futura por defecto
        fechaPosesion = new Date();
        fechaPosesion.setFullYear(fechaPosesion.getFullYear() + 1); // Un año en el futuro
      }
    } catch (error) {
      console.error("Error al parsear fecha de posesión:", error);
      // Si hay algún error, usar una fecha futura por defecto
      fechaPosesion = new Date();
      fechaPosesion.setFullYear(fechaPosesion.getFullYear() + 1); // Un año en el futuro
    }

    const hoy = new Date();

    // Si la fecha de posesión es anterior a hoy, devolver 100%
    if (fechaPosesion < hoy) return 100;

    // Calcular el total a financiar en una moneda base (usamos ARS)
    let totalFinanciar;

    // Convertir todos los valores a ARS para tener una base común
    if (data.monedaB === "USD") {
      // Si B está en USD, convertir a ARS para sumar
      const totalBEnArs = totalFinanciarUsd * (data.tcValor || 1);
      totalFinanciar = totalFinanciarArs + totalBEnArs;
      console.log("Total a financiar en ARS (A):", totalFinanciarArs);
      console.log("Total a financiar en USD (B):", totalFinanciarUsd, "convertido a ARS:", totalBEnArs);
    } else {
      // Si B está en ARS o MIX, sumar directamente
      totalFinanciar = totalFinanciarArs + totalFinanciarUsd;
      console.log("Total a financiar en ARS (A):", totalFinanciarArs);
      console.log("Total a financiar en ARS (B):", totalFinanciarUsd);
    }

    if (totalFinanciar === 0) return 100;

    console.log("=== CALCULANDO PORCENTAJE PAGADO A FECHA POSESIÓN ===");
    console.log("Fecha posesión:", fechaPosesion);
    console.log("Total a financiar:", totalFinanciar);

    // Considerar los anticipos como pagos ya realizados
    let totalAnticipos = 0;

    // Anticipos en ARS
    const anticipoArsA = data.anticipoArsA || 0;
    const anticipoArsB = data.anticipoArsB || 0;
    totalAnticipos += anticipoArsA + anticipoArsB;
    console.log("Anticipos en ARS A:", anticipoArsA);
    console.log("Anticipos en ARS B:", anticipoArsB);
    console.log("Subtotal anticipos en ARS:", anticipoArsA + anticipoArsB);

    // Anticipos en USD (convertidos a ARS para el cálculo)
    const anticipoUsdA = data.anticipoUsdA || 0;
    const anticipoUsdB = data.anticipoUsdB || 0;
    const anticiposUsdEnArs = (anticipoUsdA + anticipoUsdB) * (data.tcValor || 1);
    totalAnticipos += anticiposUsdEnArs;
    console.log("Anticipos en USD A:", anticipoUsdA);
    console.log("Anticipos en USD B:", anticipoUsdB);
    console.log("Tipo de cambio:", data.tcValor || 1);
    console.log("Subtotal anticipos en USD convertidos a ARS:", anticiposUsdEnArs);

    console.log("Total anticipos (ARS + USD convertidos):", totalAnticipos);

    // Verificar si los anticipos son números
    console.log("¿Es anticipoArsA un número?", typeof anticipoArsA === 'number');
    console.log("¿Es anticipoArsB un número?", typeof anticipoArsB === 'number');
    console.log("¿Es anticipoUsdA un número?", typeof anticipoUsdA === 'number');
    console.log("¿Es anticipoUsdB un número?", typeof anticipoUsdB === 'number');
    console.log("¿Es totalAnticipos un número?", typeof totalAnticipos === 'number');

    // Calcular el total pagado a fecha de posesión para las reglas de la parte A
    console.log("Procesando reglas de la parte A:", reglasFinanciacionA);
    let totalPagadoA = 0;

    // Procesar cada regla de la parte A
    reglasFinanciacionA.forEach(regla => {
      if (!regla.activa) {
        console.log("Regla inactiva, ignorando:", regla.id);
        return;
      }

      console.log("Procesando regla A:", regla.id, "con saldo:", regla.saldoFinanciar, "moneda:", regla.moneda);

      // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
      const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);
      console.log("Monto pagado calculado para regla A:", montoPagado);

      // Si la regla está en USD, convertir a ARS usando el tipo de cambio
      if (regla.moneda === "USD") {
        const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
        console.log("Monto pagado convertido a ARS:", montoPagadoConvertido);
        totalPagadoA += montoPagadoConvertido;
      } else {
        totalPagadoA += montoPagado;
      }
    });

    console.log("Total pagado parte A:", totalPagadoA);

    // Calcular el total pagado a fecha de posesión para las reglas de la parte B
    console.log("Procesando reglas de la parte B:", reglasFinanciacionB);
    let totalPagadoB = 0;

    // Procesar cada regla de la parte B
    reglasFinanciacionB.forEach(regla => {
      if (!regla.activa) {
        console.log("Regla inactiva, ignorando:", regla.id);
        return;
      }

      console.log("Procesando regla B:", regla.id, "con saldo:", regla.saldoFinanciar, "moneda:", regla.moneda);

      // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
      const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);
      console.log("Monto pagado calculado para regla B:", montoPagado);

      // Convertir todos los montos a ARS para tener una base común
      if (regla.moneda === "USD") {
        // Si la regla está en USD, convertir a ARS
        const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
        console.log("Monto pagado en USD convertido a ARS:", montoPagadoConvertido);
        totalPagadoB += montoPagadoConvertido;
      } else {
        // Si la regla está en ARS, usar directamente
        console.log("Monto pagado en ARS:", montoPagado);
        totalPagadoB += montoPagado;
      }
    });

    console.log("Total pagado parte B (convertido a ARS):", totalPagadoB);

    // Sumar los anticipos a los pagos de las reglas
    const totalPagado = totalPagadoA + totalPagadoB + totalAnticipos;
    console.log("Total pagado (Anticipos + Reglas A + Reglas B):", totalPagado);
    console.log("Desglose del total pagado:");
    console.log(" - Anticipos:", totalAnticipos);
    console.log(" - Reglas A:", totalPagadoA);
    console.log(" - Reglas B:", totalPagadoB);
    console.log(" - Total:", totalPagado);

    // Verificar si los valores son números
    console.log("¿Es totalPagado un número?", typeof totalPagado === 'number');
    console.log("¿Es totalFinanciar un número?", typeof totalFinanciar === 'number');

    // El porcentaje pagado es lo que se pagará antes de la fecha de posesión dividido por el total a financiar
    let porcentajePagado = 0;
    if (totalFinanciar > 0 && typeof totalPagado === 'number' && typeof totalFinanciar === 'number') {
      porcentajePagado = (totalPagado / totalFinanciar) * 100;
      console.log("Cálculo: (" + totalPagado + " / " + totalFinanciar + ") * 100 = " + porcentajePagado);
    } else {
      console.log("No se pudo calcular el porcentaje porque los valores no son válidos.");
      console.log("totalPagado:", totalPagado, "tipo:", typeof totalPagado);
      console.log("totalFinanciar:", totalFinanciar, "tipo:", typeof totalFinanciar);
    }

    console.log("Porcentaje pagado calculado:", porcentajePagado, "%");
    console.log("Fórmula: (" + totalPagado + " / " + totalFinanciar + ") * 100 = " + porcentajePagado + "%");
    console.log("Desglose del total pagado: Anticipos (" + totalAnticipos + ") + Reglas A (" + totalPagadoA + ") + Reglas B (" + totalPagadoB + ") = " + totalPagado);

    // Asegurarse de que el porcentaje esté entre 0 y 100
    return Math.max(0, Math.min(100, Math.round(porcentajePagado * 100) / 100));
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
      console.error("Error al formatear fecha de posesión:", error);
      return fechaIso;
    }
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
      moneda: nuevaReglaA.moneda as Moneda,
      saldoFinanciar: Number(nuevaReglaA.saldoFinanciar),
      numCuotas: Number(nuevaReglaA.numCuotas),
      periodicidad: nuevaReglaA.periodicidad as PeriodicidadCuota,
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
    const porcentajeCalculado = calcularPorcentajePagado(nuevasReglas, data.reglasFinanciacionB || []);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    setData({
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
    console.log("Nueva regla A agregada, recalculando porcentaje pagado:", calcularPorcentajePagado());
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
      moneda: nuevaReglaB.moneda as Moneda,
      saldoFinanciar: Number(nuevaReglaB.saldoFinanciar),
      numCuotas: Number(nuevaReglaB.numCuotas),
      periodicidad: nuevaReglaB.periodicidad as PeriodicidadCuota,
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
    const porcentajeCalculado = calcularPorcentajePagado(data.reglasFinanciacionA || [], nuevasReglas);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    setData({
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
    console.log("Nueva regla B agregada, recalculando porcentaje pagado:", calcularPorcentajePagado());
  };

  // Eliminar regla
  const eliminarReglaA = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionA || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagado(nuevasReglas, data.reglasFinanciacionB || []);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    setData({
      reglasFinanciacionA: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
    console.log("Regla A eliminada, recalculando porcentaje pagado:", calcularPorcentajePagado());
  };

  const eliminarReglaB = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionB || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagado(data.reglasFinanciacionA || [], nuevasReglas);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    setData({
      reglasFinanciacionB: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
    console.log("Regla B eliminada, recalculando porcentaje pagado:", calcularPorcentajePagado());
  };

  // Actualizar porcentaje pagado cuando cambian las reglas, la fecha de posesión o los anticipos
  useEffect(() => {
    // Si no hay fecha de posesión, no hacer cálculos detallados
    if (!data.fechaPosesion) {
      const porcentajeCalculado = calcularPorcentajePagado();
      setData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
      return;
    }

    console.log("Recalculando porcentaje pagado debido a cambios en reglas, fecha de posesión o anticipos");
    console.log("Anticipos actuales:");
    console.log("- ARS A:", data.anticipoArsA || 0);
    console.log("- ARS B:", data.anticipoArsB || 0);
    console.log("- USD A:", data.anticipoUsdA || 0);
    console.log("- USD B:", data.anticipoUsdB || 0);

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
        fechaPosesion = new Date(parseInt(year), parseInt(partes[1]) - 1, parseInt(partes[0]));
      } else {
        // Intentar parsear como fecha ISO
        fechaPosesion = new Date(data.fechaPosesion);
      }

      // Verificar si la fecha es válida
      if (isNaN(fechaPosesion.getTime())) {
        console.error("Fecha de posesión inválida:", data.fechaPosesion);
        return;
      }
    } catch (error) {
      console.error("Error al parsear fecha de posesión:", error);
      return;
    }

    // Calcular el detalle de pagos por cada regla
    const detalleReglasA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .map(regla => {
        const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);
        const porcentajeRegla = (montoPagado / regla.saldoFinanciar) * 100;
        return {
          id: regla.id,
          primerVencimiento: regla.primerVencimiento,
          ultimoVencimiento: regla.ultimoVencimiento,
          saldoFinanciar: regla.saldoFinanciar,
          montoPagado,
          porcentajePagado: Math.round(porcentajeRegla * 100) / 100,
          moneda: regla.moneda
        };
      });

    const detalleReglasB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .map(regla => {
        const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);
        const porcentajeRegla = (montoPagado / regla.saldoFinanciar) * 100;
        return {
          id: regla.id,
          primerVencimiento: regla.primerVencimiento,
          ultimoVencimiento: regla.ultimoVencimiento,
          saldoFinanciar: regla.saldoFinanciar,
          montoPagado,
          porcentajePagado: Math.round(porcentajeRegla * 100) / 100,
          moneda: regla.moneda
        };
      });

    // Forzar la actualización del porcentaje pagado
    const porcentajeCalculado = calcularPorcentajePagado();

    // Registrar para depuración
    console.log("=== DETALLE DE PORCENTAJE PAGADO A FECHA POSESIÓN ===");
    console.log("Fecha posesión:", data.fechaPosesion);
    console.log("Porcentaje pagado calculado:", porcentajeCalculado, "%");
    console.log("Total a financiar ARS:", totalFinanciarArs);
    console.log("Total a financiar USD:", totalFinanciarUsd);

    // Mostrar información sobre anticipos
    console.log("Anticipo ARS A:", data.anticipoArsA || 0);
    console.log("Anticipo ARS B:", data.anticipoArsB || 0);
    console.log("Anticipo USD A:", data.anticipoUsdA || 0);
    console.log("Anticipo USD B:", data.anticipoUsdB || 0);

    console.log("Detalle reglas parte A:", detalleReglasA);
    console.log("Detalle reglas parte B:", detalleReglasB);

    // Actualizar el estado solo si el porcentaje ha cambiado
    if (porcentajeCalculado !== data.porcentajePagadoFechaPosesion) {
      console.log("Actualizando porcentaje pagado de", data.porcentajePagadoFechaPosesion, "% a", porcentajeCalculado, "%");
      setData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
    } else {
      console.log("El porcentaje pagado no ha cambiado:", porcentajeCalculado, "%");
    }
  }, [data.reglasFinanciacionA, data.reglasFinanciacionB, data.fechaPosesion, totalFinanciarArs, totalFinanciarUsd, data.anticipoArsA, data.anticipoArsB, data.anticipoUsdA, data.anticipoUsdB, data.tcValor, data.porcentajePagadoFechaPosesion]);

  // Obtener el porcentaje pagado a fecha posesión
  const porcentajePagado = data.porcentajePagadoFechaPosesion || calcularPorcentajePagado();

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
          {!mostrarFormA ? (
            <div className="flex justify-center">
              <Button
                onClick={() => setMostrarFormA(true)}
                className="flex items-center gap-2"
                disabled={calcularSaldoRestanteA() <= 0}
              >
                <PlusCircle className="w-4 h-4" /> Agregar regla de financiación
              </Button>
            </div>
          ) : (
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
                      <Input
                        id="saldoFinanciarA"
                        type="number"
                        placeholder="0.00"
                        value={nuevaReglaA.saldoFinanciar || ""}
                        onChange={(e) => setNuevaReglaA({ ...nuevaReglaA, saldoFinanciar: Number(e.target.value) })}
                        max={calcularSaldoRestanteA()}
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
          )}
        </CardContent>
      </Card>

      {/* Sección B - Moneda según paso 3 */}
      <Card className="border-2 border-purple-500">
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
          {!mostrarFormB ? (
            <div className="flex justify-center">
              <Button
                onClick={() => setMostrarFormB(true)}
                className="flex items-center gap-2"
                disabled={calcularSaldoRestanteB() <= 0}
              >
                <PlusCircle className="w-4 h-4" /> Agregar regla de financiación
              </Button>
            </div>
          ) : (
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
                      <Input
                        id="saldoFinanciarB"
                        type="number"
                        placeholder="0.00"
                        value={nuevaReglaB.saldoFinanciar || ""}
                        onChange={(e) => setNuevaReglaB({ ...nuevaReglaB, saldoFinanciar: Number(e.target.value) })}
                        max={calcularSaldoRestanteB()}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
