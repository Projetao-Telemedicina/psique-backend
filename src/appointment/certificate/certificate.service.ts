import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface CertificateData {
  appointmentId: string;
  patientName: string;
  professionalName: string;
  professionalCrp: string;
  professionalSpecialty: string | null;
  startsAt: Date;
  endsAt: Date;
  completedAt: Date;
}

@Injectable()
export class CertificateService {
  async generateAttendanceCertificate(data: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#2D6A4F';
      const lightGray = '#F5F5F5';
      const darkGray = '#333333';
      const mediumGray = '#666666';

      const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'America/Sao_Paulo',
        });

      const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        });

      const durationMinutes = Math.round(
        (new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime()) /
          (1000 * 60),
      );

      const protocol = `PSIQUE-${data.appointmentId.split('-')[0].toUpperCase()}`;

      // ─── Cabeçalho ───────────────────────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('PSIQUE', 60, 30);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Plataforma de Telemedicina', 60, 56);

      doc
        .fontSize(10)
        .text(`Protocolo: ${protocol}`, 60, 72);

      // ─── Título ───────────────────────────────────────────────────────────────
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('COMPROVANTE DE COMPARECIMENTO', 60, 130, { align: 'center' });

      doc
        .moveTo(60, 158)
        .lineTo(doc.page.width - 60, 158)
        .strokeColor(primaryColor)
        .lineWidth(2)
        .stroke();

      // ─── Texto introdutório ───────────────────────────────────────────────────
      doc
        .fillColor(darkGray)
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Certificamos que a consulta psicológica abaixo identificada foi realizada com sucesso na plataforma Psique.`,
          60,
          175,
          { align: 'justify', width: doc.page.width - 120 },
        );

      // ─── Dados da Consulta ────────────────────────────────────────────────────
      const sectionTop = 230;

      doc
        .rect(60, sectionTop, doc.page.width - 120, 24)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('DADOS DA CONSULTA', 70, sectionTop + 6);

      const fields = [
        { label: 'Paciente', value: data.patientName },
        { label: 'Profissional', value: data.professionalName },
        { label: 'CRP', value: data.professionalCrp },
        {
          label: 'Especialidade',
          value: data.professionalSpecialty ?? 'Psicologia Clínica',
        },
        { label: 'Data da Consulta', value: formatDate(data.startsAt) },
        {
          label: 'Horário',
          value: `${formatTime(data.startsAt)} às ${formatTime(data.endsAt)}`,
        },
        { label: 'Duração', value: `${durationMinutes} minutos` },
        { label: 'Modalidade', value: 'Teleconsulta (Google Meet)' },
        { label: 'Status', value: 'Concluída' },
      ];

      let currentY = sectionTop + 34;

      fields.forEach((field, index) => {
        const bgColor = index % 2 === 0 ? lightGray : '#FFFFFF';

        doc
          .rect(60, currentY, doc.page.width - 120, 28)
          .fill(bgColor);

        doc
          .fillColor(mediumGray)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(field.label.toUpperCase(), 72, currentY + 5);

        doc
          .fillColor(darkGray)
          .fontSize(11)
          .font('Helvetica')
          .text(field.value, 72, currentY + 16);

        currentY += 28;
      });

      // ─── Borda da tabela ──────────────────────────────────────────────────────
      doc
        .rect(60, sectionTop, doc.page.width - 120, currentY - sectionTop)
        .strokeColor('#DDDDDD')
        .lineWidth(1)
        .stroke();

      // ─── Data de emissão ──────────────────────────────────────────────────────
      currentY += 24;

      doc
        .fillColor(mediumGray)
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Documento gerado em ${formatDate(data.completedAt)} às ${formatTime(data.completedAt)}`,
          60,
          currentY,
          { align: 'center' },
        );

      // ─── Rodapé ───────────────────────────────────────────────────────────────
      const footerTop = doc.page.height - 80;

      doc
        .moveTo(60, footerTop)
        .lineTo(doc.page.width - 60, footerTop)
        .strokeColor('#DDDDDD')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(mediumGray)
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Este documento é gerado automaticamente pela plataforma Psique e possui validade como comprovante de atendimento.',
          60,
          footerTop + 10,
          { align: 'center', width: doc.page.width - 120 },
        );

      doc
        .fontSize(8)
        .text(
          `ID da Consulta: ${data.appointmentId}`,
          60,
          footerTop + 32,
          { align: 'center' },
        );

      doc.end();
    });
  }
}