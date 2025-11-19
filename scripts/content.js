
// holds the current page URL object
var current_page;

// holds the Unidade SEI abbreviation
var current_depto = {};

// holds the User information
var current_user = {};

// holds action hrefs for procedimento_trabalhar
var saved_actions = {}

// identified flags in process list; to use in grid filter
var identifiedFlags = {}

// attributes to images mapping
const attrToImage = {
	'Recebido': 'plane-arrival',
	'Gerado': 'house',
	'Não visualizado': 'envelope-closed',
	'Sigiloso': 'lock',
	'Visualizado': 'envelope-open'
};

// my favorite procs buttons
const seidmais_buttons = [
	{	// let start-add at first
		'img': chrome.runtime.getURL("images/star-add.svg"),
		'label': 'Adicionar processos selecionados aos favoritos pessoais',
		'onclick': () => { add_to_my_processes(gridApi); }
	},
	{	'img': chrome.runtime.getURL("images/star-open.svg"),
		'label': 'Mostrar processos favoritos pessoais',
		'onclick': () => { show_my_processes(gridApi); }
	},
	{	'img': chrome.runtime.getURL("images/star-download.svg"),
		'label': 'Fazer uma cópia de segurança da lista de favoritos pessoais',
		'onclick': () => { download_my_processes(); }
	}
];

