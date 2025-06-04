function renderGraficos(data) {
    // Destruir gráficos existentes
    Object.keys(currentCharts).forEach(id => {
        currentCharts[id]?.destroy();
    });
    currentCharts = {};

    // Procesar datos para gráficos

    // Conteo de tipos de cáncer
    const cancerTypeCounts = {};
    // Conteo de etapas de cáncer
    const cancerStageCounts = {};
    // Conteo de género
    const genderCounts = {};
    // Conteo de país/región
    const countryCounts = {};
    // Promedio de años de supervivencia por tipo de cáncer
    const survivalByCancerType = {};

    data.forEach(d => {
        // Conteo tipos de cáncer
        if (d.cancer_type) {
            cancerTypeCounts[d.cancer_type] = (cancerTypeCounts[d.cancer_type] || 0) + 1;
        }

        // Conteo etapas cáncer
        if (d.cancer_stage) {
            cancerStageCounts[d.cancer_stage] = (cancerStageCounts[d.cancer_stage] || 0) + 1;
        }

        // Conteo géneros
        if (d.gender) {
            genderCounts[d.gender] = (genderCounts[d.gender] || 0) + 1;
        }

        // Conteo países/regiones
        if (d.country_region) {
            countryCounts[d.country_region] = (countryCounts[d.country_region] || 0) + 1;
        }

        // Acumular supervivencia para promedio
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

    // 1. Distribución por Tipo de Cáncer (Doughnut)
    currentCharts.distribucionCancer = new Chart(document.getElementById('distribucionCancer'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cancerTypeCounts),
            datasets: [{
                data: Object.values(cancerTypeCounts),
                backgroundColor: [
                    '#6A5ACD', '#FFA500', '#4682B4', '#FF6384', '#FFCE56',
                    '#9966FF', '#4BC0C0', '#C9CBCF', '#8E44AD', '#F39C12'
                ],
                borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#444' : '#FFFFFF',
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
                    font: { size: 16 },
                    color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                },
                legend: {
                    position: 'right',
                    labels: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    }
                }
            }
        }
    });

    // 2. Pacientes por Etapa de Cáncer (Bar)
    currentCharts.distribucionEtapas = new Chart(document.getElementById('distribucionEtapas'), {
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
                    font: { size: 16 },
                    color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                },
                legend: {
                    labels: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });

    // 3. Distribución por Género (Pie)
    currentCharts.distribucionGenero = new Chart(document.getElementById('distribucionGenero'), {
        type: 'pie',
        data: {
            labels: Object.keys(genderCounts),
            datasets: [{
                data: Object.values(genderCounts),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#444' : '#FFFFFF',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Género',
                    font: { size: 16 },
                    color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    }
                }
            }
        }
    });

    // 4. Pacientes por País/Región (Horizontal Bar)
    currentCharts.pacientesPais = new Chart(document.getElementById('pacientesPais'), {
        type: 'bar',
        data: {
            labels: Object.keys(countryCounts),
            datasets: [{
                label: 'Pacientes',
                data: Object.values(countryCounts),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Pacientes por País/Región',
                    font: { size: 16 },
                    color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // 5. Promedio de Años de Supervivencia por Tipo de Cáncer (Bar)
    currentCharts.survivalPromedio = new Chart(document.getElementById('survivalPromedio'), {
        type: 'bar',
        data: {
            labels: avgSurvivalLabels,
            datasets: [{
                label: 'Años promedio de supervivencia',
                data: avgSurvivalValues,
                backgroundColor: '#FFA500'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Promedio de Supervivencia por Tipo de Cáncer',
                    font: { size: 16 },
                    color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#FFF' : '#333'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
