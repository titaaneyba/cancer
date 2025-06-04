// Variables globales
let allData = [];
let filteredData = [];

$(document).ready(function () {
    // Configurar select2 para los filtros
    $('#filterGender, #filterCountry, #filterCancerType, #filterCancerStage').select2({
        placeholder: "Seleccionar...",
        allowClear: true,
        width: '100%',
        closeOnSelect: false,
        minimumResultsForSearch: 0,
        tags: false
    }).on('select2:select', function () {
        $(this).data('select2').$dropdown.find('.select2-search__field').focus();
    });

    // Prevención de reapertura al limpiar con la "X"
    $('#filterGender, #filterCountry, #filterCancerType, #filterCancerStage')
        .on('select2:unselecting', function (e) {
            $(this).data('prevent-open', true);
        })
        .on('select2:opening', function (e) {
            if ($(this).data('prevent-open')) {
                e.preventDefault();
                $(this).removeData('prevent-open');
            }
        });

    // Cargar datos iniciales
    $.ajax({
        url: "/api/cancer",
        method: "GET",
        dataType: "json",
        success: function (data) {
            allData = data;
            filteredData = allData;
            popularFiltros();
            actualizarStatsCards();
            renderGraficos(filteredData);
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar los datos:", error);
            mostrarToast('❌ Error al cargar datos de pacientes', 'danger');
        }
    });

    // Event listeners para filtros
    $('#filterGender, #filterCountry, #filterCancerType, #filterCancerStage').on('change', function () {
        aplicarFiltrosYGraficos();
    });

    $('#searchPatient').on('input', function () {
        aplicarFiltrosYGraficos();
    });

    // Botón para alternar tema claro/oscuro
    $('#toggleTheme').on('click', function () {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-bs-theme') === 'dark';
        html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
        this.innerHTML = isDark ? '<i class="fas fa-sun me-1"></i> Modo Claro' : '<i class="fas fa-moon me-1"></i> Modo Oscuro';
    });
});

function popularFiltros() {
    const params = {
        gender: $('#filterGender').val() || [],
        country: $('#filterCountry').val() || [],
        cancer_type: $('#filterCancerType').val() || [],
        cancer_stage: $('#filterCancerStage').val() || []
    };

    $.ajax({
        url: '/api/cancer_filters',
        method: 'GET',
        data: params,
        traditional: true,
        success: function (res) {
            actualizarCombo('#filterGender', res.genders, params.gender);
            actualizarCombo('#filterCountry', res.countries, params.country);
            actualizarCombo('#filterCancerType', res.cancer_types, params.cancer_type);
            actualizarCombo('#filterCancerStage', res.cancer_stages, params.cancer_stage);
        },
        error: function (err) {
            console.error("Error al cargar filtros:", err);
            mostrarToast('❌ Error al cargar opciones de filtro', 'danger');
        }
    });
}

function actualizarCombo(id, valores, valoresActuales) {
    const select = $(id);
    select.empty();
    valores.forEach(v => select.append(`<option value="${v}">${v}</option>`));
    select.val(valoresActuales);
    select.trigger('change.select2');
}

function aplicarFiltrosYGraficos() {
    const gender = $('#filterGender').val() || [];
    const country = $('#filterCountry').val() || [];
    const cancerType = $('#filterCancerType').val() || [];
    const cancerStage = $('#filterCancerStage').val() || [];
    const search = $('#searchPatient').val().toLowerCase();

    filteredData = allData.filter(d =>
        (gender.length === 0 || gender.includes(d.gender)) &&
        (country.length === 0 || country.includes(d.country_region)) &&
        (cancerType.length === 0 || cancerType.includes(d.cancer_type)) &&
        (cancerStage.length === 0 || cancerStage.includes(d.cancer_stage)) &&
        (!search || 
         (d.patient_id && d.patient_id.toLowerCase().includes(search)) ||
         (d.cancer_type && d.cancer_type.toLowerCase().includes(search)))
    );

    actualizarStatsCards();
    renderGraficos(filteredData);
}

