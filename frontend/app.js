let medicamentoActual = null;

// Función para limpiar prefijos repetidos en una lista de ítems
function limpiarPrefijosRepetidos(items) {
    if (!items || items.length === 0) return items;
    
    // Detectar prefijo común (ej: "dolor de" que se repite)
    let prefijoComun = '';
    let primerItem = items[0];
    
    // Buscar prefijos comunes como "dolor de", "fiebre", "tos", etc.
    const prefijosPosibles = [
        'dolor de ', 'dolor ', 'fiebre ', 'tos ', 'congestión ', 
        'inflamación ', 'calambre ', 'malestar ', 'náuseas ', 
        'vómito ', 'para ', 'debido a ', 'aliviar '
    ];
    
    for (let prefijo of prefijosPosibles) {
        if (primerItem.toLowerCase().startsWith(prefijo)) {
            // Verificar si TODOS los items comienzan con el mismo prefijo
            let todosTienenPrefijo = items.every(item => 
                item.toLowerCase().startsWith(prefijo)
            );
            if (todosTienenPrefijo) {
                prefijoComun = prefijo;
                break;
            }
        }
    }
    
    if (prefijoComun) {
        // Eliminar el prefijo común de todos los items
        items = items.map(item => {
            let nuevo = item.substring(prefijoComun.length).trim();
            // Capitalizar primera letra
            if (nuevo.length > 0) {
                nuevo = nuevo.charAt(0).toUpperCase() + nuevo.slice(1);
            }
            return nuevo;
        });
    }
    
    // Eliminar duplicados exactos
    items = [...new Set(items)];
    
    return items;
}

// Función para detectar si un texto es una lista
function esListaDeSintomas(texto) {
    if (!texto) return false;
    
    const numeroDeComas = (texto.match(/,/g) || []).length;
    const tienePalabrasDeLista = /dolor de|fiebre|náuseas|vómito|tos|congestión|inflamación|calambre|malestar/i.test(texto);
    
    if (numeroDeComas >= 2 && tienePalabrasDeLista) return true;
    if (numeroDeComas >= 3) return true;
    if (texto.length < 200 && numeroDeComas >= 2) return true;
    
    return false;
}

// Función para extraer ítems de una lista y limpiar repetidos
function extraerItemsDeListaLimpia(texto) {
    // Dividir por comas
    let items = texto.split(/,/);
    
    // Limpiar cada item
    items = items.map(item => {
        return item.trim()
            .replace(/^y\s+/, '')
            .replace(/^\.\s*/, '')
            .replace(/\s+y\s*$/, '')
            .replace(/\.$/, '')
            .trim();
    }).filter(item => item.length > 0 && item.length < 100);
    
    // Limpiar prefijos repetidos
    items = limpiarPrefijosRepetidos(items);
    
    return items;
}

// Función para formatear indicaciones en la WEB
function formatearIndicacionesWeb(texto) {
    if (!texto || texto === '') return 'No disponible';
    
    if (esListaDeSintomas(texto)) {
        const items = extraerItemsDeListaLimpia(texto);
        
        if (items.length >= 2) {
            let html = '<ul class="lista-sintomas">';
            items.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
            return html;
        }
    }
    
    // No es lista → texto normal con párrafos
    if (texto.includes('.') && texto.length > 80) {
        const parrafos = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜ])/);
        let html = '';
        parrafos.forEach(parrafo => {
            if (parrafo.trim()) {
                html += `<p class="parrafo-separado">${parrafo.trim()}</p>`;
            }
        });
        return html;
    }
    
    return `<p>${texto}</p>`;
}

// Función para formatear texto normal (advertencias)
function formatearTextoNormal(texto) {
    if (!texto || texto === '') return 'No disponible';
    
    if (texto.includes('.') && texto.length > 80) {
        const parrafos = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜ])/);
        let html = '';
        parrafos.forEach(parrafo => {
            if (parrafo.trim()) {
                html += `<p class="parrafo-separado">${parrafo.trim()}</p>`;
            }
        });
        return html;
    }
    
    return `<p>${texto}</p>`;
}

// Función para formatear interacciones
function formatearInteraccionesWeb(interacciones) {
    if (!interacciones || interacciones.length === 0) {
        return '<p>No se reportan interacciones relevantes</p>';
    }
    
    let html = '<div class="lista-interacciones">';
    interacciones.slice(0, 8).forEach(interaccion => {
        html += `<div class="interaccion-item"><i class="fas fa-exclamation-triangle"></i> ${interaccion}</div>`;
    });
    html += '</div>';
    return html;
}

