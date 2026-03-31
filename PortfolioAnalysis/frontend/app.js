// State
let companies = [];
let selectedCompany = null;
let selectedTickers = [];
let pollingInterval = null;

// DOM Elements
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const fileInput = document.getElementById('csv-file');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const companiesList = document.getElementById('companies-list');
const analysisPanel = document.getElementById('active-analysis');
const portfolioTier = document.getElementById('portfolio-tier');
const portfolioRating = document.getElementById('portfolio-rating');
const portfolioNarrative = document.getElementById('portfolio-narrative');
const totalAssets = document.getElementById('total-assets');
const toolsContainer = document.getElementById('tools-container');

// Detect if running from local file or different host
const API_URL = window.location.protocol === 'file:' ? 'http://localhost:8005/api' : '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUpload();
    loadDashboard();
});

function initTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');

            if (target === 'dashboard') {
                loadDashboard();
            } else if (target === 'recommendations') {
                renderRecommendations();
            }
        });
    });

    // Bulk Actions listeners
    setTimeout(() => {
        const selectAll = document.getElementById('select-all');
        const bulkAnalyze = document.getElementById('bulk-analyze-btn');
        const bulkDelete = document.getElementById('bulk-delete-btn');

        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                selectedTickers = isChecked ? companies.map(c => c.ticker) : [];
                renderCompanyList();
            });
        }

        if (bulkAnalyze) {
            bulkAnalyze.addEventListener('click', async () => {
                if (selectedTickers.length === 0) return alert("Select companies first.");
                
                try {
                    const res = await fetch(`${API_URL}/analyze_bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tickers: selectedTickers })
                    });
                    if (res.ok) {
                        alert(`Triggered analysis for ${selectedTickers.length} companies.`);
                        selectedTickers = [];
                        renderCompanyList();
                        updateSelectAllCheckbox();
                    }
                } catch (err) { alert("Failed to trigger bulk analysis: " + err.message); }
            });
        }

        if (bulkDelete) {
            bulkDelete.addEventListener('click', async () => {
                if (selectedTickers.length === 0) return alert("Select companies first.");
                if (!confirm(`Delete ${selectedTickers.length} companies from database?`)) return;

                try {
                    const res = await fetch(`${API_URL}/delete_companies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tickers: selectedTickers })
                    });
                    if (res.ok) {
                        selectedTickers = [];
                        loadDashboard(); // Reload list
                    }
                } catch (err) { alert("Failed to delete companies: " + err.message); }
            });
        }
    }, 500); // Wait for DOM if needed, or run after init
}

