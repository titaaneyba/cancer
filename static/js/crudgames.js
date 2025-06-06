// Constantes para selectores y configuraciones
const SELECTORS = {
    loader: '#loader',
    table: '#tablaPacientes',
    addForm: '#formAgregar',
    editForm: '#formEditar',
    modals: {
        add: '#modalAgregar',
        edit: '#modalEditar'
    }
};

const API_ENDPOINTS = {
    patients: '/api/list_patients',
    filters: '/api/cancer_filters',
    addPatient: '/add/patient',
    updatePatient: '/upd/patient',
    deletePatient: '/del/patient'
};

// Configuración de DataTables
const TABLE_CONFIG = {
    responsive: true,
    language: {
        url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
    },
    columnDefs: [
        { targets: 0, visible: false }, // ID oculto
        { targets: -1, orderable: false, searchable: false } // Columna de acciones
    ]
};

$(document).ready(function () {
    initApplication();
});

function initApplication() {
    setupEventListeners();
    loadInitialData();
}

function setupEventListeners() {
    // Formulario agregar
    $(SELECTORS.addForm).on('submit', handleAddPatient);
    
    // Formulario editar
    $(SELECTORS.editForm).on('submit', handleEditPatient);
    
    // Delegación de eventos para botones dinámicos
    $(SELECTORS.table).on('click', '.btn-editar', handleEditClick);
    $(SELECTORS.table).on('click', '.btn-eliminar', handleDeleteClick);
}

async function loadInitialData() {
    try {
        showLoader();
        await loadPatients();
        await loadFormOptions();
    } catch (error) {
        showToast('❌ Error al cargar datos iniciales', 'danger');
        console.error("Error inicial:", error);
    } finally {
        hideLoader();
    }
}

// Carga de pacientes con paginación
async function loadPatients(filters = {}) {
    try {
        const response = await $.ajax({
            url: API_ENDPOINTS.patients,
            method: "GET",
            data: filters,
            dataType: "json"
        });

        if ($.fn.DataTable.isDataTable(SELECTORS.table)) {
            $(SELECTORS.table).DataTable().clear().destroy();
        }

        renderTable(response);
    } catch (error) {
        throw error;
    }
}

function renderTable(data) {
    const tableData = data.map(patient => formatPatientData(patient));
    
    $(SELECTORS.table).DataTable({
        ...TABLE_CONFIG,
        data: tableData,
        columns: getTableColumns()
    });
}

function formatPatientData(patient) {
    return [
        patient.id,
        patient.patient_id,
        patient.age || 'N/A',
        patient.gender || 'N/A',
        patient.country_region || 'N/A',
        patient.cancer_type || 'N/A',
        patient.cancer_stage || 'N/A',
        patient.treatment_cost_usd ? formatCurrency(patient.treatment_cost_usd) : 'N/A',
        patient.survival_years ? formatYears(patient.survival_years) : 'N/A',
        patient.target_severity_score || 0,
        '' // Placeholder para acciones
    ];
}

function getTableColumns() {
    return [
        { title: "ID" },
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
            render: renderSeverityBar 
        },
        {
            title: "Acciones",
            className: "text-center",
            render: renderActionButtons
        }
    ];
}

