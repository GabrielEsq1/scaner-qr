// static/app.js - JavaScript para la aplicación CCB Promotores

/**
 * Normaliza un código OP a formato estándar
 * @param {string} op - Código OP a normalizar
 * @returns {string} OP normalizado
 */
function normalizeOP(op) {
    if (!op) return "";
    let normalized = op.toUpperCase().replace(/\s+/g, '').replace(/-/g, '').replace(/_/g, '');
    
    if (normalized.match(/^\d+$/)) {
        return "EX" + normalized;
    }
    
    if (!normalized.startsWith("EX") && normalized.match(/\d/)) {
        const digits = normalized.replace(/\D/g, '');
        return "EX" + digits;
    }
    
    return normalized;
}

/**
 * Muestra alertas al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta ('error' o 'success')
 */
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alert');
    if (!alertDiv) return;
    
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.classList.remove('hidden');
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        alertDiv.classList.add('hidden');
    }, 5000);
}

/**
 * Realiza búsqueda de OP en el servidor
 */
async function searchOP() {
    const opInput = document.getElementById('op-input');
    if (!opInput) return;
    
    const opValue = opInput.value.trim();
    
    if (!opValue) {
        showAlert('Por favor, ingrese un OP para buscar');
        return;
    }
    
    try {
        showAlert('Buscando...', 'success');
        
        const response = await fetch(`/api/promotores?op=${encodeURIComponent(opValue)}`);
        const data = await response.json();
        
        if (!data.ok) {
            showAlert(data.error);
            return;
        }
        
        displayResults(data.data.records);
        
        if (data.data.records.length === 0) {
            showAlert(`No se encontraron resultados para el OP: ${opValue}`);
        } else {
            showAlert(`Se encontraron ${data.data.records.length} resultado(s)`, 'success');
        }
    } catch (error) {
        console.error('Error en búsqueda:', error);
        showAlert('Error al conectar con el servidor');
    }
}

/**
 * Muestra los resultados en la tabla
 * @param {Array} results - Array de resultados
 */
function displayResults(results) {
    const resultsBody = document.getElementById('results-body');
    if (!resultsBody) return;
    
    resultsBody.innerHTML = '';
    
    if (results.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" style="text-align: center; padding: 2rem;">No se encontraron resultados</td>`;
        resultsBody.appendChild(row);
        return;
    }
    
    results.forEach(item => {
        const row = document.createElement('tr');
        
        // Crear botones para enlaces
        let enlaceButtons = '';
        if (item.enlace && item.enlace.trim() !== '') {
            const enlace = item.enlace.trim();
            enlaceButtons = `
                <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                    <a href="${enlace}" target="_blank" class="btn-link">Abrir</a>
                    <button class="btn-link" onclick="copyToClipboard('${enlace.replace(/'/g, "\\'")}')">Copiar</button>
                </div>
            `;
        }
        
        row.innerHTML = `
            <td><strong>${item.op || ''}</strong></td>
            <td>${item.cliente || ''}</td>
            <td>${item.nombre || ''}</td>
            <td>${item.descripcion || ''}</td>
            <td style="text-align: center;">${item.cantidad || ''}</td>
            <td style="text-align: center;">${item.talla || ''}</td>
            <td>${item.qr || ''}</td>
            <td>${enlaceButtons}</td>
        `;
        resultsBody.appendChild(row);
    });
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 */
function copyToClipboard(text) {
    // Crear un elemento temporal para copiar
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showAlert('Enlace copiado al portapapeles', 'success');
        } else {
            showAlert('Error al copiar el enlace');
        }
    } catch (err) {
        document.body.removeChild(textArea);
        
        // Fallback para navegadores modernos
        navigator.clipboard.writeText(text)
            .then(() => {
                showAlert('Enlace copiado al portapapeles', 'success');
            })
            .catch(clipboardErr => {
                console.error('Error al copiar:', clipboardErr);
                showAlert('Error al copiar el enlace');
            });
    }
}

/**
 * Abre/cierra el modal de QR
 */
function toggleQRModal() {
    const qrModal = document.getElementById('qr-modal');
    if (!qrModal) return;
    
    if (qrModal.open) {
        qrModal.close();
    } else {
        qrModal.showModal();
        initQRScanner();
    }
}

/**
 * Inicializa el escáner QR (versión simulada)
 */
