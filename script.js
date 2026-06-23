// ============ المتغيرات العامة ============
let allData = null;
let gcData = [];
let stagesData = [];
let stage1Data = [];
let charts = {};

// ============ تهيئة الصفحة ============
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await loadData();
    initializeNavigation();
    initializeScrollTop();
});

// ============ تحميل البيانات ============
async function loadData() {
    try {
        const response = await fetch('data/tdf_all_data.json');
        allData = await response.json();
        
        gcData = allData.general_classification || [];
        stagesData = allData.stages_info || [];
        
        // 🔧 تصحيح بيانات المرحلة الأولى
        stage1Data = (allData.stage_1_ranking || []).map(rider => ({
            stage: rider.stage,
            rank: rider.rank,
            rider: rider.rider,
            rider_no: rider.team,      // team يحتوي على الرقم
            team: rider.time,          // time يحتوي على اسم الفريق
            time: '-'                  // لا يوجد زمن فعلي
        }));
        
        updateOverview();
        updateGC();
        updateStages();
        updateStageResults();
        createCharts();
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showError('فشل في تحميل البيانات. تأكد من وجود الملفات في مجلد data/');
    }
}

// ============ قسم النظرة العامة ============
function updateOverview() {
    if (gcData.length === 0) return;
    
    const winner = gcData[0];
    
    document.getElementById('winner-name').textContent = winner.rider.trim();
    document.getElementById('winner-team').textContent = winner.team.trim();
    document.getElementById('total-riders').textContent = gcData.length;
    document.getElementById('total-stages').textContent = stagesData.length;
    document.getElementById('winner-time').textContent = winner.time.trim();
    document.getElementById('winner-gap').textContent = 'الزمن الإجمالي';
    
    updateJerseys();
    updateTimeline();
}

function updateJerseys() {
    const container = document.getElementById('jerseys-container');
    if (!container) return;
    
    const jerseys = [
        { 
            class: 'yellow', 
            icon: 'fa-medal', 
            title: 'القميص الأصفر', 
            subtitle: 'الترتيب العام',
            rider: gcData[0]?.rider?.trim() || '-'
        },
        { 
            class: 'green', 
            icon: 'fa-trophy', 
            title: 'القميص الأخضر', 
            subtitle: 'نقاط السرعة',
            rider: 'قيد التحديث'
        },
        { 
            class: 'polka', 
            icon: 'fa-mountain', 
            title: 'القميص المنقط', 
            subtitle: 'ملك الجبال',
            rider: 'قيد التحديث'
        },
        { 
            class: 'white', 
            icon: 'fa-star', 
            title: 'القميص الأبيض', 
            subtitle: 'أفضل شاب',
            rider: 'قيد التحديث'
        }
    ];
    
    container.innerHTML = jerseys.map(j => `
        <div class="jersey-card ${j.class}">
            <i class="fas ${j.icon}"></i>
            <h4>${j.title}</h4>
            <p>${j.subtitle}</p>
            <strong>${j.rider}</strong>
        </div>
    `).join('');
}

function updateTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    
    container.innerHTML = stagesData.map(stage => {
        const text = stage.text || '';
        const dateMatch = text.match(/(\d{2}\/\d{2})/);
        const date = dateMatch ? dateMatch[1] : '';
        
        return `
            <div class="stage-item" onclick="showStageDetails(${stage.stage_number})">
                <div class="stage-number">S${stage.stage_number}</div>
                <div class="stage-date">${date}</div>
                <div class="stage-route">${extractRoute(text)}</div>
            </div>
        `;
    }).join('');
}

function extractRoute(text) {
    const parts = text.split('\n')[0].split('|');
    if (parts.length > 1) {
        const route = parts[1].replace(/\d{2}\/\d{2}/, '').replace(/Find out more/g, '').trim();
        return route.length > 20 ? route.substring(0, 20) + '...' : route;
    }
    return '';
}

// ============ الرسوم البيانية ============
function createCharts() {
    createGapChart();
    createTeamsChart();
}

function createGapChart() {
    const ctx = document.getElementById('gapChart');
    if (!ctx) return;
    
    const top10 = gcData.slice(0, 10);
    const labels = top10.map(r => r.rider.trim());
    const gaps = top10.map(r => {
        if (!r.gap || r.gap.trim() === '-') return 0;
        return parseTimeToSeconds(r.gap);
    });
    
    if (charts.gap) charts.gap.destroy();
    
    charts.gap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'الفارق الزمني (ثواني)',
                data: gaps,
                backgroundColor: 'rgba(255, 204, 0, 0.7)',
                borderColor: 'rgba(255, 204, 0, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatSeconds(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatSeconds(value);
                        }
                    }
                }
            }
        }
    });
}