// on page load, improve screen
(() => {
	// current depto
	infraUnidade = $("#lnkInfraUnidade");
	current_depto = {};
	if (infraUnidade.length) {
		current_depto.depto = infraUnidade.html();
		current_depto.name = infraUnidade.attr('title');
	}

	// current user
	infraUser = $("#lnkUsuarioSistema");
	current_user = {};
	if (infraUnidade.length) {
		const match = infraUser.attr('title').match(/(.*) \(([^\/]+)\//);
		if (match) {
			current_user.id = match[2];
			current_user.name = match[1];
		}
	}

	acao = getAcao();
	if (acao === 'procedimento_controlar') {
		improveProcedimentoControlar();
	} else if (acao === 'procedimento_trabalhar') {
		setupProcedimentoTrabalhar();
	} else if (acao === 'editor_montar') {
		setupEditor();
	}
})();

function setupEditor() {
	current_proc = JSON.parse(localStorage.getItem('current_proc') || {});

	divContainer = $('<div id="sidePanelContainer"></div>');
	$('#frmEditor').after(divContainer);
	
	body = $('body');
	body.css('display', 'flex');
	body.css('margin', '0');

	$(window).on('resize', function() {
		divContainer.css('height', window.innerHeight);
	});
	divContainer.css('height', window.innerHeight);
	
	setupSidePanel(divContainer, true);
}

async function getUserId() {
	msg = {}
	id = $('#hdnInfraPrefixoCookie').val();
	msg.userid = id;
	return msg;
}

function getAcao() {
	current_page = new URL(window.location.href);
	var params = current_page.searchParams;
	return params.get('acao');
}

function getSmallProcessNumber(number) {
	return number.replace(/^[^.]*\.|\-\d+$/g, '');
}

function get_all_procs() {
	rowdata = [];
	hasDivRecebidos = $('#divRecebidos').length == 1;
	procs = document.querySelectorAll('a.processoVisualizado, a.processoNaoVisualizado, a.processoVisualizadoSigiloso, a.processoNaoVisualizadoSigiloso')
	for (a of procs) {
		proc = {}
		tr = a.closest('tr');
		proc.pid = tr.id.replace('P', '');
		proc.checkbox = $(tr).find('input.infraCheckboxInput');
		
		pn = getSmallProcessNumber(a.innerText);
		proc.numero = $(`<a target="_blank" class="${a.className}" href="${a.href}">${pn}</a>`)[0];

		proc.responsavel = a.parentElement.nextElementSibling.children[0]
		if (proc.responsavel != undefined) {
			proc.responsavel = proc.responsavel.title.replace('Atribuído para ', '');
			proc.responsavel = toTitleCaseBrazilian(proc.responsavel);
		}

		proc.attributes = [];
		if (hasDivRecebidos)
			proc.attributes.push(a.closest('#tblProcessosRecebidos') ? 'Recebido' : 'Gerado')
		pclass = a.getAttribute('class')
		proc.attributes.push(pclass.includes('NaoVisualizado') ? 'Não visualizado' : 'Visualizado');
		if (pclass.includes('Sigiloso'))
			proc.attributes.push('Sigiloso');

		const reInfraTooltip = /infraTooltipMostrar\(['"]([^'"]*)['"],['"]([^'"]*)['"]\)/;

		flagsFound = $(a.parentElement.previousElementSibling).children().toArray();
		if (!hasDivRecebidos) {
			ancMarkers = $(a).closest('tr').find('.ancMarcador > div');
			flagsFound = flagsFound.concat(ancMarkers.toArray());
		}

		proc.flags = $('<div>');
		proc.hasflags = []
		for(flag of flagsFound) {
			if (flag.nodeName == 'IMG')
				flag = $('<div>').append(flag);
			$(flag).find('img').each(function(index, img) {
				let html = img.getAttribute('onmouseover');
				if (!html) {
					closest = $(img).closest('[onmouseover]');
					html = closest.length > 0 ? closest[0].getAttribute('onmouseover') : '';
				}
				parts = reInfraTooltip.exec(html);
				details = '';
				identifiedFlags[img.src] = '';
				if (parts) {
					details = parts[1].replace(/\\?\\n/gm, '\n').trim();
					identifiedFlags[img.src] = parts[2];
				} else if (img.parentElement.nodeName == 'DIV') {
					// marker in a div, when !hasDivRecebidos
					if (img.parentElement.nextSibling.nodeName == 'DIV')
						identifiedFlags[img.src] = img.parentElement.nextSibling.innerText;
				}
				
				// special cases
				if (img.src.includes('anotacao'))
					identifiedFlags[img.src] = 'Anotação';
				else if (img.src.includes('exclamacao'))
					identifiedFlags[img.src] = 'Documento incluído/assinado';

				proc.flags.append($(`<img class="seidmais-marker" src="${img.src}" title="${identifiedFlags[img.src]}${details != '' ? "\n" + details : ''}"/>`))
				proc.hasflags.push(img.src);
			});
		}
		proc.flags = proc.flags[0]

		const html = a.getAttribute('onmouseover');
		parts = reInfraTooltip.exec(html);
		if (parts) {
			proc.tipo = parts[2];
			proc.especificacao = parts[1];
			if (proc.attributes.includes('Sigiloso') && parts[1].trim() == '')
				proc.especificacao = 'Sigiloso';
		}
		rowdata.push(proc);
	}

	return rowdata;
}


function renderProcessAttributes(attrs) {
	// Recebido Interno Não visualizado Visualizado Sigiloso
	divAttrs = $("<div>");
	for(attr of attrs) {
		imgUrl = chrome.runtime.getURL(`images/${attrToImage[attr]}.svg`);
		divAttrs.append($(`<img class="seidmais-icon" src="${imgUrl}" title="${attr}"></img>`));
	}
	return divAttrs[0];
}

function set_grid_row_data(gridApi) {
	all_procs = get_all_procs();
	empty_span = $('<span>')[0];
	qtd = all_procs.length;
	rec = all_procs.filter(i => i.attributes.indexOf('Recebido') != -1).length;
	int = all_procs.filter(i => i.attributes.indexOf('Gerado') != -1).length;
	sig = all_procs.filter(i => i.attributes.indexOf('Sigiloso') != -1).length;
	nvi = all_procs.filter(i => i.attributes.indexOf('Não visualizado') != -1).length;
	nre = all_procs.filter(i => !i.responsavel).length;
	desc = `${qtd} processos`
	if (rec > 0) desc += `, ${rec} recebidos`;
	if (int > 0) desc += `, ${int} gerados`;
	if (sig > 0) desc += `, ${sig} sigilosos`;
	if (nvi > 0) desc += `, ${nvi} não visualizados`;
	if (nre > 0) desc += `, ${nre} sem responsável`;

	userName = toTitleCaseBrazilian(current_user.name);
	respcount = all_procs.filter(i => i.responsavel == userName).length;
	resp_node = undefined;
	if (respcount > 0) {
		resp_node = $(`<a>${respcount} p. sob sua responsabilidade</a>`);
		resp_node.on('click', function() {
			gridApi.setFilterModel(null);
			gridApi.setColumnFilterModel('responsavel', {
    			filterType: 'text',
    			type: 'contains',
    			filter: userName
			});
			gridApi.onFilterChanged();
		});
		resp_node = resp_node[0]
	}

	const pinnedBottomRowData = [
		{ numero: empty_span, responsavel: resp_node, attributes: [],
			flags: empty_span, tipo: '', 
			especificacao: desc}
	];
	gridApi.setGridOption('rowData', all_procs);
	gridApi.setGridOption('pinnedBottomRowData', pinnedBottomRowData);
}

function improveProcedimentoControlar() {
	let alreadyImproved = improveProcedimentoControlar.alreadyImproved || false;

	const params = new URLSearchParams(window.location.search);
	const tipoFiltro = params.get('tipo_filtro');
	if (alreadyImproved || tipoFiltro == 'M' || tipoFiltro == 'P') {
		return; // already improved
	}

	divTabelaProcesso = $('#divTabelaProcesso');
	divTabelaProcesso.css('overflow-y', 'visible');
	divTabelaProcesso.attr('tabIndex', '-1');
	divTabelaProcesso.addClass('hidden-force');

	// setup the new grid at top
	putat = $("#divFiltro");
	putat.after('<div id="aggridContainer" style="flex: 1 1 auto;"><div id="aggrid" class="ag-theme-balham"></div></div>');

	const gridOptions = {
		columnDefs: [
			{ field: "numero", headerName: "Número",
				cellRenderer: params => { return params.data.numero; },
				valueGetter: params => { return params.data.numero?.innerText; },
			},
			{ field: "responsavel", headerName: "Responsável", 
				cellRenderer: params => {
					if (params.node.rowPinned)
						return $(params.data.responsavel)[0]
					else
						return params.data.responsavel;
				},
				valueGetter: params => {
					if (params.node.rowPinned)
						return params.data.responsavel?.innerText;
					else
						return params.data.responsavel;
				},
				colSpan: params => params.node.rowPinned ? 2 : 1
			},
			{ field: "attributes", headerName: "Atributos",
				filter: { component: AttributesFilter, doesFilterPass: attributesFilterPass },
    			filterParams: {useForm: true, buttons: ["apply"], closeOnApply: true},
				cellRenderer: params => { return renderProcessAttributes(params.data.attributes); },
				valueGetter: params => { return params.data.attributes.join(", "); },
			},
			{ field: "flags", headerName: "Marcadores",
				filter: { component: FlagsFilter, doesFilterPass: flagsFilterPass },
    			filterParams: {useForm: true, buttons: ["apply"], closeOnApply: true},
				cellRenderer: params => { return $('<div>').append(params.data.flags).html(); },
				valueGetter: params => { 
					return params.data.flags ? params.data.flags.innerText : ''
				},
			},
			{ field: "annotations", headerName: "Anotações pessoais", 
				hide: true, editable: true, tooltipField: 'annotations'},
			{ field: "tipo", width: 250, headerName: "Tipo do processo", tooltipField: 'tipo'},
			{ field: "especificacao", headerName: "Especificação", tooltipField: 'especificacao',
				flex: 1, autoHeight: true },
		],
		defaultColDef: { filter: true },
		enableFilterHandlers: true,
		rowSelection: { mode: "multiRow", },
		tooltipShowMode: 'whenTruncated',
		tooltipShowDelay: 200,
		localeText: AG_GRID_LOCALE_BR,
		onFirstDataRendered: params => {
			params.api.autoSizeColumns(['numero', 'attributes', 'flags'])
		},
		onRowSelected: event => {
			event.node.data.checkbox.click();
		},
		onFilterChanged: function(params) {
        	const filterModel = params.api.getFilterModel();
        	localStorage.setItem('seidmais-filters', JSON.stringify(filterModel));
		},
		onGridReady: function(params) {
			const savedFilters = JSON.parse(localStorage.getItem('seidmais-filters'));
			if (savedFilters) {
        		params.api.setFilterModel(savedFilters);
			}
    	},
		onCellValueChanged: (params) => {
			favs = seidmaisFavorites();
			if (params.data.pid in favs) {
				favs[params.data.pid].annotations = params.data.annotations;
				update_storage(favs);
			}
		}
	};

	// shift+click removes the filter applyed to a column
	document.addEventListener('click', function(event) {
		const target = event.target;
		if (target.matches('span.ag-icon-filter') && event.shiftKey) {
			event.stopImmediatePropagation();
			event.preventDefault();
			column = $(event.target).closest('div[col-id]').attr('col-id');
			gridApi.setColumnFilterModel(column, null);
			gridApi.onFilterChanged();
		}
		if (overlay)
			overlay.remove()
	}, true);

	const myGridDiv = document.querySelector('#aggrid');
	gridApi = agGrid.createGrid(myGridDiv, gridOptions);
	set_grid_row_data(gridApi);
	set_footer_seidmais_image();
	set_saved_filters_button();

	// update grid height to screen size
	const resizeGrid = () => {
		const rect = myGridDiv.getBoundingClientRect();
		const offsetTop = rect.top + window.scrollY;
		const availableHeight = window.innerHeight + window.scrollY - offsetTop - 20;
		myGridDiv.style.height = availableHeight + 'px';
	}
	resizeGrid();
	$(window).on('resize', resizeGrid);
    
	commands = $("#divComandos");
	for(button of seidmais_buttons) {
		const btn = $(`<a href="#" tabindex=451><img src="${button.img}" alt="${button.label}" title="${button.label}"></a>`).on('click', button.onclick);
		commands.append(btn);
	}

	// improve divTabelaProcesso
	$('#divFiltro').append('<div class="divLink"><a id="toggleTabelaProcesso" class="ancoraPadraoPreta" tabindex="453">Mostrar/Ocultar tabela original do SEI</a></div>');
	$('#toggleTabelaProcesso').on('click', function() {
		divTabelaProcesso.toggleClass('hidden-force');
		if (!divTabelaProcesso.hasClass('hidden-force')) {
			setTimeout(() => divTabelaProcesso.trigger('focus'), 0);
		}
	});

	improveProcedimentoControlar.alreadyImproved = true;

	// improve header
	/*improveTables = ['#tblProcessosRecebidos', '#tblProcessosGerados']
	improveTables.forEach(tbl => {
		header = $(tbl + " tbody tr:first").detach();
		$(tbl).append("<thead></thead>");
		$(tbl + " thead").append(header);
		$(tbl + " thead tr").append("<th>Número</th><th>Responsável</th><th>Descrição</th>");
		$(tbl + " thead tr th").removeAttr('colspan').addClass('infraTh');
	});

	// color even rows
	$("tr:even").css("background-color", "color-mix(in oklab, var(--infra-esquema-cor-clara), white 95%)");

	// remove predefined width
	$('td').removeAttr('width');

	// add a new column with process details
	for (a of procs) {
		re = /infraTooltipMostrar\('([^']*)','([^']*)'\)/g
		parts = re.exec(a.outerHTML)
		if (parts) {
			cell = a.parentElement.parentElement.insertCell(-1)
			cell.innerText = parts[2] + '\n' + parts[1]
		}
	}*/
}

function getAllProcessDocs(icontent, callback) {

	const processNodes = (nodes) => {
		current_proc.docs = {};
		first = true;
		nodes.each(function(index, a) {
			
			if (first) { // skip process node
				first = false;
				return;
			}

			// skip items titled as this pattern (SEI folders)
			if ((/Pasta \d+/.test(a.title)) || 
				(/anchorAGUARDE\d+/.test(a.id))) {
				return;
			}

			doc = {};
			doc.needsign = true;
			doc.signed = false;
			doc.href = a.href;
			doc.ack = false;
			doc.privacy = 'public';

			span = $('span', a);
			if (span.length > 0) {
				doc.title = span.text();
				doc.spanid = span[0].id;
				doc.number = doc.title.match(/\(?([0-9]+)\)?$/)?.[1];
				doc.docid = doc.spanid.match(/\d+$/)?.[0];
			}

			// Infer the type looking at the document icon.
			prevIcon = $(a).prev();
			if (prevIcon.length > 0) {
				const notSignedTypes = ['pdf', 'email', 'email_cco', 'imagem', 'cancelado', 'zip', 'formulario2', 'anexado', 'sem_conteudo', 'html'];
				const match = prevIcon.html().match(/documento_(.+?)\.svg/);
				doc.type = match ? match[1] : null;
				if (notSignedTypes.includes(doc.type)) {
					doc.needsign = false;
				}
			}
			
			node = a.nextSibling;
			if (node.id.includes('anchorUG')) {
				doc.depto = $(node).find('span').text();
				node = node.nextSibling;
			}

			// search for signatures, restrito, sigiloso
			reSignName = /Assinado por:\n([^\"]+)/g
			while (node != null && node.nodeName != 'IMG') {
				img_src = $(node).find('img').attr('src') || ''
				if (img_src.includes('processo_restrito'))
					doc.privacy = 'restricted'
				else if (img_src.includes('processo_sigiloso'))
					doc.privacy = 'confidential'
				else if (img_src.includes('ciencia'))
					doc.ack = true
				else if (img_src.includes('assinatura')) {
					signatures = reSignName.exec(node.innerHTML);
					if (signatures) {
						parts = signatures[1].split('\n\n');
						if (parts.length > 0)
							doc.signed = true;
						
						doc.signs = [];
						parts.forEach(p => {
							sign_fields = p.split('\n');
							doc.signs.push(
								{'name': sign_fields[0], 
								 'role': sign_fields[1],
								 'depto': sign_fields[2]});
						});
					}
				}
				node = node.nextSibling;
			}
			current_proc.docs[doc.docid] = doc;
		});
	}
	
	const getAllDocsSrcs = (page_text) => {
		const regex_docid = /id_documento=([0-9]+)/;
		const regex_src = /Nos\[(\d+)\]\.src = '(.*)';/g;
		const matches = [...page_text.matchAll(regex_src)];
		for (const match of matches) {
			let docid = match[2].match(regex_docid)?.[1];
			if (match[2] == '') continue;
			if (!docid) {
				const idno = match[1];
				const regexid = new RegExp(`Nos\\[${idno}\\] = [^\\(]+\\("DOCUMENTO","(\\d+)`);
				const matchid = page_text.match(regexid);
				if (matchid)
					docid = matchid[1];
			}
			if (docid)
				current_proc.docs[docid].src = match[2];
		}
	}

	const processContentText = (nodes, doc) => {
		processNodes(nodes);
		getAllDocsSrcs(doc.text());
		callback();
	}

	// expand all folders
	openFoldersButton = $('[id^="anchorAP"]', icontent);
	if (openFoldersButton.length > 0) {
		getUrlDOMViaIframe(openFoldersButton[0].href, function(doc) {
			nodes = $('.infraArvoreNo', doc);
			processContentText(nodes, $(doc))
		});
	} else {
		nodes = $('.infraArvoreNo', icontent);
		processContentText(nodes, $(icontent));
	}
}

function validateProcess() {
	items = $('#validationDivItems', $('#ifrArvore').contents());
	items.children().empty();
	elements = 0;
	validation = pValidations.filter(i => i.type == current_proc.type);
	if (validation.length > 0) {
		stages = validation[0].stages;
		stages.forEach(stage => {
			stageDiv = $(`<div style="padding-left: 10px; font-weigth: bold;">Etapa de ${stage.name}</img>`);
			elementsState = 0;

			// needed documents
			stage.neededDocs.forEach(docspec => {
				procDoc = Object.values(current_proc.docs).filter(i => i.title.includes(docspec.title));
				if (procDoc == null || procDoc.length == 0) {
					msg = docspec.title;
					if (docspec.warn)
						msg += ': ' + docspec.warn;
					error = $(`<div style="cursor: pointer; padding-left: 20px;"><img class="sdmicon" src="svg/exclamacao.svg"></img>${msg}</div>`);
					error.on('click', function() {
						addNewDocument(docspec.title);
					});

					stageDiv.append(error);
					elementsState++;
				}
			});

			if (elementsState > 0) {
				items.append(stageDiv);
			}
			elements += elementsState;
		});
	}
	
	// check signatures
	Object.values(current_proc.docs).forEach(doc => {
		if (doc.needsign && !doc.signed) {
			error = `<div><a href="#" onclick="$('#${doc.spanid}').click()"><img class="sdmicon" src="svg/exclamacao.svg"></img> Documento não assinado: ${doc.title}</a></div>`;
			items.append(error);
			elements++;
		}
	});

	// check assignment
	[open_entry] = current_proc.opened_in.filter(x => x.depto == current_depto.depto);
	if (!current_proc.closed && open_entry && !open_entry.assigned_to) {
		action = saved_actions['procedimento_atribuicao_cadastrar'] || '#';
		error = `<div><a target="ifrVisualizacao" href="${action}"><img class="sdmicon" src="svg/exclamacao.svg"></img>Atribua o processo a um responsável</a></div>`;
		items.append(error);
		elements++;
	}

	if (elements == 0) {
		items.append('<div><img class="sdmicon" src="svg/ciencia.svg"></img> Validação concluída, nenhuma recomendação.<div>');
	}
}

// save relevant URLs for actions
function saveRelevantActions(iframe) {
	src = iframe.attr('src');
	if (src.match(/acao=arvore_visualizar/)) {
		
	}
	ivisualizacao = iframe.contents();
	
	// capture all action
	$('#divArvoreAcoes a', ivisualizacao).each(function() {
		const match = this.href.match(/(controlador\.php\?acao=([^&']+)[^']*)/);
		if (match) {
			href = match[1];
			acao = match[2];
			saved_actions[acao] = href;
		}
	});

	// capture e-mail action
	const match = ivisualizacao.text().match(/controlador.php\?acao=procedimento_enviar_email[^']+/)
	if (match)
		saved_actions['procedimento_enviar_email'] = match[0];
	
	/*  Processo aberto nas unidades:
		DAD (atribuído para eryka.laiany)
		ICET (atribuído para kamila_coelho)
		Processo aberto somente na unidade ICET (atribuído para rafmatos).
		Processo não possui andamentos abertos.
		Processo aberto nas unidades:
		PDIRET
		SEINFRA (atribuído para claudinei.avila)
		Processo aberto somente na unidade PDIRET.
		*/
	info = $("#divArvoreInformacao", ivisualizacao)[0]?.innerText || '';
	current_proc.closed = info.includes('não possui andamentos abertos');
	if (current_proc.closed) {
		current_proc.opened_in = [];
	} else {
		info = info.replace(/Processo aberto.*na[s]? unidade[s]?[:]?/, '');
		info = info.replace(/\.\n$/, '\n');
		names = $("#divArvoreInformacao a", ivisualizacao);
		const get_user_name = (user_id) => {
			return names.filter((_,x) => x.innerText == user_id).attr('title');
		}
		// match with assigned_to
		matches = info.matchAll(/(\w+)\s+\(atribuído para ([^)]+)\)/gm)
		op = [...matches.map(m => ({depto: m[1], assigned_to: get_user_name(m[2])}))];
		// open without assigned_to
		matches = info.matchAll(/(\w+)\n/gm)
		op = op.concat([...matches.map(m => ({depto: m[1]}))]);
		current_proc.opened_in = op;
	}

	const validateProcId = setInterval(() => {
		// aguarda documentos para validar
		if (current_proc.docs) {
			validateProcess();
			clearInterval(validateProcId);
		}
	}, 500);
}

async function ifrVisualizacaoLoadTo(href) {
	const iframe = document.getElementById('ifrVisualizacao');
    const promise = new Promise(resolve => {
        const onLoadAssign = () => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            $(doc).ready(() => {
        		resolve(doc);
    		});
        };
        iframe.addEventListener('load', onLoadAssign, { once: true });
    });
    setTimeout(()=>{ iframe.src = href; }, 0);
    return await promise;
}

function setupProcedimentoTrabalhar() {
	current_proc = {};
	first = true;
	$("#ifrVisualizacao").on('load', function() {
		href = this.contentWindow.location.href;
		if (href.includes('id_documento'))
			return;
		iframe = $(this);
		saveRelevantActions(iframe);
		// the ifrArvore is alread load at this point
		if (first) {
			// run only in the first time
			first = false;
			improveProcedimentoTrabalhar($('#ifrArvore'));
		}
		improveIfrVisualizacao();
	});

	$("#ifrArvore").on('load', function() {
		// after reload ifrArvore, re-improve the iframe
		improveProcedimentoTrabalhar($(this));
	});
	
	setupSidePanel($('#divConteudo'), false);
}


function setupSidePanel(containerDiv, editor = false) {
    const sideUI = $(`
        <div id="seidmais-divider" class="divLinha"></div>
        <div id="seidmais-sidepanel">
			<div id="kb-content" style="display: none">
				<span style="padding: 10px">Nenhuma base de conhecimento para este processo.</span>
			</div>
            <div id="ai-content" style="display: none">
                <div id="ai-chat-history"></div>
				<div id="ai-chat-bottom">
                	<div id="ai-chat-input" contenteditable="true" data-placeholder="Pergunte sobre o processo ou documento..."></div>
					<div id="ai-chat-tools">
						<img id="chat-add-btn" title="Exemplos"></img>
					</div>
					<div id="ai-menu-container" style="position: relative;"></div>
				</div>
            </div>
        </div>
        <div id="sidepanel-buttons" class="sdm-flex-column">
            <div id="btn-show-kb" class="sdm-flex-column">
                <span class="sdm-vertical-text">Base de conhecimento</span></img>
				<img src="svg/base_conhecimento.svg">
            </div>
            <div id="btn-show-ai" class="sdm-flex-column">
				<span class="sdm-vertical-text">IA</span></img>
				<img id="seidmais-ai-btn">
			</div>
        </div>
    `);

    sideUI.appendTo(containerDiv);
	$('#seidmais-ai-btn').attr('src', chrome.runtime.getURL('images/ai.png'));
	$('#btn-show-ai').on('click', showAIPanel);
	$('#btn-show-kb').on('click', showKBPanel);

	$('#chat-add-btn').attr('src', chrome.runtime.getURL('images/add.svg'));

    setup_ai_panel(editor);
}

function showAIPanel() {
	isActive = $('#btn-show-ai').hasClass('active');
	$('#sidepanel-buttons div').removeClass('active');
	if (isActive) {
		$('#seidmais-sidepanel').hide();
		return;
	}
	$('#btn-show-ai').addClass('active');
	$('#ai-content').show();
	$('#kb-content').hide();
	$('#seidmais-sidepanel').show();
	$('#ai-chat-input').focus();
	
	getUserAIHistoryForProcess();
}

async function showKBPanel() {
	isActive = $('#btn-show-kb').hasClass('active');
	$('#sidepanel-buttons div').removeClass('active');
	if (isActive) {
		$('#seidmais-sidepanel').hide();
		return;
	}
	$('#btn-show-kb').addClass('active');
	$('#ai-content').hide();
	kbs = await getKnowledgeBase();
	kbsHtml = $('<div>');
	for(kb in kbs)
		kbsHtml.append(kbs[kb].html);
	$('#kb-content').empty();
	$('#kb-content').append(kbsHtml);
	$('#kb-content').show();
	$('#seidmais-sidepanel').show();
}

async function improveIfrVisualizacao() {
	ivisualizacao = $("#ifrVisualizacao").contents();

	// add save to my process button
	saction = saved_actions['procedimento_consultar'] || saved_actions['procedimento_alterar']
	if (saction) {
		button = seidmais_buttons[0]; // add is at the first position
		const btn = $(`<a href="#" tabindex=451><img src="${button.img}" alt="${button.label}" title="${button.label}"></a>`);
		btn.on('click', async function() {
			// get tipo and especificacao through Consultar Processo URL
			url = saction;
			content = await getUrlContent(url, 'iso-8859-1');
			tipo = content.find('#selTipoProcedimento  option:selected').text();
			especificacao = content.find('#txtDescricao').val();

			save_item = {};
			save_item.pid = current_proc.pid;
			save_item.attributes = [];
			save_item.hasflags = [];
			save_item.flags = '';
			save_item.tipo = tipo;
			save_item.especificacao = especificacao;
			save_item.num = getSmallProcessNumber(current_proc.num);
			save_item.annotations = '';
			
			[open_entry] = current_proc.opened_in.filter(x => x.depto == current_depto.depto);
			if (open_entry.responsavel)
				save_item.responsavel = toTitleCaseBrazilian(open_entry.responsavel);
			
			add_to_my_processes_from_trabalhar(save_item);
		});
		$('#divArvoreAcoes', ivisualizacao).append(btn);
	}
}

function improveProcedimentoTrabalhar(ifrArvore) {
	let icontent = ifrArvore.contents();
	if (icontent.length <= 0)
		icontent = document;

	// create validation div
	validationDiv = document.createElement('div');
	validationDiv.id = 'validationDiv';

	validationDivTitle = document.createElement('div');
	validationDivTitle.id = "validationDivTitle";
	validationDivTitle.style.borderTop = "solid .1em #b0b0b0";
	validationDivTitle.style.marginTop = "5px";
	validationDivTitle.style.paddingTop = "5px";
	validationDivTitle.innerHTML = 
		'<a href="#" onclick="window.postMessage({type:\'revalidate\'},\'*\');" style="font-size: .9rem; text-decoration: none;">' +
		'  <img style="width: 20px; vertical-align: sub" title="Revalidar" src="svg/processo_relacionados.svg?11"></img>' +
		'  Validação do processo</a>';
	
	validationDivItems = document.createElement('div');
	validationDivItems.id = 'validationDivItems';
	validationDivItems.style.paddingLeft = "20px";

	validationDiv.appendChild(validationDivTitle);
	validationDiv.appendChild(validationDivItems);

	$("#validationDiv", icontent).remove(); // remove previous validation
	$("#frmArvore", icontent)[0].appendChild(validationDiv);
	$(validationDiv).animate({ opacity: 1 }, 400);

	// add an event listener to receive requests of process revalidation
	ifrArvore[0].contentWindow.addEventListener('message', (evt) => {
		if (evt.data.type == 'revalidate') {
			validateProcess();
		}
	}, false);
	
	current_proc.pid = $("#topmenu a", icontent)[0].id.replace('anchorImg', '');
	current_proc.num = $('#span' + current_proc.pid, icontent)[0].innerText;
	current_proc.type = getProcessType(icontent);
	getAllProcessDocs(icontent, function() {
		localStorage.setItem('current_proc', JSON.stringify(current_proc));
	});
}

function getProcessType(icontent) {
	// the DOM element with #topmenu id has 
	// some a elements. The one with class .infraArvoreNo
	// has the process type in its title

	topnode = $("#topmenu>a.infraArvoreNo", icontent)
	if (topnode.length > 0) {
		return topnode[0].title
	}
	return null;
}

function getKnowledgeBaseURL(icontent) {
	// the DOM element with #anchorBC id has 
	// the URL to the knowledge base

	kbs = $("#anchorBC", icontent);
	if (kbs.length > 0) {
		return kbs[0].href
	}
	return null;
}

function addNewDocument(form_name) {
	// get button new document URL
	ivisualizacao = $('#ifrVisualizacao');
	
	// create a temporary iframe to hold the choose list (where the new doc is selected)
	const iframe = document.createElement('iframe');
	iframe.style.display = 'none';
	document.body.appendChild(iframe);
	iframe.onload = function(event) {
		const doc = iframe.contentDocument || iframe.contentWindow.document;
		if ($('#ancExibirSeries', iframe.contentDocument).attr('onclick').includes("'T'")) {
			// button to list all is shown
			doc.getElementById('hdnFiltroSerie').value = 'T';
			doc.getElementById('frmDocumentoEscolherTipo').submit();
		} else {
			// there's a tr inside tblSeries with data-sec = lower(form_name)
			const tr = $("#tblSeries tr", iframe.contentDocument).filter(function() {
				new_form_name = form_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
				return $(this).attr('data-desc') === new_form_name.toLowerCase();
			});
			// the first a.ancoraOpcao is the doc href
			href = $("a.ancoraOpcao", tr).first().attr('href');
			ivisualizacao.attr('src', href);

			iframe.remove();
		}
	};
	iframe.src = saved_actions['documento_escolher_tipo'];
}

async function getUrlContent(url, encoding = 'utf-8') {
    const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	const decoder = new TextDecoder(encoding);
	const text = decoder.decode(buffer);
    return $('<div>').html(text);
}

function getUrlDOMViaIframe(url, callback) {
	const iframe = $('<iframe>', {
		src: url,
		style: 'display: none'
	}).appendTo('body');

	iframe.on('load', function () {
		try {
			const doc = this.contentDocument || this.contentWindow.document;
			$(doc).ready(() => {
				callback(doc);
			});
		} catch (e) {
			console.error('Erro ao acessar iframe:', e);
		} finally {
			iframe.remove();
		}
	});
}

async function getKnowledgeBase() {
    if (!getKnowledgeBase.base) {
        iarvore = $("#ifrArvore").contents();
        url = getKnowledgeBaseURL(iarvore);
        getKnowledgeBase.base = await getKnowledgeBaseContent(url);
    }
	return getKnowledgeBase.base;
}

async function getKnowledgeBaseContent(url) {
	if (!url)
		return null;

	// create a div to temporarily hold the Knowledge Base items
	var tempdiv = jQuery('<div>', {id: 'tempdiv', display: "hidden"}).appendTo("body");

    var resolveFunc;
    const promise = new Promise(function(resolve, _) {
        resolveFunc = resolve;
    });

	tempdiv.load(url + " #divInfraAreaGlobal", async function() {
		// in the loaded url, the div #divInfraAreaGlobal has
		// a table with three <a> elements per row:
		// - first: has the unit abbreviation
		// - second: has the kb article link
		// - third: has the user name

		var kbs = {};
		var links = $("a.ancoraSigla");
		for(i = 0; i < links.length; i += 3) {
			href = links[i+1].href;
			html = await loadKb(href, tempdiv);
			kbs[links[i].innerText] = {};
			kbs[links[i].innerText].html = html;
			cleaner_html = $(html).clone().find('style').remove().end();
			txt = cleaner_html[0].innerText;
			txt = txt.replaceAll(/[\n\t]+/g, ' ');
			kbs[links[i].innerText].txt = txt;
		}

		tempdiv.remove();
		resolveFunc(kbs);
	});

	return promise;
}

async function loadKb(href, tempdiv) {
    var resolveFunc;
    const promise = new Promise(function(resolve, _) {
        resolveFunc = resolve;
    });

	// the :topmost selector here prevents script execution
	tempdiv.load(href + " :topmost", function() {
		// now, tempdiv has the html of the kb article
		tempdiv.find("meta").remove();
		tempdiv.find("title").remove();
		// UFJ header and process type
		tempdiv.find("div").first().remove();
		tempdiv.find("p").first().remove();

		tempdiv.find("a").each(function () {
			// fix a elements without origin
			relativeHref = this.getAttribute('href')
			if (relativeHref && relativeHref.search("://") == -1) {
				// this.href has the origin added by the browser
				this.setAttribute('href', this.href);
			}
		});

		html = tempdiv[0];
		resolveFunc(html);
	});

	return promise;
}

let overlay = null

function set_saved_filters_button() {
	filter_btn = $(`<img id="btn-saved-filter-menu" class="seidmais-marker" src="${chrome.runtime.getURL('images/star-menu.svg')}"></img>`);
	menu_filter = $(`<div id="filters-menu-container" style="position: relative;"></div>`)
	$('.ag-cell-label-container').last().find('.ag-header-cell-filter-button').before(filter_btn);
	filter_btn.on('click', (e) => {
		e.preventDefault()
		e.stopPropagation()
		if (overlay && document.body.contains(overlay)) {
			overlay.remove()
			overlay = null
			return
		}
		renderOverlay()
    });
}

function storageKey() {
	return 'seidmais-saved-filters';
}

const Store =
    window.__SEID_STORE__ ||
    (window.__SEID_STORE__ = {
      all() {
        try {
          return JSON.parse(localStorage.getItem(storageKey()) || "{}")
        } catch {
          return {}
        }
      },
      write(o) {
        localStorage.setItem(storageKey(), JSON.stringify(o))
      },
      list() {
        return Object.keys(this.all()).sort((a, b) => a.localeCompare(b))
      },
      get(n) {
        return this.all()[n]
      },
      put(n, m) {
        const a = this.all()
        a[n] = m
        this.write(a)
      },
      del(n) {
        const a = this.all()
        delete a[n]
        this.write(a)
      },
    })

function pickGridApi() {
	return gridApi;
}

// limpa todos os filtros da grid
function clearAllFilters() {
	gridApi.setFilterModel(null);
	// apaga eventual persistência da tela principal
	try {
		localStorage.removeItem("seidmais-filters")
	} catch {}
}


function renderOverlay() {
    const names = Store.list()
    const items = names.map((n) => `
		<div class="seid-filter-item" data-action="apply" data-name="${encodeURIComponent(n)}">
		<span class="seid-filter-name" title="${n}">${n}</span>
		<span class="seid-filter-actions">
			<span class="seid-filter-link" data-action="rename" data-name="${encodeURIComponent(n)}">renomear</span>
			<span class="seid-filter-link" data-action="delete" data-name="${encodeURIComponent(n)}">excluir</span>
		</span>
		</div>`).join("")

    const html = `
		<div class="seid-filter-overlay" data-seid-overlay>
		<div class="seid-filter-item" data-action="save"><strong>＋ Salvar filtro atual…</strong></div>
		<div class="seid-filter-item" data-action="clear_all" style="border-top:1px dashed #ddd; padding-top:.4rem; margin-top:.2rem;">
			<strong>Limpar filtros</strong>
		</div>
		<div class="seid-filter-group" style="margin-top:.4rem;">
			${
			items ||
			'<div class="seid-filter-empty">Nenhum filtro salvo.</div>'
			}
		</div>
		</div>`
	
    const t = document.createElement("template")
    t.innerHTML = html.trim()
	overlay = t.content.firstChild
	document.body.appendChild(overlay)

	$('.seid-filter-item[data-action="save"]').on('click', onOverlayAction);
	$('.seid-filter-item[data-action="clear_all"]').on('click', onOverlayAction);
	$('.seid-filter-link').on('click', onOverlayAction);
	$('.seid-filter-name').on('click', onOverlayAction);

	positionOverlay()
}

function positionOverlay() {
	btn = $('#btn-saved-filter-menu')[0]
	const r = btn.getBoundingClientRect()
	// alinha o menu ao botão, do lado esquerdo
	overlay.style.left = Math.max(8, Math.min(window.innerWidth - overlay.offsetWidth - 8, r.left)) +
	"px"

	// abre pra cima se faltar espaço
	const openUp = window.innerHeight - r.bottom < overlay.offsetHeight + 24
	overlay.style.top =
	(openUp ? r.top - overlay.offsetHeight - 6 : r.bottom + 6) + "px"
}

const onOverlayAction = (e) => {
	const t = e.target.closest("[data-action]")
	if (!t) return
	const action = t.getAttribute("data-action")
	const name = decodeURIComponent(t.getAttribute("data-name") || "")

	if (action === "save") {
		const newName = prompt("Nome do filtro:", "Novo filtro")
		if (!newName) return
		if (Store.get(newName) &&
			!confirm(`O filtro "${newName}" já existe. Substituir?`))
			return
		Store.put(newName, gridApi.getFilterModel())
		renderOverlay()
	}

	if (action === "apply") {
		const model = Store.get(name)
		if (model)
			gridApi.setFilterModel(model)
		overlay.remove()
	}

	if (action === "rename") {
		const newName = prompt(`Novo nome para "${name}":`, name)
		if (!newName || newName === name) return
		const model = Store.get(name)
		if (!model) return
		Store.del(name)
		Store.put(newName, model)
		renderOverlay()
	}

	if (action === "delete") {
		if (!confirm(`Excluir filtro "${name}"?`)) return
		Store.del(name)
		renderOverlay()
	}

	if (action === "clear_all") {
		clearAllFilters()
		overlay.remove()
	}
}
