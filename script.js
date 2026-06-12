function decodificarZPL(texto) {
    try {
        return decodeURIComponent(texto.replace(/_/g, '%'));
    } catch (e) {
        return texto.replace(/_/g, '');
    }
}

function resumirDescricaoProduto(descricao) {
    const palavrasIgnoradas = ["DE", "DA", "DO", "DAS", "DOS", "C", "C/", "COM", "E"];
    const palavras = descricao
        .replace(/[^\wÀ-ÿ/-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter(palavra => !palavrasIgnoradas.includes(palavra.toUpperCase()));

    let resumo = "";

    for (const palavra of palavras) {
        const proximoResumo = resumo ? `${resumo} ${palavra}` : palavra;
        if (proximoResumo.length > 35 || proximoResumo.split(" ").length > 5) break;
        resumo = proximoResumo;
    }

    return resumo || "PRODUTO";
}

function formatarSkuEtiqueta(textoSku) {
    const conteudo = textoSku.replace(/^SKU:\s*/i, '').trim();
    const partes = conteudo
        .split(/[-\s]+/)
        .map(parte => parte.trim().toUpperCase())
        .filter(Boolean);

    const unidadeIndex = partes.findIndex(parte => /^\d+(UN|UND|UNID|UNIDADE|UNIDADES)$/.test(parte));
    const unidade = unidadeIndex >= 0
        ? partes[unidadeIndex].replace(/(UND|UNID|UNIDADE|UNIDADES)$/, 'UN')
        : "";
    const areaCodigo = unidadeIndex >= 0 ? partes.slice(0, unidadeIndex) : partes;
    const codigo = areaCodigo.find(parte => /^\d+$/.test(parte))
        || areaCodigo.find(parte => /\d/.test(parte))
        || areaCodigo[0]
        || conteudo.toUpperCase();

    if (codigo && unidade) return `SKU: ${codigo} - ${unidade}`;

    return `SKU: ${partes.join(" - ") || conteudo.toUpperCase()}`;
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
        const campos = descMatch
            .map(t => decodificarZPL(t.replace(/^\^FD|\^FS$/g, '')).trim())
            .filter(Boolean);

        const achouDesc = campos.find(t => t !== barcodeValue && !t.toUpperCase().startsWith("SKU:"));
        if (achouDesc) descricao = resumirDescricaoProduto(achouDesc);

        const achouSku = campos.find(t => t.toUpperCase().startsWith("SKU:"));
        if (achouSku) sku = formatarSkuEtiqueta(achouSku);
    }

    const qtdMatch = input.match(/\^PQ(\d+)/);
    const quantidade = qtdMatch ? parseInt(qtdMatch[1]) : 1;

    for (let i = 0; i < quantidade; i += 2) {
        const linha = document.createElement('div');
        linha.className = 'etiqueta-linha';

        for (let j = 0; j < 2; j++) {
            if (i + j < quantidade) {
                const label = document.createElement('div');
                label.className = 'etiqueta-individual etiqueta-mercado';

                const idCanvas = `bc-${i}-${j}`;
                label.innerHTML = `
                    <div class="etiqueta-conteudo">
                        <svg id="${idCanvas}" class="barcode"></svg>
                        <div class="txt-codigo">${barcodeValue}</div>
                        <div class="txt-desc">${descricao}</div>
                        <div class="txt-sku">${sku}</div>
                    </div>
                `;
                linha.appendChild(label);

                // Desenho puro sem cálculos de viewBox
                setTimeout(() => {
                    JsBarcode(`#${idCanvas}`, barcodeValue, {
                        format: "CODE128",
                        width: 1.3,
                        height: 35,
                        displayValue: false,
                        margin: 0
                    });
                }, 0);
            }
        }
        printArea.appendChild(linha);
    }

    setTimeout(() => { window.print(); }, 500);
}

function mostrarTela(tipo) {
    const telaZpl = document.getElementById('tela-zpl');
    const telaTexto = document.getElementById('tela-texto');
    const tabZpl = document.getElementById('tab-zpl');
    const tabTexto = document.getElementById('tab-texto');

    const telaTextoAtiva = tipo === 'texto';

    telaZpl.classList.toggle('active', !telaTextoAtiva);
    telaTexto.classList.toggle('active', telaTextoAtiva);
    tabZpl.classList.toggle('active', !telaTextoAtiva);
    tabTexto.classList.toggle('active', telaTextoAtiva);

    limparStatus();
}

function limparTextoLivre() {
    document.getElementById('textoLivre').value = "";
    document.getElementById('quantidadeTexto').value = 1;
    document.getElementById('print-area').innerHTML = "";
    limparStatus();
}

function limparStatus() {
    const status = document.getElementById('status');
    if (status) status.textContent = "";
}

function exibirStatus(mensagem) {
    const status = document.getElementById('status');
    if (status) status.textContent = mensagem;
}

function gerarEtiquetasTextoLivre() {
    const texto = document.getElementById('textoLivre').value.trim();
    const quantidadeCampo = document.getElementById('quantidadeTexto');
    const quantidade = Math.min(500, Math.max(1, parseInt(quantidadeCampo.value, 10) || 1));
    const printArea = document.getElementById('print-area');

    if (!texto) {
        exibirStatus("Digite a informacao que deseja imprimir.");
        return;
    }

    quantidadeCampo.value = quantidade;
    printArea.innerHTML = "";

    for (let i = 0; i < quantidade; i += 2) {
        const linha = document.createElement('div');
        linha.className = 'etiqueta-linha';

        for (let j = 0; j < 2; j++) {
            if (i + j < quantidade) {
                const label = document.createElement('div');
                const conteudo = document.createElement('div');

                label.className = 'etiqueta-individual etiqueta-texto-livre';
                conteudo.className = 'txt-livre';
                conteudo.textContent = texto;

                label.appendChild(conteudo);
                linha.appendChild(label);
            }
        }
        printArea.appendChild(linha);
    }

    limparStatus();
    setTimeout(() => { window.print(); }, 300);
}