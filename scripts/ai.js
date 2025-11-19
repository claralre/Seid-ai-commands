
const APIBASE = 'https://api.openai.com/v1'
//const APIBASE = 'http://127.0.0.1:8000/v1'

// all docs in the process, filled from validation
var knowledgeBaseAI;
var current_proc = {};

var currentChat = [];
const openai_assistantId = "asst_Sx6QFcFncZsx1LAONb6kKTQP";

const menuItemsProcesso = {
    "Situação do processo": "Verifique a situação atual do processo e indique a próxima etapa",
    "Resumir documento": "Resuma o documento [Despacho 123]",
    "Validar": "Valide o processo conforme a base de conhecimento e identifique documentos não assinados."
};

const menuItemsEditor = {
    "Calcular e preencher": "Calcule todas as variáveis e aplique no documento em edição",
    "Ortografia e gramática": "Verifique a gramática do documento em edição",
    "Melhorar": "Melhore o texto selecionado no documento em edição"
};

function saveAIKey(key) {
    user = document.getElementById('hdnInfraPrefixoCookie').value;
    localStorage.setItem(`ai-key-${user}`, encodeKey(key));
    getAIKey.aikey = null;
}

function getAIKey() {
    if (!getAIKey.aikey) {
        user = document.getElementById('hdnInfraPrefixoCookie').value;
        getAIKey.aikey = decodeKey(localStorage.getItem(`ai-key-${user}`));
    }
    return getAIKey.aikey;
}

function getDocByAnyId(id) {
    const nid = parseInt(id);
    return Object.values(current_proc.docs).find(
        x => parseInt(x.docid) === nid || parseInt(x.number) === nid
    );
}

async function extractTextFromPdf(pdfUrl) {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n";
    }

    return cleanTextForAI(text);
}

async function getDocumentContent(selectedDoc) {
    if (selectedDoc && selectedDoc.privacy == 'confidential')
        return selectedDoc.privacy;
    if (!selectedDoc.src)
        return "O conteúdo do documento não está disponível.";
    if (selectedDoc.type == 'pdf')
        return extractTextFromPdf(selectedDoc.src);
    
    const result = await new Promise(resolve => {
        getUrlDOMViaIframe(selectedDoc.src, resolve);
    });
    return cleanTextForAI($(result.body).text());
}

function getEditorContentSelected() {
    let iframe = $('#divEditores').find('iframe[title="Texto"]')[0];
    if (iframe) {
        return iframe.contentWindow.getSelection().toString();
    }
    return 'Usuário não está editando um documento.';
}

function replaceEditorContent(params) {
    const replacemap = params['replacemap'];
    editorIframes = $('#divEditores iframe');
    editorIframes = editorIframes.filter((i,x) => {
        const pass = x.contentDocument.body.isContentEditable;
        return pass;
    });

    const saveSnapshot = (iframe) => {
        const body = iframe.contentDocument.body;
        body.focus();
        document.execCommand('insertText', false, '');
    };

    if (!editorIframes.length)
        return 'Usuário não está editando um documento.';
    
    total_replaced = 0;
    editorIframes.each((_, iframe) => {
        replaced = 0;
        saveSnapshot(iframe);
        const content = $(iframe).contents();
        content.find('body p').each(function () {
            function replaceInTextNodes(node) {
                $(node).contents().each(function () {
                    if (this.nodeType === Node.TEXT_NODE) {
                        let html = this.nodeValue;
                        const style = 'style="background-color:#e67e22" ia-modified="true"';
                        for (const [key, value] of Object.entries(replacemap)) {
                            html = html.split(key).join(`<span ${style}>${escapeHtml(value)}</span>`);
                        }
                        if (html !== this.nodeValue) {
                            replaced++;
                            const span = document.createElement('span');
                            span.innerHTML = html;
                            this.parentNode.replaceChild(span, this);
                        }
                    } else {
                        replaceInTextNodes($(this), replacemap);
                    }
                });
            }
            replaceInTextNodes(this);
        });

        // add a paragragh with onclick, to remove background after user verification
        ia_clear = content.find('#ia-clear-background');
        if (replaced > 0 && ia_clear.length == 0) {
            ia_clear = $('<p id="ia-clear-background">')
                .text('Depois de conferir, clique aqui para remover o destaque da IA.')
                .css('background-color', '#e67e22')
                .css('cursor', 'pointer')
                .on('click', function() {
                    saveSnapshot(iframe);
                    content.find('[ia-modified]').each(function() {
                        $(this).css('background-color', '').removeAttr('ia-modified');
                    });
                    $(this).remove();
                    saveSnapshot(iframe);
                });

            content.find('body').append(ia_clear);
            saveSnapshot(iframe);
        }

        total_replaced += replaced;
    });

    return `${total_replaced} substituições realizadas.`;
}

