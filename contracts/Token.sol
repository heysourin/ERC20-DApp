// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Token is Ownable, ERC20, ERC20Burnable {
    uint public tokenPrice;
    uint public maxSupply;

    constructor() ERC20("RylePhoenixToken", "RPT") {
        tokenPrice = 1500000000000000; //0.0015 ether
        maxSupply = 250 * 10 ** 18; //250 Tokens
    }

    function mint(uint amount) public payable {
        require(totalSupply() + amount <= maxSupply, "Exceeding max supply");
        require(
            (msg.value * 10 ** decimals()) / amount >= tokenPrice,
            "Pay ETH according to token price"
        );
        _mint(msg.sender, amount);
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function returnState() public view returns (uint, uint, uint, uint) {
        return (balanceOf(msg.sender), maxSupply, totalSupply(), tokenPrice);
    }
}
