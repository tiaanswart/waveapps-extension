(function () {
    const getCookie = (k) => (document.cookie.match('(^|; )' + k + '=([^;]*)') || 0)[2];
    const postData = async (url = '', data = {}) => {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getCookie('waveapps')}`,
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    const getCurrentFinancialYear = () => {
        const today = new Date();
        if ((today.getMonth() + 1) <= 3) {
            return today.getFullYear() - 1;
        }
        return today.getFullYear();
    }

    const buildGSTTable = (data) => {
        const referenceNode = document.querySelector('#NetIncomeTable');
        data.reports.summary.forEach(s => {
            const container = document.createElement('div');
            container.appendChild(document.createElement('hr'));
            const header = document.createElement('h2');
            header.innerHTML = s.header.cells.map(c => c.value ? c.value.join('') : '').filter(c => !!c).join(' - ');
            container.appendChild(header);
            const table = document.createElement('table');
            table.className = 'wv-table--condensed';
            const tableBody = document.createElement('tbody');
            tableBody.className = 'wv-table__body';
            s.rows.forEach(r => {
                const tableRow = document.createElement('tr');
                tableRow.className = 'wv-table__row';
                r.cells.forEach(c => {
                    const tableCell = document.createElement('td');
                    tableCell.className = 'wv-table__cell';
                    tableCell.innerHTML = c.value ? c.value.join('') : ''
                    tableRow.appendChild(tableCell);
                });
                tableBody.appendChild(tableRow);
            });
            table.appendChild(tableBody);
            container.appendChild(table);
            referenceNode.parentNode.appendChild(container);
        });
    }

    const dateFormat = (date) => date.toISOString().split('T')[0];
    const bid = Array.from(document.querySelectorAll('script')).find(s => s.innerHTML.includes('NAV_IDENTITY_BUSINESS_ID')).innerHTML.trim().split('\n')[0].split(' = \'')[1].replace('\'', '');

    if (!Array.prototype.last) {
        Array.prototype.last = function () {
            return this[this.length - 1];
        };
    };

    postData(`https://api.waveapps.com/businesses/${bid}/reports/sales_tax/`, {
            filters: {
                start_date: dateFormat(new Date(`${getCurrentFinancialYear() - 1}-04-01`)),
                end_date: dateFormat(new Date(`${getCurrentFinancialYear()}-03-31`)),
                report_type: "1",
            },
            version: 1,
            client_request_date: dateFormat(new Date())
        })
        .then((lastYearData) => {
            const referenceNode = document.querySelector('#NetIncomeTable');
            buildGSTTable(lastYearData);
            postData(`https://api.waveapps.com/businesses/${bid}/reports/sales_tax/`, {
                    filters: {
                        start_date: dateFormat(new Date(`${getCurrentFinancialYear()}-04-01`)),
                        end_date: dateFormat(new Date(`${getCurrentFinancialYear() + 1}-03-31`)),
                        report_type: "1",
                    },
                    version: 1,
                    client_request_date: dateFormat(new Date())
                })
                .then((thisYearData) => {
                    buildGSTTable(thisYearData);
                    const incomeLY = parseFloat(document.querySelector('#NetIncomeTable:last-child table tbody tr:first-child  td:nth-child(2)').innerText.replace(',', ''));
                    const expenseLY = parseFloat(document.querySelector('#NetIncomeTable:last-child table tbody tr:nth-child(2)  td:nth-child(2)').innerText.replace(',', ''));
                    const netIncomeLY = incomeLY - expenseLY;
                    const incomeTY = parseFloat(document.querySelector('#NetIncomeTable:last-child table tbody tr:first-child  td:last-child').innerText.replace(',', ''));
                    const expenseTY = parseFloat(document.querySelector('#NetIncomeTable:last-child table tbody tr:nth-child(2)  td:last-child').innerText.replace(',', ''));
                    const netIncomeTY = incomeTY - expenseTY;
                    const referenceNodeTable = referenceNode.querySelector('table');
                    const tableBody = referenceNodeTable.querySelector('tbody');
                    [{
                        cells: [
                            'Sales Tax',
                            lastYearData.reports.summary[0].rows.last().cells.last().value.join(''),
                            thisYearData.reports.summary[0].rows.last().cells.last().value.join('')
                        ]
                    }, {
                        cells: [
                            'ACC Tax',
                            (netIncomeLY * 0.017).toFixed(2),
                            (netIncomeTY * 0.017).toFixed(2)
                        ]
                    }, {
                        cells: [
                            'Prov Tax',
                            (netIncomeLY * 0.33).toFixed(2),
                            (netIncomeTY * 0.33).toFixed(2)
                        ]
                    }, {
                        cells: [
                            'KiwiSaver',
                            (netIncomeLY * 0.03).toFixed(2),
                            (netIncomeTY * 0.03).toFixed(2)
                        ]
                    }].forEach(r => {
                        const tableRow = document.createElement('tr');
                        tableRow.className = 'wv-table__row';
                        r.cells.forEach((c, cIndex) => {
                            const tableCell = document.createElement('td');
                            tableCell.className = `wv-table__cell${cIndex > 0 ? '--amount' : ''}`;
                            tableCell.innerHTML = c;
                            tableRow.appendChild(tableCell);
                        });
                        tableBody.appendChild(tableRow);
                    });
                });
        });
})();