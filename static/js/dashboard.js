function renderGraficos(data) {
    // Destruir gráficos existentes antes de crear nuevos
    Object.keys(currentCharts).forEach(id => {
        if (currentCharts[id]) {
            currentCharts[id].destroy();
        }
    });
    currentCharts = {};

    // Inicializar estructuras de datos
    const cancerTypeCounts = {};
    const cancerStageCounts = {};
    const genderCounts = {};
    const countryCounts = {};
    const survivalByCancerType = {};

    // Procesar datos
    data.forEach(d => {
        if (d.cancer_type) {
            cancerTypeCounts[d.cancer_type] = (cancerTypeCounts[d.cancer_type] || 0) + 1;
        }
        if (d.cancer_stage) {
            cancerStageCounts[d.cancer_stage] = (cancerStageCounts[d.cancer_stage] || 0) + 1;
        }
        if (d.gender) {
            genderCounts[d.gender] = (genderCounts[d.gender] || 0) + 1;
        }
        if (d.country_region) {
            countryCounts[d.country_region] = (countryCounts[d.country_region] || 0) + 1;
        }
        if (d.cancer_type && typeof d.survival_years === 'number') {
            if (!survivalByCancerType[d.cancer_type]) {
                survivalByCancerType[d.cancer_type] = { totalYears: 0, count: 0 };
            }
            survivalByCancerType[d.cancer_type].totalYears += d.survival_years;
            survivalByCancerType[d.cancer_type].count += 1;
        }
    });

    // Calcular promedio de supervivencia por tipo de cáncer
    const avgSurvivalLabels = [];
    const avgSurvivalValues = [];
    Object.entries(survivalByCancerType).forEach(([key, val]) => {
        avgSurvivalLabels.push(key);
        avgSurvivalValues.push(val.count ? val.totalYears / val.count : 0);
    });

    // --- Crear gráficos ---
    const themeColor = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333';

    currentCharts.distribucionCancer = new Chart(document.getElementById('distribucionCancer'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cancerTypeCounts),
            datasets: [{
                data: Object.values(cancerTypeCounts),
                backgroundColor: ['#6A5ACD', '#FFA500', '#4682B4', '#FF6384', '#FFCE56'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Distribución por Tipo de Cáncer', color: themeColor },
                legend: { labels: { color: themeColor } }
            }
        }
    });

    currentCharts.distribucionEtapas = new Chart(document.getElementById('distribucionEtapas'), {
        type: 'bar',
        data: {
            labels: Object.keys(cancerStageCounts),
            datasets: [{ label: 'Pacientes', data: Object.values(cancerStageCounts), backgroundColor: '#6A5ACD' }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Pacientes por Etapa', color: themeColor } },
            scales: { y: { beginAtZero: true, ticks: { color: themeColor } }, x: { ticks: { color: themeColor } } }
        }
    });

    currentCharts.distribucionGenero = new Chart(document.getElementById('distribucionGenero'), {
        type: 'pie',
        data: {
            labels: Object.keys(genderCounts),
            datasets: [{ data: Object.values(genderCounts), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'] }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Distribución por Género', color: themeColor }, legend: { labels: { color: themeColor } } }
        }
    });

    currentCharts.pacientesPais = new Chart(document.getElementById('pacientesPais'), {
        type: 'bar',
        data: {
            labels: Object.keys(countryCounts),
            datasets: [{ label: 'Pacientes', data: Object.values(countryCounts), backgroundColor: '#36A2EB' }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { title: { display: true, text: 'Pacientes por País', color: themeColor } },
            scales: { x: { beginAtZero: true, ticks: { color: themeColor } }, y: { ticks: { color: themeColor } } }
        }
    });

    currentCharts.survivalPromedio = new Chart(document.getElementById('survivalPromedio'), {
        type: 'bar',
        data: {
            labels: avgSurvivalLabels,
            datasets: [{ label: 'Años promedio', data: avgSurvivalValues, backgroundColor: '#FFA500' }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Promedio de Supervivencia', color: themeColor } },
            scales: { y: { beginAtZero: true, ticks: { color: themeColor } }, x: { ticks: { color: themeColor } } }
        }
    });
}
