// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EarnPaywall {
    address public immutable owner; // Adresa ta de administrator
    uint256 public activationFee;   // Taxa fixă pe blockchain

    mapping(address => bool) public hasAccess;

    event AccessActivated(address indexed user, uint256 amount);
    event FeeUpdated(uint256 newFee);
    event FundsWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    // Constructorul primește doar taxa de 50$ (în Wei) la deploy
    constructor(uint256 _initialFee) {
        owner = msg.sender; // Cel care dă deploy devine administratorul
        activationFee = _initialFee;
    }

    /**
     * @notice Utilizatorul plătește taxa de activare.
     * REPARAT: Banii rămân în contract, eliminând eroarea de timeout a rețelei!
     */
    function payActivation() public payable {
        require(msg.value >= activationFee, "Insufficient ETH sent for activation");
        
        hasAccess[msg.sender] = true;
        emit AccessActivated(msg.sender, msg.value);
    }

    /**
     * @notice Funcție de siguranță prin care contractul acceptă bani chiar dacă JavaScript-ul nu trimite date
     */
    receive() external payable {
        if (msg.value >= activationFee) {
            hasAccess[msg.sender] = true;
            emit AccessActivated(msg.sender, msg.value);
        }
    }

    fallback() external payable {
        if (msg.value >= activationFee) {
            hasAccess[msg.sender] = true;
            emit AccessActivated(msg.sender, msg.value);
        }
    }

    /**
     * @notice FUNCȚIE NOUĂ: Îți permite doar ȚIE să retragi toți banii adunați din taxe în portofelul tău real!
     */
    function withdrawFunds(address payable _to) external onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = _to.call{value: balance}("");
        require(success, "Withdraw failed");
        emit FundsWithdrawn(_to, balance);
    }

    function setFee(uint256 _newFee) external onlyOwner {
        activationFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function checkAccess(address _user) external view returns (bool) {
        return hasAccess[_user];
    }
}
