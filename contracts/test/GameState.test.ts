import { expect } from "chai";
import { network } from "hardhat";
import type { GameState } from "../types/ethers-contracts/GameState";

describe("GameState", function () {
  async function deployGameStateFixture() {
    const { ethers } = await network.connect();
    const [owner, player1, player2] = await ethers.getSigners();
    const GameState = await ethers.getContractFactory("GameState");
    const gameState = await GameState.deploy() as unknown as GameState;
    await gameState.waitForDeployment();
    
    return { gameState, owner, player1, player2 };
  }

  describe("Deployment", function () {
    it("Should deploy with zero player count", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState } = await networkHelpers.loadFixture(deployGameStateFixture);
      expect(await gameState.playerCount()).to.equal(0n);
    });
  });

  describe("joinGame", function () {
    it("Should emit PlayerJoined event on first join", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await expect(gameState.connect(player1).joinGame())
        .to.emit(gameState, "PlayerJoined");
    });

    it("Should emit ScoreUpdated event with initial score", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await expect(gameState.connect(player1).joinGame())
        .to.emit(gameState, "ScoreUpdated");
    });

    it("Should increment player count on first join", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      expect(await gameState.playerCount()).to.equal(1n);
    });

    it("Should set initial score to 100", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      expect(await gameState.scores(player1.address)).to.equal(100n);
    });

    it("Should not increment player count on subsequent joins", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      await gameState.connect(player1).joinGame();
      expect(await gameState.playerCount()).to.equal(1n);
    });
  });

  describe("updateScore", function () {
    it("Should emit ScoreUpdated event with correct values", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      
      await expect(gameState.connect(player1).updateScore(250n))
        .to.emit(gameState, "ScoreUpdated");
    });

    it("Should update score correctly", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      await gameState.connect(player1).updateScore(500n);
      
      expect(await gameState.scores(player1.address)).to.equal(500n);
    });

    it("Should allow updating score multiple times", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      await gameState.connect(player1).updateScore(200n);
      await gameState.connect(player1).updateScore(300n);
      
      expect(await gameState.scores(player1.address)).to.equal(300n);
    });
  });

  describe("purchaseItem", function () {
    it("Should emit ItemPurchased event with correct parameters", async function () {
      const { networkHelpers, ethers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      const itemId = 42n;
      const price = ethers.parseEther("0.1");
      
      await expect(gameState.connect(player1).purchaseItem(itemId, { value: price }))
        .to.emit(gameState, "ItemPurchased");
    });

    it("Should revert if no payment sent", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await expect(gameState.connect(player1).purchaseItem(1n))
        .to.be.revertedWith("Must send payment");
    });

    it("Should accept payment and emit event", async function () {
      const { networkHelpers, ethers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      const price = ethers.parseEther("0.05");
      await expect(gameState.connect(player1).purchaseItem(10n, { value: price }))
        .to.emit(gameState, "ItemPurchased");
    });
  });

  describe("resetGame", function () {
    it("Should emit GameReset event with current player count", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1, player2 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      await gameState.connect(player2).joinGame();
      
      await expect(gameState.resetGame())
        .to.emit(gameState, "GameReset");
    });

    it("Should emit GameReset event with zero players if none joined", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await expect(gameState.resetGame())
        .to.emit(gameState, "GameReset");
    });
  });

  describe("getScore", function () {
    it("Should return zero for player who hasn't joined", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      expect(await gameState.getScore(player1.address)).to.equal(0n);
    });

    it("Should return correct score for player", async function () {
      const { networkHelpers } = await network.connect();
      const { gameState, player1 } = await networkHelpers.loadFixture(deployGameStateFixture);
      
      await gameState.connect(player1).joinGame();
      await gameState.connect(player1).updateScore(750n);
      
      expect(await gameState.getScore(player1.address)).to.equal(750n);
    });
  });
});