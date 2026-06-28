const description = document.getElementById('description')
const amount = document.getElementById('amount')
const transactionForm = document.getElementById('transaction-form')
const categories = document.querySelectorAll('.tab-btn')
const clearBtn = document.getElementById('clear-all-btn')
const confirmationModal = document.getElementById('confirmation-modal')

const incomeEl = document.getElementById('total-income')
const expenseEl = document.getElementById('total-expense')
const balanceEl = document.getElementById('total-balance')

const searchInput = document.getElementById('search-input')
const dateFilterInput = document.getElementById('date-filter-input')
const budgetLimitInput = document.getElementById('budget-limit-input')
const setBudgetBtn = document.getElementById('set-budget-btn')
const budgetProgressFill = document.getElementById('budget-progress-fill')
const budgetSpent = document.getElementById('budget-spent')
const budgetCap = document.getElementById('budget-cap')
const exportReportBtn = document.getElementById('export-report-btn')

let budgetLimit = Number(localStorage.getItem('budgetLimit')) || 0
let budgetPercentage = document.getElementById('budget-percentage')

let transactions = []
let selectedCategory = 'all'

let expenseChart = null;





//display transactions

function displayTransactions(transaction) {
    const transactionList = document.getElementById('transaction-list')
    const transactionItem = document.createElement('li')

    if (transaction.category === 'income') {
        transactionItem.classList.add('plus')
    } else {
        transactionItem.classList.add('minus')
    }

    transactionItem.innerHTML = `
            <div class='item-details'>
            <span class='item-desc'>${transaction.description}</span>
            
            <span class='item-amt'> ${transaction.category === 'income' ? '+' : '-'}${formatMoney(Math.abs(transaction.amount))}</span>
            </div>
            
            <button class='delete-btn'><i class='bx bx-trash'></i></button>
            <button class='edit-btn'><i class='bx bx-edit'></i></button>
            `
    transactionList.appendChild(transactionItem)

    const deleteBtn = transactionItem.querySelector('.delete-btn')
    const editBtn = transactionItem.querySelector('.edit-btn')

    deleteBtn.addEventListener('click', function () {
        transactionList.removeChild(transactionItem)
        const index = transactions.indexOf(transaction)

        if (index !== -1) {
            transactions.splice(index, 1)
            updateSummary()
            saveTransactions()
            filterCategories()
        }
    })
    let isEditing = false;

    editBtn.addEventListener('click', function () {
        const detailsContainer = transactionItem.querySelector('.item-details');

        if (!isEditing) {
            isEditing = true;
            editBtn.innerHTML = "<i class='bx bx-check-circle' style='color: var(--success)'></i>";

            detailsContainer.innerHTML = `
                <div class="edit-mode-inputs">
                    <input type="text" class="edit-desc" value="${transaction.description}" />
                    <input type="number" step="0.01" class="edit-amt" value="${Math.abs(transaction.amount)}" />
                </div>
            `;
        } else {
            const newDesc = detailsContainer.querySelector('.edit-desc').value.trim();
            const newAmt = Number(detailsContainer.querySelector('.edit-amt').value);

            if (newDesc === '' || isNaN(newAmt) || newAmt <= 0) {
                alert('Please enter valid fields');
                return;
            }

            // Maintain the existing mathematical sign based on whether it's an income or expense
            const originalSign = transaction.category === 'income' ? 1 : -1;

            transaction.description = newDesc;
            transaction.amount = newAmt * originalSign; 

            saveTransactions();
            updateSummary();
            filterCategories();

            isEditing = false;
        }
    });

}

//add transactions
function addTransactions(e) {
    e.preventDefault()
    const selectedType = document.querySelector('input[name="transactionType"]:checked')

    //validate input
    if (description.value === '' || amount.value === '') {
        alert('enter fields')
        return

    }
    if (!selectedType) {
        alert('please select income or expense')
        return
    }
    let rawAmount = Math.abs(Number(amount.value))
    if (selectedType.value === 'expense') {
        rawAmount = -rawAmount
    }

    const transaction = {
        id: Date.now(),
        description: description.value,
        amount: Number(amount.value),
        type: selectedType.value,
        category: selectedType.value
    }


    description.value = ''
    amount.value = ''
    description.focus()
    transactions.push(transaction)
    displayTransactions(transaction)
    saveTransactions()
    updateSummary()
    filterCategories()

}

//format money
function formatMoney(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount)
}

function updateSummary() {
    const incomeType = transactions
        .filter(transaction => transaction.category === 'income')
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0)

    
    const expenseType = transactions
        .filter(transaction => transaction.category === 'expense')
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0)

    const balanceType = incomeType - expenseType

    incomeEl.textContent = formatMoney(incomeType)
    expenseEl.textContent = formatMoney(expenseType)
    balanceEl.textContent = formatMoney(balanceType)
    updateBudgetUI()
    
    updateChartUI()


}

//filter categories
function filterCategories() {
    const transactionList = document.getElementById('transaction-list')
    const keyword = searchInput.value.toLowerCase()
    transactionList.innerHTML = ''
    let filterList = [...transactions]
    if (selectedCategory !== 'all') {
        filterList = transactions.filter(transaction => transaction.category === selectedCategory)
    }
    if (keyword) {
        filterList = filterList.filter(transaction => transaction.description.toLowerCase().includes(keyword))

    }
    if (dateFilterInput.value) {
        const selectedDate = new Date(dateFilterInput.value)
        filterList = filterList.filter(transaction => {
            const transactionDate = new Date(transaction.id)
            return transactionDate.toDateString() === selectedDate.toDateString()
        })
    }

    filterList.forEach(transaction => displayTransactions(transaction))
}
categories.forEach(category => {
    category.addEventListener('click', () => {
        categories.forEach(item => {
            item.classList.remove('active')
        })
        category.classList.add('active')

        selectedCategory = category.dataset.filter
        filterCategories()
    })

})

