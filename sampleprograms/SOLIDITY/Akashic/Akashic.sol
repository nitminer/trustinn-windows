// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "./ERC20.sol";

contract Akashic is ERC20 {
    constructor() ERC20 ("Akashic", "AKC") {
        _mint(msg.sender, 20000000 * 10 ** decimals());
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
