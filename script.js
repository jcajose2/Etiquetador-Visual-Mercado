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
    printArea.className = "";
    limparEstiloImpressaoZpl();

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
                label.className = 'etiqueta-individual etiqueta-produto';

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
    const tipos = ['zpl', 'texto', 'labelary'];

    tipos.forEach(nome => {
        const tela = document.getElementById(`tela-${nome}`);
        const tab = document.getElementById(`tab-${nome}`);

        if (tela) tela.classList.toggle('active', tipo === nome);
        if (tab) tab.classList.toggle('active', tipo === nome);
    });

    document.body.classList.toggle('modo-preview-zpl', tipo === 'labelary');
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
    printArea.className = "";
    limparEstiloImpressaoZpl();

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

let labelaryPreviewUrl = "";
let labelaryPrintUrls = [];

function extrairZplLabelary(entrada) {
    const texto = entrada.trim();

    if (!texto) return "";

    if (/^https?:\/\//i.test(texto)) {
        try {
            const url = new URL(texto);
            const zpl = url.searchParams.get('zpl');
            const density = url.searchParams.get('density');
            const width = url.searchParams.get('width');
            const height = url.searchParams.get('height');
            const index = url.searchParams.get('index');

            if (density) document.getElementById('labelaryDensity').value = density;
            if (width) document.getElementById('labelaryWidth').value = width;
            if (height) document.getElementById('labelaryHeight').value = height;
            if (index) document.getElementById('labelaryIndex').value = Math.max(1, parseInt(index, 10) || 1);

            return zpl || texto;
        } catch (e) {
            return texto;
        }
    }

    return texto;
}

function obterConfigLabelary() {
    const density = document.getElementById('labelaryDensity').value || "8";
    const width = Math.max(0.1, parseFloat(document.getElementById('labelaryWidth').value) || 4);
    const height = Math.max(0.1, parseFloat(document.getElementById('labelaryHeight').value) || 6);
    const page = Math.max(1, parseInt(document.getElementById('labelaryIndex').value, 10) || 1);

    document.getElementById('labelaryWidth').value = width;
    document.getElementById('labelaryHeight').value = height;
    document.getElementById('labelaryIndex').value = page;

    return {
        density,
        width,
        height,
        page,
        apiIndex: page - 1
    };
}

async function gerarPreviaLabelary() {
    const entrada = document.getElementById('labelaryInput').value;
    const zpl = extrairZplLabelary(entrada);
    const preview = document.getElementById('labelaryPreview');
    const info = document.getElementById('labelaryPreviewInfo');

    if (!zpl) {
        exibirStatus("Cole um ZPL ou link de visualizacao.");
        return;
    }

    if (!zpl.includes('^XA') || !zpl.includes('^XZ')) {
        exibirStatus("O conteudo precisa ter um ZPL valido com ^XA e ^XZ.");
        return;
    }

    const config = obterConfigLabelary();

    exibirStatus("Gerando preview...");
    preview.hidden = true;
    info.textContent = "";

    try {
        const resultado = await renderizarImagemZpl(zpl, config, config.apiIndex);

        if (labelaryPreviewUrl) URL.revokeObjectURL(labelaryPreviewUrl);
        labelaryPreviewUrl = resultado.url;

        preview.src = labelaryPreviewUrl;
        preview.hidden = false;
        info.textContent = resultado.total > 1 ? `Pagina ${config.page} de ${resultado.total}` : "";
        limparStatus();
    } catch (e) {
        const mensagem = e.name === "AbortError" ? "tempo limite excedido" : e.message;
        exibirStatus(`Nao foi possivel gerar o preview: ${mensagem}`);
    }
}

