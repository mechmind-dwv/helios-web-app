// ============================================================
// HELIOS - script.js
// Fix: state unificado, inicialización desanidada de startBioSync,
// fechas dinámicas para NASA DONKI, Bio-Sync marcado como simulación,
// ids calzados con el index.html real (irg-status, irg-value=circulo).
// ============================================================

const SOLAR_API_BASE = 'https://api.nasa.gov/DONKI/';
const NASA_API_KEY = 'DEMO_KEY'; // DEMO_KEY = rate limit bajo (30/h, 50/día). Para uso real, pedir key propia en https://api.nasa.gov/

document.addEventListener('DOMContentLoaded', function () {
    // --- Estado global único (antes estaba duplicado/fuera de scope) ---
    const state = { irg: 42.8, ftrt: 1.21, kp: 5, bioSymptoms: 30, ics: 65 };

    const glossary = {
        ftrt: {
            title: "Fuerza de Marea Relativa Total (FTRT)",
            text: "Así como la Luna tira de los océanos, los planetas gigantes como Júpiter tiran del Sol. Cuando se alinean, su fuerza combinada 'estira' al Sol, provocando tormentas solares. El FTRT calcula esta fuerza. Un valor > 1.5 es nuestra señal de alerta."
        },
        irg: {
            title: "Índice de Resonancia Global (IRG)",
            text: "Imagina que la Tierra y toda la vida son un solo organismo. El IRG mide el 'estrés' de este organismo combinando la fuerza solar, la salud de la población y la estabilidad social. Un IRG alto indica que el sistema está bajo presión."
        }
    };

    // --- Funciones de UI ---
    function updateDashboard() {
        document.getElementById('irg-value').innerText = state.irg.toFixed(1);
        document.getElementById('ftrt-value').innerText = state.ftrt.toFixed(2);
        const kpEl = document.getElementById('kp-value');
        if (kpEl) kpEl.innerText = state.kp;
        const bioEl = document.getElementById('bio-value');
        if (bioEl) bioEl.innerText = `+${state.bioSymptoms}%`;
        const icsEl = document.getElementById('ics-value');
        if (icsEl) icsEl.innerText = state.ics;
        updateIrgStyle();
    }

    function updateIrgStyle() {
        // irg-value ES el círculo: en index.html es <div class="irg-circle" id="irg-value">
        const irgCircle = document.getElementById('irg-value');
        const irgStatus = document.getElementById('irg-status');
        let color, status;
        if (state.irg < 40) { color = 'var(--success-color)'; status = 'ARMONÍA PROFUNDA'; }
        else if (state.irg < 70) { color = 'var(--warning-color)'; status = 'PERTURBACIÓN LEVE'; }
        else { color = 'var(--critical-color)'; status = 'TORMENTA CÓSMICA'; }
        irgCircle.style.borderColor = color; irgCircle.style.boxShadow = `0 0 20px ${color}40`;
        irgStatus.innerText = status; irgStatus.style.color = color;
    }

    // --- Datos solares reales (NASA DONKI) ---
    // NOTA: el FTRT calculado aquí es una aproximación operativa a partir
    // de eventos DONKI (CMEs + tormentas geomagnéticas), NO la fórmula
    // Σ(M_planeta × R_☉)/d_planeta³ del proyecto FTRT-Scientific-Validation.
    // Mientras no se unifiquen, no tratar este valor como equivalente.
    async function fetchSolarData() {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30); // últimos 30 días reales, no fecha fija

            const fmt = (d) => d.toISOString().split('T')[0];

            const response = await fetch(
                `${SOLAR_API_BASE}CMEAnalysis?startDate=${fmt(startDate)}&endDate=${fmt(endDate)}&api_key=${NASA_API_KEY}`
            );
            if (!response.ok) throw new Error(`DONKI CMEAnalysis ${response.status}`);
            const cmeData = await response.json();

            const gstResponse = await fetch(
                `${SOLAR_API_BASE}GST?startDate=${fmt(startDate)}&endDate=${fmt(endDate)}&api_key=${NASA_API_KEY}`
            );
            if (!gstResponse.ok) throw new Error(`DONKI GST ${gstResponse.status}`);
            const gstData = await gstResponse.json();

            console.log('Datos Solares Recibidos:', { cmeData, gstData });

            let newFtrt = 1.0; // Base
            if (Array.isArray(cmeData) && cmeData.length > 0) {
                newFtrt += cmeData.length * 0.1;
            }
            if (Array.isArray(gstData) && gstData.some(gst => gst.kpIndex > 5)) {
                newFtrt += 0.5;
            }

            state.ftrt = newFtrt;
            state.kp = (Array.isArray(gstData) && gstData.length > 0)
                ? (gstData[gstData.length - 1].kpIndex || 5)
                : 5;

            setDataSourceStatus('live');
            updateDashboard();

        } catch (error) {
            console.error("Error al obtener datos solares:", error);
            // Antes el comentario decía "mantenemos la simulación" pero no
            // existía tal simulación de respaldo. Ahora sí hay feedback
            // explícito al usuario en vez de fallar en silencio.
            setDataSourceStatus('offline');
        }
    }

    function setDataSourceStatus(mode) {
        const el = document.getElementById('data-source-status');
        if (!el) return; // opcional; añadir <span id="data-source-status"> en index.html si se quiere ver
        if (mode === 'live') {
            el.innerText = 'Datos NASA DONKI en vivo';
            el.style.color = 'var(--success-color)';
        } else {
            el.innerText = 'Sin conexión a NASA DONKI — mostrando último valor conocido';
            el.style.color = 'var(--warning-color)';
        }
    }

    // --- Lógica de Módulos ---
    // index.html llama con onclick="showModule('oraculo', this)" — recibe
    // el elemento botón directamente, no un evento.
    window.showModule = function (moduleId, buttonEl) {
        document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(moduleId);
        if (target) target.classList.add('active');
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        if (buttonEl) buttonEl.classList.add('active');
    };

    // --- Bio-Sync: SIMULACIÓN EXPLÍCITA, no mide PPG real todavía ---
    // Se mantiene el flujo de permiso de cámara porque es el paso previo
    // necesario para una futura implementación real (leer variación de
    // color en los píxeles del dedo vía canvas), pero mientras tanto la
    // UI debe dejar claro que el BPM mostrado es una simulación.
    async function startBioSync() {
        const resultDiv = document.getElementById('bio-result');
        resultDiv.innerHTML = 'Solicitando acceso a la cámara para medir tu pulso...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            resultDiv.innerHTML = `
                <strong>Conectando con tu campo bio-eléctrico...</strong><br>
                Coloca tu dedo suavemente sobre la cámara y el flash.<br>
                <small>⚠️ Versión experimental: esta medición es una SIMULACIÓN.
                Aún no se procesa la señal real de la cámara (PPG).</small>
            `;

            setTimeout(() => {
                // TODO: sustituir por PPG real (canvas.getImageData sobre el
                // frame de video) — ver TODO.md sección 1.
                const simulatedBPM = Math.floor(Math.random() * 40) + 60; // 60-100 BPM
                let coherenceLevel = 'Baja';
                let color = 'var(--critical-color)';
                if (simulatedBPM > 65 && simulatedBPM < 85) { coherenceLevel = 'Alta'; color = 'var(--success-color)'; }
                else if (simulatedBPM >= 85) { coherenceLevel = 'Media-Alta'; color = 'var(--warning-color)'; }

                stream.getTracks().forEach(track => track.stop());

                resultDiv.innerHTML = `
                    <strong>Simulación completada</strong> <small>(no es una medición real todavía)</small><br>
                    Pulso simulado: <span style="color: ${color}; font-size: 1.5em;">${simulatedBPM} BPM</span><br>
                    Nivel de coherencia (simulado): ${coherenceLevel}.<br>
                    <small>Recomendación: ajusta tu respiración para sincronizarte con el IRG actual de ${state.irg.toFixed(1)}.</small>
                `;
            }, 5000);

        } catch (error) {
            resultDiv.innerHTML = `<strong>Error:</strong> No se pudo acceder a la cámara. Por favor, asegúrate de haber dado el permiso. ${error.message}`;
        }
    }
    window.startBioSync = startBioSync;

    // --- Lógica del Modal (Glosario) ---
    // (antes vivía incorrectamente anidada dentro de startBioSync)
    window.openModal = function (infoKey) {
        const modal = document.getElementById('info-modal');
        const info = glossary[infoKey];
        if (info) {
            document.getElementById('modal-title').innerText = info.title;
            document.getElementById('modal-text').innerText = info.text;
            modal.style.display = 'block';
        }
    };
    window.closeModal = function () {
        document.getElementById('info-modal').style.display = 'none';
    };

    document.querySelectorAll('.info-trigger').forEach(el => {
        el.addEventListener('click', () => openModal(el.dataset.info));
    });
    window.onclick = function (event) {
        const modal = document.getElementById('info-modal');
        if (modal && event.target == modal) closeModal();
    };

    // --- Simulaciones y lógica de otros módulos ---
    // IMPORTANTE: no hay fuente de datos social ni económica real conectada
    // todavía (ver TODO.md sección 4 — ICS e IRSE marcados ACTIVE_HYPOTHESIS).
    // Estas tres funciones generan variación simulada para que el dashboard
    // no se vea estático, pero cada salida deja explícito en la UI que es
    // una simulación, no una medición. Sustituir por fuentes reales cuando
    // existan (ver DATA_SOURCES.md pendiente).

    function simulateDataChange() {
        // Pequeña variación aleatoria acotada alrededor del valor actual,
        // solo para que el dashboard principal no se vea congelado entre
        // refrescos de fetchSolarData (cada 5 min). No sustituye datos reales.
        state.irg = clamp(state.irg + (Math.random() - 0.5) * 2, 0, 100);
        state.bioSymptoms = clamp(state.bioSymptoms + (Math.random() - 0.5) * 3, 0, 100);
        state.ics = clamp(state.ics + (Math.random() - 0.5) * 4, 0, 100);
        updateDashboard();
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function updateSocialFeed() {
        const feedEl = document.getElementById('social-feed');
        if (!feedEl) return;

        // ACTIVE_HYPOTHESIS: sin fuente social real conectada (ej. API de
        // redes sociales agregada). Estos mensajes son ilustrativos del
        // concepto de ICS, no datos observados.
        const sampleSignals = [
            'Aumento de menciones de fatiga e irritabilidad en foros públicos',
            'Actividad en redes estable, sin picos de polarización detectados',
            'Ligero incremento en discusiones sobre insomnio',
            'Sin anomalías relevantes en el pulso social de las últimas horas',
        ];
        const pick = sampleSignals[Math.floor(Math.random() * sampleSignals.length)];

        feedEl.innerHTML = `
            <p class="ics-disclaimer">
                <small>⚠️ ACTIVE HYPOTHESIS — simulación ilustrativa, sin fuente de datos social real conectada.</small>
            </p>
            <p>ICS actual (simulado): <strong>${state.ics.toFixed(0)}</strong></p>
            <p>${pick}</p>
        `;
    }

    function generateKondratievChart() {
        const chartEl = document.getElementById('economic-chart');
        if (!chartEl) return;

        // ACTIVE_HYPOTHESIS: no hay fuente real de datos de mercado ni de
        // Ondas de Kondratiev conectada (ver TODO.md, IRSE). Se muestra un
        // marcador de posición honesto en vez de un gráfico con datos
        // inventados presentados como si fueran reales.
        chartEl.innerHTML = `
            <p class="irse-disclaimer">
                <small>⚠️ ACTIVE HYPOTHESIS — el Índice de Riesgo Solar-Económico (IRSE)
                y las Ondas de Kondratiev aún no tienen una fuente de datos real
                conectada en esta versión. Este panel es un marcador de posición.</small>
            </p>
        `;
    }

    // --- Inicialización ---
    updateDashboard();
    fetchSolarData(); // primera carga de datos reales
    setInterval(fetchSolarData, 300000); // cada 5 minutos
    setInterval(simulateDataChange, 4000);
    setInterval(updateSocialFeed, 7000);
    generateKondratievChart();
});
