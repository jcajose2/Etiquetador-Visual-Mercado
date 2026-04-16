function decodificarZPL(texto) {
    try {
        return decodeURIComponent(texto.replace(/_/g, '%'));
    } catch (e) {

        return texto.replace(/_/g, '');
    }
}

function gerarEtiquetas() {
    const input = document.getElementById('zplInput').value;
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = "";


    const barcodeMatch = input.match(/\^FD([A-Z0-9]+)\^FS/);
    const barcodeValue = barcodeMatch ? barcodeMatch[1] : "ERRO";

    const descMatch = input.match(/\^FD(.*?)\^FS/g);
    let descricao = "PRODUTO";
    let sku = "N/A";

    if (descMatch) {

        const achouDesc = descMatch.find(t => t.includes("Fita") || t.includes("Pasta"));
        if (achouDesc) descricao = decodificarZPL(achouDesc.replace(/^\^FD|\^FS$/g, ''));


        const achouSku = descMatch.find(t => t.includes("SKU:"));
        if (achouSku) sku = decodificarZPL(achouSku.replace(/^\^FD|\^FS$/g, ''));
    }

    const qtdMatch = input.match(/\^PQ(\d+)/);
    const quantidade = qtdMatch ? parseInt(qtdMatch[1]) : 1;


    for (let i = 0; i < quantidade; i += 2) {
        const linha = document.createElement('div');
        linha.className = 'etiqueta-linha';


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
