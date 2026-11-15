/**
 * js/visualizacion.js
 * Renderizado dinámico SVG del recipiente graduado (0 a 2000 cm³), fases líquidas y esferas en equilibrio.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export function renderizarProbetaSVG(svgEl, resultadoFases, esferasCalculadas) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  const yTop = 40;
  const yBottom = 480;
  const hTotalPx = yBottom - yTop; // 440 px para 2000 cm³ -> 0.22 px/cm³
  const xLeft = 90;
  const xRight = 290;
  const wProbeta = xRight - xLeft;

  const volToY = (volCm3) => yBottom - (volCm3 / 2000) * hTotalPx;

  // Definiciones de gradientes
  const defs = document.createElementNS(SVG_NS, "defs");
  svgEl.appendChild(defs);

  // Fondo del vidrio
  const rectVidrio = document.createElementNS(SVG_NS, "rect");
  rectVidrio.setAttribute("x", xLeft);
  rectVidrio.setAttribute("y", yTop);
  rectVidrio.setAttribute("width", wProbeta);
  rectVidrio.setAttribute("height", hTotalPx);
  rectVidrio.setAttribute("rx", "6");
  rectVidrio.setAttribute("fill", "#0f172a");
  rectVidrio.setAttribute("stroke", "#475569");
  rectVidrio.setAttribute("stroke-width", "3");
  svgEl.appendChild(rectVidrio);

  // Dibujar fases líquidas
  if (resultadoFases.valido && resultadoFases.fases.length > 0) {
    resultadoFases.fases.forEach((fase, idx) => {
      const ySup = volToY(fase.cotaSuperiorCm3);
      const yInf = volToY(fase.cotaInferiorCm3);
      const hFase = Math.max(0, yInf - ySup);

      const rectFase = document.createElementNS(SVG_NS, "rect");
      rectFase.setAttribute("x", xLeft + 2);
      rectFase.setAttribute("y", ySup);
      rectFase.setAttribute("width", wProbeta - 4);
      rectFase.setAttribute("height", hFase);
      rectFase.setAttribute("fill", fase.color);
      rectFase.setAttribute("fill-opacity", fase.opacidad);
      svgEl.appendChild(rectFase);

      // Línea de menisco/interfaz
      const lineaSup = document.createElementNS(SVG_NS, "line");
      lineaSup.setAttribute("x1", xLeft + 2);
      lineaSup.setAttribute("x2", xRight - 2);
      lineaSup.setAttribute("y1", ySup);
      lineaSup.setAttribute("y2", ySup);
      lineaSup.setAttribute("stroke", "#f8fafc");
      lineaSup.setAttribute("stroke-opacity", "0.65");
      lineaSup.setAttribute("stroke-width", "1.5");
      svgEl.appendChild(lineaSup);

      // Etiqueta de la fase a la derecha
      if (hFase >= 18) {
        const txt = document.createElementNS(SVG_NS, "text");
        txt.setAttribute("x", xRight + 12);
        txt.setAttribute("y", ySup + hFase / 2 + 4);
        txt.setAttribute("fill", "#e2e8f0");
        txt.setAttribute("font-size", "11");
        txt.setAttribute("font-family", "monospace");
        txt.textContent = `F${idx + 1}: ρ=${fase.densidad.toFixed(4)} g/cm³ (${fase.volumenFinal.toFixed(1)} cm³)`;
        svgEl.appendChild(txt);
      }
    });
  }

  // Escala graduada cada 100 cm³
  for (let v = 0; v <= 2000; v += 100) {
    const y = volToY(v);
    const esMayor = v % 500 === 0;
    const tick = document.createElementNS(SVG_NS, "line");
    tick.setAttribute("x1", xLeft);
    tick.setAttribute("x2", xLeft + (esMayor ? 18 : 10));
    tick.setAttribute("y1", y);
    tick.setAttribute("y2", y);
    tick.setAttribute("stroke", esMayor ? "#cbd5e1" : "#64748b");
    tick.setAttribute("stroke-width", esMayor ? "1.8" : "1");
    svgEl.appendChild(tick);

    if (v % 200 === 0) {
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", xLeft - 8);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("fill", "#94a3b8");
      label.setAttribute("font-size", "10");
      label.setAttribute("font-family", "monospace");
      label.textContent = `${v}`;
      svgEl.appendChild(label);
    }
  }

  // Dibujar esferas sólidas (D = 0.90 cm <= h_100cm3 = 22 px -> radio R = 10 px, D = 20 px)
  const R = 10;
  const D = 20;
  const nEsf = esferasCalculadas.length;

  esferasCalculadas.forEach((esf, i) => {
    const pasoX = (wProbeta - 44) / Math.max(1, nEsf);
    const cx = xLeft + 22 + pasoX * (i + 0.5);
    let cy = yBottom - R - 2;

    if (resultadoFases.valido && resultadoFases.fases.length > 0) {
      const fases = resultadoFases.fases;
      const faseSup = fases[fases.length - 1];
      const ySuperficieLibre = volToY(faseSup.cotaSuperiorCm3);

      if (esf.estado === "FLOTACION_SUPERFICIE") {
        // El borde inferior de la esfera está a distancia u*D debajo de ySuperficieLibre
        const yBottomEsf = ySuperficieLibre + esf.fraccionAlturaSumergida * D;
        cy = yBottomEsf - R;
      } else if (esf.estado === "EQUILIBRIO_INTERFAZ" && fases.length === 2) {
        const yInterfaz = volToY(fases[0].cotaSuperiorCm3);
        const yBottomEsf = yInterfaz + esf.fraccionAlturaSumergida * D;
        cy = yBottomEsf - R;
      } else if (esf.estado === "EQUILIBRIO_FASE") {
        const f = fases[esf.faseAsociada];
        cy = (volToY(f.cotaSuperiorCm3) + volToY(f.cotaInferiorCm3)) / 2;
      } else if (esf.estado === "SEDIMENTACION_FONDO") {
        cy = yBottom - R - 2;
      }
    }

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", R);
    circle.setAttribute("fill", esf.color);
    circle.setAttribute("stroke", "#f8fafc");
    circle.setAttribute("stroke-width", "1.5");
    svgEl.appendChild(circle);

    const lbl = document.createElementNS(SVG_NS, "text");
    lbl.setAttribute("x", cx);
    lbl.setAttribute("y", cy + 3);
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("fill", "#0f172a");
    lbl.setAttribute("font-size", "8.5");
    lbl.setAttribute("font-weight", "bold");
    lbl.textContent = esf.nombre.substring(0, 2).toUpperCase();
    svgEl.appendChild(lbl);
  });
}
