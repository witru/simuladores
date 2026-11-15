/**
 * js/fases.js
 * Determinación, formación y ordenamiento gravitatorio de fases líquidas a 20 °C.
 */
import { validarSistemaLiquidos } from './miscibilidad.js';
import { calcularSolucionBinaria } from './calculos.js';

export function construirFasesLiquidas(seleccionLiquidos, mapaLiquidos, matrizMiscibilidad, tablasSoluciones) {
  // Consolidar entradas del mismo líquido si el usuario eligió el mismo líquido en dos selectores
  const agrupados = [];
  seleccionLiquidos.forEach(item => {
    if (!item.id || item.volumen <= 0) return;
    const existente = agrupados.find(x => x.id === item.id);
    if (existente) {
      existente.volumen += item.volumen;
    } else {
      const info = mapaLiquidos[item.id];
      agrupados.push({ ...info, volumen: item.volumen });
    }
  });

  const validacion = validarSistemaLiquidos(agrupados, matrizMiscibilidad);
  if (!validacion.valido) {
    return { valido: false, validacion, fases: [], masaTotalLiquidos: 0, volumenTotalFinal: 0 };
  }

  let fases = [];

  if (agrupados.length === 1) {
    const L = agrupados[0];
    const masa = L.densidad_20C * L.volumen;
    fases.push({
      tipo: "pura",
      nombre: L.nombre,
      componentes: [{ id: L.id, nombre: L.nombre, volumenInicial: L.volumen, masa, porcentajeMasa: 100 }],
      densidad: L.densidad_20C,
      volumenInicialSuma: L.volumen,
      volumenFinal: L.volumen,
      deltaV: 0,
      masaTotal: masa,
      color: L.color,
      opacidad: L.opacidad,
      tipoDatos: "experimental",
      fuente: L.fuente
    });
  } else if (validacion.caso === "CASO_A_DOS_MISCIBLES") {
    const [L1, L2] = agrupados;
    const sol = calcularSolucionBinaria(L1, L1.volumen, L2, L2.volumen, tablasSoluciones);
    fases.push({
      tipo: "solucion_binaria",
      nombre: `Solución (${L1.nombre} + ${L2.nombre})`,
      componentes: [
        { id: L1.id, nombre: L1.nombre, volumenInicial: L1.volumen, masa: sol.mA, porcentajeMasa: sol.wA },
        { id: L2.id, nombre: L2.nombre, volumenInicial: L2.volumen, masa: sol.mB, porcentajeMasa: sol.wB }
      ],
      densidad: sol.densidadSolucion,
      volumenInicialSuma: L1.volumen + L2.volumen,
      volumenFinal: sol.volumenFinal,
      deltaV: sol.deltaV,
      masaTotal: sol.mTotal,
      color: L1.color,
      opacidad: (L1.opacidad + L2.opacidad) / 2,
      tipoDatos: sol.tipoDatos,
      fuente: sol.fuente
    });
  } else if (validacion.caso === "CASO_B_DOS_INMISCIBLES") {
    agrupados.forEach(L => {
      const masa = L.densidad_20C * L.volumen;
      fases.push({
        tipo: "pura",
        nombre: L.nombre,
        componentes: [{ id: L.id, nombre: L.nombre, volumenInicial: L.volumen, masa, porcentajeMasa: 100 }],
        densidad: L.densidad_20C,
        volumenInicialSuma: L.volumen,
        volumenFinal: L.volumen,
        deltaV: 0,
        masaTotal: masa,
        color: L.color,
        opacidad: L.opacidad,
        tipoDatos: "experimental",
        fuente: L.fuente
      });
    });
  } else if (validacion.caso === "CASO_C_TRES_LIQUIDOS") {
    const par = validacion.parejaMiscible;
    const L1 = agrupados.find(x => x.id === par.idA);
    const L2 = agrupados.find(x => x.id === par.idB);
    const L3 = agrupados.find(x => x.id !== par.idA && x.id !== par.idB);

    const sol = calcularSolucionBinaria(L1, L1.volumen, L2, L2.volumen, tablasSoluciones);
    fases.push({
      tipo: "solucion_binaria",
      nombre: `Solución (${L1.nombre} + ${L2.nombre})`,
      componentes: [
        { id: L1.id, nombre: L1.nombre, volumenInicial: L1.volumen, masa: sol.mA, porcentajeMasa: sol.wA },
        { id: L2.id, nombre: L2.nombre, volumenInicial: L2.volumen, masa: sol.mB, porcentajeMasa: sol.wB }
      ],
      densidad: sol.densidadSolucion,
      volumenInicialSuma: L1.volumen + L2.volumen,
      volumenFinal: sol.volumenFinal,
      deltaV: sol.deltaV,
      masaTotal: sol.mTotal,
      color: L1.color,
      opacidad: (L1.opacidad + L2.opacidad) / 2,
      tipoDatos: sol.tipoDatos,
      fuente: sol.fuente
    });

    const masa3 = L3.densidad_20C * L3.volumen;
    fases.push({
      tipo: "pura",
      nombre: L3.nombre,
      componentes: [{ id: L3.id, nombre: L3.nombre, volumenInicial: L3.volumen, masa: masa3, porcentajeMasa: 100 }],
      densidad: L3.densidad_20C,
      volumenInicialSuma: L3.volumen,
      volumenFinal: L3.volumen,
      deltaV: 0,
      masaTotal: masa3,
      color: L3.color,
      opacidad: L3.opacidad,
      tipoDatos: "experimental",
      fuente: L3.fuente
    });
  }

  // Ordenar de mayor densidad (abajo, índice 0) a menor densidad (arriba)
  fases.sort((a, b) => b.densidad - a.densidad);

  let vAcum = 0;
  let mAcum = 0;
  fases.forEach((f, idx) => {
    f.ordenDesdeFondo = idx + 1;
    f.cotaInferiorCm3 = vAcum;
    f.cotaSuperiorCm3 = vAcum + f.volumenFinal;
    vAcum += f.volumenFinal;
    mAcum += f.masaTotal;
  });

  return {
    valido: true,
    validacion,
    fases,
    masaTotalLiquidos: mAcum,
    volumenTotalFinal: vAcum
  };
}
