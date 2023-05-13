// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract MesherERC20 is OwnableUpgradeable, ERC20Upgradeable {
    /* ========== INITIALIZER ========== */

    function initialize(string memory _symbol) external initializer {
        __Ownable_init();
        __ERC20_init("Mesher Token", _symbol); // temporary setting
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _to, uint _amount) external onlyOwner {
        _burn(_to, _amount);
    }
}
