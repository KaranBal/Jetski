function getApiBaseUrl() {
    return document.getElementById("api_url").value;
}

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
    
    // Bind Event Listeners
    document.getElementById("ingest-form").addEventListener("submit", handleIngest);
    if (document.getElementById("create-source-form")) {
         document.getElementById("create-source-form").addEventListener("submit", handleCreateSource);
    }
    document.getElementById("refresh-sources").addEventListener("click", fetchSources);
    document.getElementById("refresh-golden").addEventListener("click", fetchGoldenRecords);
    
    document.getElementById("api_url").addEventListener("change", () => {
        logToConsole("API Base URL updated. Re-polling...");
        fetchSources();
        fetchGoldenRecords();
    });
});

function initDashboard() {
    logToConsole("Initializing MDM Client Load...");
    fetchSources();
    fetchGoldenRecords();
    setInterval(fetchGoldenRecords, 10000);
}

// 🩺 Status Updater
function updateStatus(text, colorClass) {
    const dot = document.getElementById("status-dot");
    const label = document.getElementById("status-text");
    if (!dot || !label) return;

    dot.className = `dot ${colorClass}`;
    label.innerText = text;
}

// --- 🌐 Fetch API Nodes ---

async function fetchSources() {
    const baseUrl = getApiBaseUrl();
    updateStatus("Connecting...", "yellow");
    try {
        const response = await fetch(`${baseUrl}/sources/`);
        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
        const sources = await response.json();
        
        updateStatus("Connected", "green");
        
        const tableBody = document.getElementById("sources-table-body");
        tableBody.innerHTML = ""; 
        const select = document.getElementById("source_select");
        select.innerHTML = '<option value="">-- Select Source --</option>';

        if (sources.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" class="loading">No sources found.</td></tr>';
            return;
        }

        sources.forEach(source => {
            const row = `<tr>
                <td class="accent-text"><strong>${source.source_name}</strong></td>
                <td><span class="score-badge">${source.reliability_score.toFixed(2)}</span></td>
                <td><small>${source.source_id.split('-')[0]}...</small></td>
            </tr>`;
            tableBody.innerHTML += row;

            const option = `<option value="${source.source_id}">${source.source_name} (${source.reliability_score})</option>`;
            select.innerHTML += option;
        });

    } catch (error) {
        updateStatus("Connection Error", "red");
        logToConsole(`Error fetching sources: ${error.message}`, "error");
    }
}

async function fetchGoldenRecords() {
    const baseUrl = getApiBaseUrl();
    try {
        const response = await fetch(`${baseUrl}/golden/`);
        const records = await response.json();
        const tableBody = document.getElementById("golden-table-body");
        
        if (records.length === 0 || !Array.isArray(records)) {
             tableBody.innerHTML = '<tr><td colspan="6" class="loading">No master records consolidated.</td></tr>';
             return;
        }

        tableBody.innerHTML = ""; 
        records.forEach(record => {
             const row = `<tr>
                <td><span class="gold-id">#${record.golden_id.split('-')[0]}</span></td>
                <td><strong>${record.first_name || '-'} ${record.last_name || '-'}</strong></td>
                <td>${record.email || '<span class="mute">-</span>'}</td>
                <td>${record.phone || '<span class="mute">-</span>'}</td>
                <td><span class="score-badge success-bg">${(record.confidence_score * 100).toFixed(0)}%</span></td>
                <td><small>${new Date(record.updated_at).toLocaleTimeString()}</small></td>
             </tr>`;
             tableBody.innerHTML += row;
        });

    } catch (error) {
         console.error(error);
    }
}

async function handleCreateSource(e) {
    e.preventDefault();
    const baseUrl = getApiBaseUrl();
    
    const srcName = document.getElementById("src_name").value;
    const srcScore = parseFloat(document.getElementById("src_score").value);

    const payload = {
        source_name: srcName,
        reliability_score: srcScore,
        description: `Demo Source ${srcName}`
    };

    try {
        const response = await fetch(`${baseUrl}/sources/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            logToConsole(`Source '${srcName}' created successfully.`);
            document.getElementById("src_name").value = "";
            document.getElementById("src_score").value = "";
            fetchSources();
        } else {
            logToConsole(`Failed to create source. Check constraints.`, "error");
        }
    } catch (error) {
        logToConsole(`Create Source Error: ${error.message}`, "error");
    }
}

async function handleIngest(e) {
    e.preventDefault();
    const baseUrl = getApiBaseUrl();

    const source_id = document.getElementById("source_select").value;
    const first_name = document.getElementById("first_name").value;
    const last_name = document.getElementById("last_name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    const payload = {
        source_id: source_id,
        first_name: first_name || null,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null
    };

    try {
        const response = await fetch(`${baseUrl}/customers/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
             const rawShort = result.raw_record_id ? result.raw_record_id.split('-')[0] : "???";
             const goldShort = result.matched_golden_record_id ? result.matched_golden_record_id.split('-')[0] : "???";
             
             logToConsole(`Success! Ingested Raw: ${rawShort}... Consolidated Golden: ${goldShort}...`);
             fetchGoldenRecords();
             
             document.getElementById("first_name").value = "";
             document.getElementById("last_name").value = "";
             document.getElementById("email").value = "";
             document.getElementById("phone").value = "";
        } else {
             logToConsole(`Ingest Error: ${result.detail || "Check payload defaults"}`, "error");
        }
    } catch (error) {
        logToConsole(`Ingest Fetch Exception: ${error.message}`, "error");
    }
}

function logToConsole(message, type = "system") {
    const consoleBox = document.getElementById("log-console");
    if (!consoleBox) return;
    const item = document.createElement("div");
    item.className = `log-item ${type}`;
    item.innerText = `> [${new Date().toLocaleTimeString()}] ${message}`;
    consoleBox.appendChild(item);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}
