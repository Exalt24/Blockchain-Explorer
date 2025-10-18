import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GameStateModule = buildModule("GameStateModule", (m) => {
  const gameState = m.contract("GameState");
  
  return { gameState };
});

export default GameStateModule;