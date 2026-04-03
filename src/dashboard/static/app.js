/* === SSE Stream Handler === */
function streamAction(url, outputEl, onDone) {
    outputEl.innerHTML = '';
    const source = new EventSource(url);

    source.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.done) {
            source.close();
            const line = document.createElement('div');
            line.className = 'done';
            line.textContent = data.message || 'Done!';
            outputEl.appendChild(line);
            if (onDone) onDone(data);
            return;
        }
        if (data.error) {
            source.close();
            const line = document.createElement('div');
            line.className = 'error';
            line.textContent = 'Error: ' + data.error;
            outputEl.appendChild(line);
            return;
        }
        const line = document.createElement('div');
        line.className = 'step';
        line.textContent = data.message;
        outputEl.appendChild(line);
        outputEl.scrollTop = outputEl.scrollHeight;
    };

    source.onerror = function() {
        source.close();
        const line = document.createElement('div');
        line.className = 'error';
        line.textContent = 'Connection lost.';
        outputEl.appendChild(line);
    };

    return source;
}

/* === Compile === */
function startCompile(full) {
    const btn = document.getElementById('compile-btn');
    const fullBtn = document.getElementById('compile-full-btn');
    const output = document.getElementById('compile-output');
    if (btn) btn.disabled = true;
    if (fullBtn) fullBtn.disabled = true;
    output.style.display = 'block';

    const url = full ? '/api/compile/stream?full=1' : '/api/compile/stream';
    streamAction(url, output, function(data) {
        if (btn) btn.disabled = false;
        if (fullBtn) fullBtn.disabled = false;
        if (data.stats) {
            const line = document.createElement('div');
            line.className = 'done';
            line.textContent = `Summarized: ${data.stats.summarized}, Concepts: ${data.stats.concepts}, Topics: ${data.stats.topics}`;
            output.appendChild(line);
        }
    });
}

/* === Ingest === */
function runIngest() {
    const btn = document.getElementById('ingest-btn');
    const result = document.getElementById('ingest-result');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Scanning...';

    fetch('/api/ingest', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            btn.disabled = false;
            btn.textContent = 'Scan raw/';
            result.innerHTML = `<div class="flash flash-success">Ingest complete: ${data.new} new, ${data.modified} modified, ${data.unchanged} unchanged</div>`;
            if (data.new > 0 || data.modified > 0) {
                setTimeout(() => location.reload(), 1500);
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.textContent = 'Scan raw/';
            result.innerHTML = `<div class="flash flash-error">Error: ${err.message}</div>`;
        });
}

/* === File Upload === */
function setupDropzone() {
    const dz = document.getElementById('dropzone');
    if (!dz) return;
    const fileInput = document.getElementById('file-input');

    dz.addEventListener('click', () => fileInput.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('dragover');
        uploadFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
}

function uploadFiles(files) {
    const result = document.getElementById('upload-result');
    const formData = new FormData();
    for (const f of files) formData.append('files', f);

    result.innerHTML = '<div class="flash flash-success">Uploading...</div>';
    fetch('/api/upload', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            result.innerHTML = `<div class="flash flash-success">Uploaded ${data.count} file(s) to raw/articles/</div>`;
            setTimeout(() => location.reload(), 1500);
        })
        .catch(err => {
            result.innerHTML = `<div class="flash flash-error">Upload failed: ${err.message}</div>`;
        });
}

/* === Q&A === */
function askQuestion() {
    const input = document.getElementById('qa-input');
    const question = input.value.trim();
    if (!question) return;

    const btn = document.getElementById('qa-btn');
    const steps = document.getElementById('qa-steps');
    const answer = document.getElementById('qa-answer');
    btn.disabled = true;
    steps.style.display = 'block';
    steps.innerHTML = '';
    answer.innerHTML = '';

    const url = '/api/qa/stream?q=' + encodeURIComponent(question);
    streamAction(url, steps, function(data) {
        btn.disabled = false;
        if (data.answer) {
            answer.style.display = 'block';
            answer.innerHTML = data.answer;
        }
    });
}

/* === Search === */
function liveSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const query = input.value.trim();
    if (!query) { results.innerHTML = ''; return; }

    fetch('/api/search?q=' + encodeURIComponent(query))
        .then(r => r.json())
        .then(data => {
            if (!data.results.length) {
                results.innerHTML = '<div class="search-result"><p style="color: var(--text-muted)">No results found.</p></div>';
                return;
            }
            results.innerHTML = data.results.map(r => `
                <div class="search-result">
                    <span class="score">${r.score.toFixed(2)}</span>
                    <h3><a href="/wiki/${r.path}">${r.title}</a></h3>
                    <div class="path">${r.path}</div>
                    <div class="snippet">${r.snippet}</div>
                </div>
            `).join('');
        });
}

/* === Lint === */
function runLint(checkName) {
    const btn = document.getElementById('lint-btn');
    const output = document.getElementById('lint-output');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Running...';
    output.innerHTML = '';

    const url = checkName ? `/api/lint?check=${checkName}` : '/api/lint';
    const evtSource = new EventSource(url);
    output.style.display = 'block';

    evtSource.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.done) {
            evtSource.close();
            btn.disabled = false;
            btn.textContent = 'Run All Checks';
            if (data.report_html) {
                output.innerHTML = data.report_html;
            }
            return;
        }
        const line = document.createElement('div');
        line.className = 'step';
        line.textContent = data.message;
        output.appendChild(line);
    };

    evtSource.onerror = function() {
        evtSource.close();
        btn.disabled = false;
        btn.textContent = 'Run All Checks';
    };
}

/* === Render === */
function renderArticle() {
    const select = document.getElementById('render-file');
    const format = document.getElementById('render-format').value;
    const file = select.value;
    if (!file) return;

    const btn = document.getElementById('render-btn');
    const result = document.getElementById('render-result');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Rendering...';

    fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, format })
    })
        .then(r => r.json())
        .then(data => {
            btn.disabled = false;
            btn.textContent = 'Render';
            if (data.error) {
                result.innerHTML = `<div class="flash flash-error">${data.error}</div>`;
            } else {
                result.innerHTML = `<div class="flash flash-success">Saved to: ${data.output}</div>`;
                if (data.preview) {
                    result.innerHTML += `<div class="wiki-content">${data.preview}</div>`;
                }
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.textContent = 'Render';
            result.innerHTML = `<div class="flash flash-error">${err.message}</div>`;
        });
}

/* === Init === */
document.addEventListener('DOMContentLoaded', function() {
    setupDropzone();

    // Live search with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(liveSearch, 250);
        });
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { clearTimeout(timer); liveSearch(); }
        });
    }

    // Q&A enter key
    const qaInput = document.getElementById('qa-input');
    if (qaInput) {
        qaInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(); }
        });
    }
});
