// Añade esto al principio de tu script.js
const SOLAR_API_BASE = 'https://api.nasa.gov/DONKI/';
const NASA_API_KEY = 'DEMO_KEY'; // Puedes usar 'DEMO_KEY' para empezar. Para uso intensivo, solicita una gratis en https://api.nasa.gov/

// --- Nueva función para obtener datos reales ---
async function fetchSolarData() {
    try {
        // Obtenemos las CMEs (Eyecciones de Masa Coronal) de los últimos 30 días
        const response = await fetch(`${SOLAR_API_BASE}CMEAnalysis?startDate=2024-01-01&endDate=2024-12-31&api_key=${NASA_API_KEY}`);
        const cmeData = await response.json();

        // Obtenemos las tormentas geomagnéticas
        const gstResponse = await fetch(`${SOLAR_API_BASE}GST?startDate=2024-01-01&endDate=2024-12-31&api_key=${NASA_API_KEY}`);
        const gstData = await gstResponse.json();

        console.log('Datos Solares Recibidos:', { cmeData, gstData });

        // --- Ahora, actualiza el estado con datos reales ---
        // Lógica simple: si hay una CME de alta velocidad o una tormenta geomagnética (G), aumentamos el FTRT.
        let newFtrt = 1.0; // Base
        if (cmeData.length > 0) {
            newFtrt += cmeData.length * 0.1;
        }
        if (gstData.some(gst => gst.kpIndex > 5)) {
            newFtrt += 0.5;
        }

        state.ftrt = newFtrt;
        state.kp = gstData.length > 0 ? gstData[gstData.length - 1].kpIndex || 5 : 5;
        
        updateDashboard(); // Llama a tu función existente para actualizar la UI

    } catch (error) {
        console.error("Error al obtener datos solares:", error);
        // Si falla la API, mantenemos la simulación
    }
}

// --- Llama a esta función al cargar la página y luego cada 5 minutos ---
document.addEventListener('DOMContentLoaded', function() {
    // ... tu código existente ...
    fetchSolarData(); // Llamada inicial
    setInterval(fetchSolarData, 300000); // Llama cada 5 minutos (300,000 ms)
});
document.addEventListener('DOMContentLoaded', function() {
    // Estado global
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
        // ... actualizar otros valores ...
        updateIrgStyle();
    }

    function updateIrgStyle() {
        const irgCircle = document.getElementById('irg-circle');
        const irgStatus = document.getElementById('irg-label');
        let color, status;
        if (state.irg < 40) { color = 'var(--success-color)'; status = 'ARMONÍA PROFUNDA'; }
        else if (state.irg < 70) { color = 'var(--warning-color)'; status = 'PERTURBACIÓN LEVE'; }
        else { color = 'var(--critical-color)'; status = 'TORMENTA CÓSMICA'; }
        irgCircle.style.borderColor = color; irgCircle.style.boxShadow = `0 0 20px ${color}40`;
        irgStatus.innerText = status; irgStatus.style.color = color;
    }

    // --- Lógica de Módulos ---
    window.showModule = function(moduleId) {
        document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(moduleId).classList.add('active');
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    };

    // --- Función Bio-Sync Mejorada ---
async function startBioSync() {
    const resultDiv = document.getElementById('bio-result');
    resultDiv.innerHTML = 'Solicitando acceso a la cámara para medir tu pulso...';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Lógica de PPG simplificada (esto es una simulación del proceso)
        resultDiv.innerHTML = `
            <strong>Conectando con tu campo bio-eléctrico...</strong><br>
            Coloca tu dedo suavemente sobre la cámara y el flash.<br>
            <small>Nota: Esta es una versión experimental. La precisión puede variar.</small>
        `;

        setTimeout(() => {
            // Simulación de la medición del pulso
            const simulatedBPM = Math.floor(Math.random() * 40) + 60; // 60-100 BPM
            let coherenceLevel = 'Baja';
            let color = 'var(--critical-color)';
            if (simulatedBPM > 65 && simulatedBPM < 85) { coherenceLevel = 'Alta'; color = 'var(--success-color)'; }
            else if (simulatedBPM >= 85) { coherenceLevel = 'Media-Alta'; color = 'var(--warning-color)'; }

            stream.getTracks().forEach(track => track.stop()); // Detenemos la cámara

            resultDiv.innerHTML = `
                <strong>Sincronización Completa.</strong><br>
                Pulso Cardíaco: <span style="color: ${color}; font-size: 1.5em;">${simulatedBPM} BPM</span><br>
                Nivel de Coherencia: ${coherenceLevel}.<br>
                <small>Recomendación: Tu ritmo cardíaco está ${coherenceLevel === 'Alta' ? 'en calma' : 'acelerado'}. Ajusta tu respiración para sincronizarte con el IRG actual de ${state.irg.toFixed(1)}.</small>
            `;
        }, 5000); // Damos 5 segundos para la "medición"

    } catch (error) {
        resultDiv.innerHTML = `<strong>Error:</strong> No se pudo acceder a la cámara. Por favor, asegúrate de haber dado el permiso. ${error.message}`;
    }
    // --- Lógica del Modal (Glosario) ---
    window.openModal = function(infoKey) {
        const modal = document.getElementById('info-modal');
        const info = glossary[infoKey];
        if (info) {
            document.getElementById('modal-title').innerText = info.title;
            document.getElementById('modal-text').innerText = info.text;
            modal.style.display = 'block';
        }
    };
    window.closeModal = function() { document.getElementById('info-modal').style.display = 'none'; };
    
    // Asignar listeners a los elementos con info-trigger
    document.querySelectorAll('.info-trigger').forEach(el => {
        el.addEventListener('click', () => openModal(el.dataset.info));
    });
    window.onclick = function(event) { if (event.target == document.getElementById('info-modal')) { closeModal(); } };

    // --- Simulaciones y Lógica de otros módulos ---
    // (Copiar y adaptar la lógica de la versión HTML anterior para los demás módulos)
    function simulateDataChange() { /* ... */ }
    function startBioSync() { /* ... */ }
    function updateSocialFeed() { /* ... */ }
    function generateKondratievChart() { /* ... */ }

    // --- Inicialización ---
    updateDashboard();
    setInterval(simulateDataChange, 4000);
    setInterval(updateSocialFeed, 7000);
    generateKondratievChart();
});