async function buscarMedicamento() {

    const nombre = document.getElementById("medicamento").value.trim();

    if (!nombre) {
        alert("Escribe un medicamento");
        return;
    }

    const resultadoDiv = document.getElementById("resultado");
    resultadoDiv.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-circle-notch"></i> Consultando información...
        </div>
    `;

    try {

        const respuesta = await fetch(
            `https://mediconsulta.onrender.com/medicamento/${nombre}`
        );

        const data = await respuesta.json();

        medicamentoActual = data;

        if (data.mensaje) {
            document.getElementById("resultado").innerHTML =
                `<h3 class="error-mensaje"><i class="fas fa-info-circle"></i> ${data.mensaje}</h3>`;
            document.getElementById("btnPDF").style.display = "none";
            return;
        }

        document.getElementById("btnPDF").style.display = "block";

        const indicacionesFormateadas = formatearIndicacionesWeb(data.indicaciones);
        const advertenciasFormateadas = formatearTextoNormal(data.advertencias);
        const interaccionesFormateadas = formatearInteraccionesWeb(data.interacciones);

        document.getElementById("resultado").innerHTML = `
            <div class="resultado-card-interno">
                <h2><i class="fas fa-capsules"></i> ${data.nombre}</h2>

                <div class="info-marca">
                    <i class="fas fa-trademark"></i> <strong>Marca:</strong> ${data.marca}
                </div>

                <div class="seccion">
                    <div class="seccion-titulo">
                        <i class="fas fa-stethoscope"></i> Indicaciones
                    </div>
                    <div class="seccion-contenido">
                        ${indicacionesFormateadas}
                    </div>
                </div>

                <div class="seccion">
                    <div class="seccion-titulo">
                        <i class="fas fa-exclamation-triangle"></i> Advertencias
                    </div>
                    <div class="seccion-contenido">
                        ${advertenciasFormateadas}
                    </div>
                </div>

                <div class="seccion">
                    <div class="seccion-titulo">
                        <i class="fas fa-handshake"></i> Interacciones relevantes
                    </div>
                    <div class="seccion-contenido">
                        ${interaccionesFormateadas}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {

        console.error(error);

        document.getElementById("resultado").innerHTML = `
            <h3 class="error-mensaje">
                <i class="fas fa-server"></i> Error al consultar el medicamento
                <br><small>¿El servidor backend está corriendo en https://mediconsulta.onrender.com?</small>
            </h3>
        `;
        
        document.getElementById("btnPDF").style.display = "none";
    }
}

// ========== FUNCIONES PARA EL PDF ==========

function esListaDeSintomasPDF(texto) {
    if (!texto) return false;
    const numeroDeComas = (texto.match(/,/g) || []).length;
    const tienePalabrasDeLista = /dolor de|fiebre|náuseas|vómito|tos|congestión|inflamación|calambre|malestar/i.test(texto);
    
    if (numeroDeComas >= 2 && tienePalabrasDeLista) return true;
    if (numeroDeComas >= 3) return true;
    if (texto.length < 200 && numeroDeComas >= 2) return true;
    
    return false;
}

function extraerItemsDeListaLimpiaPDF(texto) {
    let items = texto.split(/,/);
    
    items = items.map(item => {
        return item.trim()
            .replace(/^y\s+/, '')
            .replace(/^\.\s*/, '')
            .replace(/\s+y\s*$/, '')
            .replace(/\.$/, '')
            .trim();
    }).filter(item => item.length > 0 && item.length < 100);
    
    // Limpiar prefijos repetidos
    items = limpiarPrefijosRepetidos(items);
    
    return items;
}

function limpiarPrefijosRepetidosPDF(items) {
    if (!items || items.length === 0) return items;
    
    const prefijosPosibles = [
        'dolor de ', 'dolor ', 'fiebre ', 'tos ', 'congestión ', 
        'inflamación ', 'calambre ', 'malestar ', 'náuseas ', 
        'vómito ', 'para ', 'debido a ', 'aliviar '
    ];
    
    let prefijoComun = '';
    let primerItem = items[0];
    
    for (let prefijo of prefijosPosibles) {
        if (primerItem.toLowerCase().startsWith(prefijo)) {
            let todosTienenPrefijo = items.every(item => 
                item.toLowerCase().startsWith(prefijo)
            );
            if (todosTienenPrefijo) {
                prefijoComun = prefijo;
                break;
            }
        }
    }
    
    if (prefijoComun) {
        items = items.map(item => {
            let nuevo = item.substring(prefijoComun.length).trim();
            if (nuevo.length > 0) {
                nuevo = nuevo.charAt(0).toUpperCase() + nuevo.slice(1);
            }
            return nuevo;
        });
    }
    
    items = [...new Set(items)];
    return items;
}

function dividirTextoNormalPDF(texto) {
    if (!texto || texto === '') return ['No disponible'];
    const parrafos = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜ])/);
    return parrafos.filter(p => p.trim().length > 0).map(p => p.trim());
}

function generarPDF() {

    if (!medicamentoActual) {
        alert("Busca un medicamento primero");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
    });

    const colorPrincipal = [31, 72, 112];
    const colorSecundario = [44, 125, 160];
    const colorTexto = [50, 50, 70];
    const colorGrisClaro = [245, 248, 250];
    
    // CABECERA
    doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('FOLLETO INFORMATIVO', 105, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Informacion para el paciente', 105, 34, { align: 'center' });
    
    // NOMBRE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
    doc.text(medicamentoActual.nombre, 105, 58, { align: 'center' });
    
    doc.setDrawColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
    doc.setLineWidth(0.5);
    doc.line(50, 65, 160, 65);
    
    // MARCA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
    doc.text('Marca comercial:', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 100);
    doc.text(medicamentoActual.marca || 'No especificada', 65, 80);
    
    let yPos = 100;
    const marginLeft = 20;
    const lineHeight = 5.5;
    
    function addSeccionIndicacionesPDF(titulo, contenido, startY) {
        if (!contenido || contenido === '') return startY;
        
        if (startY > 260) {
            doc.addPage();
            startY = 30;
            doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
            doc.rect(0, 0, 210, 25, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text('FOLLETO INFORMATIVO', 105, 15, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(medicamentoActual.nombre, 105, 22, { align: 'center' });
        }
        
        doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
        doc.roundedRect(marginLeft - 2, startY - 4, 170, 8, 2, 2, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
        doc.text(titulo, marginLeft, startY);
        
        let currentY = startY + 6;
        
        if (esListaDeSintomasPDF(contenido)) {
            const items = extraerItemsDeListaLimpiaPDF(contenido);
            
            if (items.length >= 2) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
                doc.text('Se usa para aliviar:', marginLeft, currentY);
                currentY += 5;
                
                for (let i = 0; i < items.length; i++) {
                    if (currentY > 275) {
                        doc.addPage();
                        currentY = 30;
                    }
                    
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
                    doc.text('•', marginLeft, currentY);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
                    const splitItem = doc.splitTextToSize(items[i], 165);
                    doc.text(splitItem, marginLeft + 5, currentY);
                    
                    currentY += (splitItem.length * lineHeight) + 1.5;
                }
                return currentY + 5;
            }
        }
        
        // Texto normal
        const parrafos = dividirTextoNormalPDF(contenido);
        for (let i = 0; i < parrafos.length; i++) {
            if (currentY > 275) {
                doc.addPage();
                currentY = 30;
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
            const splitText = doc.splitTextToSize(parrafos[i], 170);
            doc.text(splitText, marginLeft, currentY);
            currentY += (splitText.length * lineHeight) + 2;
        }
        
        return currentY + 5;
    }
    
    function addSeccionNormalPDF(titulo, contenido, startY) {
        if (!contenido || contenido === '') return startY;
        
        if (startY > 260) {
            doc.addPage();
            startY = 30;
        }
        
        doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
        doc.roundedRect(marginLeft - 2, startY - 4, 170, 8, 2, 2, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
        doc.text(titulo, marginLeft, startY);
        
        let currentY = startY + 6;
        const parrafos = dividirTextoNormalPDF(contenido);
        
        for (let i = 0; i < parrafos.length; i++) {
            if (currentY > 275) {
                doc.addPage();
                currentY = 30;
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
            const splitText = doc.splitTextToSize(parrafos[i], 170);
            doc.text(splitText, marginLeft, currentY);
            currentY += (splitText.length * lineHeight) + 2;
        }
        
        return currentY + 5;
    }
    
    function addInteraccionesPDF(titulo, interacciones, startY) {
        if (!interacciones || interacciones.length === 0) {
            return addSeccionNormalPDF(titulo, 'No se reportan interacciones relevantes', startY);
        }
        
        if (startY > 260) {
            doc.addPage();
            startY = 30;
        }
        
        doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
        doc.roundedRect(marginLeft - 2, startY - 4, 170, 8, 2, 2, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
        doc.text(titulo, marginLeft, startY);
        
        let currentY = startY + 6;
        
        for (let i = 0; i < interacciones.length && i < 8; i++) {
            if (currentY > 275) {
                doc.addPage();
                currentY = 30;
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
            const splitText = doc.splitTextToSize(`- ${interacciones[i]}`, 170);
            doc.text(splitText, marginLeft, currentY);
            
            currentY += (splitText.length * lineHeight) + 1.5;
        }
        
        return currentY + 5;
    }
    
    yPos = addSeccionIndicacionesPDF('INDICACIONES', medicamentoActual.indicaciones, yPos);
    yPos = addSeccionNormalPDF('ADVERTENCIAS', medicamentoActual.advertencias, yPos);
    
    let interaccionesArray = [];
    if (medicamentoActual.interacciones) {
        interaccionesArray = Array.isArray(medicamentoActual.interacciones) 
            ? medicamentoActual.interacciones 
            : [medicamentoActual.interacciones];
    }
    yPos = addInteraccionesPDF('INTERACCIONES RELEVANTES', interaccionesArray, yPos);
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(180, 180, 200);
        doc.setLineWidth(0.3);
        doc.line(20, 285, 190, 285);
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text('Este folleto es informativo. Consulte siempre a su medico o farmaceutico.', 105, 292, { align: 'center' });
        
        const fechaActual = new Date().toLocaleDateString('es-ES');
        doc.text(`Generado por MediConsulta - ${fechaActual}`, 105, 298, { align: 'center' });
        doc.text(`Pagina ${i} de ${pageCount}`, 190, 292, { align: 'right' });
    }
    
    const nombreArchivo = `${medicamentoActual.nombre.replace(/\s/g, '_')}_folleto.pdf`;
    doc.save(nombreArchivo);
}