// Função para corrigir "ElÃ¡stica" e converter hexadecimais do ZPL
function decodificarZPL(texto) {
    try {
        // O Mercado Livre envia hex como _C3_A1. Convertemos para %C3%A1 para o navegador entender
        return decodeURIComponent(texto.replace(/_/g, '%'));
    } catch (e) {
        // Se falhar, tenta uma limpeza simples
        return texto.replace(/_/g, '');
    }
}

function gerarEtiquetas() {
    const input = document.getElementById('zplInput').value;
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = "";

    // 1. Extração de dados via Regex
    const barcodeMatch = input.match(/\^FD([A-Z0-9]+)\^FS/);
    const barcodeValue = barcodeMatch ? barcodeMatch[1] : "ERRO";

    // Captura a descrição e o SKU, limpando os caracteres estranhos
    const descMatch = input.match(/\^FD(.*?)\^FS/g);
    let descricao = "PRODUTO";
    let sku = "N/A";

    if (descMatch) {
        // Procura a descrição longa no texto
        const achouDesc = descMatch.find(t => t.includes("Fita") || t.includes("Pasta"));
        if (achouDesc) descricao = decodificarZPL(achouDesc.replace(/^\^FD|\^FS$/g, ''));

        // Procura o SKU
        const achouSku = descMatch.find(t => t.includes("SKU:"));
        if (achouSku) sku = decodificarZPL(achouSku.replace(/^\^FD|\^FS$/g, ''));
    }

    const qtdMatch = input.match(/\^PQ(\d+)/);
    const quantidade = qtdMatch ? parseInt(qtdMatch[1]) : 1;

    // 2. Montagem das etiquetas em pares (2 colunas)
    for (let i = 0; i < quantidade; i += 2) {
        const linha = document.createElement('div');
        linha.className = 'etiqueta-linha';

        // Cria até 2 etiquetas por linha
        for (let j = 0; j < 2; j++) {
            if (i + j < quantidade) {
                const label = document.createElement('div');
                label.className = 'etiqueta-individual';
                
                const idCanvas = `bc-${i}-${j}`;
                label.innerHTML = `
                    <svg id="${idCanvas}" class="barcode"></svg>
                    <div class="txt-codigo">${barcodeValue}</div>
                    <div class="txt-desc">${descricao}</div>
                    <div class="txt-sku">${sku}</div>
                `;
                linha.appendChild(label);

                // Desenha o código de barras na hora
                setTimeout(() => {
                    JsBarcode(`#${idCanvas}`, barcodeValue, {
                        format: "CODE128",
                        width: 1.5,
                        height: 40,
                        displayValue: false,
                        margin: 0
                    });
                }, 0);
            }
        }
        printArea.appendChild(linha);
    }

    // 3. Comando de impressão
    setTimeout(() => { window.print(); }, 500);
}