function initUpload() {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadBtn.style.pointerEvents = 'auto';
            uploadBtn.style.opacity = '1';
        } else {
            uploadBtn.style.pointerEvents = 'none';
            uploadBtn.style.opacity = '0.5';
        }
    });

    uploadBtn.addEventListener('click', async () => {
        if (fileInput.files.length === 0) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        uploadStatus.innerHTML = '<span class="loading">Uploading and processing...</span>';

        try {
            const res = await fetch(`${API_URL}/upload_csv`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                uploadStatus.innerHTML = `<span style="color: #10b981;">✅ Success! Parsed ${data.companies_processed} positions.</span>`;
                loadDashboard();
            } else {
                throw new Error("Upload failed");
            }
        } catch (err) {
            uploadStatus.innerHTML = `<span style="color: #ef4444;">❌ Error: ${err.message}</span>`;
        }
    });
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/companies`);
        companies = await res.json();
        
        renderCompanyList();
        loadPortfolioRating();
        updateOverviewStats();

        // Auto-select first if none selected
        if (!selectedCompany && companies.length > 0) {
            selectCompany(companies[0]);
        }
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
    }
}

function updateOverviewStats() {
    totalAssets.innerText = companies.length;
}

async function loadPortfolioRating() {
    try {
        const res = await fetch(`${API_URL}/portfolio_rating`);
        const data = await res.json();

        portfolioRating.innerHTML = data.rating;
        portfolioNarrative.innerHTML = data.narrative;
        
        if (data.rating.includes("A-Tier")) {
            portfolioTier.innerText = "A-Tier";
            portfolioTier.className = "badge tier-a";
        } else {
            portfolioTier.innerText = "Check Review";
            portfolioTier.className = "badge tier-b";
        }
    } catch (err) {
        console.error("Failed to load portfolio rating:", err);
    }
}

function renderCompanyList() {
    if (companies.length === 0) {
        companiesList.innerHTML = '<div class="loading">No positions loaded. Use Import tab.</div>';
        return;
    }

    companiesList.innerHTML = '';
    companies.forEach(c => {
        const div = document.createElement('div');
        div.className = `company-item ${selectedCompany && selectedCompany.id === c.id ? 'selected' : ''}`;
        
        // Clicking item selects it for side viewing (if not clicking checkbox)
        div.onclick = (e) => {
            if (e.target.closest('.checkbox-container')) return;
            selectCompany(c);
        };

        div.innerHTML = `
            <label class="checkbox-container" onclick="event.stopPropagation()">
                <input type="checkbox" class="row-checkbox" value="${c.ticker}" ${selectedTickers.includes(c.ticker) ? 'checked' : ''} onchange="toggleSelect('${c.ticker}', this.checked)">
                <span class="checkmark"></span>
            </label>
            <div class="comp-info" style="flex: 1; margin-left: 12px;">
                <h4>${c.ticker}</h4>
                <span>${c.name || 'Unknown Company'}</span>
            </div>
            <div class="comp-badge">
                <span class="badge ${getCategoryClass(c.category)}">${c.category || 'Pending'}</span>
            </div>
        `;
        companiesList.appendChild(div);
    });
}

window.toggleSelect = function(ticker, isChecked) {
    if (isChecked) {
        if (!selectedTickers.includes(ticker)) selectedTickers.push(ticker);
    } else {
        selectedTickers = selectedTickers.filter(t => t !== ticker);
    }
    updateSelectAllCheckbox();
};

function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('select-all');
    if (!selectAll) return;
    selectAll.checked = companies.length > 0 && selectedTickers.length === companies.length;
}

function getCategoryClass(cat) {
    if (!cat) return 'tier-b';
    if (cat === 'Great Buy') return 'tier-a';
    if (cat === 'Good Buy') return 'tier-b';
    return 'tier-c'; // Custom or fallback
}

function selectCompany(c) {
    selectedCompany = c;
    renderCompanyList(); // Update selected state in list
    renderAnalysisPanel();
}

function renderAnalysisPanel() {
    if (!selectedCompany) return;

    const c = selectedCompany;
    const hasAnalysis = c.short_term_thesis || c.medium_term_thesis;

    if (!hasAnalysis) {
        analysisPanel.innerHTML = `
            <h2>Deep Thesis Research (${c.ticker})</h2>
            <div class="placeholder-analysis">
                <span class="icon-large">📊</span>
                <p>No analysis found. Trigger Deep Research to analyze this asset.</p>
                <button class="primary-btn" onclick="triggerAnalysis('${c.ticker}')">Run AI Deep Analysis</button>
            </div>
        `;
        return;
    }

    // Stop polling if we found analysis (assuming it was polling and now finished)
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    analysisPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2>Deep Thesis Research (${c.ticker})</h2>
            <button class="primary-btn" style="margin-top: 0; padding: 10px 16px; font-size: 0.9rem;" onclick="triggerAnalysis('${c.ticker}')">Run AI Deep Analysis</button>
        </div>
        <div class="analysis-scroll">
            <div class="thesis-box">
                <h3>Short Term View</h3>
                <p>${c.short_term_thesis || 'No data generated.'}</p>
            </div>
            <div class="thesis-box" style="border-color: #a855f7;">
                <h3>Medium Term View</h3>
                <p>${c.medium_term_thesis || 'No data generated.'}</p>
            </div>
            <div class="thesis-box" style="border-color: #ec4899;">
                <h3>Long Term Thesis</h3>
                <p>${c.long_term_thesis || 'No data generated.'}</p>
            </div>
            <div class="thesis-box" style="border-color: #10b981;">
                <h3>Rating: ${c.category || 'Not rated'}</h3>
                <p>Recommended Tools: ${c.must_own_apps || 'Standard analytics.'}</p>
            </div>
        </div>
    `;
}

window.triggerAnalysis = async function(ticker) {
    analysisPanel.innerHTML = `
        <h2>Deep Thesis Research (${ticker})</h2>
        <div class="placeholder-analysis">
            <span class="icon-large">🤖</span>
            <p>Agent is currently scraping news, reddit, youtube and press releases. This takes a while...</p>
            <div class="loading">Deep Thinking... Checking metrics...</div>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/analyze/${ticker}`, {
            method: 'POST'
        });

        if (res.ok) {
            // Start polling
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(() => checkAnalysisStatus(ticker), 3000);
        } else {
            throw new Error("Failed to trigger analysis");
        }
    } catch (err) {
        console.error("Error triggering analysis:", err);
        renderAnalysisPanel();
    }
}

async function checkAnalysisStatus(ticker) {
    try {
        const res = await fetch(`${API_URL}/companies`);
        const data = await res.json();
        companies = data; // Update in-memory list
        
        const updated = companies.find(c => c.ticker === ticker);
        if (updated && (updated.short_term_thesis || updated.medium_term_thesis)) {
            // We found it! Update UI.
            selectedCompany = updated;
            renderCompanyList();
            renderAnalysisPanel();
            loadPortfolioRating();
        }
    } catch (err) {
        console.error("Polling error:", err);
    }
}

function renderRecommendations() {
    // Collect all must own apps from companies
    let tools = [];
    companies.forEach(c => {
        if (c.must_own_apps && c.must_own_apps !== 'Standard tools (Excel, Python) - No specific must-own platform found.') {
            tools.push({ ticker: c.ticker, apps: c.must_own_apps });
        }
    });

    if (tools.length === 0) {
        toolsContainer.innerHTML = `
            <div class="placeholder-tools">
                <p>No special tools discovered yet. Select a company and Run AI Deep Analysis to scan for hidden platforms.</p>
            </div>
        `;
        return;
    }

    toolsContainer.innerHTML = '';
    tools.forEach(t => {
        const div = document.createElement('div');
        div.className = 'thesis-box glass';
        div.style.marginBottom = '16px';
        div.innerHTML = `
            <h3>Discovered via ${t.ticker}</h3>
            <p>${t.apps}</p>
        `;
        toolsContainer.appendChild(div);
    });
}
