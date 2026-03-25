import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

interface Mensaje {
  role: string;
  content: string;
  orden: number;
}

interface SesionData {
  empresa: string;
  giro: string;
  monto?: string | null;
  bien?: string | null;
  contacto?: string | null;
  correo_ejecutivo: string;
  created_at: string;
  completed_at?: string | null;
  resumen: string;
}

export async function generateWordBuffer(
  sesion: SesionData,
  mensajes: Mensaje[],
  resumen: string
): Promise<Buffer> {
  const fecha = new Date(sesion.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          // Portada
          new Paragraph({ spacing: { after: 600 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'CASOFIN',
                bold: true,
                size: 56,
                color: '1a365d',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Arrendadora Financiera',
                size: 28,
                color: '4a5568',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 3, color: '1a365d' },
            },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'REPORTE DE ENTREVISTA DE CRÉDITO',
                bold: true,
                size: 36,
                color: '2d3748',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: sesion.empresa.toUpperCase(),
                bold: true,
                size: 32,
                color: '1a365d',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: fecha,
                size: 24,
                color: '718096',
                font: 'Calibri',
              }),
            ],
          }),

          // Datos Generales
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: '1. DATOS GENERALES',
                bold: true,
                size: 28,
                color: '1a365d',
                font: 'Calibri',
              }),
            ],
          }),
          createDataRow('Empresa:', sesion.empresa),
          createDataRow('Giro:', sesion.giro),
          createDataRow('Monto solicitado:', sesion.monto || 'No especificado'),
          createDataRow('Bien a arrendar:', sesion.bien || 'No especificado'),
          createDataRow('Contacto:', sesion.contacto || 'No especificado'),
          createDataRow('Ejecutivo:', sesion.correo_ejecutivo),
          createDataRow('Fecha de entrevista:', fecha),

          // Resumen Ejecutivo
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: '2. RESUMEN EJECUTIVO',
                bold: true,
                size: 28,
                color: '1a365d',
                font: 'Calibri',
              }),
            ],
          }),
          ...resumen.split('\n').filter(Boolean).map(
            (line) =>
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: line,
                    size: 22,
                    font: 'Calibri',
                  }),
                ],
              })
          ),

          // Q&A
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: '3. PREGUNTAS Y RESPUESTAS',
                bold: true,
                size: 28,
                color: '1a365d',
                font: 'Calibri',
              }),
            ],
          }),
          ...mensajes.flatMap((msg) => {
            const isAssistant = msg.role === 'assistant';
            const label = isAssistant ? 'Analista CASOFIN:' : 'Prospecto:';
            const color = isAssistant ? '1a365d' : '2d3748';

            return [
              new Paragraph({
                spacing: { before: isAssistant ? 200 : 80, after: 40 },
                children: [
                  new TextRun({
                    text: label,
                    bold: true,
                    size: 22,
                    color,
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 80 },
                indent: { left: 360 },
                children: [
                  new TextRun({
                    text: msg.content.replace('ENTREVISTA_COMPLETADA', '').trim(),
                    size: 22,
                    font: 'Calibri',
                    italics: !isAssistant,
                  }),
                ],
              }),
            ];
          }),

          // Pie
          new Paragraph({ spacing: { before: 600 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: {
              top: { style: BorderStyle.SINGLE, size: 3, color: '1a365d' },
            },
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: 'Documento generado automáticamente por el sistema de entrevistas CASOFIN',
                size: 18,
                color: 'a0aec0',
                font: 'Calibri',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

function createDataRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: `${label} `,
        bold: true,
        size: 22,
        font: 'Calibri',
        color: '4a5568',
      }),
      new TextRun({
        text: value,
        size: 22,
        font: 'Calibri',
      }),
    ],
  });
}
