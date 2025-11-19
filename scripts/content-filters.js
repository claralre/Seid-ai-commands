let id = 1;

function attributesFilterPass({ model, node, handlerParams }) {
    if (model == null || model.all)
        return true;
    else {
        handlerParams.getValue(node);
        if (node.data.attributes.length == 0)
            return false;
        else {
            const intersection = node.data.attributes.filter(value => model.selected.includes(value)) 
            return intersection.length > 0;
        }
    }
}

class AttributesFilter  {
    eGui;
    ffAllCheckbox;
    checkboxCount;

    init(params) {
        this.eGui = document.createElement('div');
        var jeGui = $(this.eGui);
        jeGui.addClass('flags-filter');
        jeGui.append('<label><input type="checkbox" value="all" checked> Todos</label><br>');
        this.ffAllCheckbox = jeGui.find('input');

        const onAnyCheckboxChange = (event) => {
            if (event.target.checked !== this.ffAllCheckbox.is(':checked'))
                this.ffAllCheckbox[0].indeterminate = true;
            this.updateModel(params);
        }

        this.checkboxCount = 0;
        const entries = Object.entries(attrToImage).sort((a, b) => a[1].localeCompare(b[1]));
        for (const [value, image] of entries) {
            const input = $(`<input type="checkbox" value="${value}" checked>`);
            input.on('change', onAnyCheckboxChange);
            const imageSrc = chrome.runtime.getURL(`images/${image}.svg`);
            jeGui.append($(`<label>`).append(input).append(
                `<img src="${imageSrc}"/> ${value}</label><br>`));
            this.checkboxCount++;
        }

        const onAllCheckboxChange = () => {
            const checked = this.ffAllCheckbox.is(':checked');
            jeGui.find('input[type="checkbox"]').prop('checked', checked);
            this.updateModel(params);
        };

        this.ffAllCheckbox.on('change', onAllCheckboxChange);

        this.refresh(params);
    }


    updateModel(params) {
        var jeGui = $(this.eGui);
        var new_model = {'all': true, 'selected': []};
        jeGui.find('input[type="checkbox"]').each(function() {
            if (this.checked && this.value != 'all')
                new_model.selected.push(this.value);
        });
        new_model.all = (new_model.selected.length == this.checkboxCount);
        params.onStateChange({
            model: new_model
        });
        if (!params.buttons?.includes('apply')) {
            params.onAction('apply');
        }
    }

    refresh(params) {
        var jeGui = $(this.eGui);
        let model = params.state?.model || params.model
        if (model == null || model.all)
            jeGui.find('input[type="checkbox"]').prop('checked', true);
        else {
            jeGui.find('input[type="checkbox"]').each(function() {
                const idx = model.selected.indexOf(this.value);
                this.checked = idx != -1;
            });
        }
        return true;
    }

    getGui() {
        return this.eGui;
    }
}


function flagsFilterPass({ model, node, handlerParams }) {
    if (model == null || model.all)
        return true;
    else {
        handlerParams.getValue(node);
        if (node.data.flags.length == 0)
            return false;
        else {
            result = false;
            for(src of node.data.hasflags) {
                if (model.selected.indexOf(src) != -1) {
                    result = true;
                    break;
                }
            }
            return result;
        }
    }
}

class FlagsFilter  {
    eGui;
    ffAllCheckbox;
    checkboxCount;

    init(params) {
        this.eGui = document.createElement('div');
        var jeGui = $(this.eGui);
        jeGui.addClass('flags-filter');
        jeGui.append('<label><input type="checkbox" value="all" checked> Todos</label><br>');
        this.ffAllCheckbox = jeGui.find('input');

        const onAnyCheckboxChange = (event) => {
            if (event.target.checked !== this.ffAllCheckbox.is(':checked'))
                this.ffAllCheckbox[0].indeterminate = true;
            this.updateModel(params);
        }

        this.checkboxCount = 0;
        const entries = Object.entries(identifiedFlags).sort((a, b) => a[1].localeCompare(b[1]));
        for (const [src, label] of entries) {
            const input = $(`<input type="checkbox" value="${src}" checked>`);
            input.on('change', onAnyCheckboxChange);
            jeGui.append($(`<label>`).append(input).append(`<img src="${src}"/> ${label}</label><br>`));
            this.checkboxCount++;
        }
        
        const onAllCheckboxChange = () => {
            const checked = this.ffAllCheckbox.is(':checked');
            jeGui.find('input[type="checkbox"]').prop('checked', checked);
            this.updateModel(params);
        };

        this.ffAllCheckbox.on('change', onAllCheckboxChange);

        this.refresh(params);
    }


    updateModel(params) {
        var jeGui = $(this.eGui);
        var new_model = {'all': true, 'selected': []};
        jeGui.find('input[type="checkbox"]').each(function() {
            if (this.checked && this.value != 'all')
                new_model.selected.push(this.value);
        });
        new_model.all = (new_model.selected.length == this.checkboxCount);
        params.onStateChange({
            model: new_model
        });
        if (!params.buttons?.includes('apply')) {
            params.onAction('apply');
        }
    }

    refresh(params) {
        var jeGui = $(this.eGui);
        let model = params.state?.model || params.model
        if (model == null || model.all)
            jeGui.find('input[type="checkbox"]').prop('checked', true);
        else {
            jeGui.find('input[type="checkbox"]').each(function() {
                const idx = model.selected.indexOf(this.value);
                this.checked = idx != -1;
            });
        }
        return true;
    }

    getGui() {
        return this.eGui;
    }
}