function createTeamsChart() {
    const ctx = document.getElementById('teamsChart');
    if (!ctx) return;
    
    const top10 = gcData.slice(0, 10);
    const teamsCount = {};
    
    top10.forEach(r => {
        const team = r.team.trim();
        teamsCount[team] = (teamsCount[team] || 0) + 1;
    });
    
    const labels = Object.keys(teamsCount);
    const data = Object.values(teamsCount);
    const colors = [
        '#ffcc00', '#2ecc71', '#e74c3c', '#3498db',
        '#9b59b6', '#f39c12', '#1abc9c', '#e67e22',
        '#34495e', '#16a085'
    ];
    
    if (charts.teams) charts.teams.destroy();
    
    charts.teams = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

// ============ قسم الترتيب العام ============
function updateGC() {
    const tbody = document.getElementById('gc-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = gcData.map((rider) => {
        const rank = parseInt(rider.rank);
        let rowClass = '';
        let rankClass = '';
        
        if (rank === 1) { rowClass = 'top-1'; rankClass = 'rank-1'; }
        else if (rank === 2) { rowClass = 'top-3'; rankClass = 'rank-2'; }
        else if (rank === 3) { rowClass = 'top-3'; rankClass = 'rank-3'; }
        
        return `
            <tr class="${rowClass}" data-rider="${rider.rider.toLowerCase()}" data-team="${rider.team.toLowerCase()}">
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td><strong>${rider.rider.trim()}</strong></td>
                <td>${rider.rider_no.trim()}</td>
                <td>${rider.team.trim()}</td>
                <td>${rider.time.trim()}</td>
                <td>${rider.gap.trim()}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('gc-search').addEventListener('input', filterGC);
    document.getElementById('gc-sort').addEventListener('change', sortGC);
    document.getElementById('export-gc').addEventListener('click', exportGC);
}

function filterGC() {
    const searchTerm = document.getElementById('gc-search').value.toLowerCase();
    const rows = document.querySelectorAll('#gc-tbody tr');
    
    rows.forEach(row => {
        const rider = row.dataset.rider || '';
        const team = row.dataset.team || '';
        
        if (rider.includes(searchTerm) || team.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function sortGC() {
    const sortBy = document.getElementById('gc-sort').value;
    const tbody = document.getElementById('gc-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let aVal, bVal;
        
        switch(sortBy) {
            case 'rank':
                aVal = parseInt(a.cells[0].textContent);
                bVal = parseInt(b.cells[0].textContent);
                break;
            case 'rider':
                aVal = a.cells[1].textContent;
                bVal = b.cells[1].textContent;
                return aVal.localeCompare(bVal);
            case 'team':
                aVal = a.cells[3].textContent;
                bVal = b.cells[3].textContent;
                return aVal.localeCompare(bVal);
            case 'time':
                aVal = parseTimeToSeconds(a.cells[4].textContent);
                bVal = parseTimeToSeconds(b.cells[4].textContent);
                break;
        }
        
        return aVal - bVal;
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

function exportGC() {
    let csv = 'الترتيب,الدراج,الرقم,الفريق,الزمن,الفارق\n';
    
    gcData.forEach(rider => {
        csv += `${rider.rank},${rider.rider},${rider.rider_no},${rider.team},${rider.time},${rider.gap}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tdf_general_classification_ar.csv';
    link.click();
}

// ============ قسم المراحل ============
function updateStages() {
    const grid = document.getElementById('stages-grid');
    if (!grid) return;
    
    grid.innerHTML = stagesData.map(stage => {
        const text = stage.text || '';
        const dateMatch = text.match(/(\d{2}\/\d{2})/);
        const date = dateMatch ? dateMatch[1] : '';
        const route = extractFullRoute(text);
        
        return `
            <div class="stage-card">
                <div class="stage-card-header">
                    <span class="stage-badge">المرحلة ${stage.stage_number}</span>
                    <span class="stage-date">
                        <i class="fas fa-calendar"></i> ${date}
                    </span>
                </div>
                <div class="stage-route">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${route}</span>
                </div>
            </div>
        `;
    }).join('');
}

function extractFullRoute(text) {
    const parts = text.split('|');
    if (parts.length > 1) {
        return parts[1].replace(/\d{2}\/\d{2}/, '').replace(/Find out more/g, '').trim();
    }
    return text;
}

// ============ قسم نتائج المراحل ============
function updateStageResults() {
    const select = document.getElementById('stage-select');
    if (!select) return;
    
    // إنشاء قائمة المراحل
    let options = '';
    for (let i = 1; i <= stagesData.length; i++) {
        options += `<option value="${i}">المرحلة ${i}</option>`;
    }
    select.innerHTML = options;
    
    select.addEventListener('change', (e) => {
        displayStageResults(parseInt(e.target.value));
    });
    
    displayStageResults(1);
}

function displayStageResults(stageNumber) {
    const tbody = document.getElementById('stage-results-tbody');
    if (!tbody) return;
    
    // حالياً لدينا فقط بيانات المرحلة الأولى
    if (stageNumber === 1 && stage1Data.length > 0) {
        tbody.innerHTML = stage1Data.map(rider => {
            const rank = parseInt(rider.rank);
            let rankClass = '';
            
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';
            
            return `
                <tr>
                    <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                    <td><strong>${rider.rider.trim()}</strong></td>
                    <td>${rider.team.trim()}</td>
                    <td>-</td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--text-muted);"></i>
                    <p>بيانات هذه المرحلة غير متوفرة حالياً</p>
                </td>
            </tr>
        `;
    }
}

// ============ التنقل ============
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            const sectionId = link.dataset.section;
            document.getElementById(sectionId).classList.add('active');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ============ الوضع الداكن ============
function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ============ زر العودة للأعلى ============
function initializeScrollTop() {
    const scrollBtn = document.getElementById('scroll-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============ دوال مساعدة ============
function parseTimeToSeconds(timeStr) {
    if (!timeStr || timeStr === '-') return 0;
    
    const match = timeStr.match(/(\d+)h\s*(\d+)'\s*(\d+)''/);
    if (!match) return 0;
    
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

function formatSeconds(seconds) {
    if (seconds === 0) return '0s';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    let result = '';
    if (h > 0) result += `${h}h `;
    if (m > 0) result += `${m}m `;
    if (s > 0 || result === '') result += `${s}s`;
    
    return result;
}

function showStageDetails(stageNumber) {
    document.querySelector('[data-section="stage-results"]').click();
    document.getElementById('stage-select').value = stageNumber;
    displayStageResults(stageNumber);
}

function showError(message) {
    const main = document.querySelector('main');
    main.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #e74c3c;"></i>
            <h2>حدث خطأ</h2>
            <p>${message}</p>
        </div>
    `;
}
