// ============================================================
// HELIOS - journal.js
// Journal personal del usuario. Guarda solo en localStorage
// (nada sale del navegador). No interpreta correlaciones: solo
// muestra el registro del usuario junto al dato solar del día,
// para que el propio usuario observe si ve algo o no.
// ============================================================

(function () {
    const STORAGE_KEY = 'helios_journal_entries_v1';

    function loadEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('Error leyendo journal de localStorage:', err);
            return [];
        }
    }

    function saveEntries(entries) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
            return true;
        } catch (err) {
            console.error('Error guardando journal en localStorage:', err);
            return false;
        }
    }

    function todayKey() {
        return new Date().toISOString().split('T')[0];
    }

    function upsertTodayEntry(entry) {
        const entries = loadEntries();
        const key = todayKey();
        const idx = entries.findIndex(e => e.date === key);
        const record = { date: key, ...entry };
        if (idx >= 0) {
            entries[idx] = record;
        } else {
            entries.push(record);
        }
        entries.sort((a, b) => a.date.localeCompare(b.date));
        saveEntries(entries);
        return entries;
    }

    function initForm() {
        const form = document.getElementById('journal-form');
        if (!form) return;

        const energyInput = document.getElementById('journal-energy');
        const moodInput = document.getElementById('journal-mood');
        const sleepInput = document.getElementById('journal-sleep');
        const symptomsInput = document.getElementById('journal-symptoms');
        const feedbackEl = document.getElementById('journal-save-feedback');

        [
            [energyInput, 'journal-energy-value'],
            [moodInput, 'journal-mood-value'],
            [sleepInput, 'journal-sleep-value'],
        ].forEach(([input, labelId]) => {
            if (!input) return;
            input.addEventListener('input', () => {
                const label = document.getElementById(labelId);
                if (label) label.innerText = input.value;
            });
        });

        const existing = loadEntries().find(e => e.date === todayKey());
        if (existing) {
            if (energyInput) { energyInput.value = existing.energy; document.getElementById('journal-energy-value').innerText = existing.energy; }
            if (moodInput) { moodInput.value = existing.mood; document.getElementById('journal-mood-value').innerText = existing.mood; }
            if (sleepInput) { sleepInput.value = existing.sleep; document.getElementById('journal-sleep-value').innerText = existing.sleep; }
            if (symptomsInput) symptomsInput.value = existing.symptoms || '';
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            // Referencia solar del momento del registro. Si HELIOS aún no
            // cargó datos reales, se guarda null en vez de inventar un valor.
            const solarState = window.HELIOS_STATE || {};

            const entry = {
                energy: Number(energyInput.value),
                mood: Number(moodInput.value),
                sleep: Number(sleepInput.value),
                symptoms: (symptomsInput.value || '').trim().slice(0, 140),
                kpAtEntry: typeof solarState.kp === 'number' ? solarState.kp : null,
                irgAtEntry: typeof solarState.irg === 'number' ? solarState.irg : null,
            };

            upsertTodayEntry(entry);

            if (feedbackEl) {
                feedbackEl.innerText = '✅ Registro de hoy guardado.';
                setTimeout(() => { feedbackEl.innerText = ''; }, 3000);
            }

            renderHistory();
        });
    }

    function renderList(entries) {
        const listEl = document.getElementById('journal-list');
        if (!listEl) return;

        if (entries.length === 0) {
            listEl.innerHTML = '<p class="journal-empty">Aún no hay registros. Empieza anotando cómo te sientes hoy.</p>';
            return;
        }

        const rows = entries.slice().reverse().map(e => {
            const kpText = e.kpAtEntry !== null && e.kpAtEntry !== undefined ? e.kpAtEntry : '—';
            const irgText = e.irgAtEntry !== null && e.irgAtEntry !== undefined ? Number(e.irgAtEntry).toFixed(1) : '—';
            const symptomsText = e.symptoms ? `<br><small>Síntomas: ${escapeHtml(e.symptoms)}</small>` : '';
            return `
                <div class="journal-entry">
                    <strong>${e.date}</strong>
                    — Energía: ${e.energy}/5, Ánimo: ${e.mood}/5, Sueño: ${e.sleep}/5
                    <br><small>Kp ese día: ${kpText} · IRG ese día: ${irgText}</small>
                    ${symptomsText}
                </div>
            `;
        }).join('');

        listEl.innerHTML = rows;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    // Gráfico con dos series en el mismo eje X. Deliberadamente NO se
    // dibuja ninguna línea de correlación ni tendencia: solo las dos series.
    function renderChart(entries) {
        const canvas = document.getElementById('journal-chart');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (entries.length < 2) {
            ctx.fillStyle = '#888';
            ctx.font = '14px sans-serif';
            ctx.fillText('Necesitas al menos 2 días de registro para ver el gráfico.', 20, h / 2);
            return;
        }

        const padding = 40;
        const plotW = w - padding * 2;
        const plotH = h - padding * 2;

        const wellbeingSeries = entries.map(e => (e.energy + e.mood + e.sleep) / 3);
        const kpSeries = entries.map(e => e.kpAtEntry);

        const n = entries.length;
        const xStep = plotW / Math.max(n - 1, 1);

        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        drawSeries(ctx, wellbeingSeries, 1, 5, padding, plotW, plotH, xStep, '#00ff88');
        drawSeries(ctx, kpSeries, 0, 9, padding, plotW, plotH, xStep, '#00aaff');

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('● Tu bienestar (promedio 1-5)', padding, 20);
        ctx.fillStyle = '#00aaff';
        ctx.fillText('● Kp registrado ese día (0-9)', padding, 36);
    }

    function drawSeries(ctx, values, min, max, padding, plotW, plotH, xStep, color) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;

        values.forEach((v, i) => {
            if (v === null || v === undefined) return;
            const x = padding + i * xStep;
            const normalized = (v - min) / (max - min);
            const y = padding + (1 - normalized) * plotH;

            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
            ctx.fillRect(x - 2, y - 2, 4, 4);
        });

        ctx.stroke();
    }

    function renderHistory() {
        const entries = loadEntries();
        renderList(entries);
        renderChart(entries);
    }

    function initDataControls() {
        const exportBtn = document.getElementById('journal-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const entries = loadEntries();
                const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `helios-journal-${todayKey()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const clearBtn = document.getElementById('journal-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const confirmed = window.confirm('¿Borrar todo tu historial del journal? Esta acción no se puede deshacer.');
                if (!confirmed) return;
                localStorage.removeItem(STORAGE_KEY);
                renderHistory();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initForm();
        initDataControls();
        renderHistory();
    });
})();
