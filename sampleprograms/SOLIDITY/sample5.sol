// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract BuggyToken {

    uint public totalSupply;
    mapping(address => uint) public balances;

    constructor(uint supply) {
        require(supply > 0, "Zero supply");

        totalSupply = supply;
        balances[msg.sender] = supply;

        assert(balances[msg.sender] == totalSupply);
    }

    function transfer(address to, uint amount) public {
        require(to != address(0), "Invalid");
        require(balances[msg.sender] >= amount, "Low balance");

        uint senderBefore = balances[msg.sender];
        uint receiverBefore = balances[to];
        uint supplyBefore = totalSupply;

        balances[msg.sender] -= amount;
        balances[to] += amount;

        // BUG: unintended supply modification
        if (amount % 2 == 0) {
            totalSupply += 1;
        }

        // Assertions (will fail under certain conditions)
        assert(balances[msg.sender] == senderBefore - amount);
        assert(balances[to] == receiverBefore + amount);
        assert(totalSupply == supplyBefore);
    }

    function burn(uint amount) public {
        require(balances[msg.sender] >= amount, "Low balance");

        uint beforeSupply = totalSupply;

        balances[msg.sender] -= amount;

        // BUG: forgot to reduce totalSupply
        // totalSupply -= amount;

        assert(totalSupply == beforeSupply - amount);
    }
}