$(document).ready(function () {
    // Cargar datos iniciales
    cargarDatos();
    cargarOpcionesFormulario();
    
    // Configurar eventos
    configurarEventos();
});

function cargarDatos() {
    $('#loader').removeClass('d-none');
    $.ajax({
        url: "/api/list_patients",
        method: "GET",
        dataType: "json",
        success: function (data) {
            if ($.fn.DataTable.isDataTable('#tablaPacientes')) {
                $('#tablaPacientes').DataTable().clear().destroy();
            }
            cargarTabla(data);
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar los datos:", error);
            mostrarToast('❌ Error al cargar datos de pacientes', 'danger');
        },
        complete: function () {
            $('#loader').addClass('d-none');
        }
    });
}

function cargarTabla(data) {
    const cuerpo = data.map(d => [
        d.id,
        d.patient_id,
        d.age || 'N/A',
        d.gender || 'N/A',
        d.country_region || 'N/A',
        d.cancer_type || 'N/A',
        d.cancer_stage || 'N/A',
        d.treatment_cost_usd ? '$' + parseFloat(d.treatment_cost_usd).toFixed(2) : 'N/A',
        d.survival_years ? parseFloat(d.survival_years).toFixed(1) + ' años' : 'N/A',
        d.target_severity_score || 0
    ]);

    $('#tablaPacientes').DataTable({
        data: cuerpo,
        columns: [
            { title: "ID", visible: false },
            { title: "ID Paciente" },
            { title: "Edad" },
            { title: "Género" },
            { title: "País/Región" },
            { title: "Tipo Cáncer" },
            { title: "Etapa" },
            { title: "Costo Tratamiento", className: "text-end" },
            { title: "Sobrevivencia", className: "text-end" },
            { 
                title: "Severidad", 
                className: "text-center",
                render: function(data, type, row) {
                    const score = parseFloat(data) || 0;
                    const percentage = (score / 10) * 100;
                    let colorClass = 'bg-success';
                    if (score > 6) colorClass = 'bg-danger';
                    else if (score > 3) colorClass = 'bg-warning';
                    
                    return `
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar ${colorClass}" 
                                 role="progressbar" 
                                 style="width: ${percentage}%" 
                                 aria-valuenow="${score}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="10">
                                ${score.toFixed(1)}
                            </div>
                        </div>
                    `;
                }
            },
            {
                title: "Acciones",
                orderable: false,
                searchable: false,
                className: "text-center",
                render: function (data, type, row) {
                    const id = row[0];
                    return `
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-primary btn-editar me-1" data-id="${id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-eliminar" data-id="${id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>`;
                }
            }
        ],
        responsive: true,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
        }
    });
}

function cargarOpcionesFormulario() {
    $.ajax({
        url: '/api/cancer_filters',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            llenarCombo('#editarGender', data.genders);
            llenarCombo('#editarCountry', data.countries);
            llenarCombo('#editarCancerType', data.cancer_types);
            llenarCombo('#editarCancerStage', data.cancer_stages);

            llenarCombo('#addGender', data.genders);
            llenarCombo('#addCountry', data.countries);
            llenarCombo('#addCancerType', data.cancer_types);
            llenarCombo('#addCancerStage', data.cancer_stages);
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar opciones:", error);
            mostrarToast('❌ Error al cargar opciones de filtro', 'danger');
        }
    });
}

function llenarCombo(selector, valores) {
    const select = $(selector);
    select.empty();
    select.append('<option value="">-- Seleccione --</option>');
    valores.forEach(v => {
        select.append(`<option value="${v}">${v}</option>`);
    });
}

