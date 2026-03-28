// 📈 Growth Traded - Core Application Engine Engine

// Pre-compiled Mock Data for Top Growth Tickers
const KNOWN_TICKERS = {
    "NVDA": { name: "Nvidia Corporation", growth: 85.0, fcf_margin: 44.5, gross_margin: 74.8, nrr: 130, narrative: "Dominant global leader in AI hardware and data center acceleration with an unassailable CUDA software ecosystem." },
    "SNOW": { name: "Snowflake Inc.", growth: 21.5, fcf_margin: 25.5, gross_margin: 75.1, nrr: 124, narrative: "The leading cloud data warehouse and platform with powerful data gravity and a flexible consumption-based pricing model." },
    "PLTR": { name: "Palantir Technologies", growth: 30.1, fcf_margin: 32.2, gross_margin: 80.5, nrr: 114.5, narrative: "A best-in-class enterprise AI provider helping both government and commercial sectors operationalize data with AIP and Foundry." },
    "CRWD": { name: "CrowdStrike Holdings", growth: 27.8, fcf_margin: 32.8, gross_margin: 78.2, nrr: 119, narrative: "The premier cybersecurity platform consolidating endpoint, cloud, and identity defense into a single, lightweight agent." },
    "MDB": { name: "MongoDB, Inc.", growth: 17.5, fcf_margin: 18.1, gross_margin: 74.9, nrr: 112, narrative: "The go-to NoSQL database platform essential for modern cloud-native applications and AI-driven data pipelines." },
    "TSLA": { name: "Tesla, Inc.", growth: 12.5, fcf_margin: 8.5, gross_margin: 18.2, nrr: 100, narrative: "The global electric vehicle leader with massive long-term optionality in autonomous driving, robotics, and energy infrastructure." },
    "MSFT": { name: "Microsoft Corporation", growth: 15.2, fcf_margin: 31.8, gross_margin: 70.2, nrr: 110, narrative: "A mega-cap tech titan driving enterprise AI adoption via its massive cloud footprint and strategic OpenAI partnership." },
    "DDOG": { name: "Datadog, Inc.", growth: 23.3, fcf_margin: 28.3, gross_margin: 80.1, nrr: 113.8, narrative: "A unified observability platform becoming a critical, single pane of glass for DevOps and IT infrastructure management." },
    "NET": { name: "Cloudflare, Inc.", growth: 28.2, fcf_margin: 12.4, gross_margin: 77.2, nrr: 114.7, narrative: "A hyper-scale global edge network delivering fast, secure, and resilient infrastructure with Zero Trust and edge AI capabilities." },
    "HUBS": { name: "HubSpot, Inc.", growth: 18.2, fcf_margin: 17.3, gross_margin: 81.2, nrr: 104.8, narrative: "A leading CRM platform for SMBs moving up-market with unified, easy-to-use Sales, Marketing, and Service Hubs." }
};

let portfolio = [];
// Smart API Base: If accessed via 8003, use relative paths (bypasses CORS network blocks).
const API_BASE = window.location.port === "8003" ? "" : "http://localhost:8003"; 

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    const form = document.getElementById("portfolio-form");
    const uploadForm = document.getElementById("upload-form");
    const csvForm = document.getElementById("csv-form");
    const clearBtn = document.getElementById("clear-all");

    form.addEventListener("submit", handleAddPosition);
    if (uploadForm) {
        uploadForm.addEventListener("submit", handleFileUpload);
    }
    if (csvForm) {
        csvForm.addEventListener("submit", handleCsvSubmit);
    }
    clearBtn.addEventListener("click", handleClearAll);

    // Initial Render
    renderPortfolio();
}

function handleAddPosition(e) {
    e.preventDefault();

    const pasteInput = document.getElementById("paste-list");
    const pasteText = pasteInput.value.trim();

    if (!pasteText) return;

    const lines = pasteText.split('\n');
    
    lines.forEach(line => {
        if (!line.trim()) return;
        
        const parts = line.split(',');
        const ticker = parts[0] ? parts[0].toUpperCase().trim() : null;
        let amount = 0;
        
        if (parts[1]) {
            const cleanAmount = parts[1].replace('$', '').replace(/,/g, '').trim();
            const parsed = parseFloat(cleanAmount);
            if (!isNaN(parsed)) amount = parsed;
        }
        
        const reason = parts[2] ? parts[2].trim() : null;

        if (ticker) {
            simulateDeepThinking(ticker, amount, reason);
        }
    });

    // Reset Form
    pasteInput.value = "";
}

