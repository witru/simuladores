/**
 * js/calculos.js
 * Cálculos fisicoquímicos de masas, porcentajes en masa, interpolación de densidades a 20 °C y volúmenes finales.
 */

export function obtenerTablaBinaria(idA, idB, tablasSoluciones) {
  const k1 = `${idA}__${idB}`;
  const k2 = `${idB}__${idA}`;
  if (tablasSoluciones[k1]) return { tabla: tablasSoluciones[k1], invertida: false };
  if (tablasSoluciones[k2]) return { tabla: tablasSoluciones[k2], invertida: true };
  return null;
}

export function interpolarDensidadBinaria(wB_objetivo, nodos) {
  if (wB_objetivo <= nodos[0].wB) return nodos[0].rho;
  if (wB_objetivo >= nodos[nodos.length - 1].wB) return nodos[nodos.length - 1].rho;
  for (let i = 0; i < nodos.length - 1; i++) {
    const n0 = nodos[i];
    const n1 = nodos[i + 1];
    if (wB_objetivo >= n0.wB && wB_objetivo <= n1.wB) {
      const t = (wB_objetivo - n0.wB) / (n1.wB - n0.wB);
      return n0.rho + t * (n1.rho - n0.rho);
    }
  }
  return nodos[0].rho;
}

export function calcularSolucionBinaria(liqA, volA, liqB, volB, tablasSoluciones) {
  const mA = liqA.densidad_20C * volA;
  const mB = liqB.densidad_20C * volB;
  const mTotal = mA + mB;
  const vAditivo = volA + volB;

  if (liqA.id === liqB.id) {
    return {
      mA, mB, mTotal,
      wA: (mA / mTotal) * 100,
      wB: (mB / mTotal) * 100,
      densidadSolucion: liqA.densidad_20C,
      volumenFinal: vAditivo,
      deltaV: 0,
      tipoDatos: "exacto_puro",
      fuente: liqA.fuente
    };
  }

  const ref = obtenerTablaBinaria(liqA.id, liqB.id, tablasSoluciones);
  if (!ref) {
    throw new Error(`No existe tabla de densidades para ${liqA.nombre} + ${liqB.nombre}`);
  }

  const wA = (mA / mTotal) * 100;
  const wB = (mB / mTotal) * 100;
  const wConsulta = ref.invertida ? wA : wB;
  const rhoSol = interpolarDensidadBinaria(wConsulta, ref.tabla.nodos);
  const vFinal = mTotal / rhoSol;
  const deltaV = vFinal - vAditivo;

  return {
    mA, mB, mTotal, wA, wB,
    densidadSolucion: rhoSol,
    volumenFinal: vFinal,
    volumenAditivo: vAditivo,
    deltaV,
    tipoDatos: ref.tabla.tipo_datos,
    fuente: ref.tabla.fuente,
    metodo: ref.tabla.metodo_interpolacion
  };
}