function renderSeverityBar(data, type, row) {
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

function renderActionButtons(data, type, row) {
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

// Carga de opciones para formularios
async function loadFormOptions() {
    try {
        const response = await $.ajax({
            url: API_ENDPOINTS.filters,
            method: 'GET',
            dataType: 'json'
        });

        fillSelectOptions('#editarGender', response.genders);
        fillSelectOptions('#editarCountry', response.countries);
        fillSelectOptions('#editarCancerType', response.cancer_types);
        fillSelectOptions('#editarCancerStage', response.cancer_stages);

        fillSelectOptions('#addGender', response.genders);
        fillSelectOptions('#addCountry', response.countries);
        fillSelectOptions('#addCancerType', response.cancer_types);
        fillSelectOptions('#addCancerStage', response.cancer_stages);
    } catch (error) {
        throw error;
    }
}

function fillSelectOptions(selector, options) {
    const $select = $(selector).empty().append('<option value="">-- Seleccione --</option>');
    options.forEach(option => {
        $select.append(`<option value="${option}">${option}</option>`);
    });
}

// Manejadores de eventos
async function handleAddPatient(e) {
    e.preventDefault();
    
    try {
        const formData = getFormData(SELECTORS.addForm);
        await submitPatientData(API_ENDPOINTS.addPatient, 'POST', formData);
        
        $(SELECTORS.modals.add).modal('hide');
        $(SELECTORS.addForm)[0].reset();
        showToast('✅ Paciente agregado con éxito', 'success');
        await loadPatients();
    } catch (error) {
        showToast('❌ Error al agregar paciente', 'danger');
        console.error("Error al agregar:", error);
    }
}

async function handleEditPatient(e) {
    e.preventDefault();
    const patientId = $('#editarId').val();
    
    try {
        const formData = getFormData(SELECTORS.editForm);
        await submitPatientData(`${API_ENDPOINTS.updatePatient}/${patientId}`, 'PUT', formData);
        
        $(SELECTORS.modals.edit).modal('hide');
        showToast('✏️ Paciente actualizado', 'warning');
        await loadPatients();
    } catch (error) {
        showToast('❌ Error al actualizar paciente', 'danger');
        console.error("Error al editar:", error);
    }
}

function handleEditClick() {
    const $row = $(this).closest('tr');
    const rowData = $(SELECTORS.table).DataTable().row($row).data();
    
    // Llenar formulario de edición
    $('#editarId').val(rowData[0]);
    $('#editarPatientId').val(rowData[1]);
    $('#editarAge').val(rowData[2] === 'N/A' ? '' : rowData[2]);
    // ... completar con todos los campos
    
    $(SELECTORS.modals.edit).modal('show');
}

function handleDeleteClick() {
    const patientId = $(this).data('id');
    
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await $.ajax({
                    url: `${API_ENDPOINTS.deletePatient}/${patientId}`,
                    method: 'DELETE'
                });
                
                showToast('🗑️ Paciente eliminado', 'danger');
                await loadPatients();
            } catch (error) {
                const errorMsg = error.responseJSON?.error || 'Error al eliminar paciente';
                showToast(`❌ ${errorMsg}`, 'danger');
                console.error("Error al eliminar:", error);
            }
        }
    });
}

// Funciones auxiliares
function getFormData(formSelector) {
    const form = $(formSelector)[0];
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        // Convertir campos numéricos
        if (key.includes('age') || key.includes('year')) {
            data[key] = value ? parseInt(value) : null;
        } else if (key.includes('cost') || key.includes('years') || key.includes('score') || 
                   key.includes('pollution') || key.includes('use') || key.includes('smoking') || 
                   key.includes('level')) {
            data[key] = value ? parseFloat(value) : 0;
        } else {
            data[key] = value;
        }
    });
    
    return data;
}

async function submitPatientData(url, method, data) {
    return $.ajax({
        url: url,
        method: method,
        contentType: 'application/json',
        data: JSON.stringify(data)
    });
}

function formatCurrency(value) {
    return '$' + parseFloat(value).toFixed(2);
}

function formatYears(value) {
    return parseFloat(value).toFixed(1) + ' años';
}

function showLoader() {
    $(SELECTORS.loader).removeClass('d-none');
}

function hideLoader() {
    $(SELECTORS.loader).addClass('d-none');
}

function showToast(message, type = 'primary') {
    const toastEl = $('#toastNotificacion');
    const toastBody = $('#toastMensaje');

    toastEl.removeClass('bg-primary bg-success bg-danger bg-warning');
    toastEl.addClass(`bg-${type}`);
    toastBody.text(message);

    const toast = new bootstrap.Toast(toastEl[0]);
    toast.show();
}