function getEditorContent() {
    const editorIframes = document.querySelectorAll('#divEditores iframe');
    if (!editorIframes.length)
        return 'Usuário não está editando um documento.';

    parts = []
    editorIframes.forEach(iframe => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const editableBody = doc.body;
        const text = editableBody.innerText || editableBody.textContent;
        parts.push(text);
    });
    return parts.join('\n');
}

function notifyUnknownVarValue(params) {
    vars = params['vars'];
    input = $('#ai-chat-input');
    current_text = input.text();
    input.text(`${current_text}\nO valor das variáveis é:\n`);
    $(vars).each((_,v) => {
        const container = $('<div class="ai-chat-input-var"></div>');
        const label = $('<label></label>')
            .text(v + ':')
            .attr('for', v);
        const inputvar = $('<input></input>')
            .attr({ type: 'text', id: v, name: v });
        container.append(label, inputvar);
        input.append(container);
    });
    input.append('<span><br>');
    return 'done';
}

function extractTextFrom(node) {
    let text = ' ' ;
    $(node).contents().each(function () {
        if (this.nodeType === Node.TEXT_NODE) {
            text += `${this.nodeValue}\n`;
        } else if (this.nodeType === Node.ELEMENT_NODE) {
            if (this.tagName === 'INPUT') {
                val = $(this).val();
                text += `${val}\n`;
            } else {
                text += extractTextFrom(this);
            }
        }
    });
    return text;
}

function setThreadIdForCurrentProc(threadid) {
    getThreadIdForCurrentProc();
    getThreadIdForCurrentProc.threads[current_proc.pid] = threadid;
    localStorage.setItem('ai-threads', JSON.stringify(getThreadIdForCurrentProc.threads));
}

function getThreadIdForCurrentProc() {
    if (!getThreadIdForCurrentProc.threads) {
        let threads = JSON.parse(localStorage.getItem('ai-threads'));
        getThreadIdForCurrentProc.threads = threads || {};
    }
    return getThreadIdForCurrentProc.threads[current_proc.pid];
}

