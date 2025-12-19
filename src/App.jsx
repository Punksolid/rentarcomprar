/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from "recharts";

function TooltipPatrimonio({ active, payload, label, mxn }) {
  if (!active || !payload?.length) return null;
  const p = payload.reduce((acc, item) => {
    acc[item.dataKey] = Number(item.value);
    return acc;
  }, {});
  const t1 = Number.isFinite(p.totalEsc1) ? p.totalEsc1 : 0;
  const t2 = Number.isFinite(p.totalEsc2) ? p.totalEsc2 : 0;
  const diff = t1 - t2;
  return (
    <div className="bg-white border rounded-lg shadow px-3 py-2 text-sm">
      <div className="font-medium">Año {label}</div>
      <div className="flex items-center justify-between gap-6"><span className="text-gray-600">Compra</span><span>{mxn.format(t1)}</span></div>
      <div className="flex items-center justify-between gap-6"><span className="text-gray-600">Renta</span><span>{mxn.format(t2)}</span></div>
      <div className="mt-1 pt-1 border-t flex items-center justify-between gap-6">
        <span className="text-gray-600">Diferencia</span>
        <span className={diff >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>{mxn.format(diff)}</span>
      </div>
    </div>
  );
}

function normalizarNumeroDeInput(texto) {
  const raw = String(texto ?? "")
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!raw) return "";

  // Mantén un único signo negativo al inicio
  let s = raw.replace(/(?!^)-/g, "");
  const negativo = s.startsWith("-");
  s = s.replace(/-/g, "");

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const sepIndex = Math.max(lastDot, lastComma);

  let entero = s;
  let dec = "";
  if (sepIndex >= 0) {
    entero = s.slice(0, sepIndex);
    dec = s.slice(sepIndex + 1);
  }

  entero = entero.replace(/[.,]/g, "");
  dec = dec.replace(/[.,]/g, "");

  const out = dec ? `${entero}.${dec}` : entero;
  return negativo ? `-${out}` : out;
}

function InputNumeroFormateado({
  id,
  value,
  onChangeValue,
  locale,
  min,
  max,
  decimals = 0,
  className,
}) {
  const [focused, setFocused] = useState(false);
  const [texto, setTexto] = useState("");

  const fmt = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      useGrouping: true,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [locale, decimals]);

  useEffect(() => {
    if (focused) return;
    if (!Number.isFinite(value)) {
      setTexto("");
      return;
    }
    setTexto(fmt.format(value));
  }, [value, fmt, focused]);

  const commit = (nextText) => {
    const normalizado = normalizarNumeroDeInput(nextText);
    if (normalizado === "" || normalizado === "-" || normalizado === ".") {
      onChangeValue(0);
      return;
    }
    let n = Number(normalizado);
    if (!Number.isFinite(n)) n = 0;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    onChangeValue(n);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={texto}
      onFocus={() => {
        setFocused(true);
        const v = Number.isFinite(value) ? value : 0;
        setTexto(String(v));
      }}
      onBlur={() => {
        setFocused(false);
        const v = Number.isFinite(value) ? value : 0;
        setTexto(fmt.format(v));
      }}
      onChange={(e) => {
        const next = e.target.value;
        setTexto(next);
        commit(next);
      }}
      className={className}
    />
  );
}

