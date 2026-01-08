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
    body {
      margin: 0;
      padding: 0;
      font-family: 'Times New Roman', serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      width: 29.7cm;
      height: 21cm;
      background: white;
      padding: 3cm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      position: relative;
      border: 2px solid #667eea;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 2cm;
      left: 2cm;
      right: 2cm;
      bottom: 2cm;
      border: 3px solid #764ba2;
      border-style: dashed;
    }
    .header {
      text-align: center;
      margin-bottom: 2cm;
    }
    .header h1 {
      font-size: 48px;
      color: #667eea;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 5px;
    }
    .header p {
      font-size: 18px;
      color: #666;
      margin-top: 10px;
    }
    .content {
      text-align: center;
      margin: 2cm 0;
    }
    .content p {
      font-size: 20px;
      line-height: 1.8;
      color: #333;
      margin: 20px 0;
    }
    .name {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin: 30px 0;
      text-decoration: underline;
    }
    .training-name {
      font-size: 28px;
      font-style: italic;
      color: #764ba2;
      margin: 20px 0;
    }
    .details {
      margin-top: 2cm;
      display: flex;
      justify-content: space-around;
      font-size: 14px;
      color: #666;
    }
    .footer {
      margin-top: 2cm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 10px;
    }
    .certificate-number {
      position: absolute;
      bottom: 1cm;
      right: 2cm;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <h1>Certificado</h1>
      <p>de Conclusão de Treinamento</p>
    </div>
    
    <div class="content">
      <p>Certificamos que</p>
      <div class="name">${employeeName}</div>
      <p>concluiu com sucesso o treinamento</p>
      <div class="training-name">"${trainingName}"</div>
      <p>realizado em ${formattedDate}</p>
      ${hours > 0 ? `<p>com carga horária de ${hours} hora(s)</p>` : ''}
      ${score !== undefined ? `<p>obtendo nota final de ${score.toFixed(1)}%</p>` : ''}
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