function configurarEventos() {
    // Agregar nuevo paciente
    $('#formAgregar').on('submit', function (e) {
        e.preventDefault();

        const datos = {
            patient_id: this.patient_id.value,
            age: parseInt(this.age.value) || null,
            gender: this.gender.value,
            country_region: this.country.value,
            year: parseInt(this.year.value) || null,
            genetic_risk: this.genetic_risk.value,
            air_pollution: parseFloat(this.air_pollution.value) || 0,
            alcohol_use: parseFloat(this.alcohol_use.value) || 0,
            smoking: parseFloat(this.smoking.value) || 0,
            obesity_level: parseFloat(this.obesity_level.value) || 0,
            cancer_type: this.cancer_type.value,
            cancer_stage: this.cancer_stage.value,
            treatment_cost_usd: parseFloat(this.treatment_cost.value) || 0,
            survival_years: parseFloat(this.survival_years.value) || 0,
            target_severity_score: parseFloat(this.severity_score.value) || 0
        };

        $.ajax({
            url: '/add/patient',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(datos),
            success: function (response) {
                $('#modalAgregar').modal('hide');
                $('#formAgregar')[0].reset();
                mostrarToast('✅ Paciente agregado con éxito', 'success');
                cargarDatos();
            },
            error: function (xhr, status, error) {
                console.error("Error al agregar paciente:", error);
                mostrarToast('❌ Error al agregar paciente', 'danger');
            }
        });
    });

    // Editar paciente
    $('#tablaPacientes').on('click', '.btn-editar', function () {
        const row = $(this).closest('tr');
        const data = $('#tablaPacientes').DataTable().row(row).data();
        
        $('#editarId').val(data[0]);
        $('#editarPatientId').val(data[1]);
        $('#editarAge').val(data[2] === 'N/A' ? '' : data[2]);
        $('#editarGender').val(data[3] === 'N/A' ? '' : data[3]);
        $('#editarCountry').val(data[4] === 'N/A' ? '' : data[4]);
        $('#editarCancerType').val(data[5] === 'N/A' ? '' : data[5]);
        $('#editarCancerStage').val(data[6] === 'N/A' ? '' : data[6]);
        $('#editarTreatmentCost').val(data[7].replace('$', '') === 'N/A' ? '' : data[7].replace('$', ''));
        $('#editarSurvivalYears').val(data[8].replace(' años', '') === 'N/A' ? '' : data[8].replace(' años', ''));
        $('#editarSeverityScore').val(data[9]);

        const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
        modal.show();
    });

    // Guardar cambios de edición
    $('#formEditar').on('submit', function (e) {
        e.preventDefault();
        const id = $('#editarId').val();

        const datos = {
            patient_id: $('#editarPatientId').val(),
            age: parseInt($('#editarAge').val()) || null,
            gender: $('#editarGender').val(),
            country_region: $('#editarCountry').val(),
            year: parseInt($('#editarYear').val()) || null,
            genetic_risk: $('#editarGeneticRisk').val(),
            air_pollution: parseFloat($('#editarAirPollution').val()) || 0,
            alcohol_use: parseFloat($('#editarAlcoholUse').val()) || 0,
            smoking: parseFloat($('#editarSmoking').val()) || 0,
            obesity_level: parseFloat($('#editarObesityLevel').val()) || 0,
            cancer_type: $('#editarCancerType').val(),
            cancer_stage: $('#editarCancerStage').val(),
            treatment_cost_usd: parseFloat($('#editarTreatmentCost').val()) || 0,
            survival_years: parseFloat($('#editarSurvivalYears').val()) || 0,
            target_severity_score: parseFloat($('#editarSeverityScore').val()) || 0
        };

        $.ajax({
            url: `/upd/patient/${id}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(datos),
            success: function () {
                $('#modalEditar').modal('hide');
                mostrarToast('✏️ Paciente actualizado', 'warning');
                cargarDatos();
            },
            error: function (xhr, status, error) {
                console.error("Error al actualizar paciente:", error);
                mostrarToast('❌ Error al actualizar paciente', 'danger');
            }
        });
    });

    // Eliminar paciente
    $('#tablaPacientes').on('click', '.btn-eliminar', function () {
        const id = $(this).data('id');
        
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `/del/patient/${id}`,
                    method: 'DELETE',
                    success: function () {
                        mostrarToast('🗑️ Paciente eliminado', 'danger');
                        cargarDatos();
                    },
                    error: function (xhr, status, error) {
                        console.error("Error al eliminar paciente:", error);
                        mostrarToast('❌ Error al eliminar paciente', 'danger');
                    }
                });
            }
        });
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