export default function SimuladorCompraVsInversion() {
  const locale = "es-MX";
  const [moneda, setMoneda] = useState("MXN");

  const mxn = new Intl.NumberFormat(locale, { style: "currency", currency: moneda });
  const mxnCompacto = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  // Parámetros base
  const [precio, setPrecio] = useState(2_000_000); // Precio del inmueble
  const [gastosPct, setGastosPct] = useState(5);   // % de gastos de compra sobre el precio
  const [inflacionPct, setInflacionPct] = useState(4); // % anual (impacta rentas y valor del inmueble)
  const [plusvaliaRealPct, setPlusvaliaRealPct] = useState(0); // crecimiento real adicional del inmueble sobre inflación
  const [tasaCetesPct, setTasaCetesPct] = useState(6); // % nominal anual inversión
  const [predialPct, setPredialPct] = useState(0.2);   // % anual sobre valor del inmueble
  const [mantenMeses, setMantenMeses] = useState(1);   // meses de renta por año como mantenimiento

  // Costos operativos adicionales (Escenario 1)
  const [vacanciaMesesAnual, setVacanciaMesesAnual] = useState(0); // meses/año sin cobrar renta
  const [seguroAnual, setSeguroAnual] = useState(0); // MXN/año
  const [condominioMensual, setCondominioMensual] = useState(0); // MXN/mes
  const [adminPctRenta, setAdminPctRenta] = useState(0); // % sobre renta cobrada
  const [capexMonto, setCapexMonto] = useState(0); // MXN
  const [capexCadaNAnios, setCapexCadaNAnios] = useState(0); // 0 = desactivado

  // Costos de salida (Escenario 1)
  const [comisionVentaPct, setComisionVentaPct] = useState(5); // % sobre precio de venta
  const [gastosVentaPct, setGastosVentaPct] = useState(1.5); // % sobre precio de venta

  // Impuestos
  // Arrendamiento (Escenario 1)
  const [modoArrISR, setModoArrISR] = useState("ciega"); // "ciega" | "real"
  const [deduccionCiegaPct, setDeduccionCiegaPct] = useState(35); // % sobre ingresos
  const [isrRentaPct, setIsrRentaPct] = useState(20); // tasa efectiva sobre base

  // Intereses (Escenario 2)
  const [isrInteresesPct, setIsrInteresesPct] = useState(20); // tasa efectiva sobre base de intereses
  const [gravaInteresReal, setGravaInteresReal] = useState(true); // si true: grava solo interés real (interés − inflación*capital)

  // Rentas
  // Escenario 1: ingreso por alquilar el inmueble comprado
  const [rendimientoRentaPct, setRendimientoRentaPct] = useState(4); // % anual del valor del inmueble (promedio pesimista)
  const [aportaE1Anual, setAportaE1Anual] = useState(0); // aportación adicional anual al efectivo

  // Escenario 2: costo por alquilar a un tercero mientras inviertes el capital
  const [rentaPagadaMensual, setRentaPagadaMensual] = useState(8000);
  const [rentaPagadaIndexa, setRentaPagadaIndexa] = useState(true);
  const [aportaE2Anual, setAportaE2Anual] = useState(0); // aportación adicional anual al fondo de inversión

  const [horizonte, setHorizonte] = useState(10); // años

  // Estado del wizard
  const [pasoActual, setPasoActual] = useState(1);
  const totalPasos = 4;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const fmtAxis = (v) => {
    const abs = Math.abs(Number(v));
    if (abs >= 1_000_000) return mxnCompacto.format(Number(v));
    return mxn.format(Number(v));
  };

  const ganadorMeta = (diff) => {
    const ganaE1 = diff >= 0;
    return {
      ganaE1,
      titulo: ganaE1 ? "Gana Compra" : "Gana Renta",
      cardClass: ganaE1
        ? "border-blue-600 ring-blue-100"
        : "border-emerald-600 ring-emerald-100",
      badgeClass: ganaE1
        ? "bg-blue-50 text-blue-700"
        : "bg-emerald-50 text-emerald-700",
    };
  };

  function simularEscenario1(anios) {
    const infl = inflacionPct / 100;
    const plus = plusvaliaRealPct / 100;
    const pred = predialPct / 100;
    const gastos = precio * (gastosPct / 100);

    const rendimientoRenta = clamp(rendimientoRentaPct, 0, 100) / 100;

    const vacMeses = clamp(vacanciaMesesAnual, 0, 12);
    const factorCobro = (12 - vacMeses) / 12;
    const adminPct = clamp(adminPctRenta, 0, 100) / 100;
    const comVenta = clamp(comisionVentaPct, 0, 100) / 100;
    const gasVenta = clamp(gastosVentaPct, 0, 100) / 100;

    let valorCasa = precio;           // valor del activo
    let efectivo = -gastos;           // egresos iniciales (escrituras, impuestos, avalúo, etc.)

    let seguro = seguroAnual;
    let condominio = condominioMensual;
    let capex = capexMonto;

    const rows = [];

    for (let a = 1; a <= anios; a++) {
      const rentaAnualBruta = valorCasa * rendimientoRenta;
      const rentaAnual = rentaAnualBruta * factorCobro;
      const rentaMensual = rentaAnualBruta / 12;
      const mantenimiento = rentaMensual * mantenMeses; // meses de renta por año
      const predial = pred * valorCasa;
      const administracion = rentaAnual * adminPct;
      const condominioAnual = condominio * 12;
      const capexAnual = capexCadaNAnios > 0 && a % capexCadaNAnios === 0 ? capex : 0;

      // ISR por arrendamiento (dos modos)
      let baseISR = 0;
      if (modoArrISR === "ciega") {
        // Deducción ciega: no se deducen gastos reales; la base es ingreso menos deducción ciega
        baseISR = Math.max(0, rentaAnual * (1 - deduccionCiegaPct / 100));
      } else {
        // Gastos reales: base = ingreso − (mantenimiento + predial)
        baseISR = Math.max(0, rentaAnual - mantenimiento - predial);
      }
      const isrRenta = baseISR * (isrRentaPct / 100);

      const neto = rentaAnual - mantenimiento - predial - administracion - seguro - condominioAnual - capexAnual - isrRenta + aportaE1Anual; // flujo neto del año
      efectivo += neto;

      // registrar estado al cierre del año (antes de apreciar valor siguiente año)
      const total = valorCasa + efectivo;
      rows.push({ anio: a, rentaAnualBruta, rentaAnual, mantenimiento, predial, administracion, seguro, condominioAnual, capexAnual, isrRenta, neto, valorCasa, efectivo, total });

      // actualización de variables para el siguiente año
      valorCasa *= (1 + infl) * (1 + plus);
      if (seguro > 0) seguro *= (1 + infl);
      if (condominio > 0) condominio *= (1 + infl);
      if (capex > 0) capex *= (1 + infl);
    }

    const last = rows.at(-1);
    const valorCasaFinal = last?.valorCasa ?? valorCasa;
    const efectivoAcumulado = last?.efectivo ?? efectivo;
    const patrimonioBruto = last?.total ?? valorCasaFinal + efectivoAcumulado;

    const costoSalida = valorCasaFinal * (comVenta + gasVenta);
    const patrimonioNeto = patrimonioBruto - costoSalida;

    return {
      valorCasaFinal,
      efectivoAcumulado,
      patrimonioBruto,
      costoSalida,
      patrimonioTotal: patrimonioNeto,
      detalle: rows,
    };
  }

  function simularEscenario2(anios) {
    const infl = inflacionPct / 100;
    const tasa = tasaCetesPct / 100;
    const gastos = precio * (gastosPct / 100);

    let capital = precio + gastos; // invierto lo mismo que hubiese gastado en comprar + escriturar
    let renta = rentaPagadaMensual; // renta mensual pagada al tercero

    const rows = [];

    for (let a = 1; a <= anios; a++) {
      const intereses = capital * tasa;

      // ISR sobre intereses
      const interesReal = intereses - capital * infl; // aproximación de interés real
      const baseISR = gravaInteresReal ? Math.max(0, interesReal) : intereses;
      const isrIntereses = baseISR * (isrInteresesPct / 100);

      const rentaAnual = renta * 12;
      const neto = intereses + aportaE2Anual - rentaAnual - isrIntereses;
      capital = capital + neto; // reinversión neta

      rows.push({ anio: a, intereses, rentaAnual, isrIntereses, aportacion: aportaE2Anual, neto, capital });

      if (rentaPagadaIndexa) renta *= (1 + infl);
    }

    const last = rows.at(-1);
    return {
      capitalFinal: last?.capital ?? capital,
      detalle: rows,
    };
  }

  function construirSerie(anios) {
    const e1 = simularEscenario1(anios);
    const e2 = simularEscenario2(anios);

    // construir dataset año a año para el gráfico principal (patrimonio vs capital)
    const len = Math.max(e1.detalle.length, e2.detalle.length);
    const data = [];
    const dataFlow = [];

    for (let i = 0; i < len; i++) {
      const p1 = e1.detalle[i];
      const p2 = e2.detalle[i];
      data.push({
        anio: (i + 1).toString(),
        totalEsc1: p1 ? p1.total : (e1.detalle.at(-1)?.total ?? 0),
        totalEsc2: p2 ? p2.capital : (e2.detalle.at(-1)?.capital ?? 0),
      });
      dataFlow.push({
        anio: (i + 1).toString(),
        flowEsc1: p1 ? p1.neto : 0,
        flowEsc2: p2 ? p2.neto : 0,
      });
    }

    return { e1, e2, data, dataFlow };
  }

  const deps = [
    precio,
    gastosPct,
    inflacionPct,
    plusvaliaRealPct,
    tasaCetesPct,
    predialPct,
    mantenMeses,
    rendimientoRentaPct,
    rentaPagadaMensual,
    rentaPagadaIndexa,
    aportaE1Anual,
    aportaE2Anual,
    modoArrISR,
    deduccionCiegaPct,
    isrRentaPct,
    isrInteresesPct,
    gravaInteresReal,
    vacanciaMesesAnual,
    seguroAnual,
    condominioMensual,
    adminPctRenta,
    capexMonto,
    capexCadaNAnios,
    comisionVentaPct,
    gastosVentaPct,
  ];
  const r5 = useMemo(() => construirSerie(5), deps);
  const r10 = useMemo(() => construirSerie(10), deps);
  const rh = useMemo(() => construirSerie(horizonte), [...deps, horizonte]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">¿Comprar o Rentar?</h1>
          <p className="text-lg text-gray-700 mt-2 font-medium">Simulador de inversión inmobiliaria vs inversión financiera</p>
          <p className="text-sm text-gray-600 mt-3 max-w-3xl">Una de las decisiones financieras más importantes es elegir entre <b>comprar un inmueble para rentarlo</b> o <b>invertir ese capital y pagar renta</b>. Este simulador te ayuda a comparar ambos escenarios considerando todos los costos reales (mantenimiento, impuestos, vacancia, salida) y el valor del dinero en el tiempo, para que tomes la mejor decisión según tu contexto.</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-3 border-t-4 border-slate-300 ring-1 ring-slate-100">
          <label htmlFor="moneda" className="text-xs text-gray-600 block mb-1">Moneda</label>
          <select id="moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-32 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50 cursor-pointer">
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Solo cambia el formato; no convierte montos.</p>
        </div>
      </div>

      {/* Wizard de parámetros */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        {/* Indicador de progreso */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { num: 1, titulo: "Activo", color: "slate" },
              { num: 2, titulo: "Escenario 1", color: "blue" },
              { num: 3, titulo: "Escenario 2", color: "emerald" },
              { num: 4, titulo: "Horizonte", color: "amber" },
            ].map((paso, idx) => {
              const activo = pasoActual === paso.num;
              const completado = pasoActual > paso.num;
              const colorClasses = {
                slate: { activo: "bg-gray-700 text-white ring-4 ring-gray-200", completado: "bg-gray-600 text-white", linea: "bg-gray-400" },
                blue: { activo: "bg-blue-600 text-white ring-4 ring-blue-100", completado: "bg-blue-500 text-white", linea: "bg-blue-400" },
                emerald: { activo: "bg-emerald-700 text-white ring-4 ring-emerald-200", completado: "bg-emerald-600 text-white", linea: "bg-emerald-400" },
                amber: { activo: "bg-amber-600 text-white ring-4 ring-amber-100", completado: "bg-amber-500 text-white", linea: "bg-amber-400" },
              };
              const colors = colorClasses[paso.color];
              return (
                <React.Fragment key={paso.num}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setPasoActual(paso.num)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        activo ? colors.activo : completado ? colors.completado : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {completado ? "✓" : paso.num}
                    </button>
                    <span
                      className={`text-xs mt-1 font-medium ${
                        activo ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {paso.titulo}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        completado ? colors.linea : "bg-gray-300"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="p-6">
          {pasoActual === 1 && (
            <div className="max-w-2xl mx-auto space-y-3 border-t-4 border-gray-600 ring-1 ring-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Parámetros del activo</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Activo</span>
              </div>
              <p className="text-sm text-gray-600 pb-2 border-b">Define las características del inmueble y los parámetros económicos generales (inflación, plusvalía) que afectan ambos escenarios.</p>
              <div className="grid grid-cols-2 items-center gap-2">
            <label htmlFor="precio" className="text-sm text-gray-700">Precio del inmueble ({moneda})</label>
            <InputNumeroFormateado
              id="precio"
              value={precio}
              onChangeValue={setPrecio}
              locale={locale}
              min={0}
              decimals={0}
              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
            />

            <label htmlFor="gastosPct" className="text-sm text-gray-700">Gastos de compra (% del precio)</label>
            <input id="gastosPct" type="number" min={0} step={0.1} value={gastosPct} onChange={e=>setGastosPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="predialPct" className="text-sm text-gray-700">Predial anual (% del valor)</label>
            <input id="predialPct" type="number" min={0} step={0.01} value={predialPct} onChange={e=>setPredialPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="mantenMeses" className="text-sm text-gray-700">Mantenimiento (meses renta/año)</label>
            <input id="mantenMeses" type="number" min={0} step={0.1} value={mantenMeses} onChange={e=>setMantenMeses(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="inflacionPct" className="text-sm text-gray-700">Inflación anual (% anual)</label>
            <input id="inflacionPct" type="number" step={0.1} value={inflacionPct} onChange={e=>setInflacionPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="plusvaliaRealPct" className="text-sm text-gray-700">Plusvalía real (% adicional)</label>
            <input id="plusvaliaRealPct" type="number" step={0.1} value={plusvaliaRealPct} onChange={e=>setPlusvaliaRealPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
              </div>
            </div>
          )}

          {pasoActual === 2 && (
            <div className="max-w-2xl mx-auto space-y-3 border-t-4 border-blue-600 ring-1 ring-blue-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Escenario Compra · Comprar y rentar el inmueble</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Compra</span>
              </div>
              <p className="text-sm text-gray-600 pb-2 border-b">Compras el inmueble y lo rentas a un tercero. Define los ingresos por renta, costos operativos (seguro, condominio, mantenimiento, vacancia), impuestos y los costos de salida al vender.</p>
              <div className="grid grid-cols-2 items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="rendimientoRentaPct" className="text-sm text-gray-700">Rendimiento por renta (% anual del valor)</label>
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Ayuda: rendimiento por renta"
                  className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 text-xs font-semibold leading-none flex items-center justify-center bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  ?
                </button>
                <div className="hidden group-hover:block group-focus-within:block absolute z-10 left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs text-gray-700">
                  <div className="font-semibold text-gray-900 mb-1">¿Cómo se calcula?</div>
                  <div>Se estima con: <span className="font-medium">renta anual bruta = valor del inmueble × rendimiento</span>.</div>
                  <div className="mt-1">Como el valor del inmueble crece con inflación/plusvalía, la renta estimada también se ajusta automáticamente.</div>
                  <div className="mt-1 text-gray-600">Tip: no es necesario modificarlo; déjalo como referencia y ajusta solo si tienes un dato mejor.</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="rendimientoRentaPct"
                type="number"
                min={0}
                step={0.1}
                value={rendimientoRentaPct}
                onChange={(e) => setRendimientoRentaPct(Number(e.target.value))}
                className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
              />
              <div className="text-xs text-gray-600 whitespace-nowrap">
                <div>≈ {mxn.format(precio * (Math.max(0, rendimientoRentaPct) / 100))}/año</div>
                <div>≈ {mxn.format((precio * (Math.max(0, rendimientoRentaPct) / 100)) / 12)}/mes</div>
              </div>
            </div>

            <label htmlFor="vacanciaMesesAnual" className="text-sm text-gray-700">Vacancia (meses sin cobrar/año)</label>
            <input id="vacanciaMesesAnual" type="number" min={0} max={12} step={0.5} value={vacanciaMesesAnual} onChange={e=>setVacanciaMesesAnual(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="aportaE1Anual" className="text-sm text-gray-700">Aportación adicional ({moneda}/año)</label>
            <InputNumeroFormateado
              id="aportaE1Anual"
              value={aportaE1Anual}
              onChangeValue={setAportaE1Anual}
              locale={locale}
              decimals={0}
              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
            />
          </div>

              <div className="pt-2 border-t border-blue-100 space-y-2">
            <h3 className="font-medium text-blue-900">Costos operativos</h3>
            <div className="grid grid-cols-2 items-center gap-2">
              <label htmlFor="seguroAnual" className="text-sm text-gray-700">Seguro ({moneda}/año)</label>
              <InputNumeroFormateado
                id="seguroAnual"
                value={seguroAnual}
                onChangeValue={setSeguroAnual}
                locale={locale}
                min={0}
                decimals={0}
                className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
              />

              <label htmlFor="condominioMensual" className="text-sm text-gray-700">Condominio/HOA ({moneda}/mes)</label>
              <InputNumeroFormateado
                id="condominioMensual"
                value={condominioMensual}
                onChangeValue={setCondominioMensual}
                locale={locale}
                min={0}
                decimals={0}
                className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
              />

              <label htmlFor="adminPctRenta" className="text-sm text-gray-700">Administración (% de renta cobrada)</label>
              <input id="adminPctRenta" type="number" min={0} step={0.1} value={adminPctRenta} onChange={e=>setAdminPctRenta(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

              <label htmlFor="capexMonto" className="text-sm text-gray-700">CAPEX ({moneda})</label>
              <InputNumeroFormateado
                id="capexMonto"
                value={capexMonto}
                onChangeValue={setCapexMonto}
                locale={locale}
                min={0}
                decimals={0}
                className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
              />

              <label htmlFor="capexCadaNAnios" className="text-sm text-gray-700">CAPEX cada N años (0=off)</label>
              <input id="capexCadaNAnios" type="number" min={0} step={1} value={capexCadaNAnios} onChange={e=>setCapexCadaNAnios(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
            </div>
            <p className="text-xs text-gray-600">Vacancia reduce la renta cobrada. Seguro/condominio/CAPEX se indexan por inflación.</p>
              </div>

              <div className="pt-2 border-t border-blue-100">
            <h3 className="font-medium text-blue-900">Impuestos – Arrendamiento</h3>
            <div className="grid grid-cols-2 items-center gap-2">
              <label htmlFor="modoArrISR" className="text-sm text-gray-700">Modo</label>
              <select id="modoArrISR" value={modoArrISR} onChange={e=>setModoArrISR(e.target.value)} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50 cursor-pointer">
                <option value="ciega">Deducción ciega</option>
                <option value="real">Gastos reales</option>
              </select>
            </div>
            {modoArrISR === "ciega" && (
              <div className="grid grid-cols-2 items-center gap-2 mt-2">
                <label htmlFor="deduccionCiegaPct" className="text-sm text-gray-700">Deducción ciega (%)</label>
                <input id="deduccionCiegaPct" type="number" min={0} step={0.1} value={deduccionCiegaPct} onChange={e=>setDeduccionCiegaPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
              </div>
            )}
            <div className="grid grid-cols-2 items-center gap-2 mt-2">
              <label htmlFor="isrRentaPct" className="text-sm text-gray-700">ISR sobre base (%)</label>
              <input id="isrRentaPct" type="number" min={0} step={0.1} value={isrRentaPct} onChange={e=>setIsrRentaPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
            </div>
            <p className="text-xs text-gray-600">En "ciega" la base = ingreso × (1 − deducción). En "real" la base = ingreso − (mantenimiento + predial). El ISR se resta del flujo neto.</p>
              </div>

              <div className="pt-2 border-t border-blue-100">
            <h3 className="font-medium text-blue-900">Salida (venta)</h3>
            <div className="grid grid-cols-2 items-center gap-2">
              <label htmlFor="comisionVentaPct" className="text-sm text-gray-700">Comisión venta (% del precio)</label>
              <input id="comisionVentaPct" type="number" min={0} step={0.1} value={comisionVentaPct} onChange={e=>setComisionVentaPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
              <label htmlFor="gastosVentaPct" className="text-sm text-gray-700">Gastos de venta (% del precio)</label>
              <input id="gastosVentaPct" type="number" min={0} step={0.1} value={gastosVentaPct} onChange={e=>setGastosVentaPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
            </div>
            <p className="text-xs text-gray-600">Se descuenta una fricción de salida al final del horizonte (corretaje + gastos). No incluye ISR por enajenación.</p>
              </div>
            </div>
          )}

          {pasoActual === 3 && (
            <div className="max-w-2xl mx-auto space-y-3 border-t-4 border-emerald-700 ring-1 ring-emerald-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Escenario Renta · Invertir y pagar renta</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Renta</span>
              </div>
              <p className="text-sm text-gray-600 pb-2 border-b">En lugar de comprar, inviertes el mismo capital inicial en inversión (cetes, sofipos, bolsa de valores) y pagas renta de mercado. Define la renta pagada, tasa de rendimiento de la inversión e impuestos sobre intereses.</p>
              <div className="grid grid-cols-2 items-center gap-2">
            <label htmlFor="rentaPagadaMensual" className="text-sm text-gray-700">Renta pagada ({moneda}/mes)</label>
            <InputNumeroFormateado
              id="rentaPagadaMensual"
              value={rentaPagadaMensual}
              onChangeValue={setRentaPagadaMensual}
              locale={locale}
              min={0}
              decimals={0}
              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
            />

            <label htmlFor="tasaCetesPct" className="text-sm text-gray-700">Tasa de inversión (% nominal anual) (cetes, sofipos, bolsa de valores)</label>
            <input id="tasaCetesPct" type="number" step={0.1} value={tasaCetesPct} onChange={e=>setTasaCetesPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>

            <label htmlFor="aportaE2Anual" className="text-sm text-gray-700">Aportación adicional ({moneda}/año)</label>
            <InputNumeroFormateado
              id="aportaE2Anual"
              value={aportaE2Anual}
              onChangeValue={setAportaE2Anual}
              locale={locale}
              decimals={0}
              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"
            />
          </div>

          <div className="inline-flex items-center space-x-2 text-sm text-gray-700">
            <input id="rentaPagadaIndexa" type="checkbox" checked={rentaPagadaIndexa} onChange={e=>setRentaPagadaIndexa(e.target.checked)} className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer" />
            <label htmlFor="rentaPagadaIndexa">Indexar renta por inflación</label>
              </div>

              <div className="pt-2 border-t border-emerald-100">
            <h3 className="font-medium text-emerald-900">Impuestos – Intereses</h3>
            <div className="grid grid-cols-2 items-center gap-2">
              <label htmlFor="isrInteresesPct" className="text-sm text-gray-700">ISR intereses (%)</label>
              <input id="isrInteresesPct" type="number" min={0} step={0.1} value={isrInteresesPct} onChange={e=>setIsrInteresesPct(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
            </div>
            <div className="inline-flex items-center space-x-2">
              <input id="gravaInteresReal" type="checkbox" checked={gravaInteresReal} onChange={e=>setGravaInteresReal(e.target.checked)} className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer" />
              <label htmlFor="gravaInteresReal">Gravar solo interés real</label>
            </div>
            <p className="text-xs text-gray-600">Interés real ≈ interés − (inflación × capital). Si está activo, el ISR se calcula sobre el interés real no negativo.</p>
              </div>
            </div>
          )}

          {pasoActual === 4 && (
            <div className="max-w-2xl mx-auto space-y-3 border-t-4 border-amber-500 ring-1 ring-amber-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Horizonte de inversión</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Tiempo</span>
              </div>
              <p className="text-sm text-gray-600 pb-2 border-b">Define el plazo en años para la comparación. El simulador calculará el patrimonio neto al final de este periodo para ambos escenarios.</p>
              <div className="grid grid-cols-2 items-center gap-2">
            <label htmlFor="horizonte" className="text-sm text-gray-700">Años</label>
            <input id="horizonte" type="number" min={1} step={1} value={horizonte} onChange={e=>setHorizonte(Number(e.target.value))} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400 bg-gray-50"/>
              </div>
              <p className="text-xs text-gray-600">Se muestran resúmenes a 5, 10 y el horizonte elegido, además de dos gráficas.</p>
            </div>
          )}

          {/* Navegación del wizard */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t max-w-2xl mx-auto">
            <button
              onClick={() => setPasoActual(Math.max(1, pasoActual - 1))}
              disabled={pasoActual === 1}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                pasoActual === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              ← Anterior
            </button>

            <div className="text-sm text-gray-600">
              Paso {pasoActual} de {totalPasos}
            </div>

            <button
              onClick={() => setPasoActual(Math.min(totalPasos, pasoActual + 1))}
              disabled={pasoActual === totalPasos}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                pasoActual === totalPasos
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {pasoActual === totalPasos ? "Finalizado ✓" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico 1: Patrimonio */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Evolución anual del patrimonio</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={rh.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" />
              <YAxis tickFormatter={fmtAxis} width={110} />
              <Tooltip content={<TooltipPatrimonio mxn={mxn} />} />
              <Legend />
              <Line type="monotone" dataKey="totalEsc1" name="Compra" dot={false} stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="totalEsc2" name="Renta" dot={false} stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Flujos netos anuales */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Flujo neto anual (después de impuestos)</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={rh.dataFlow} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" />
              <YAxis tickFormatter={fmtAxis} width={110} />
              <Tooltip formatter={(v)=>mxn.format(Number(v))} labelFormatter={(l)=>`Año ${l}`} />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
              <Bar dataKey="flowEsc1" name="Flujo Compra" fill="#2563eb" />
              <Bar dataKey="flowEsc2" name="Flujo Renta" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resúmenes */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={(() => {
          const diff = r5.e1.patrimonioTotal - r5.e2.capitalFinal;
          const meta = ganadorMeta(diff);
          return `bg-white shadow rounded-2xl p-4 border-t-4 ring-1 ${meta.cardClass}`;
        })()}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Resultado a 5 años</h3>
            <span className={(() => {
              const diff = r5.e1.patrimonioTotal - r5.e2.capitalFinal;
              const meta = ganadorMeta(diff);
              return `text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`;
            })()}>
              {(() => {
                const diff = r5.e1.patrimonioTotal - r5.e2.capitalFinal;
                return ganadorMeta(diff).titulo;
              })()}
            </span>
          </div>
          <div className="space-y-1">
            <div><b>Compra:</b> Patrimonio total {mxn.format(r5.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(r5.e1.valorCasaFinal)}, Efectivo {mxn.format(r5.e1.efectivoAcumulado)}, Salida −{mxn.format(r5.e1.costoSalida)})</span></div>
            <div><b>Renta:</b> Capital final {mxn.format(r5.e2.capitalFinal)}</div>
            <div className={(r5.e1.patrimonioTotal - r5.e2.capitalFinal) >= 0 ? "text-green-700" : "text-red-700"}><b>Diferencia:</b> {mxn.format(r5.e1.patrimonioTotal - r5.e2.capitalFinal)}</div>
          </div>
        </div>
        <div className={(() => {
          const diff = r10.e1.patrimonioTotal - r10.e2.capitalFinal;
          const meta = ganadorMeta(diff);
          return `bg-white shadow rounded-2xl p-4 border-t-4 ring-1 ${meta.cardClass}`;
        })()}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Resultado a 10 años</h3>
            <span className={(() => {
              const diff = r10.e1.patrimonioTotal - r10.e2.capitalFinal;
              const meta = ganadorMeta(diff);
              return `text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`;
            })()}>
              {(() => {
                const diff = r10.e1.patrimonioTotal - r10.e2.capitalFinal;
                return ganadorMeta(diff).titulo;
              })()}
            </span>
          </div>
          <div className="space-y-1">
            <div><b>Compra:</b> Patrimonio total {mxn.format(r10.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(r10.e1.valorCasaFinal)}, Efectivo {mxn.format(r10.e1.efectivoAcumulado)}, Salida −{mxn.format(r10.e1.costoSalida)})</span></div>
            <div><b>Renta:</b> Capital final {mxn.format(r10.e2.capitalFinal)}</div>
            <div className={(r10.e1.patrimonioTotal - r10.e2.capitalFinal) >= 0 ? "text-green-700" : "text-red-700"}><b>Diferencia:</b> {mxn.format(r10.e1.patrimonioTotal - r10.e2.capitalFinal)}</div>
          </div>
        </div>
        <div className={(() => {
          const diff = rh.e1.patrimonioTotal - rh.e2.capitalFinal;
          const meta = ganadorMeta(diff);
          return `bg-white shadow rounded-2xl p-4 border-t-4 ring-1 ${meta.cardClass}`;
        })()}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Resultado a {horizonte} años</h3>
            <span className={(() => {
              const diff = rh.e1.patrimonioTotal - rh.e2.capitalFinal;
              const meta = ganadorMeta(diff);
              return `text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`;
            })()}>
              {(() => {
                const diff = rh.e1.patrimonioTotal - rh.e2.capitalFinal;
                return ganadorMeta(diff).titulo;
              })()}
            </span>
          </div>
          <div className="space-y-1">
            <div><b>Compra:</b> Patrimonio total {mxn.format(rh.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(rh.e1.valorCasaFinal)}, Efectivo {mxn.format(rh.e1.efectivoAcumulado)}, Salida −{mxn.format(rh.e1.costoSalida)})</span></div>
            <div><b>Renta:</b> Capital final {mxn.format(rh.e2.capitalFinal)}</div>
            <div className={(rh.e1.patrimonioTotal - rh.e2.capitalFinal) >= 0 ? "text-green-700" : "text-red-700"}><b>Diferencia:</b> {mxn.format(rh.e1.patrimonioTotal - rh.e2.capitalFinal)}</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p>Notas: Este simulador ahora incluye impuestos: ISR por arrendamiento (con modo de deducción ciega o gastos reales) y ISR sobre intereses (opción de gravar solo interés real). No contempla seguros, ISAI/plusvalía al vender ni comisiones de corretaje. Úsalo como estimación inicial.</p>
      </div>
    </div>
  );
}