function simulateDeepThinking(ticker, amount, reason) {
    const container = document.getElementById("results-container");
    
    // Check if it was empty
    const emptyState = container.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    // Create temporary thinking card
    const thinkingCard = document.createElement("div");
    thinkingCard.className = "card glass eval-card thinking-pulse";
    thinkingCard.id = `thinking-${ticker}`;
    thinkingCard.innerHTML = `
        <div class="eval-header">
            <div class="ticker-box">
                <span class="ticker-name">${ticker}</span>
                <span class="company-name" id="thinking-status-${ticker}">Initializing Deep Analysis...</span>
            </div>
            <div class="loader-spinner">🌀</div>
        </div>
        <div class="metrics-strip">
            <p class="thinking-text" id="thinking-text-${ticker}">Scanning Total Addressable Market...</p>
        </div>
    `;
    container.prepend(thinkingCard);

    const stages = [
        "Computing Rule of 40 Efficiency...",
        "Evaluating Pricing Power (Gross Margins)...",
        "Validating Net Retention Rates & Moat Quality...",
        "Factoring User Rationale Scenarios...",
        "Finalizing Growth Thesis..."
    ];

    let stage = 0;
    const interval = setInterval(() => {
        const textNode = document.getElementById(`thinking-text-${ticker}`);
        const statusNode = document.getElementById(`thinking-status-${ticker}`);
        
        if (textNode && stage < stages.length) {
            textNode.innerText = stages[stage];
            stage++;
        } else {
            clearInterval(interval);
            thinkingCard.remove();
            executeEvaluation(ticker, amount, reason);
        }
    }, 700); // 700ms per stage thinking
}

async function executeEvaluation(ticker, amount, reason) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/analyze/manual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, amount, user_reason: reason })
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            
            const position = {
                ticker: result.ticker,
                amount: result.amount,
                metrics: result.metrics,
                ruleOf40: result.ruleOf40,
                category: result.category,
                narrative: result.narrative,
                timestamp: new Date()
            };

            portfolio.unshift(position); // Newest first
            renderPortfolio();
        }
    } catch (error) {
        console.error("Evaluation Fetch Error:", error);
        // Fallback to offline metrics if server fails to ensure UI remains alive
        fallbackOfflineEvaluation(ticker, amount);
    }
}

function fallbackOfflineEvaluation(ticker, amount) {
    let metrics = KNOWN_TICKERS[ticker];

    if (!metrics) {
        const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        metrics = {
            name: `${ticker} Global Systems`,
            growth: (hash % 50) + 5,
            fcf_margin: (hash % 30) - 5,
            gross_margin: (hash % 40) + 40,
            nrr: (hash % 40) + 95,
            narrative: "Fallback offline heuristic triggered. Server offline."
        };
    }

    const ruleOf40 = metrics.growth + metrics.fcf_margin;
    let category = "Buy S&P500 instead";
    if (ruleOf40 > 45 && metrics.gross_margin > 70) category = "Great Buy";
    else if (ruleOf40 > 30 || metrics.gross_margin > 60) category = "Good Buy";

    portfolio.unshift({ ticker, amount, metrics, ruleOf40, category, timestamp: new Date() });
    renderPortfolio();
}