async function renderizarImagemZpl(zpl, config, apiIndex) {
    const url = `https://api.labelary.com/v1/printers/${config.density}dpmm/labels/${config.width}x${config.height}/${apiIndex}/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const resposta = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "image/png",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: zpl,
            signal: controller.signal
        });

        if (!resposta.ok) {
            const erro = await resposta.text();
            throw new Error(erro || `Erro ${resposta.status}`);
        }

        const imagem = await resposta.blob();
        const total = Math.max(1, parseInt(resposta.headers.get("X-Total-Count"), 10) || 1);

        return {
            url: URL.createObjectURL(imagem),
            total
        };
    } finally {
        clearTimeout(timeout);
    }
}

function atualizarEstiloImpressaoZpl(config) {
    let estilo = document.getElementById('zpl-print-style');

    if (!estilo) {
        estilo = document.createElement('style');
        estilo.id = 'zpl-print-style';
        document.head.appendChild(estilo);
    }

    estilo.textContent = `
        @media print {
            @page {
                size: ${config.width}in ${config.height}in;
                margin: 0;
            }

            #print-area.zpl-print-area {
                display: block !important;
                width: ${config.width}in !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .zpl-print-page {
                width: ${config.width}in !important;
                height: ${config.height}in !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                page-break-after: always;
                break-after: page;
            }

            .zpl-print-page:last-child {
                page-break-after: auto;
                break-after: auto;
            }

            .zpl-print-page img {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
            }
        }
    `;
}

function limparEstiloImpressaoZpl() {
    const estilo = document.getElementById('zpl-print-style');
    if (estilo) estilo.remove();
}

function limparUrlsImpressaoZpl() {
    labelaryPrintUrls.forEach(url => URL.revokeObjectURL(url));
    labelaryPrintUrls = [];
}

function aguardarImagemCarregar(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("imagem de impressao nao carregou"));
    });
}

async function imprimirZplPreview() {
    const entrada = document.getElementById('labelaryInput').value;
    const zpl = extrairZplLabelary(entrada);

    if (!zpl) {
        exibirStatus("Cole um ZPL ou link de visualizacao.");
        return;
    }

    const config = obterConfigLabelary();
    const printArea = document.getElementById('print-area');

    if (!zpl.includes('^XA') || !zpl.includes('^XZ')) {
        exibirStatus("O conteudo precisa ter um ZPL valido com ^XA e ^XZ.");
        return;
    }

    try {
        exibirStatus("Preparando impressao...");
        limparUrlsImpressaoZpl();
        printArea.innerHTML = "";
        printArea.className = "zpl-print-area";
        atualizarEstiloImpressaoZpl(config);

        const primeiraPagina = await renderizarImagemZpl(zpl, config, 0);
        labelaryPrintUrls.push(primeiraPagina.url);
        const total = primeiraPagina.total;
        const paginas = [primeiraPagina];

        for (let i = 1; i < total; i++) {
            exibirStatus(`Preparando impressao ${i + 1} de ${total}...`);
            const pagina = await renderizarImagemZpl(zpl, config, i);
            labelaryPrintUrls.push(pagina.url);
            paginas.push(pagina);
        }

        const carregamentos = paginas.map(pagina => {
            const page = document.createElement('div');
            const img = document.createElement('img');

            page.className = "zpl-print-page";
            img.src = pagina.url;
            img.alt = "Etiqueta ZPL";
            page.appendChild(img);
            printArea.appendChild(page);

            return aguardarImagemCarregar(img);
        });

        await Promise.all(carregamentos);
        limparStatus();
        setTimeout(() => { window.print(); }, 200);
    } catch (e) {
        const mensagem = e.name === "AbortError" ? "tempo limite excedido" : e.message;
        exibirStatus(`Nao foi possivel imprimir: ${mensagem}`);
    }
}

function limparLabelary() {
    document.getElementById('labelaryInput').value = "";
    document.getElementById('labelaryDensity').value = "8";
    document.getElementById('labelaryWidth').value = "4";
    document.getElementById('labelaryHeight').value = "6";
    document.getElementById('labelaryIndex').value = "1";

    const preview = document.getElementById('labelaryPreview');
    const info = document.getElementById('labelaryPreviewInfo');
    preview.removeAttribute('src');
    preview.hidden = true;
    info.textContent = "";

    if (labelaryPreviewUrl) URL.revokeObjectURL(labelaryPreviewUrl);
    labelaryPreviewUrl = "";
    limparUrlsImpressaoZpl();
    limparEstiloImpressaoZpl();
    document.getElementById('print-area').innerHTML = "";
    document.getElementById('print-area').className = "";

    limparStatus();
}
