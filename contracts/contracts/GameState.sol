// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract GameState {
    event PlayerJoined(address indexed player, uint256 timestamp);
    event ScoreUpdated(address indexed player, uint256 oldScore, uint256 newScore, uint256 timestamp);
    event GameReset(uint256 timestamp, uint256 playerCount);
    event ItemPurchased(address indexed player, uint256 itemId, uint256 price, uint256 timestamp);
    
    mapping(address => uint256) public scores;
    uint256 public playerCount;
    
    function joinGame() external {
        if (scores[msg.sender] == 0) {
            playerCount++;
            emit PlayerJoined(msg.sender, block.timestamp);
        }
        scores[msg.sender] = 100;
        emit ScoreUpdated(msg.sender, 0, 100, block.timestamp);
    }
    
    function updateScore(uint256 newScore) external {
        uint256 oldScore = scores[msg.sender];
        scores[msg.sender] = newScore;
        emit ScoreUpdated(msg.sender, oldScore, newScore, block.timestamp);
    }
    
    function purchaseItem(uint256 itemId) external payable {
        require(msg.value > 0, "Must send payment");
        emit ItemPurchased(msg.sender, itemId, msg.value, block.timestamp);
    }
    
    function resetGame() external {
        emit GameReset(block.timestamp, playerCount);
    }
    
    function getScore(address player) external view returns (uint256) {
        return scores[player];
    }
}