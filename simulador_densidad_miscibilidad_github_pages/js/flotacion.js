/**
 * js/flotacion.js
 * Principio de Arquímedes y resolución exacta de la ecuación cúbica del casquete esférico.
 * Ecuación adimensional: 3*u^2 - 2*u^3 = fV, donde u = h / D es la fracción lineal de diámetro sumergido.
 */

export const DIAMETRO_ESFERA_CM = 0.90;
export const VOLUMEN_ESFERA_CM3 = (Math.PI / 6) * Math.pow(DIAMETRO_ESFERA_CM, 3); // 0.3817 cm³

export function resolverFraccionLinealCasquete(fV) {
  if (fV <= 0) return 0;
  if (fV >= 1) return 1;
  // Solución analítica trigonométrica de 3u^2 - 2u^3 = fV en [0, 1]
  const angulo = Math.acos(1 - 2 * fV);
  return 0.5 - Math.cos((angulo + 4 * Math.PI) / 3);
}

export function evaluarEquilibrioEsferas(esferasSeleccionadas, fasesLiquidas) {
  return esferasSeleccionadas.map((esfera, idx) => {
    const masaEsfera = esfera.densidad_20C * VOLUMEN_ESFERA_CM3;

    if (!fasesLiquidas || fasesLiquidas.length === 0) {
      return {
        ...esfera,
        indice: idx,
        diametroCm: DIAMETRO_ESFERA_CM,
        volumenCm3: VOLUMEN_ESFERA_CM3,
        masaG: masaEsfera,
        estado: "FONDO_SIN_LIQUIDO",
        descripcionEstado: "En el fondo del recipiente vacío",
        fraccionVolInf: 0,
        fraccionVolSup: 0,
        fraccionAlturaSumergida: 0
      };
    }

    const EPS = 1e-4;
    // Recordatorio: fasesLiquidas[0] es la fase inferior (más densa)
    // Si hay 2 fases, fasesLiquidas[1] es la fase superior (menos densa)
    const faseInf = fasesLiquidas[0];
    const faseSup = fasesLiquidas.length > 1 ? fasesLiquidas[1] : fasesLiquidas[0];

    // 1. Equilibrio indiferente dentro de una fase
    for (let i = 0; i < fasesLiquidas.length; i++) {
      if (Math.abs(esfera.densidad_20C - fasesLiquidas[i].densidad) <= EPS) {
        return {
          ...esfera,
          indice: idx,
          diametroCm: DIAMETRO_ESFERA_CM,
          volumenCm3: VOLUMEN_ESFERA_CM3,
          masaG: masaEsfera,
          estado: "EQUILIBRIO_FASE",
          faseAsociada: i,
          descripcionEstado: `Equilibrio neutro dentro de ${fasesLiquidas[i].nombre}`,
          fraccionVolInf: 1,
          fraccionVolSup: 0,
          fraccionAlturaSumergida: 1
        };
      }
    }

    // 2. Flotación en la superficie libre superior
    if (esfera.densidad_20C < faseSup.densidad) {
      const fV = esfera.densidad_20C / faseSup.densidad;
      const u = resolverFraccionLinealCasquete(fV);
      return {
        ...esfera,
        indice: idx,
        diametroCm: DIAMETRO_ESFERA_CM,
        volumenCm3: VOLUMEN_ESFERA_CM3,
        masaG: masaEsfera,
        estado: "FLOTACION_SUPERFICIE",
        descripcionEstado: `Flota en la superficie de ${faseSup.nombre} (${(fV * 100).toFixed(1)}% vol. sumergido)`,
        fraccionVolInf: fV,
        fraccionVolSup: 1 - fV,
        fraccionAlturaSumergida: u
      };
    }

    // 3. Equilibrio en la interfaz entre dos fases (rho_sup < rho_esfera < rho_inf)
    if (fasesLiquidas.length === 2 && esfera.densidad_20C > faseSup.densidad && esfera.densidad_20C < faseInf.densidad) {
      const fV_inf = (esfera.densidad_20C - faseSup.densidad) / (faseInf.densidad - faseSup.densidad);
      const fV_sup = 1 - fV_inf;
      const u = resolverFraccionLinealCasquete(fV_inf);
      return {
        ...esfera,
        indice: idx,
        diametroCm: DIAMETRO_ESFERA_CM,
        volumenCm3: VOLUMEN_ESFERA_CM3,
        masaG: masaEsfera,
        estado: "EQUILIBRIO_INTERFAZ",
        descripcionEstado: `Retenida en interfaz: ${(fV_inf * 100).toFixed(1)}% en fase inferior y ${(fV_sup * 100).toFixed(1)}% en fase superior`,
        fraccionVolInf: fV_inf,
        fraccionVolSup: fV_sup,
        fraccionAlturaSumergida: u
      };
    }

    // 4. Sedimentación en el fondo
    return {
      ...esfera,
      indice: idx,
      diametroCm: DIAMETRO_ESFERA_CM,
      volumenCm3: VOLUMEN_ESFERA_CM3,
      masaG: masaEsfera,
      estado: "SEDIMENTACION_FONDO",
      descripcionEstado: `Sedimentada en el fondo (ρ_sólido > ${faseInf.densidad.toFixed(4)} g/cm³)`,
      fraccionVolInf: 1,
      fraccionVolSup: 0,
      fraccionAlturaSumergida: 1
    };
  });
}
