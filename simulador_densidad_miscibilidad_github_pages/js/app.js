/**
 * js/app.js
 * Coordinación general del simulador, carga de archivos JSON y gestión de eventos.
 */
import { construirFasesLiquidas } from './fases.js';
import { evaluarEquilibrioEsferas } from './flotacion.js';
import { renderizarProbetaSVG } from './visualizacion.js';

const estado = {
  liquidos: [],
  solidos: [],
  mapaLiquidos: {},
  mapaSolidos: {},
  matrizMiscibilidad: {},
  tablasSoluciones: {},
  seleccionLiquidos: [
    { id: "agua", volumen: 600 },
    { id: "etanol", volumen: 400 },
    { id: "aceite_oliva", volumen: 500 }
  ],
  esferasIds: ["corcho", "pead", "aluminio", "oro"]
};

async function inicializarApp() {
  const [resLiq, resSol, resMisc, resTablas] = await Promise.all([
    fetch('./data/liquidos.json').then(r => r.json()),
    fetch('./data/solidos.json').then(r => r.json()),
    fetch('./data/miscibilidad.json').then(r => r.json()),
    fetch('./data/soluciones.json').then(r => r.json())
  ]);

  estado.liquidos = resLiq;
  estado.solidos = resSol;
  estado.matrizMiscibilidad = resMisc.matriz;
  estado.tablasSoluciones = resTablas;

  resLiq.forEach(l => { estado.mapaLiquidos[l.id] = l; });
  resSol.forEach(s => { estado.mapaSolidos[s.id] = s; });

  construirControlesLiquidos();
  construirControlesSolidos();
  actualizarSimulacion();
}

function construirControlesLiquidos() {
  const contenedor = document.getElementById('controles-liquidos');
  contenedor.innerHTML = '';

  estado.seleccionLiquidos.forEach((sel, idx) => {
    const card = document.createElement('div');
    card.className = 'control-card';

    const opciones = ['<option value="">-- Ninguno --</option>']
      .concat(estado.liquidos.map(l => `<option value="${l.id}" ${l.id === sel.id ? 'selected' : ''}>${l.nombre} (ρ = ${l.densidad_20C} g/cm³)</option>`))
      .join('');

    card.innerHTML = `
      <div class="control-header">
        <strong>Selector de Líquido ${idx + 1}</strong>
        <span id="badge-vol-${idx}" class="badge">${sel.volumen} cm³</span>
      </div>
      <select id="select-liq-${idx}" class="input-select">${opciones}</select>
      <input type="range" id="range-liq-${idx}" min="0" max="2000" step="100" value="${sel.volumen}" class="input-range">
    `;
    contenedor.appendChild(card);

    const selectEl = card.querySelector(`#select-liq-${idx}`);
    const rangeEl = card.querySelector(`#range-liq-${idx}`);

    selectEl.addEventListener('change', (e) => {
      estado.seleccionLiquidos[idx].id = e.target.value;
      if (!e.target.value) {
        estado.seleccionLiquidos[idx].volumen = 0;
        rangeEl.value = 0;
      } else if (estado.seleccionLiquidos[idx].volumen === 0) {
        const disp = obtenerVolumenDisponible(idx);
        estado.seleccionLiquidos[idx].volumen = Math.min(200, disp);
        rangeEl.value = estado.seleccionLiquidos[idx].volumen;
      }
      actualizarSimulacion();
    });

    rangeEl.addEventListener('input', (e) => {
      let deseado = parseInt(e.target.value, 10);
      const disp = obtenerVolumenDisponible(idx);
      if (deseado > disp) {
        deseado = disp;
        rangeEl.value = deseado;
      }
      estado.seleccionLiquidos[idx].volumen = deseado;
      actualizarSimulacion();
    });
  });
}

function obtenerVolumenDisponible(idxActual) {
  let sumaOtros = 0;
  estado.seleccionLiquidos.forEach((s, i) => {
    if (i !== idxActual && s.id) sumaOtros += s.volumen;
  });
  return Math.max(0, 2000 - sumaOtros);
}

function construirControlesSolidos() {
  const selectSol = document.getElementById('select-nuevo-solido');
  selectSol.innerHTML = estado.solidos
    .map(s => `<option value="${s.id}">${s.nombre} (ρ = ${s.densidad_20C.toFixed(3)} g/cm³)</option>`)
    .join('');

  document.getElementById('btn-agregar-esfera').addEventListener('click', () => {
    if (estado.esferasIds.length >= 5) {
      alert('Se permite incorporar hasta 5 materiales sólidos simultáneamente.');
      return;
    }
    const id = selectSol.value;
    if (!estado.esferasIds.includes(id)) {
      estado.esferasIds.push(id);
      actualizarSimulacion();
    }
  });

  document.getElementById('btn-limpiar-esferas').addEventListener('click', () => {
    estado.esferasIds = [];
    actualizarSimulacion();
  });
}

