

jQuery.extend(jQuery.expr[':'], {
	topmost: function (e, index, match, array) {
		// first parent is a div (jquery body replacement?)
		return e.parentElement.parentElement == null;
	}
});

function toTitleCaseBrazilian(name) {
  if (!name) return;
  const particles = ['da', 'de', 'do', 'das', 'dos'];
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (particles.includes(word) && index > 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getSalt() {
    const el = document.getElementById('hdnInfraPrefixoCookie');
    return el ? el.value : '';
}

function encodeKey(key) {
    const salt = getSalt();
    const xored = key.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    return btoa(xored);
}

function decodeKey(encoded) {
    const salt = getSalt();
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch (err) {  
    }
    return decoded.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
}

function cleanTextForAI(str) {
    return str
        .replace(/\u00A0/g, ' ')               // nbsp → space
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
        .replace(/\u00AD/g, '')                // soft hyphen
        .replace(/[\u2028\u2029]/g, '\n')      // normalize separators
        .replace(/[\u202A-\u202E\u2066-\u2069]/g, '') // bidi controls
        .replace(/[ \t]+/g, ' ')               // collapse spaces/tabs
        .replace(/\s*\n\s*/g, '\n')            // trim around newlines
        .trim();
}

async function loadPdfJs() {
  if (!loadPdfJs.pdfjsLib) {
    loadPdfJs.pdfjsLib = await import(chrome.runtime.getURL('pdfjs/pdf.min.mjs'));
    loadPdfJs.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdfjs/pdf.worker.min.mjs');
  }
  return loadPdfJs.pdfjsLib;
}
