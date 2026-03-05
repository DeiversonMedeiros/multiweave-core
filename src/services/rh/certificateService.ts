import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO DE CERTIFICADOS
// =====================================================

export interface CertificateData {
  trainingId: string;
  employeeId: string;
  employeeName: string;
  trainingName: string;
  completionDate: string;
  certificateNumber: string;
  companyName: string;
  hours: number;
  score?: number;
}

/**
 * Gera um certificado em PDF usando jsPDF
 * TODO: Instalar jsPDF: npm install jspdf
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Blob> {
  // Por enquanto, retorna um HTML que pode ser convertido para PDF
  // Para implementação completa, seria necessário:
  // 1. npm install jspdf
  // 2. npm install html2canvas (para converter HTML em imagem)
  
  const html = generateCertificateHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  
  return blob;
}

/**
 * Gera HTML do certificado (pode ser convertido para PDF depois)
 */
function generateCertificateHTML(data: CertificateData): string {
  const { 
    employeeName, 
    trainingName, 
    completionDate, 
    certificateNumber,
    companyName,
    hours,
    score
  } = data;

  const formattedDate = new Date(completionDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificado - ${trainingName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    :root {
      --color-primary: #16a34a;
      --color-primary-dark: #15803d;
      --color-accent: #0f766e;
      --color-border: #e2e8f0;
      --color-border-strong: #cbd5f5;
      --color-text-main: #0f172a;
      --color-text-muted: #64748b;
      --color-surface: #ffffff;
      --color-background: #f1f5f9;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top left, rgba(22, 163, 74, 0.2), transparent 55%),
                  radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.18), transparent 55%),
                  var(--color-background);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      width: 29.7cm;
      height: 21cm;
      background: radial-gradient(circle at top, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.95));
      padding: 2.4cm 3cm;
      box-shadow:
        0 30px 60px rgba(15, 23, 42, 0.24),
        0 0 0 1px rgba(148, 163, 184, 0.2);
      position: relative;
      border-radius: 18px;
      overflow: hidden;
    }
    .certificate::before {
      content: '';
      position: absolute;
      inset: 1.1cm;
      border-radius: 12px;
      border: 2px solid rgba(148, 163, 184, 0.45);
      box-shadow:
        0 0 0 1px rgba(226, 232, 240, 0.85),
        inset 0 0 0 1px rgba(226, 232, 240, 0.8);
      pointer-events: none;
    }
    .header {
      position: relative;
      z-index: 1;
      text-align: center;
      margin-bottom: 1.6cm;
    }
    .header h1 {
      font-size: 40px;
      color: var(--color-primary-dark);
      margin: 0 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.32em;
      font-weight: 700;
    }
    .header p {
      font-size: 17px;
      color: var(--color-text-muted);
      margin-top: 6px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .content {
      text-align: center;
      margin: 1.4cm 0 1.5cm 0;
      position: relative;
      z-index: 1;
    }
    .content p {
      font-size: 18px;
      line-height: 1.7;
      color: var(--color-text-main);
      margin: 10px 0;
    }
    .name {
      font-size: 34px;
      font-weight: bold;
      color: var(--color-primary-dark);
      margin: 20px 0;
      padding: 10px 40px;
      border-radius: 999px;
      display: inline-block;
      background: radial-gradient(circle at top left, rgba(22, 163, 74, 0.12), transparent 55%),
                  rgba(241, 245, 249, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.6);
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
    }
    .training-name {
      font-size: 28px;
      font-style: normal;
      color: var(--color-accent);
      margin: 20px 0 8px 0;
      font-weight: 600;
    }
    .details {
      margin-top: 1.8cm;
      display: flex;
      justify-content: center;
      gap: 2.8cm;
      font-size: 14px;
      color: var(--color-text-muted);
      position: relative;
      z-index: 1;
    }
    .footer {
      margin-top: 1.8cm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 0.3cm;
      position: relative;
      z-index: 1;
    }
    .signature {
      text-align: center;
      width: 220px;
      font-size: 13px;
      color: var(--color-text-muted);
    }
    .signature-line {
      border-top: 1.8px solid rgba(15, 23, 42, 0.7);
      margin-top: 46px;
      padding-top: 8px;
    }
    .certificate-number {
      position: absolute;
      bottom: 0.85cm;
      right: 1.9cm;
      font-size: 11px;
      color: rgba(100, 116, 139, 0.9);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .badge-company {
      position: absolute;
      top: 1.35cm;
      left: 1.9cm;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(100, 116, 139, 0.95);
    }

    .watermark {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
      opacity: 0.06;
      font-size: 120px;
      font-weight: 700;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: var(--color-primary-dark);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="watermark">RH</div>
    <div class="badge-company">${companyName}</div>

    <div class="header">
      <h1>Certificado</h1>
      <p>de conclusão de treinamento</p>
    </div>
    
    <div class="content">
      <p>Certificamos que</p>
      <div class="name">${employeeName}</div>
      <p>concluiu com aproveitamento o treinamento</p>
      <div class="training-name">"${trainingName}"</div>
      <p>realizado em ${formattedDate}</p>
      ${hours > 0 ? `<p>com carga horária total de <strong>${hours} hora(s)</strong></p>` : ''}
    </div>
    
    <div class="details">
      <div>
        <strong>Empresa:</strong><br>
        ${companyName}
      </div>
      <div>
        <strong>Data de Conclusão:</strong><br>
        ${formattedDate}
      </div>
      ${hours > 0 ? `
      <div>
        <strong>Carga Horária:</strong><br>
        ${hours} hora(s)
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="signature">
        <div class="signature-line">
          <strong>Coordenador de Treinamentos</strong>
        </div>
      </div>
      <div class="signature">
        <div class="signature-line">
          <strong>Diretor de Recursos Humanos</strong>
        </div>
      </div>
    </div>
    
    <div class="certificate-number">
      Certificado Nº: ${certificateNumber}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Salva certificado no banco de dados
 */
export async function saveCertificate(
  companyId: string,
  data: {
    training_id: string;
    employee_id: string;
    numero_certificado: string;
    nota_final?: number;
    percentual_presenca_final?: number;
    arquivo_certificado?: string;
  }
) {
  // Primeiro, tentar localizar certificado existente (em qualquer empresa)
  try {
    const existing = await EntityService.list({
      schema: 'rh',
      table: 'training_certificates',
      companyId,
      skipCompanyFilter: true,
      filters: {
        training_id: data.training_id,
        employee_id: data.employee_id
      },
      pageSize: 1
    });

    if (existing.data && existing.data.length > 0) {
      return existing.data[0];
    }
  } catch (err) {
    console.warn('[certificateService.saveCertificate] Erro ao verificar certificado existente, seguindo para criação:', err);
  }

  // Se não encontrou, tenta criar; se der erro de chave duplicada, retorna o existente
  try {
    return await EntityService.create({
      schema: 'rh',
      table: 'training_certificates',
      companyId,
      data: {
        ...data,
        company_id: companyId,
        data_emissao: new Date().toISOString().split('T')[0],
        status: 'valido',
        aprovado: true
      }
    });
  } catch (err: any) {
    const message: string = err?.message || '';

    // Tratamento extra: se ainda assim ocorrer duplicate key, tentar buscar e retornar o existente
    if (
      message.includes('duplicate key value') &&
      message.includes('training_certificates_training_id_employee_id_key')
    ) {
      const fallbackExisting = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        skipCompanyFilter: true,
        filters: {
          training_id: data.training_id,
          employee_id: data.employee_id
        },
        pageSize: 1
      });

      if (fallbackExisting.data && fallbackExisting.data.length > 0) {
        return fallbackExisting.data[0];
      }
    }

    throw err;
  }
}

/**
 * Gera número único de certificado
 */
export function generateCertificateNumber(trainingId: string, employeeId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Baixa certificado como PDF
 */
export async function downloadCertificate(data: CertificateData) {
  const html = generateCertificateHTML(data);
  
  // Criar blob e fazer download
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificado-${data.certificateNumber}.html`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  // Para gerar PDF real, seria necessário:
  // 1. Usar window.print() para imprimir como PDF
  // 2. Ou usar jsPDF + html2canvas para gerar PDF programaticamente
}