function actualizarSimulacion() {
  // Actualizar etiquetas de volumen
  let volInicialTotal = 0;
  estado.seleccionLiquidos.forEach((s, i) => {
    const b = document.getElementById(`badge-vol-${i}`);
    if (b) b.textContent = `${s.id ? s.volumen : 0} cm³`;
    if (s.id) volInicialTotal += s.volumen;
  });
  document.getElementById('indicador-vol-total').textContent = `${volInicialTotal} / 2000 cm³`;

  const resFases = construirFasesLiquidas(
    estado.seleccionLiquidos,
    estado.mapaLiquidos,
    estado.matrizMiscibilidad,
    estado.tablasSoluciones
  );

  const objetosEsferas = estado.esferasIds.map(id => estado.mapaSolidos[id]).filter(Boolean);
  const esferasCalc = evaluarEquilibrioEsferas(objetosEsferas, resFases.fases);

  const svgEl = document.getElementById('svg-probeta');
  renderizarProbetaSVG(svgEl, resFases, esferasCalc);

  renderizarPanelResultados(resFases, esferasCalc, volInicialTotal);
}

function renderizarPanelResultados(resFases, esferasCalc, volInicialTotal) {
  const panel = document.getElementById('panel-resultados');
  const alertaHg = estado.seleccionLiquidos.some(s => s.id === 'mercurio' && s.volumen > 0);

  if (!resFases.valido) {
    panel.innerHTML = `<div class="alerta-error"><strong>Combinación no habilitada:</strong> ${resFases.validacion.mensaje}</div>`;
    return;
  }

  const htmlFases = resFases.fases.map((f, idx) => `
    <div class="resultado-bloque">
      <h4>Fase ${idx + 1} (${idx === 0 ? 'Inferior' : 'Superior'}): ${f.nombre}</h4>
      <ul>
        <li><strong>Densidad a 20 °C:</strong> ${f.densidad.toFixed(4)} g/cm³ (${f.tipoDatos})</li>
        <li><strong>Volumen final:</strong> ${f.volumenFinal.toFixed(2)} cm³ ${f.deltaV !== 0 ? `(ΔV = ${f.deltaV.toFixed(2)} cm³ por contracción/expansión)` : ''}</li>
        <li><strong>Masa de la fase:</strong> ${f.masaTotal.toFixed(2)} g</li>
        <li><strong>Composición másica:</strong> ${f.componentes.map(c => `${c.nombre}: ${c.porcentajeMasa.toFixed(2)}% m/m (${c.masa.toFixed(1)} g)`).join(' | ')}</li>
      </ul>
    </div>
  `).join('');

  const htmlEsferas = esferasCalc.map(e => `
    <div class="esfera-item">
      <span><strong>${e.nombre}</strong> (ρ = ${e.densidad_20C.toFixed(3)} g/cm³, m = ${e.masaG.toFixed(2)} g): ${e.descripcionEstado}</span>
      <button class="btn-quitar" data-id="${e.id}">Quitar</button>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="resumen-sistema">
      <p><strong>Estado de miscibilidad:</strong> ${resFases.validacion.mensaje}</p>
      <p><strong>Volumen inicial sumado:</strong> ${volInicialTotal.toFixed(1)} cm³ | <strong>Volumen final total:</strong> ${resFases.volumenTotalFinal.toFixed(2)} cm³ | <strong>Masa líquida total:</strong> ${resFases.masaTotalLiquidos.toFixed(2)} g</p>
    </div>
    ${alertaHg ? '<div class="alerta-hg"><strong>Nota científica sobre el Mercurio:</strong> Modelo hidrostático idealizado. No contempla reacciones químicas ni formación de amalgamas con oro, plata, estaño, zinc o plomo.</div>' : ''}
    ${htmlFases}
    <div class="resultado-bloque">
      <h4>Esferas Sólidas Incorporadas (D = 0.90 cm, V = 0.382 cm³)</h4>
      ${htmlEsferas || '<p>No hay esferas incorporadas.</p>'}
    </div>
  `;

  panel.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      estado.esferasIds = estado.esferasIds.filter(x => x !== id);
      actualizarSimulacion();
    });
  });
}

document.addEventListener('DOMContentLoaded', inicializarApp);
