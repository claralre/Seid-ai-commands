
const sei_proc_url = 'controlador.php?acao=procedimento_trabalhar&id_procedimento=';

// local storage for favorite processes
const fav_storage_entry = 'seidmais-favorites'

function seidmaisFavorites() {
    favs = JSON.parse(localStorage.getItem(fav_storage_entry));
    if (!favs)
        favs = {}
    return favs;
}

// context vars for the context menu
var selected_grid_row;
var gridApi;

function set_footer_seidmais_image() {
    $('.ag-row-pinned').css('background-image', `url(${chrome.runtime.getURL('images/seidmais-128.png')})`);
}

function show_my_processes(agGrid) {
    gridApi = agGrid;

    fav_procs = [];
    favs = seidmaisFavorites();
    for(p in favs) {
        proc = {...favs[p]};
        proc.flags = $(proc.flags)[0];
        proc.numero = $(`<a target="_blank" href="${sei_proc_url}${proc.pid}">${proc.num}</a>`)[0];
        fav_procs.push(proc);
    }

    // header in goldenrod
    document.querySelectorAll('.ag-header-row').forEach(el => {
        el.style.setProperty('background-color', 'goldenrod', 'important');
    });

    // disable SEI filters
    $('#divFiltro div').hide();
    $('#divFiltro').append('<div class="divLink"><a class="ancoraPadraoPreta" onclick="location.reload();" tabindex="453">Voltar para lista de processos</a></div>');

    // context menu
    setupContextMenu(agGrid);

    // change the column flags by annotations
    agGrid.setColumnsVisible(['flags'], false);
    agGrid.setColumnsVisible(['annotations'], true);

    // set data in the grid
    agGrid.setFilterModel(null);
    agGrid.setGridOption('rowSelection', undefined);
    agGrid.setGridOption('rowData', fav_procs);
	agGrid.setGridOption('pinnedBottomRowData', [{}]);
    set_footer_seidmais_image();
}

function download_my_processes() {
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(seidmaisFavorites())], {type: 'text/plain'});
    a.href = URL.createObjectURL(file);
    a.download = 'seidmais-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
}

function update_storage(favorites) {
    localStorage.setItem(fav_storage_entry, JSON.stringify(favorites));
}

function add_to_my_processes_from_trabalhar(data) {
    // get a fresh version of seidmaisFavorites 
    favs = seidmaisFavorites();
    if (data.pid in favs)
        data.annotations = favs[data.pid].annotations;
    favs[data.pid] = data;
    update_storage(favs);
    alert('O processo foi adicionado aos favoritos pessoais.');
}

function add_to_my_processes(agGrid) {
    const selectedRows = agGrid.getSelectedRows();
    if (selectedRows.length == 0)
        alert('Nenhum processo selecionado.');
    else {
        favs = seidmaisFavorites();
        selectedRows.forEach(row => {
            save_item = {}
            save_item.pid = row.pid;
            save_item.attributes = row.attributes;
            save_item.hasflags = row.hasflags;
            save_item.flags = row.flags.outerHTML;
            save_item.responsavel = row.responsavel;
            save_item.tipo = row.tipo;
            save_item.especificacao = row.especificacao;
            save_item.num = row.numero.innerText;
            save_item.annotations = '';
            favs[row.pid] = save_item;
		});
        
        update_storage(favs);
        alert('O(s) processo(s) foram adicionados aos favoritos pessoais.');
    }
}

function handleDelete() {
    favs = seidmaisFavorites();
    delete favs[selected_grid_row.pid];
    update_storage(favs);
    gridApi.applyTransaction({ remove: [selected_grid_row] });
}

function setupContextMenu(agGrid) {
    document.addEventListener('click', () => {
        document.getElementById('seidmais-favorites-row-menu').style.display = 'none';
    });

    document.getElementById('aggrid').addEventListener('contextmenu', function(e) {
        e.preventDefault(); // don't show browser context menu
    });

    agGrid.addEventListener('cellContextMenu', function(params) {
        showFavoritesMenu(params.event.clientX, params.event.clientY, params);
    });

    const menu = `
        <div id="seidmais-favorites-row-menu">
            <div id="seidmais_favmenu_delete" class"menu-item">Remover dos favoritos</div>
        </div>`;
    const menudiv = document.getElementById('seidmais-favorites-row-menu');
    if (!menudiv) {
        $('body').append(menu);
        $('#seidmais_favmenu_delete').on('click', handleDelete);
    }
}

function showFavoritesMenu(x, y, row) {
    if (!row.node.rowPinned) {
        selected_grid_row = row.data;
        const menu = document.getElementById('seidmais-favorites-row-menu');
        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;
        menu.style.display = 'block';
    }
}
