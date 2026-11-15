/**
 * js/miscibilidad.js
 * Identificación de relaciones de miscibilidad y validación de sistemas de hasta 3 líquidos a 20 °C.
 */

export function consultarMiscibilidadPar(idA, idB, matrizMiscibilidad) {
  if (idA === idB) return "miscibles";
  if (!matrizMiscibilidad || !matrizMiscibilidad[idA] || !matrizMiscibilidad[idA][idB]) {
    return "no_verificados";
  }
  return matrizMiscibilidad[idA][idB];
}

export function validarSistemaLiquidos(entradasActivas, matrizMiscibilidad) {
  if (entradasActivas.length === 0) {
    return { valido: true, caso: "VACIO", mensaje: "Recipiente sin líquidos.", pares: [] };
  }
  if (entradasActivas.length === 1) {
    return { valido: true, caso: "UN_LIQUIDO", mensaje: "Sustancia pura (1 fase).", pares: [] };
  }

  const pares = [];
  for (let i = 0; i < entradasActivas.length; i++) {
    for (let j = i + 1; j < entradasActivas.length; j++) {
      const A = entradasActivas[i];
      const B = entradasActivas[j];
      const rel = consultarMiscibilidadPar(A.id, B.id, matrizMiscibilidad);
      pares.push({ idA: A.id, idB: B.id, nombreA: A.nombre, nombreB: B.nombre, relacion: rel });
      if (rel === "parcialmente_miscibles" || rel === "no_verificados") {
        return {
          valido: false,
          caso: "BLOQUEADO",
          mensaje: `La pareja ${A.nombre} + ${B.nombre} está clasificada como "${rel}". El modelo a 20 °C no admite equilibrios parcialmente miscibles ni combinaciones no verificadas.`,
          pares
        };
      }
    }
  }

  if (entradasActivas.length === 2) {
    const rel = pares[0].relacion;
    return {
      valido: true,
      caso: rel === "miscibles" ? "CASO_A_DOS_MISCIBLES" : "CASO_B_DOS_INMISCIBLES",
      mensaje: rel === "miscibles"
        ? "Caso A: Dos líquidos miscibles forman una única fase homogénea."
        : "Caso B: Dos líquidos inmiscibles forman dos fases diferenciadas ordenadas por densidad.",
      pares
    };
  }

  if (entradasActivas.length === 3) {
    const miscibles = pares.filter(p => p.relacion === "miscibles");
    const inmiscibles = pares.filter(p => p.relacion === "inmiscibles");
    if (miscibles.length === 1 && inmiscibles.length === 2) {
      return {
        valido: true,
        caso: "CASO_C_TRES_LIQUIDOS",
        mensaje: `Caso C: ${miscibles[0].nombreA} y ${miscibles[0].nombreB} forman una solución binaria homogénea; el tercer líquido permanece como fase inmiscible independiente.`,
        parejaMiscible: miscibles[0],
        pares
      };
    } else {
      return {
        valido: false,
        caso: "TRES_LIQUIDOS_INVALIDO",
        mensaje: "Cuando se seleccionan 3 líquidos, exactamente dos deben ser miscibles entre sí y el tercero debe ser inmiscible con ambos y con la solución resultante.",
        pares
      };
    }
  }

  return { valido: false, caso: "ERROR", mensaje: "Configuración no contemplada.", pares };
}