function renderPortfolio() {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    if (portfolio.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <h3>No position evaluated yet</h3>
                <p>Feed a ticker (try **NVDA**, **CRWD**, or **SNOW**) to start the deep engine.</p>
            </div>
        `;
        updateGlobalStats(0, 0, "N/A");
        return;
    }

    let totalInvested = 0;
    let weightedRule40Sum = 0;

    portfolio.forEach(pos => {
        if (!pos || !pos.ticker || !pos.metrics) return; // Skip bad/error elements gracefully

        totalInvested += pos.amount;
        weightedRule40Sum += (pos.ruleOf40 * pos.amount);

        const cardCls = pos.category === "Strong Buy" ? "buy-great" : pos.category === "Buy" ? "buy-good" : "buy-sp500";
        
        const card = document.createElement("div");
        card.className = `card glass eval-card ${cardCls}`;
        card.innerHTML = `
            <div class="eval-header">
                <div class="ticker-box">
                    <span class="ticker-name">${pos.ticker}</span>
                    <span class="company-name">${pos.metrics.name}</span>
                </div>
                <span class="badge">${pos.category}</span>
            </div>
            
            <div class="metrics-strip">
                <div class="metric-line">
                    <span>YoY Revenue Growth</span>
                    <span>${pos.metrics.growth}%</span>
                </div>
                <div class="metric-line">
                    <span>FCF Margin</span>
                    <span>${pos.metrics.fcf_margin}%</span>
                </div>
                <div class="metric-line">
                    <span>Rule of 40 Efficiency</span>
                    <span style="color: ${pos.ruleOf40 >= 40 ? 'var(--buy-great)' : 'inherit'}">${pos.ruleOf40}%</span>
                </div>
                <div class="metric-line">
                    <span>Gross Margins (Power)</span>
                    <span>${pos.metrics.gross_margin}%</span>
                </div>
                <div class="metric-line">
                    <span>Net Retention (NRR)</span>
                    <span>${pos.metrics.nrr}%</span>
                </div>
                <div class="metric-line">
                    <span>Amount Tracked</span>
                    <span>$${pos.amount.toLocaleString()}</span>
                </div>
            </div>

            <p class="narrative"><strong>Thesis:</strong> ${pos.metrics.narrative}</p>
        `;
        container.appendChild(card);
    });

    const avgRule40 = totalInvested > 0 ? (weightedRule40Sum / totalInvested) : 0;
    
    let conviction = "Moderate";
    if (avgRule40 > 40) conviction = "Hyper-Growth Concentration";
    else if (avgRule40 < 20) conviction = "Underweight / Sluggish";

    updateGlobalStats(totalInvested, avgRule40, conviction);
}

function updateGlobalStats(total, rule40, conviction) {
    document.getElementById("portfolio-total").innerText = `$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("portfolio-rule40").innerText = `${rule40.toFixed(1)}%`;
    document.getElementById("portfolio-conviction").innerText = conviction;
}

function handleClearAll() {
    if (confirm("Clear all evaluated positions from memory?")) {
        portfolio = [];
        renderPortfolio();
    }
}

async function handleFileUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById("portfolio-file");
    const statusBox = document.getElementById("upload-status");
    
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    statusBox.innerText = "⏳ Uploading and initializing scan... (This can take up to 15 minutes for large portfolios as agents evaluate deeply!)";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}/api/v1/analyze/upload`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const data = await response.json();
        statusBox.innerText = "🚀 File uploaded! Multi-agent research scan launched. Results will stream in...";
        
        pollForUploadResults(data.task_id);

        fileInput.value = ""; // Reset
    } catch (error) {
        console.error("📌 [File Upload Debug Profile]:", error);
        statusBox.innerText = `❌ Error uploading file. Details: ${error.message}`;
    }
}

async function pollForUploadResults(taskId) {
    const statusBox = document.getElementById("upload-status");
    let attempts = 0;
    const maxAttempts = 300; // 15 minutes max

    const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(interval);
            statusBox.innerText = "⚠️ Search timed out. Check if server backend is active.";
            return;
        }

    try {
        const response = await fetch(`${API_BASE}/api/v1/results/${taskId}`);
        const data = await response.json();

            if (data.results && data.results.length > 0) {
                // If we got new results, load them into portfolio
                // To prevent duplicates, we only add if not already present (simplified)
                data.results.forEach(res => {
                    if (!portfolio.some(p => p.ticker === res.ticker && p.amount === res.amount)) {
                         portfolio.unshift({ ...res, timestamp: new Date() });
                    }
                });
                renderPortfolio();
                
                clearInterval(interval);
                statusBox.innerText = "✅ Spreadsheet analysis complete! See dashboard below.";
            }
        } catch (error) {
            console.error("Polling Error:", error);
        }
    }, 3000); // Check every 3 seconds
}

async function handleCsvSubmit(e) {
    e.preventDefault();
    const urlInput = document.getElementById("csv-url");
    const statusBox = document.getElementById("csv-status");
    
    const url = urlInput.value.trim();
    if (!url) return;

    statusBox.innerText = "⏳ Initializing background link scan... (Agents are thinking deep, please wait up to 15 minutes!)";

    try {
        const response = await fetch(`${API_BASE}/api/v1/analyze/csv`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csv_url: url })
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const data = await response.json();
        statusBox.innerText = "🚀 Link queued! Results will stream in shortly...";
        
        pollForCsvResults(data.task_id);

        urlInput.value = "";
    } catch (error) {
        console.error("📌 [Link Share Debug Profile]:", error);
        statusBox.innerText = `❌ Error launching CSV scan. Details: ${error.message}`;
    }
}

async function pollForCsvResults(taskId) {
    const statusBox = document.getElementById("csv-status");
    let attempts = 0;
    const maxAttempts = 300; // 15 minutes max

    const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(interval);
            statusBox.innerText = "⚠️ Search timed out.";
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/v1/results/${taskId}`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                data.results.forEach(res => {
                    if (!portfolio.some(p => p.ticker === res.ticker && p.amount === res.amount)) {
                         portfolio.unshift({ ...res, timestamp: new Date() });
                    }
                });
                renderPortfolio();
                
                clearInterval(interval);
                statusBox.innerText = "✅ Analysis complete!";
            }
        } catch (error) {
            console.error("Polling Error:", error);
        }
    }, 3000);
}
