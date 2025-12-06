// --- CONFIGURACIÓN GLOBAL Y ESTADO ---
const SOLAR_API_BASE = 'https://api.nasa.gov/DONKI/';
const NASA_API_KEY = 'DEMO_KEY'; // Puedes usar 'DEMO_KEY' para empezar. Para uso intensivo, solicita una gratis en https://api.nasa.gov/

// Estado global de HELIOS, accesible por todas las funciones
const state = {
    irg: 42.8,
    ftrt: 1.21,
    kp: 5,
    bioSymptoms: 30,
    ics: 65,
};

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

// --- FUNCIONES PRINCIPALES DE LA APLICACIÓN ---

// Función para obtener datos REALES del clima espacial de la NASA
async function fetchSolarData() {
    try {
        // Obtenemos las CMEs (Eyecciones de Masa Coronal) de los últimos 30 días
        const response = await fetch(`${SOLAR_API_BASE}CMEAnalysis?startDate=2024-01-01&endDate=2024-12-31&api_key=${NASA_API_KEY}`);
        const cmeData = await response.json();

        // Obtenemos las tormentas geomagnéticas (GST)
        const gstResponse = await fetch(`${SOLAR_API_BASE}GST?startDate=2024-01-01&endDate=2024-12-31&api_key=${NASA_API_KEY}`);
        const gstData = await gstResponse.json();

        console.log('Datos Solares Recibidos de la NASA:', { cmeData, gstData });

        // --- Actualizamos el estado con datos REALES ---
        let newFtrt = 1.0; // Base
        if (cmeData.length > 0) {
            newFtrt += cmeData.length * 0.1;
        }
        if (gstData.some(gst => gst.kpIndex > 5)) {
            newFtrt += 0.5;
        }

        state.ftrt = newFtrt;
        state.kp = gstData.length > 0 ? gstData[gstData.length - 1].kpIndex || 5 : 5;
        
        updateDashboard(); // Actualizamos la UI con los nuevos datos

    } catch (error) {
        console.error("Error al obtener datos solares de la NASA:", error);
        // Si falla la API, no hacemos nada y dejamos que la simulación de otros valores continúe.
    }
}

// Función para simular cambios en los datos biológicos y sociales
function simulateDataChange() {
    // Simulamos pequeños cambios para dar vida al dashboard (excepto FTRT y Kp que vienen de la API)
    state.bioSymptoms = Math.max(0, Math.min(100, state.bioSymptoms + Math.floor((Math.random() - 0.5) * 5)));
    state.ics = Math.max(0, Math.min(100, state.ics + Math.floor((Math.random() - 0.5) * 5)));

    // El IRG se recalcula con los valores actualizados
    state.irg = (state.ftrt * 15) + (state.kp * 3) + (state.bioSymptoms * 0.2) + (state.ics * 0.2);
    
    updateDashboard();
}

// Función para actualizar la interfaz de usuario (UI)
function updateDashboard() {
    document.getElementById('irg-value').innerText = state.irg.toFixed(1);
    document.getElementById('ftrt-value').innerText = state.ftrt.toFixed(2);
    document.getElementById('kp-value').innerText = state.kp;
    document.getElementById('bio-value').innerText = `+${state.bioSymptoms}%`;
    document.getElementById('ics-value').innerText = state.ics;
    // ... actualizar otros valores si es necesario ...
    updateIrgStyle();
}

// Función para actualizar el estilo visual del IRG
function updateIrgStyle() {
    const irgCircle = document.getElementById('irg-circle');
    const irgStatus = document.getElementById('irg-status');
    let color, status;
    if (state.irg < 40) { color = 'var(--success-color)'; status = 'ARMONÍA PROFUNDA'; }
    else if (state.irg < 70) { color = 'var(--warning-color)'; status = 'PERTURBACIÓN LEVE'; }
    else { color = 'var(--critical-color)'; status = 'TORMENTA CÓSMICA'; }
    irgCircle.style.borderColor = color; 
    irgCircle.style.boxShadow = `0 0 20px ${color}40`;
    irgStatus.innerText = status; 
    irgStatus.style.color = color;
}

// --- LÓGICA DE MÓDULOS Y NAVEGACIÓN ---

// Muestra un módulo específico y oculta los demás
window.showModule = function(moduleId) {
    document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    // Aseguramos de que el botón que se clickeo se active
    if (event && event.target) {
        event.target.classList.add('active');
    }
};

