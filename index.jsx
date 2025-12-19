import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";

export default function SimuladorCompraVsInversion() {
  const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

  // Parámetros base
  const [precio, setPrecio] = useState(2_000_000); // Precio del inmueble
  const [gastosPct, setGastosPct] = useState(5);   // % de gastos de compra sobre el precio
  const [inflacionPct, setInflacionPct] = useState(4); // % anual (impacta rentas y valor del inmueble)
  const [plusvaliaRealPct, setPlusvaliaRealPct] = useState(0); // crecimiento real adicional del inmueble sobre inflación
  const [tasaCetesPct, setTasaCetesPct] = useState(6); // % nominal anual inversión
  const [predialPct, setPredialPct] = useState(0.2);   // % anual sobre valor del inmueble
  const [mantenMeses, setMantenMeses] = useState(1);   // meses de renta por año como mantenimiento

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
  const [rentaRecibidaMensual, setRentaRecibidaMensual] = useState(2000);
  const [rentaRecibidaIndexa, setRentaRecibidaIndexa] = useState(true); // si ajusta por inflación
  const [aportaE1Anual, setAportaE1Anual] = useState(0); // aportación adicional anual al efectivo

  // Escenario 2: costo por alquilar a un tercero mientras inviertes el capital
  const [rentaPagadaMensual, setRentaPagadaMensual] = useState(8000);
  const [rentaPagadaIndexa, setRentaPagadaIndexa] = useState(true);
  const [aportaE2Anual, setAportaE2Anual] = useState(0); // aportación adicional anual al fondo de inversión

  const [horizonte, setHorizonte] = useState(10); // años

  function simularEscenario1(anios) {
    const infl = inflacionPct / 100;
    const plus = plusvaliaRealPct / 100;
    const pred = predialPct / 100;
    const gastos = precio * (gastosPct / 100);

    let valorCasa = precio;           // valor del activo
    let efectivo = -gastos;           // egresos iniciales (escrituras, impuestos, avalúo, etc.)
    let renta = rentaRecibidaMensual; // renta mensual recibida

    const rows = [];

    for (let a = 1; a <= anios; a++) {
      const rentaAnual = renta * 12;
      const mantenimiento = renta * mantenMeses; // meses de renta por año
      const predial = pred * valorCasa;

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

      const neto = rentaAnual - mantenimiento - predial - isrRenta + aportaE1Anual; // flujo neto del año
      efectivo += neto;

      // registrar estado al cierre del año (antes de apreciar valor siguiente año)
      const total = valorCasa + efectivo;
      rows.push({ anio: a, rentaAnual, mantenimiento, predial, isrRenta, neto, valorCasa, efectivo, total });

      // actualización de variables para el siguiente año
      valorCasa *= (1 + infl) * (1 + plus);
      if (rentaRecibidaIndexa) renta *= (1 + infl);
    }

    const last = rows[rows.length - 1];
    return {
      valorCasaFinal: last?.valorCasa ?? valorCasa,
      efectivoAcumulado: last?.efectivo ?? efectivo,
      patrimonioTotal: last?.total ?? valorCasa + efectivo,
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

    const last = rows[rows.length - 1];
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
        totalEsc1: p1 ? p1.total : (e1.detalle[e1.detalle.length - 1]?.total ?? 0),
        totalEsc2: p2 ? p2.capital : (e2.detalle[e2.detalle.length - 1]?.capital ?? 0),
      });
      dataFlow.push({
        anio: (i + 1).toString(),
        flowEsc1: p1 ? p1.neto : 0,
        flowEsc2: p2 ? p2.neto : 0,
      });
    }

    return { e1, e2, data, dataFlow };
  }

  const r5 = useMemo(() => construirSerie(5), [precio, gastosPct, inflacionPct, plusvaliaRealPct, tasaCetesPct, predialPct, mantenMeses, rentaRecibidaMensual, rentaRecibidaIndexa, rentaPagadaMensual, rentaPagadaIndexa, aportaE1Anual, aportaE2Anual, modoArrISR, deduccionCiegaPct, isrRentaPct, isrInteresesPct, gravaInteresReal]);
  const r10 = useMemo(() => construirSerie(10), [precio, gastosPct, inflacionPct, plusvaliaRealPct, tasaCetesPct, predialPct, mantenMeses, rentaRecibidaMensual, rentaRecibidaIndexa, rentaPagadaMensual, rentaPagadaIndexa, aportaE1Anual, aportaE2Anual, modoArrISR, deduccionCiegaPct, isrRentaPct, isrInteresesPct, gravaInteresReal]);
  const rh = useMemo(() => construirSerie(horizonte), [precio, gastosPct, inflacionPct, plusvaliaRealPct, tasaCetesPct, predialPct, mantenMeses, rentaRecibidaMensual, rentaRecibidaIndexa, rentaPagadaMensual, rentaPagadaIndexa, aportaE1Anual, aportaE2Anual, modoArrISR, deduccionCiegaPct, isrRentaPct, isrInteresesPct, gravaInteresReal, horizonte]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Simulador genérico: Comprar inmueble vs Invertir en CETES</h1>
      <p className="text-sm text-gray-600">Ajusta las variables. Todas impactan el resultado y las gráficas. El <b>Escenario 1</b> asume compra del inmueble y recepción de renta; el <b>Escenario 2</b> asume inversión financiera y pago de una renta de mercado.</p>

      {/* Controles principales */}
      <div className="grid xl:grid-cols-4 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Parámetros del activo</h2>
          <div className="flex items-center justify-between"><label className="mr-2">Precio del inmueble</label><input type="number" value={precio} onChange={e=>setPrecio(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Gastos de compra (%)</label><input type="number" value={gastosPct} onChange={e=>setGastosPct(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Predial anual (%)</label><input type="number" value={predialPct} onChange={e=>setPredialPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Mantenimiento (meses renta/año)</label><input type="number" min={0} step={0.1} value={mantenMeses} onChange={e=>setMantenMeses(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Inflación anual (%)</label><input type="number" value={inflacionPct} onChange={e=>setInflacionPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Plusvalía real (%)</label><input type="number" value={plusvaliaRealPct} onChange={e=>setPlusvaliaRealPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
        </div>

        <div className="bg-white shadow rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Escenario 1 · Comprar y alquilar</h2>
          <div className="flex items-center justify-between"><label className="mr-2">Renta mensual recibida</label><input type="number" value={rentaRecibidaMensual} onChange={e=>setRentaRecibidaMensual(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>
          <label className="inline-flex items-center space-x-2"><input type="checkbox" checked={rentaRecibidaIndexa} onChange={e=>setRentaRecibidaIndexa(e.target.checked)} /><span>Ajustar renta por inflación</span></label>
          <div className="flex items-center justify-between"><label className="mr-2">Aportación anual adicional</label><input type="number" value={aportaE1Anual} onChange={e=>setAportaE1Anual(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>

          <div className="pt-2 border-t">
            <h3 className="font-medium">Impuestos – Arrendamiento</h3>
            <div className="flex items-center justify-between"><label className="mr-2">Modo</label>
              <select value={modoArrISR} onChange={e=>setModoArrISR(e.target.value)} className="border rounded px-2 py-1 w-40">
                <option value="ciega">Deducción ciega</option>
                <option value="real">Gastos reales</option>
              </select>
            </div>
            {modoArrISR === "ciega" && (
              <div className="flex items-center justify-between"><label className="mr-2">Deducción ciega (%)</label><input type="number" value={deduccionCiegaPct} onChange={e=>setDeduccionCiegaPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
            )}
            <div className="flex items-center justify-between"><label className="mr-2">ISR sobre base (%)</label><input type="number" value={isrRentaPct} onChange={e=>setIsrRentaPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
            <p className="text-xs text-gray-600">En "ciega" la base = ingreso × (1 − deducción). En "real" la base = ingreso − (mantenimiento + predial). El ISR se resta del flujo neto.</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Escenario 2 · Inversión y alquiler</h2>
          <div className="flex items-center justify-between"><label className="mr-2">Renta mensual pagada</label><input type="number" value={rentaPagadaMensual} onChange={e=>setRentaPagadaMensual(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>
          <label className="inline-flex items-center space-x-2"><input type="checkbox" checked={rentaPagadaIndexa} onChange={e=>setRentaPagadaIndexa(e.target.checked)} /><span>Indexar renta por inflación</span></label>
          <div className="flex items-center justify-between"><label className="mr-2">Tasa CETES anual (%)</label><input type="number" value={tasaCetesPct} onChange={e=>setTasaCetesPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
          <div className="flex items-center justify-between"><label className="mr-2">Aportación anual adicional</label><input type="number" value={aportaE2Anual} onChange={e=>setAportaE2Anual(Number(e.target.value))} className="border rounded px-2 py-1 w-40"/></div>

          <div className="pt-2 border-t">
            <h3 className="font-medium">Impuestos – Intereses</h3>
            <div className="flex items-center justify-between"><label className="mr-2">ISR intereses (%)</label><input type="number" value={isrInteresesPct} onChange={e=>setIsrInteresesPct(Number(e.target.value))} className="border rounded px-2 py-1 w-28"/></div>
            <label className="inline-flex items-center space-x-2"><input type="checkbox" checked={gravaInteresReal} onChange={e=>setGravaInteresReal(e.target.checked)} /><span>Gravar solo interés real</span></label>
            <p className="text-xs text-gray-600">Interés real ≈ interés − (inflación × capital). Si está activo, el ISR se calcula sobre el interés real no negativo.</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Horizonte</h2>
          <div className="flex items-center justify-between"><label className="mr-2">Años</label><input type="number" value={horizonte} onChange={e=>setHorizonte(Number(e.target.value))} className="border rounded px-2 py-1 w-24"/></div>
          <p className="text-xs text-gray-600">Se muestran resúmenes a 5, 10 y el horizonte elegido, además de dos gráficas.</p>
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
              <YAxis tickFormatter={(v)=>mxn.format(v)} width={100} />
              <Tooltip formatter={(v)=>mxn.format(Number(v))} labelFormatter={(l)=>`Año ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="totalEsc1" name="Escenario 1: Comprar" dot={false} stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="totalEsc2" name="Escenario 2: Inversión" dot={false} stroke="#10b981" strokeWidth={2} />
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
              <YAxis tickFormatter={(v)=>mxn.format(v)} width={100} />
              <Tooltip formatter={(v)=>mxn.format(Number(v))} labelFormatter={(l)=>`Año ${l}`} />
              <Legend />
              <Bar dataKey="flowEsc1" name="Flujo E1 (Comprar)" fill="#2563eb" />
              <Bar dataKey="flowEsc2" name="Flujo E2 (Inversión)" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resúmenes */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Resultado a 5 años</h3>
          <div className="space-y-1">
            <div><b>Escenario 1:</b> Patrimonio total {mxn.format(r5.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(r5.e1.valorCasaFinal)}, Efectivo {mxn.format(r5.e1.efectivoAcumulado)})</span></div>
            <div><b>Escenario 2:</b> Capital final {mxn.format(r5.e2.capitalFinal)}</div>
            <div className={(r5.e1.patrimonioTotal - r5.e2.capitalFinal) >= 0 ? "text-green-700" : "text-red-700"}><b>Diferencia:</b> {mxn.format(r5.e1.patrimonioTotal - r5.e2.capitalFinal)}</div>
          </div>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Resultado a 10 años</h3>
          <div className="space-y-1">
            <div><b>Escenario 1:</b> Patrimonio total {mxn.format(r10.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(r10.e1.valorCasaFinal)}, Efectivo {mxn.format(r10.e1.efectivoAcumulado)})</span></div>
            <div><b>Escenario 2:</b> Capital final {mxn.format(r10.e2.capitalFinal)}</div>
            <div className={(r10.e1.patrimonioTotal - r10.e2.capitalFinal) >= 0 ? "text-green-700" : "text-red-700"}><b>Diferencia:</b> {mxn.format(r10.e1.patrimonioTotal - r10.e2.capitalFinal)}</div>
          </div>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Resultado a {horizonte} años</h3>
          <div className="space-y-1">
            <div><b>Escenario 1:</b> Patrimonio total {mxn.format(rh.e1.patrimonioTotal)} <span className="text-gray-500">(Inmueble {mxn.format(rh.e1.valorCasaFinal)}, Efectivo {mxn.format(rh.e1.efectivoAcumulado)})</span></div>
            <div><b>Escenario 2:</b> Capital final {mxn.format(rh.e2.capitalFinal)}</div>
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
