import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generarPDF = async (factura, detalles = []) => {
  try {
    // Validación de entrada
    if (!factura || !factura.numero) {
      throw new Error('Datos de factura inválidos: falta número de factura');
    }

    // Asegurar que detalles es un array
    const itemsFactura = Array.isArray(detalles) ? detalles : [];

    if (itemsFactura.length === 0) {
      console.warn('⚠️ Generando PDF sin items/detalles');
    }

    // Crear carpeta si no existe
    const carpetaFacturas = path.resolve("./backend/facturas");
    if (!fs.existsSync(carpetaFacturas)) {
      fs.mkdirSync(carpetaFacturas, { recursive: true });
    }

    // Nombre del archivo
    const fileName = `${factura.numero}.pdf`;
    const filePath = path.join(carpetaFacturas, fileName);

    // Crear el documento PDF
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      bufferPages: true
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Colores
    const colorPrimario = '#2563eb';
    const colorSecundario = '#1e40af';
    const colorTexto = '#1f2937';
    const colorGris = '#6b7280';

    // ========== ENCABEZADO ==========
    // Rectángulo superior azul
    doc.rect(0, 0, 612, 120).fill(colorPrimario);

    // Logo o nombre de empresa (lado izquierdo)
    doc.fontSize(24)
       .fillColor('#ffffff')
       .text('TU EMPRESA', 50, 40, { width: 300 });
    
    doc.fontSize(9)
       .fillColor('#e0e7ff')
       .text('RUC: 20123456789', 50, 70)
       .text('Av. Ejemplo 123, Lima - Perú', 50, 85)
       .text('Tel: (01) 234-5678', 50, 100);

    // FACTURA ELECTRÓNICA (lado derecho)
    doc.fontSize(22)
       .fillColor('#ffffff')
       .text('FACTURA ELECTRÓNICA', 320, 45, { align: 'right', width: 242 });
    
    doc.fontSize(16)
       .text(factura.numero, 320, 75, { align: 'right', width: 242 });

    // ========== INFORMACIÓN DEL CLIENTE ==========
    doc.fillColor(colorTexto);
    
    // Etiqueta "CLIENTE"
    doc.fontSize(11)
       .fillColor(colorSecundario)
       .text('DATOS DEL CLIENTE', 50, 150, { underline: true });

    // Datos del cliente
    doc.fontSize(10)
       .fillColor(colorTexto)
       .text(`Nombre/Razón Social:`, 50, 175, { continued: true })
       .font('Helvetica-Bold')
       .text(` ${factura.cliente_nombre || "—"}`)
       .font('Helvetica');

    doc.text(`Documento:`, 50, 192, { continued: true })
       .font('Helvetica-Bold')
       .text(` ${factura.cliente_documento || "—"}`)
       .font('Helvetica');

    const fechaEmision = new Date(factura.fecha_emision).toLocaleDateString("es-PE", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.text(`Fecha de Emisión:`, 50, 209, { continued: true })
       .font('Helvetica-Bold')
       .text(` ${fechaEmision}`)
       .font('Helvetica');

    // ========== TABLA DE DETALLES ==========
    let yPosition = 250;

    // Fondo del encabezado de tabla
    doc.rect(50, yPosition, 512, 25).fill('#f3f4f6');

    // Encabezados de tabla
    doc.fontSize(9)
       .fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .text('#', 60, yPosition + 8, { width: 25 })
       .text('DESCRIPCIÓN', 90, yPosition + 8, { width: 240 })
       .text('CANT.', 335, yPosition + 8, { width: 50, align: 'center' })
       .text('P. UNIT.', 390, yPosition + 8, { width: 70, align: 'right' })
       .text('SUBTOTAL', 465, yPosition + 8, { width: 80, align: 'right' });

    yPosition += 25;

    // Línea debajo del encabezado
    doc.strokeColor('#d1d5db')
       .lineWidth(1)
       .moveTo(50, yPosition)
       .lineTo(562, yPosition)
       .stroke();

    yPosition += 10;

    // Items
    doc.font('Helvetica')
       .fillColor(colorTexto)
       .fontSize(9);

    if (itemsFactura.length > 0) {
      itemsFactura.forEach((d, i) => {
        // Verificar si necesitamos nueva página
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const producto = d.producto || d.descripcion || "Item";
        const cantidad = d.cantidad || 1;
        const precioUnitario = Number(d.precio_unitario || 0).toFixed(2);
        const subtotal = Number(d.subtotal || 0).toFixed(2);

        // Alternar color de fondo para filas
        if (i % 2 === 0) {
          doc.rect(50, yPosition - 5, 512, 20).fill('#fafafa');
        }

        doc.fillColor(colorTexto)
           .text(`${i + 1}`, 60, yPosition, { width: 25 })
           .text(producto, 90, yPosition, { width: 240 })
           .text(`${cantidad}`, 335, yPosition, { width: 50, align: 'center' })
           .text(`S/ ${precioUnitario}`, 390, yPosition, { width: 70, align: 'right' })
           .text(`S/ ${subtotal}`, 465, yPosition, { width: 80, align: 'right' });

        yPosition += 20;
      });
    } else {
      doc.fillColor(colorGris)
         .text("Sin items registrados", 50, yPosition, { align: 'center', width: 512 });
      yPosition += 20;
    }

    // Línea superior del total
    yPosition += 10;
    doc.strokeColor('#d1d5db')
       .lineWidth(1)
       .moveTo(50, yPosition)
       .lineTo(562, yPosition)
       .stroke();

    // ========== TOTALES ==========
    yPosition += 20;

    // Cuadro de total
    doc.rect(380, yPosition, 182, 40).fill('#eff6ff');
    
    doc.fontSize(11)
       .fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .text('TOTAL:', 390, yPosition + 12, { width: 80 });

    doc.fontSize(16)
       .fillColor(colorPrimario)
       .text(`S/ ${Number(factura.total || 0).toFixed(2)}`, 390, yPosition + 12, { 
         width: 162, 
         align: 'right' 
       });

    // ========== PIE DE PÁGINA ==========
    const bottomY = 750;

    // Línea separadora
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, bottomY)
       .lineTo(562, bottomY)
       .stroke();

    // Texto legal
    doc.fontSize(7)
       .fillColor(colorGris)
       .font('Helvetica')
       .text(
         'Este documento ha sido generado electrónicamente y tiene validez legal según la normativa vigente.',
         50,
         bottomY + 10,
         { align: 'center', width: 512 }
       );

    doc.text(
      'Representación impresa de la Factura Electrónica',
      50,
      bottomY + 22,
      { align: 'center', width: 512 }
    );

    // Número de página (si hay múltiples páginas)
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7)
         .fillColor(colorGris)
         .text(
           `Página ${i + 1} de ${pages.count}`,
           50,
           bottomY + 35,
           { align: 'center', width: 512 }
         );
    }

    doc.end();

    await new Promise((resolve) => stream.on("finish", resolve));

    console.log(`✅ PDF generado exitosamente: ${filePath}`);
    return filePath;

  } catch (error) {
    console.error("❌ Error al generar PDF:", error);
    throw error;
  }
};