async function getUserAIHistoryForProcess() {
    try {
        if (getUserAIHistoryForProcess.loaded)
            return;

        threadid = getThreadIdForCurrentProc();
        if (!threadid)
            return;

        const headers = {
            "Authorization": `Bearer ${getAIKey()}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        };

        
        const messages = await fetchJson(`${APIBASE}/threads/${threadid}/messages`, { method: "GET", headers});
        for (let i = messages.data.length - 1; i >= 0; i--) {
            const message = messages.data[i];
            for(const content of message.content) {
                text = content.text.value;
                if (text.includes('<metadados_do_processo>'))
                    text = text.replace(/.*\/metadados_do_processo>\n/, '')
                addChatMessage(message.role, text);
            }
        }
        getUserAIHistoryForProcess.loaded = true;

    } catch (err) {
        addChatMessage('assistant', 'Ocorreu um erro ao obter as mensagens anteriores para o processo.');
        console.error(err);
    }
}

function setup_ai_panel(editor = false) {
    if (!getAIKey()) {
        addChatMessage('user', '<span>Insira uma chave válida para acesso ao serviço OpenAI, digitando abaixo: Chave: [Sua chave aqui]<br>Você pode obter uma chave em <a target="_blank" href="https://platform.openai.com/chat">https://platform.openai.com/chat</a>.</span>')
    }

    $('#ai-chat-input').on('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const rawText = extractTextFrom(this);
            const msg = escapeHtml(rawText.trim());
            if (msg) {
                $(this).text('');
                const mchave = msg.match(/^[Cc][Hh][Aa][Vv][Ee][:]? ?\[?(.*)\]?/)
                if (mchave) {
                    addChatMessage('user', 'Chave: ...');
                    const openai_key = mchave[1].trim();
                    if (testAIKey(openai_key)) {
                        saveAIKey(openai_key);
                    }
                } else {
                    $('#ai-chat-history').append(`<div class="user">${msg}</div>`);
                    respondFromAIassistant(msg);
                }
            }
        }
    });

    // add menu
    chat_add_btn = $('#chat-add-btn');
    chat_add_btn.on('click', function () {
        ai_menu_container = $('#ai-menu-container');

        const hideMenu = () => {
            ai_menu_container.css('opacity', 0);
            ai_menu_container.empty();
            $(document).off('click', hideMenu);
        };

        const menu = $('<ul>');
        menuItems = editor ? menuItemsEditor : menuItemsProcesso;
        $.each(menuItems, function (label, value) {
            const item = $('<li class="menu-item">').text(label).on('click', function () {
                chat_input = $('#ai-chat-input');
                chat_input.html('').append(value).focus();
                // move caret to the end
                var range = document.createRange();
                range.selectNodeContents(chat_input[0]);
                range.collapse(false);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });
            menu.append(item);
        });

        offset = chat_add_btn.offset();
        ai_menu_container.append(menu);
        menuHeight = ai_menu_container.find('ul').outerHeight();
        ai_menu_container.css({'top': - menuHeight - 50, 'opacity': 1});
        setTimeout(()=>{ $(document).on('click', hideMenu)}, 0);
    });

    // resize stuff
    var isResizing = false;
    const sidePanel = document.getElementById('seidmais-sidepanel');

    const sideMouseMove = (e) => {
        const newWidth = window.innerWidth - e.clientX;
        sidePanel.style.width = newWidth + 'px';
    };

    $('#seidmais-divider').mousedown(function (e) {
        e.preventDefault();
        isResizing = true;
        document.body.style.cursor = 'col-resize';

        $(document).on('mousemove', sideMouseMove);
    });

    $(document).on('mouseup', function () {
        if (isResizing) {
            document.body.style.cursor = 'default';
            $(document).off('mousemove', sideMouseMove);
            isResizing = false;
        }
    });
}

function scrollToQuestion(question) {
    chat = $('#ai-chat-history');
    chat.scrollTop(question.position().top + chat.scrollTop());
}

function addChatMessage(role, msg) {
    chat_history = $('#ai-chat-history');
    div_answer = $(`<div class="${role}">${msg}</div>`);
    chat_history.append(div_answer);
    divToScroll = role == 'user' ? div_answer : div_answer.prev();
    if (divToScroll)
        scrollToQuestion(divToScroll);
    return div_answer;
}

const waiting_gif = chrome.runtime.getURL('images/waiting.gif');

aiFunctionsMap = {}
aiFunctionsMap['get_kb'] = async (tool) => {
    kbs = await getKnowledgeBase();
    kbsTxt = {};
    for(kb in kbs)
        kbsTxt[kb] = kbs[kb].txt;
    return JSON.stringify(kbsTxt);
}

aiFunctionsMap['get_documents'] = (tool) => {
    const ignoreKeys = ['href', 'src', 'spanid'];
    if (!current_proc?.docs)
        return 'Lista de documentos não disponível';
    return JSON.stringify(current_proc.docs, (key, value) => {
        if (ignoreKeys.includes(key)) return undefined;
        return value;
    });
}

aiFunctionsMap['get_document_content'] = async (tool) => {
    const params = JSON.parse(tool.function.arguments);
    selectedDoc = getDocByAnyId(params.docid);
    if (!selectedDoc)
        return `O documento ${params.docid} não foi encontrado. Tente usar o docid da lista de documentos.`
    div_answer.children().last().before(`<em>Obtendo conteúdo do documento ${selectedDoc.number}</em><br>`);
    return await getDocumentContent(selectedDoc);
}

aiFunctionsMap['get_editor_content'] = getEditorContent;
aiFunctionsMap['get_editor_selected'] = getEditorContentSelected;

aiFunctionsMap['editor_replace_text'] = (tool) => {
    const params = JSON.parse(tool.function.arguments);
    return replaceEditorContent(params);
}

aiFunctionsMap['notify_unknown_var_value'] = (tool) => {
    const params = JSON.parse(tool.function.arguments);
    return notifyUnknownVarValue(params);
}

aiFunctionsMap['assign_proc_to'] = async (tool) => {
    const params = JSON.parse(tool.function.arguments);
    
    const user_name = params['name'];
    const user_name_pattern = user_name.toUpperCase().split(/\s+/).join('.*');

    assign_action = saved_actions['procedimento_atribuicao_cadastrar'];
    if (!user_name || !assign_action)
        return 'Tente executar essa ação a partir da tela do processo.';

    const doc = await ifrVisualizacaoLoadTo(assign_action)
    const select = $('#selAtribuicao', doc);
    const regex = new RegExp(user_name_pattern);
    const options = $(select).find('option').filter((_, el) =>
        regex.test($(el).text().toUpperCase())
    );
    
    let result = `Usuário ${user_name} não encontrado`;
    if (options.length == 1) {
        select.val(options[0].value);
        $(doc).find('#sbmSalvar').click();
        result = `Processo atribuído ao usuário ${user_name}`;
    } else if (options.length > 1) {
        result = `Há mais de um usuário com o nome ${user_name}`;
    }
    return result;
}

aiFunctionsMap['prepare_email'] = async (tool) => {
    const params = JSON.parse(tool.function.arguments);
    email_action = saved_actions['procedimento_enviar_email'];
    if (!email_action)
        return 'Tente executar esta ação a partir da tela do processo.';

    const doc = await ifrVisualizacaoLoadTo(email_action);
    doc_text = $(doc).text();
    href_fetch_dest = doc_text.match(/controlador_ajax.php\?acao_ajax=email_auto_completar[^"]+/)

    // search names and set destination
    hdnDestinatario = $("#hdnDestinatario", doc);
    messages = [];
    found_dests = [];
    for(dest of params['names']) {
        const formData = new FormData();
        formData.append('palavras_pesquisa', dest);
        const response = await fetch(href_fetch_dest, {
            "body": formData,
            "method": "POST",
        });
        const list = await response.json();
        if (list.length == 0)
            messages.push(`Nenhum destinatário com nome ${dest} foi encontrado.`);
        else {
            const first = list[0];
            var option = new Option(first.text, first.id, true, true);
            hdnDestinatario.append(option);
            found_dests.push(first.id);
        }
    }
    hdnDestinatario.val(found_dests.join(';'));
    const selectElement = doc.getElementById('hdnDestinatario');
    const event = new Event('change');
    selectElement.dispatchEvent(event);

    // attachments
    selDocumentos = $('#selDocumentos', doc);
    if (!params['docs']) {
        messages.push('Falha: Nenhum documento anexado.');
        params['docs'] = [];
    }
    hdnDocumentos = [];
    for(attachment of params['docs']) {
        selectedDoc = getDocByAnyId(attachment);
        if (!selectedDoc)
            messages.push(`O documento ${attachment} não foi encontrado.`);
        else {
            var option = new Option(selectedDoc.title, selectedDoc.docid);
            selDocumentos.append(option);
            //Exemplo: 495748±0459255 - Despacho¥497131±0460570 - E-mail
            hdnDocumentos.push(`${selectedDoc.docid}±${selectedDoc.title}`)
        }
    }
    $('#hdnDocumentos', doc).val(hdnDocumentos.join('¥'));
    
    $('#txtAssunto', doc).val(params['subject']);
    $('#txaMensagem', doc).val(params['content']);
    
    if (messages.length > 0)
        return messages.join('\n');

    const homeArvore = () => {
        let ifrArvore = $("#ifrArvore");
	    let icontent = ifrArvore.contents();
        setTimeout(function() { $(`#span${current_proc.pid}`, icontent).click(); }, 100);
    };
    $('#btnEnviar', doc).on('click', homeArvore);
    $('#btnCancelar', doc).attr('onclick', '');
    $('#btnCancelar', doc).on('click', homeArvore);

    return 'Tela de email carregada.';
}

async function handleToolCall(tool) {
    const functionDescription = {
        'get_kb': 'Obtendo base de conhecimento',
        'get_documents': 'Obtendo lista de documentos do processo',
        'get_editor_content': 'Obtendo o texto do documento no editor',
        'get_editor_selected': 'Obtendo o texto selecionado',
        'editor_replace_text': 'Editando o documento',
        'assign_proc_to': 'Atribuindo o processo',
        'prepare_email': 'Preparando e-mail'
    };
    const fn = tool.function.name;

    if (fn in functionDescription)
        div_answer.children().last().before(`<em>${functionDescription[fn]}</em><br>`);

    if (fn in aiFunctionsMap) {
        try {
            return await aiFunctionsMap[fn](tool);
        } catch (e) {
            console.error(e);
            return 'Ocorreu um erro ao executar a função.';
        }
    } else {
        const err = `Função ${fn} não encontrada.`;
        console.error(err)
        return err;
    }
}

async function testAIKey(key) {
    div_answer = addChatMessage('assistant', `<img id="waitingai" src="${waiting_gif}"></img>`);
    try {
        const headers = {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        };

        const response = await fetch(`${APIBASE}/threads`, { method: "POST", headers });
        const data = await response.json();
        if (data.error) {
            div_answer.text(`A chave não foi autorizada. ${data.error.message}`);
        } else {
            div_answer.text('Chave armazenada para este navegador.');
        }
        return true;

    } catch (err) {
        div_answer.html(`A chave não foi autorizada. Network error ${err.message}`);
        console.error(err);
        return false;
    } 
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.json();
}

async function respondFromAIassistant(msg) {
    try {
        div_answer = addChatMessage('assistant', `<img id="waitingai" src="${waiting_gif}"></img>`);

        const headers = {
            "Authorization": `Bearer ${getAIKey()}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
        };

        user_message = {}
        if (!respondFromAIassistant.thread) {
            respondFromAIassistant.thread = await fetchJson(`${APIBASE}/threads`, { method: "POST", headers});
            setThreadIdForCurrentProc(respondFromAIassistant.thread.id);
            const metadata = aiFunctionsMap.get_documents();
            user_message = { role: "user", content: `'<metadados_do_processo>${metadata}</metadados_do_processo>\n${msg}`};
        } else {
            user_message = { role: "user", content: msg};
        }
        const thread = respondFromAIassistant.thread;

        await fetchJson(`${APIBASE}/threads/${thread.id}/messages`, {
            method: "POST", headers,
            body: JSON.stringify(user_message)
        });

        const run = await fetchJson(`${APIBASE}/threads/${thread.id}/runs`, {
            method: "POST", headers,
            body: JSON.stringify({ assistant_id: openai_assistantId })
        });

        let status;
        while (true) {
            status = await fetchJson(`${APIBASE}/threads/${thread.id}/runs/${run.id}`, { headers });

            if (status.status === "requires_action" && status.required_action?.type === "submit_tool_outputs") {
                const tools = status.required_action.submit_tool_outputs.tool_calls;
                const tool_outputs = [];
                for (const tool of tools) {
                    let result = await handleToolCall(tool);
                    tool_outputs.push({tool_call_id: tool.id, output: result});
                }

                await fetchJson(`${APIBASE}/threads/${thread.id}/runs/${run.id}/submit_tool_outputs`, {
                    method: "POST", headers,
                    body: JSON.stringify({ tool_outputs })
                });

            } else if (status.status === "completed") {
                break;
            } else if (status.status === "failed") {
                div_answer.addClass('error');
                div_answer.html(`Erro: ${status.last_error.message}. Código: ${status.last_error.code}`);
                console.error(status.last_error);
                historyEl.scrollTop = historyEl.scrollHeight;
                return;
            }
            // wait processing
            await new Promise(r => setTimeout(r, 1500));
        };

        const messages = await fetchJson(`${APIBASE}/threads/${thread.id}/messages`, { headers });

        const reply = messages.data[0].content[0].text.value || '(sem resposta)';

        div_answer.html(marked.parse(reply));
        scrollToQuestion(div_answer.prev());

    } catch (err) {
        respondFromAIassistant.thread = null;
        div_answer.html('Falha de comunicação com a IA. ' + err);
        console.error(err);
    }
}