//budget
setBudgetBtn.addEventListener('click', () => {
    const value = Number(budgetLimitInput.value)

    if (value > 0) {
        budgetLimit = value
        localStorage.setItem('budgetLimit', budgetLimit)
        budgetLimitInput.value = ''
        updateBudgetUI()
    }
})

//update budget UI
function updateBudgetUI() {
    // 1. Recalculate your total expenses (same logic used in updateSummary)
    const totalExpenses = transactions
        .filter(t => t.category === 'expense')
        .reduce((total, t) => total + Math.abs(t.amount), 0)

    // 2. Format the text labels
    budgetCap.textContent = `Limit: ${formatMoney(budgetLimit)}`;
    budgetSpent.textContent = `Spent: ${formatMoney(totalExpenses)}`;

    // 3. Fallback handle if no budget is configured yet
    if (budgetLimit === 0) {
        budgetPercentage.textContent = '0%';
        budgetProgressFill.style.width = '0%';
        return
    }

    // 4. Calculate progress percentage
    let percentage = Math.round((totalExpenses / budgetLimit) * 100);

    // Cap visual bar width layout display at 100% so it doesn't break out of the box
    let fillWidth = percentage > 100 ? 100 : percentage;

    // Update labels and CSS layout width transition smoothly
    budgetPercentage.textContent = `${percentage}%`;
    budgetProgressFill.style.width = `${fillWidth}%`;

    // 5. Advanced Alert Warning Color Injection
    // Clean out previous alert styles first
    budgetProgressFill.classList.remove('warning', 'danger');

    if (percentage >= 80 && percentage < 100) {
        budgetProgressFill.classList.add('warning'); // Turns bar orange via your CSS
    } else if (percentage >= 100) {
        budgetProgressFill.classList.add('danger');  // Turns bar red via your CSS
    }
}


//clear all
clearBtn.addEventListener('click', function () {
    confirmationModal.classList.add('active')
    const modalCancel = document.getElementById('modal-cancel')
    const modalConfirm = document.getElementById('modal-confirm')

    modalCancel.addEventListener('click', function () {
        confirmationModal.classList.remove('active')
    })
    modalConfirm.addEventListener('click', function () {
        transactions = []
        const transactionList = document.getElementById('transaction-list')
        transactionList.innerHTML = ''
        updateSummary()
        saveTransactions()
        confirmationModal.classList.remove('active')

    })
})
exportReportBtn.addEventListener('click', () => {
    // 1. Guard check: Make sure there's data to back up
    if (transactions.length === 0) {
        alert('There are no transactions to export!');
        return;
    }

    // 2. Define standard CSV Columns headers row
    let csvContent = "ID,Description,Amount (NGN),Category,Date Created\r\n";

    // 3. Loop through array objects and append text strings rows
    transactions.forEach(t => {
        // Convert millisecond timestamp ID to a human-readable date line string
        const formattedDate = new Date(t.id).toLocaleDateString('en-NG');

        // Escape description quotes to keep formatting safe from special comma separations
        const escapedDesc = `"${t.description.replace(/"/g, '""')}"`;

        csvContent += `${t.id},${escapedDesc},${t.amount},${t.category},${formattedDate}\r\n`;
    });

    // 4. Create a binary large object (Blob) with content declared as spreadsheet text format
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 5. Build an ephemeral hidden anchor tag element to spark download delivery execution
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `SleekTracker_Report_${new Date().toISOString().split('T')[0]}.csv`);
    downloadAnchor.style.visibility = 'hidden';

    // Mount, force download, and clean up the page nodes
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
});
function updateChartUI() {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return; // Guard check if element hasn't mounted

    // 1. Calculate active totals for data points
    const totalIncome = transactions
        .filter(t => t.category === 'income')
        .reduce((total, t) => total + Math.abs(t.amount), 0);

    const totalExpense = transactions
        .filter(t => t.category === 'expense')
        .reduce((total, t) => total + Math.abs(t.amount), 0);

    // 2. If there's absolutely no data yet, don't draw an empty blank space
    if (totalIncome === 0 && totalExpense === 0) {
        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';

    // 3. If chart object instance already exists, just update its data values and redraw
    if (expenseChart) {
        expenseChart.data.datasets[0].data = [totalIncome, totalExpense];
        expenseChart.update();
        return;
    }

    // 4. Initialize and build a brand new Chart instance
    const ctx = canvas.getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: [
                    '#2ec4b6', // Match your Success Green theme color hex
                    '#e63946'  // Match your Danger Red theme color hex
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#b3b3b3', // Makes labels match your light text color variables
                        font: {
                            family: 'inherit',
                            size: 13
                        }
                    }
                }
            },
            cutout: '70%' // Makes the doughnut center hollow and sleek
        }
    });
}

//save transactions
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions))
}

//load transactions
function loadTransactions() {
    const savedTransactions = JSON.parse(localStorage.getItem('transactions')) || []

    transactions.push(...savedTransactions)

    transactions.forEach(transaction => {
        displayTransactions(transaction)
    })
    updateSummary()
}
searchInput.addEventListener('input', filterCategories)
dateFilterInput.addEventListener('input', filterCategories)
loadTransactions()
transactionForm.addEventListener('submit', addTransactions)