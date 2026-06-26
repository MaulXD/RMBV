/**
 * Webhook para receber solicitações de suporte do RMBV System
 *
 * Como usar:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Cole este código e salve (Ctrl+S)
 * 3. Implantar → Nova implantação → Tipo: Web app
 * 4. Executar como: "Eu" · Quem tem acesso: "Qualquer pessoa"
 * 5. Copie a URL gerada
 *
 * Colunas esperadas na planilha (nesta ordem):
 * Carimbo de data/hora | Seu Nome | Qual a necessidade | Observação | Endereço de e-mail | Sala
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      new Date(),                          // Carimbo de data/hora
      data.name || "",                     // Seu Nome
      data.necessidade || "",              // Qual a necessidade
      data.obs || "",                      // Observação
      data.email || "",                    // Endereço de e-mail
      data.sala || "",                     // Sala
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Webhook do RMBV Suporte ativo" }))
    .setMimeType(ContentService.MimeType.JSON);
}
