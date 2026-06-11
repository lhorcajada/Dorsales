import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface FinalAssignmentRow {
  dorsalNumber: number;
  childName: string;
}

function formatDorsal(number: number) {
  return number.toString().padStart(2, '0');
}

function buildFileName() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);

  return `asignaciones-dorsales-${datePart}.pdf`;
}

function scaleValue(value: number, sourceMin: number, sourceMax: number, targetMin: number, targetMax: number) {
  return targetMin + ((value - sourceMin) / (sourceMax - sourceMin)) * (targetMax - targetMin);
}

function drawWebJersey(pdf: jsPDF, x: number, y: number, size: number, dorsalNumber: number) {
  const left = x;
  const top = y;
  const right = x + size;
  const bottom = y + size;

  const mapX = (svgX: number) => scaleValue(svgX, 12, 60, left, right);
  const mapY = (svgY: number) => scaleValue(svgY, 16, 54, top, bottom);

  // Shirt silhouette copied from DorsalAvatar SVG path.
  pdf.setFillColor(21, 55, 175);
  pdf.setDrawColor(41, 54, 94);
  pdf.setLineWidth(1);
  pdf.path([
    { op: 'm', c: [mapX(22), mapY(16)] },
    { op: 'l', c: [mapX(12), mapY(24)] },
    { op: 'l', c: [mapX(18), mapY(35)] },
    { op: 'l', c: [mapX(24), mapY(31)] },
    { op: 'l', c: [mapX(24), mapY(54)] },
    { op: 'l', c: [mapX(48), mapY(54)] },
    { op: 'l', c: [mapX(48), mapY(31)] },
    { op: 'l', c: [mapX(54), mapY(35)] },
    { op: 'l', c: [mapX(60), mapY(24)] },
    { op: 'l', c: [mapX(50), mapY(16)] },
    { op: 'l', c: [mapX(42), mapY(20)] },
    { op: 'l', c: [mapX(36), mapY(14)] },
    { op: 'l', c: [mapX(30), mapY(20)] },
    { op: 'h', c: [] },
  ]);
  pdf.fillStroke();

  // Neck trim copied from DorsalAvatar SVG path: M28 16 c... s...
  pdf.setDrawColor(243, 183, 27);
  pdf.setLineWidth(1.4);
  pdf.path([
    { op: 'm', c: [mapX(28), mapY(16)] },
    { op: 'c', c: [mapX(30.5), mapY(19.8), mapX(33.3), mapY(21.8), mapX(36), mapY(21.8)] },
    { op: 'c', c: [mapX(38.7), mapY(21.8), mapX(41.5), mapY(19.8), mapX(44), mapY(16)] },
  ]);
  pdf.stroke();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(248, 250, 252);
  pdf.text(formatDorsal(dorsalNumber), left + size / 2, top + size * 0.6, {
    align: 'center',
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
}

export function downloadAssignmentsPdf(assignments: FinalAssignmentRow[]) {
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const sortedAssignments = [...assignments].sort((left, right) => left.dorsalNumber - right.dorsalNumber);
  const totalPlayers = sortedAssignments.length;

  pdf.setFontSize(16);
  pdf.text('Listado final de dorsales asignados', 40, 48);
  pdf.setFontSize(10);
  pdf.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, 66);
  pdf.text(`Total de jugadores: ${totalPlayers}`, 40, 80);

  autoTable(pdf, {
    startY: 96,
    head: [['Jugador', 'Camiseta']],
    body: sortedAssignments.map((assignment) => [
      assignment.childName,
      '',
    ]),
    styles: {
      fontSize: 10,
      cellPadding: 6,
      valign: 'middle',
      minCellHeight: 46,
    },
    headStyles: {
      fillColor: [19, 56, 108],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 368 },
      1: { halign: 'center', cellWidth: 112 },
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) {
        return;
      }

      const row = sortedAssignments[data.row.index];

      if (!row) {
        return;
      }

      const shirtSize = Math.min(data.cell.width - 18, data.cell.height - 10);
      const shirtX = data.cell.x + (data.cell.width - shirtSize) / 2;
      const shirtY = data.cell.y + (data.cell.height - shirtSize) / 2;

      drawWebJersey(pdf, shirtX, shirtY, shirtSize, row.dorsalNumber);
    },
  });

  pdf.save(buildFileName());
}