function initQRScanner() {
    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) return;
    
    qrReader.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h4 style="margin-bottom: 1rem;">Escáner QR</h4>
            <div style="background: #000; width: 200px; height: 200px; margin: 0 auto 1rem; position: relative; border: 2px solid #333;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 2rem;">
                    📷
                </div>
            </div>
            <p style="margin-bottom: 1rem;">Para producción, integre una librería como:</p>
            <ul style="text-align: left; display: inline-block; margin-bottom: 1.5rem;">
                <li>jsQR</li>
                <li>QuaggaJS</li>
                <li>Html5Qrcode</li>
            </ul>
            <div>
                <button class="btn-link" onclick="simulateQRScan('EX-0785')" style="margin: 0.25rem;">
                    Simular EX-0785
                </button>
                <button class="btn-link" onclick="simulateQRScan('EX-0777')" style="margin: 0.25rem;">
                    Simular EX-0777
                </button>
            </div>
        </div>
    `;
}

/**
 * Simula el escaneo de un código QR
 * @param {string} opCode - Código OP a simular
 */
function simulateQRScan(opCode) {
    const opInput = document.getElementById('op-input');
    if (opInput) {
        opInput.value = opCode;
    }
    toggleQRModal();
    setTimeout(() => {
        searchOP();
    }, 500);
}

/**
 * Limpia la búsqueda actual
 */
function clearSearch() {
    const opInput = document.getElementById('op-input');
    if (opInput) {
        opInput.value = '';
    }
    
    const alertDiv = document.getElementById('alert');
    if (alertDiv) {
        alertDiv.classList.add('hidden');
    }
    
    displayResults([]);
}

/**
 * Exporta los resultados actuales a CSV
 */
function exportToExcel() {
    const table = document.getElementById('results-table');
    const resultsBody = document.getElementById('results-body');
    
    if (!table || !resultsBody) return;
    
    const rows = resultsBody.querySelectorAll('tr');
    
    // Verificar si hay una fila de "no resultados"
    if (rows.length === 1 && rows[0].querySelector('td[colspan="8"]')) {
        showAlert('No hay datos para exportar');
        return;
    }
    
    if (rows.length === 0) {
        showAlert('No hay datos para exportar');
        return;
    }
    
    let csv = [];
    
    // Encabezados
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(`"${th.textContent.trim()}"`);
    });
    csv.push(headers.join(','));
    
    // Datos
    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach((cell, index) => {
            // Excluir la columna de enlaces (última columna)
            if (index === 7) {
                rowData.push('""');
            } else {
                let text = cell.textContent.trim();
                // Escapar comillas para CSV
                text = text.replace(/"/g, '""');
                rowData.push(`"${text}"`);
            }
        });
        csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Crear URL y descargar
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `promotores_ccb_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Datos exportados correctamente', 'success');
}

/**
 * Inicializa la aplicación cuando el DOM está listo
 */
function initializeApp() {
    console.log('Inicializando aplicación CCB Promotores...');
    
    // Botón de búsqueda
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchOP);
    }
    
    // Enter en el input de búsqueda
    const opInput = document.getElementById('op-input');
    if (opInput) {
        opInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchOP();
            }
        });
        
        // Focus al cargar la página
        opInput.focus();
    }
    
    // Botón QR
    const qrBtn = document.getElementById('qr-btn');
    if (qrBtn) {
        qrBtn.addEventListener('click', toggleQRModal);
    }
    
    // Botón limpiar
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const qrModal = document.getElementById('qr-modal');
            if (qrModal && qrModal.open) {
                qrModal.close();
            }
        }
    });

    function openQRScanner() {
    // Abrir el lector QR en una nueva ventana/pestaña
    const qrWindow = window.open('/static/lectordeqr.html', 'qrScanner', 
        'width=600,height=700,scrollbars=no,resizable=yes');
    
    // Escuchar mensajes del lector QR
    window.addEventListener('message', function(event) {
        // Verificar que el mensaje viene del lector QR
        if (event.origin === window.location.origin || event.origin === 'null') {
            if (event.data && event.data.type === 'QR_RESULT') {
                const qrData = event.data.value;
                document.getElementById('op-input').value = qrData;
                searchOP(); // Buscar automáticamente
                
                // Cerrar la ventana del lector QR
                if (qrWindow && !qrWindow.closed) {
                    qrWindow.close();
                }
            }
        }
    });
    
    showAlert('Se abrirá el lector QR. Escanea el código y se cerrará automáticamente.', 'success');
}
    
    // Cerrar modal haciendo clic fuera
    const qrModal = document.getElementById('qr-modal');
    if (qrModal) {
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                qrModal.close();
            }
        });
    }
    
    // Mostrar estado del sistema al cargar
    checkSystemStatus();
    
    // Inicializar tabla vacía
    displayResults([]);
}

/**
 * Verifica el estado del sistema
 */
async function checkSystemStatus() {
    try {
        const response = await fetch('/healthz');
        const data = await response.json();
        
        if (data.ok) {
            console.log(`Sistema cargado: ${data.rows} registros disponibles`);
        } else {
            console.warn('Problema con la carga de datos:', data.error);
            showAlert(`Advertencia: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error verificando estado del sistema:', error);
    }
}

/**
 * Maneja errores globales de JavaScript
 */
function setupErrorHandling() {
    window.addEventListener('error', (e) => {
        console.error('Error global:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Promise rechazada:', e.reason);
        e.preventDefault();
    });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupErrorHandling();
        initializeApp();
    });
} else {
    setupErrorHandling();
    initializeApp();
}
// Función para subir imagen QR
document.getElementById('uploadQR').addEventListener('click', () => {
    document.getElementById('qrFileInput').click();
});

document.getElementById('qrFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        processQRImage(file);
    }
});

function processQRImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Usar jsQR para decodificar
            if (window.jsQR) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    document.getElementById('op-input').value = code.data;
                    closeQRModal();
                    searchOP();
                    showAlert('QR detectado: ' + code.data, 'success');
                } else {
                    showAlert('No se pudo detectar QR en la imagen');
                }
            } else {
                showAlert('Librería QR no disponible');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function closeQRModal() {
    const qrModal = document.getElementById('qrModal');
    qrModal.style.display = 'none';
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
}

// Hacer funciones disponibles globalmente
window.normalizeOP = normalizeOP;
window.showAlert = showAlert;
window.searchOP = searchOP;
window.displayResults = displayResults;
window.copyToClipboard = copyToClipboard;
window.toggleQRModal = toggleQRModal;
window.initQRScanner = initQRScanner;
window.simulateQRScan = simulateQRScan;
window.clearSearch = clearSearch;
window.exportToExcel = exportToExcel;