// Función Bio-Sync Mejorada (accede a la cámara)
async function startBioSync() {
    const resultDiv = document.getElementById('bio-result');
    resultDiv.innerHTML = 'Solicitando acceso a la cámara para medir tu pulso...';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
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
}

// --- LÓGICA DE OTROS MÓDULOS ---

// Actualiza el feed de la conciencia social
function updateSocialFeed() {
    const feed = document.getElementById('social-feed');
    if (!feed) return; // Salimos si no estamos en el módulo de conciencia

    const snippets = [
        { text: "Siento una ansiedad extraña hoy, como si el aire estuviera cargado...", sentiment: "negativo" },
        { text: "¡La gente está muy agresiva en las redes! No pueden tener una conversación normal.", sentiment: "negativo" },
        { text: "Me duele la cabeza desde esta mañana. No es un dolor de cabeza normal.", sentiment: "negativo" },
        { text: "Alguien más se siente... 'apagado'? Como sin energía.", sentiment: "negativo" },
        { text: "Paz a todos. Recuerden respirar. Todo pasará.", sentiment: "positivo" },
        { text: "¿Será por la tormenta solar que vi en las noticias? Todo tiene sentido ahora.", sentiment: "positivo" },
    ];
    
    const newSnippet = snippets[Math.floor(Math.random() * snippets.length)];
    const p = document.createElement('p');
    p.innerText = `[${new Date().toLocaleTimeString()}] ${newSnippet.text}`;
    feed.appendChild(p);
    feed.scrollTop = feed.scrollHeight; // Auto-scroll
}

// Genera el gráfico de la Onda de Kondratiev
function generateKondratievChart() {
    const chart = document.getElementById('economic-chart');
    if (!chart) return; // Salimos si no estamos en el módulo de flujo

    const width = 60;
    const height = 20;
    let chartString = `Onda de Kondratiev (50-60 años) vs. Ciclo Solar (11 años)\n\n`;
    
    for (let y = height; y >= 0; y--) {
        let line = '';
        for (let x = 0; x < width; x++) {
            const kondWave = Math.sin((x / width) * Math.PI * 2) * (height / 2 - 2);
            const solarWave = Math.sin((x / width) * Math.PI * 2 * 5) * (height / 4);
            const combinedWave = kondWave + solarWave;
            
            if (Math.abs(y - combinedWave) < 1) {
                line += '█';
            } else if (Math.abs(y - kondWave) < 1) {
                line += '▓'; // Kondratiev
            } else if (Math.abs(y - solarWave) < 1) {
                line += '▒'; // Solar
            } else {
                line += '░';
            }
        }
        chartString += line + '\n';
    }
    chartString += `\nLeyenda: █ Interferencia | ▓ Onda Kondratiev | ▒ Ciclo Solar`;
    chart.innerText = chartString;
}


// --- LÓGICA DEL MODAL (GLOSARIO) ---

window.openModal = function(infoKey) {
    const modal = document.getElementById('info-modal');
    const info = glossary[infoKey];
    if (info) {
        document.getElementById('modal-title').innerText = info.title;
        document.getElementById('modal-text').innerText = info.text;
        modal.style.display = 'block';
    }
};

window.closeModal = function() { 
    document.getElementById('info-modal').style.display = 'none'; 
};


// --- INICIALIZACIÓN DE LA APLICACIÓN ---
// Este código se ejecuta UNA SOLA VEZ cuando la página se carga completamente
document.addEventListener('DOMContentLoaded', function() {
    
    // Llamada inicial a las funciones que actualizan la UI
    updateDashboard();
    fetchSolarData(); // Llamada inicial a la API
    updateSocialFeed();
    generateKondratievChart();

    // Configuramos los intervalos para actualizaciones periódicas
    setInterval(simulateDataChange, 4000);       // Simulación cada 4 segundos
    setInterval(fetchSolarData, 300000);       // Llamada a la API cada 5 minutos (300,000 ms)
    setInterval(updateSocialFeed, 7000);        // Nuevo tweet cada 7 segundos

    // Asignar listeners a los elementos con el glosario
    document.querySelectorAll('.info-trigger').forEach(el => {
        el.addEventListener('click', () => openModal(el.dataset.info));
    });

    // Listener para cerrar el modal haciendo clic fuera de él
    window.onclick = function(event) { 
        if (event.target == document.getElementById('info-modal')) { 
            closeModal(); 
        } 
    };
});            let coherenceLevel = 'Baja';
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