function actualizarStatsCards() {
    const totalPacientes = filteredData.length;
    const avgSurvival = filteredData.reduce((sum, d) => sum + (d.survival_years || 0), 0) / (totalPacientes || 1);
    const avgTreatmentCost = filteredData.reduce((sum, d) => sum + (d.treatment_cost_usd || 0), 0) / (totalPacientes || 1);
    const avgSeverity = filteredData.reduce((sum, d) => sum + (d.target_severity_score || 0), 0) / (totalPacientes || 1);

    // Actualizar tarjetas de estadísticas
    $('#totalPatients').text(totalPacientes);
    $('#avgSurvival').text(avgSurvival.toFixed(1) + ' años');
    $('#avgTreatmentCost').text('$' + avgTreatmentCost.toFixed(0));
    $('#avgSeverity').text(avgSeverity.toFixed(1));

    // Actualizar colores según severidad
    const severityColor = avgSeverity > 6 ? 'danger' : avgSeverity > 3 ? 'warning' : 'success';
    $('#avgSeverityCard').removeClass('bg-success bg-warning bg-danger').addClass(`bg-${severityColor}`);
}

function renderGraficos(data) {
    // Destruir gráficos existentes
    ['distribucionCancer', 'distribucionEtapas', 'distribucionRegion', 
     'factoresRiesgo', 'edadPacientes', 'costoTratamiento', 
     'sobrevivenciaEdad', 'severidadGenero', 'tratamientoEtapa', 
     'sobrevivenciaSeveridad'].forEach(id => {
        Chart.getChart(id)?.destroy();
    });

    // Procesar datos para gráficos
    const cancerTypeCounts = {}, cancerStageCounts = {}, countryCounts = {};
    const riskFactors = { 
        'Contaminación': 0, 
        'Alcohol': 0, 
        'Tabaco': 0, 
        'Obesidad': 0 
    };
    const ageGroups = {
        '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81+': 0
    };
    const treatmentCostGroups = {
        '0-10k': 0, '10k-50k': 0, '50k-100k': 0, '100k-200k': 0, '200k+': 0
    };
    const survivalByAge = {};
    const severityByGender = { 'Male': 0, 'Female': 0, 'Other': 0 };
    const treatmentByStage = {};
    const survivalBySeverity = { '0-3': 0, '3-6': 0, '6-10': 0 };

    data.forEach(d => {
        // Conteo por tipo de cáncer
        cancerTypeCounts[d.cancer_type] = (cancerTypeCounts[d.cancer_type] || 0) + 1;
        
        // Conteo por etapa
        cancerStageCounts[d.cancer_stage] = (cancerStageCounts[d.cancer_stage] || 0) + 1;
        
        // Conteo por región
        countryCounts[d.country_region] = (countryCounts[d.country_region] || 0) + 1;
        
        // Factores de riesgo promedio
        riskFactors['Contaminación'] += d.air_pollution || 0;
        riskFactors['Alcohol'] += d.alcohol_use || 0;
        riskFactors['Tabaco'] += d.smoking || 0;
        riskFactors['Obesidad'] += d.obesity_level || 0;
        
        // Grupos de edad
        const age = d.age || 0;
        if (age <= 20) ageGroups['0-20']++;
        else if (age <= 40) ageGroups['21-40']++;
        else if (age <= 60) ageGroups['41-60']++;
        else if (age <= 80) ageGroups['61-80']++;
        else ageGroups['81+']++;
        
        // Grupos de costo de tratamiento
        const cost = d.treatment_cost_usd || 0;
        if (cost <= 10000) treatmentCostGroups['0-10k']++;
        else if (cost <= 50000) treatmentCostGroups['10k-50k']++;
        else if (cost <= 100000) treatmentCostGroups['50k-100k']++;
        else if (cost <= 200000) treatmentCostGroups['100k-200k']++;
        else treatmentCostGroups['200k+']++;
        
        // Sobrevivencia por edad
        const ageKey = Math.floor((d.age || 0) / 10) * 10;
        if (!survivalByAge[ageKey]) {
            survivalByAge[ageKey] = { sum: 0, count: 0 };
        }
        survivalByAge[ageKey].sum += d.survival_years || 0;
        survivalByAge[ageKey].count++;
        
        // Severidad por género
        severityByGender[d.gender] = (severityByGender[d.gender] || 0) + (d.target_severity_score || 0);
        
        // Tratamiento por etapa
        if (!treatmentByStage[d.cancer_stage]) {
            treatmentByStage[d.cancer_stage] = { sum: 0, count: 0 };
        }
        treatmentByStage[d.cancer_stage].sum += d.treatment_cost_usd || 0;
        treatmentByStage[d.cancer_stage].count++;
        
        // Sobrevivencia por severidad
        const severity = d.target_severity_score || 0;
        if (severity <= 3) survivalBySeverity['0-3'] += d.survival_years || 0;
        else if (severity <= 6) survivalBySeverity['3-6'] += d.survival_years || 0;
        else survivalBySeverity['6-10'] += d.survival_years || 0;
    });

    // Calcular promedios
    Object.keys(riskFactors).forEach(k => {
        riskFactors[k] = riskFactors[k] / (data.length || 1);
    });

    Object.keys(severityByGender).forEach(k => {
        const count = data.filter(d => d.gender === k).length;
        severityByGender[k] = count > 0 ? severityByGender[k] / count : 0;
    });

    const sortedAges = Object.keys(survivalByAge).sort((a, b) => a - b);
    const survivalByAgeData = sortedAges.map(age => {
        return survivalByAge[age].count > 0 ? 
            (survivalByAge[age].sum / survivalByAge[age].count).toFixed(1) : 0;
    });

    const treatmentByStageData = Object.keys(treatmentByStage).map(stage => {
        return treatmentByStage[stage].count > 0 ? 
            (treatmentByStage[stage].sum / treatmentByStage[stage].count).toFixed(0) : 0;
    });

    const survivalBySeverityData = [
        survivalBySeverity['0-3'] / (data.filter(d => (d.target_severity_score || 0) <= 3).length || 1),
        survivalBySeverity['3-6'] / (data.filter(d => (d.target_severity_score || 0) > 3 && (d.target_severity_score || 0) <= 6).length || 1),
        survivalBySeverity['6-10'] / (data.filter(d => (d.target_severity_score || 0) > 6).length || 1)
    ];

    // Gráfico 1: Distribución por tipo de cáncer (Doughnut)
    new Chart(document.getElementById('distribucionCancer'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cancerTypeCounts),
            datasets: [{
                data: Object.values(cancerTypeCounts),
                backgroundColor: [
                    '#6A5ACD', '#FFA500', '#4682B4', '#FF6384', '#FFCE56',
                    '#9966FF', '#4BC0C0', '#C9CBCF', '#8E44AD', '#F39C12'
                ],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Tipo de Cáncer',
                    font: { size: 16 }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico 2: Distribución por etapas (Bar)
    new Chart(document.getElementById('distribucionEtapas'), {
        type: 'bar',
        data: {
            labels: Object.keys(cancerStageCounts),
            datasets: [{
                label: 'Pacientes',
                data: Object.values(cancerStageCounts),
                backgroundColor: '#6A5ACD'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Pacientes por Etapa de Cáncer',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico 3: Distribución por región (Pie)
    const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

    new Chart(document.getElementById('distribucionRegion'), {
        type: 'pie',
        data: {
            labels: Object.keys(topCountries),
            datasets: [{
                data: Object.values(topCountries),
                backgroundColor: [
                    '#6A5ACD', '#FFA500', '#4682B4', '#FF6384', '#FFCE56',
                    '#9966FF', '#4BC0C0', '#C9CBCF', '#8E44AD', '#F39C12'
                ],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Países/Regiones',
                    font: { size: 16 }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico 4: Factores de riesgo (Radar)
    new Chart(document.getElementById('factoresRiesgo'), {
        type: 'radar',
        data: {
            labels: Object.keys(riskFactors),
            datasets: [{
                label: 'Nivel de Riesgo Promedio',
                data: Object.values(riskFactors),
                backgroundColor: 'rgba(106, 90, 205, 0.2)',
                borderColor: '#6A5ACD',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Factores de Riesgo Promedio',
                    font: { size: 16 }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 10
                }
            }
        }
    });

    // Gráfico 5: Distribución por edad (Bar)
    new Chart(document.getElementById('edadPacientes'), {
        type: 'bar',
        data: {
            labels: Object.keys(ageGroups),
            datasets: [{
                label: 'Pacientes',
                data: Object.values(ageGroups),
                backgroundColor: '#FFA500'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Grupos de Edad',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico 6: Costo de tratamiento (Bar)
    new Chart(document.getElementById('costoTratamiento'), {
        type: 'bar',
        data: {
            labels: Object.keys(treatmentCostGroups),
            datasets: [{
                label: 'Pacientes',
                data: Object.values(treatmentCostGroups),
                backgroundColor: '#4682B4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Costo de Tratamiento (USD)',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico 7: Sobrevivencia por edad (Line)
    new Chart(document.getElementById('sobrevivenciaEdad'), {
        type: 'line',
        data: {
            labels: sortedAges.map(age => `${age}-${parseInt(age)+9} años`),
            datasets: [{
                label: 'Años de Sobrevivencia Promedio',
                data: survivalByAgeData,
                fill: false,
                borderColor: '#FF6384',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sobrevivencia Promedio por Grupo de Edad',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Años de Sobrevivencia'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Grupo de Edad'
                    }
                }
            }
        }
    });

    // Gráfico 8: Severidad por género (Bar)
    new Chart(document.getElementById('severidadGenero'), {
        type: 'bar',
        data: {
            labels: Object.keys(severityByGender),
            datasets: [{
                label: 'Puntuación de Severidad Promedio',
                data: Object.values(severityByGender),
                backgroundColor: '#9966FF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Severidad Promedio por Género',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });

    // Gráfico 9: Costo de tratamiento por etapa (Bar)
    new Chart(document.getElementById('tratamientoEtapa'), {
        type: 'bar',
        data: {
            labels: Object.keys(treatmentByStage),
            datasets: [{
                label: 'Costo Promedio de Tratamiento (USD)',
                data: treatmentByStageData,
                backgroundColor: '#4BC0C0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Costo de Tratamiento por Etapa',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Costo (USD)'
                    }
                }
            }
        }
    });

    // Gráfico 10: Sobrevivencia por severidad (Bar)
    new Chart(document.getElementById('sobrevivenciaSeveridad'), {
        type: 'bar',
        data: {
            labels: ['Baja (0-3)', 'Media (3-6)', 'Alta (6-10)'],
            datasets: [{
                label: 'Años de Sobrevivencia Promedio',
                data: survivalBySeverityData,
                backgroundColor: ['#6A5ACD', '#FFA500', '#FF6384']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sobrevivencia Promedio por Nivel de Severidad',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Años de Sobrevivencia'
                    }
                }
            }
        }
    });
}

function mostrarToast(mensaje, tipo = 'primary') {
    const toastEl = $('#toastNotificacion');
    const toastBody = $('#toastMensaje');

    toastEl.removeClass('bg-primary bg-success bg-danger bg-warning');
    toastEl.addClass(`bg-${tipo}`);
    toastBody.text(mensaje);

    const toast = new bootstrap.Toast(toastEl[0]);
    toast.show();
}