function generateTable(nFromOutside = null) {
    clearError();
    document.getElementById('result-area').style.display = 'none';
    const nInput = document.getElementById('matrix-n');
    const n = nFromOutside || parseInt(nInput.value);

    if (isNaN(n) || n < 1 || n > 20) {
        return showError("Размерность должна быть от 1 до 20");
    }

    const container = document.getElementById('matrix-container');
    const matrixArea = document.getElementById('matrix-area');

    matrixArea.style.display = 'block';
    nInput.value = n;

    let html = '<table class="input-table">';
    for (let i = 0; i < n; i++) {
        html += '<tr>';
        for (let j = 0; j < n; j++) {
            html += `<td><input type="text" class="a-cell" data-row="${i}" data-col="${j}" placeholder="a${i+1}${j+1}"></td>`;
        }
        html += `<td class="sep"><input type="text" class="b-cell" data-row="${i}" placeholder="b${i+1}"></td>`;
        html += '</tr>';
    }
    html += '</table>';
    container.innerHTML = html;
}

document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const currentInput = e.target;
    const reader = new FileReader();
    reader.onload = function(event) {
        currentInput.value = '';

        const lines = event.target.result.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length < 2) return showError("Файл слишком короткий");

        const n = parseInt(lines[0]);
        if (isNaN(n) || n < 1 || n > 20 || lines[0] !== n.toString()) {
            return showError("Некорректная размерность n в первой строке файла");
        }

        const validatedMatrix = [];
        const validatedB = [];

        for (let i = 0; i < n; i++) {
            if (!lines[i + 1]) return showError(`В файле не хватает строк. Ожидалось: ${n}`);

            const rowValues = lines[i + 1].split(/\s+/).filter(v => v !== "");

            if (rowValues.length < n + 1) {
                return showError(`В строке ${i + 2} недостаточно данных. Нужно ${n + 1} чисел.`);
            }

            const matrixRow = [];
            for (let j = 0; j <= n; j++) {
                const valStr = rowValues[j].replace(',', '.');
                const num = parseFloat(valStr);

                if (isNaN(num) || !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valStr)) {
                    return showError(`Ошибка в строке ${i + 2}, элемент "${rowValues[j]}": это не число!`);
                }

                if (j < n) matrixRow.push(rowValues[j]);
                else validatedB.push(rowValues[j]);
            }
            validatedMatrix.push(matrixRow);
        }

        let validatedEps = null;
        if (lines[n + 1]) {
            const epsStr = lines[n + 1].replace(',', '.');
            const epsNum = parseFloat(epsStr);
            if (isNaN(epsNum) || epsNum <= 0 || !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(epsStr)) {
                return showError("Некорректное значение точности (eps) в конце файла");
            }
            validatedEps = lines[n + 1];
        }

        generateTable(n);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                document.querySelector(`.a-cell[data-row="${i}"][data-col="${j}"]`).value = validatedMatrix[i][j].replace('.', ',');
            }
            document.querySelector(`.b-cell[data-row="${i}"]`).value = validatedB[i].replace('.', ',');
        }

        if (validatedEps) {
            document.getElementById('eps').value = validatedEps.replace('.', ',');
        }
    };
    reader.readAsText(file);
});

async function solve() {
    const n = parseInt(document.getElementById('matrix-n').value);
    const epsVal = document.getElementById('eps').value.replace(',', '.');
    const eps = parseFloat(epsVal);

    if (isNaN(eps) || eps <= 0) return showError("Введите корректную точность");

    const matrix = [];
    const b = [];

    try {
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) {
                const val = document.querySelector(`.a-cell[data-row="${i}"][data-col="${j}"]`).value.replace(',', '.');
                row.push(parseFloat(val));
            }
            matrix.push(row);
            const bVal = document.querySelector(`.b-cell[data-row="${i}"]`).value.replace(',', '.');
            b.push(parseFloat(bVal));
        }

        const response = await fetch('/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matrix, b, eps })
        });

        const res = await response.json();
        renderResults(res);
    } catch (e) {
        showError("Ошибка при чтении таблицы. Проверьте, что все поля заполнены числами.");
    }
}

function renderResults(data) {
    if (data.error_log) {
        showError("Ошибка: " + data.error_log);
        return;
    }

    document.getElementById('result-area').style.display = 'block';
    document.getElementById('meta-info').innerHTML = `
        <div>Итераций: ${data.iterations}</div>
        <div>Норма матрицы B: ${formatNumber(data.norm)}</div>
    `;

    const body = document.getElementById('result-body');
    body.innerHTML = data.rows.map(row => `
        <tr>
            <td>X${row.index}</td>
            <td class="res-val">${formatNumber(row.x)}</td>
            <td class="res-err">${formatNumber(row.error)}</td>
        </tr>
    `).join('');
}

function formatNumber(num) {
    if (num === 0) return "0";
    const abs = Math.abs(num);
    if (abs < 1e-4 || abs >= 1e9) return num.toExponential(6);
    return num.toFixed(6);
}

function fillRandom() {
    const n = parseInt(document.getElementById('matrix-n').value);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                const v = Math.floor(Math.random() * 10);
                document.querySelector(`.a-cell[data-row="${i}"][data-col="${j}"]`).value = v;
                sum += v;
            }
        }
        document.querySelector(`.a-cell[data-row="${i}"][data-col="${i}"]`).value = sum + 5;
        document.querySelector(`.b-cell[data-row="${i}"]`).value = Math.floor(Math.random() * 20) - 10;
    }
}

function showError(message) {
    const errorBox = document.getElementById('error-box');
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    document.getElementById('result-area').style.display = 'none';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearError() {
    document.getElementById('error-box').style.display = 'none';
}