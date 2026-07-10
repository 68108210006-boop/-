/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameState, GameSettings, PlayerStats } from './types';
import MainMenu from './components/MainMenu';
import HUD from './components/HUD';
import GameCanvas from './components/GameCanvas';
import { audio } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');

  // Load sound settings
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    bgmVolume: 0.18,
    sfxVolume: 0.35,
    useVirtualJoystick: true, // Default to true so mobile users can play immediately
  });

  // Load standard player stats
  const [stats, setStats] = useState<PlayerStats>({
    health: 5,
    maxHealth: 5,
    score: 0,
    potionsCollected: 0,
    enemiesDefeated: 0,
    skillsUsed: 0,
  });

  // Action trigger counters to pass down to GameCanvas
  const [attackTrigger, setAttackTrigger] = useState(0);
  const [skillTrigger, setSkillTrigger] = useState(0);
  
  // Joystick vector passed from HUD to GameCanvas
  const [touchMoveVector, setTouchMoveVector] = useState({ x: 0, y: 0 });

  // Update audio engine settings when changed
  useEffect(() => {
    audio.updateSettings(settings.soundEnabled, settings.bgmVolume, settings.sfxVolume);
  }, [settings]);

  // Clean up BGM on main app unmount
  useEffect(() => {
    return () => {
      audio.stopBgm();
    };
  }, []);

  const handleStartGame = () => {
    setStats({
      health: 5,
      maxHealth: 5,
      score: 0,
      potionsCollected: 0,
      enemiesDefeated: 0,
      skillsUsed: 0,
    });
    setTouchMoveVector({ x: 0, y: 0 });
    setGameState('PLAYING');
  };

  const handleGameOver = () => {
    setGameState('GAMEOVER');
  };

  const handleRestartGame = () => {
    handleStartGame();
  };

  const handleGoToMenu = () => {
    setGameState('MENU');
    audio.stopBgm();
  };

  const handleAttackAction = () => {
    setAttackTrigger((prev) => prev + 1);
  };

  const handleSkillAction = () => {
    setSkillTrigger((prev) => prev + 1);
  };

  const handleTouchMove = (dx: number, dy: number) => {
    setTouchMoveVector({ x: dx, y: dy });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      
      {/* 3D Game Canvas in background when playing or game-over */}
      {(gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
        <GameCanvas
          settings={settings}
          stats={stats}
          onUpdateStats={setStats}
          onGameOver={handleGameOver}
          gameState={gameState}
          attackTrigger={attackTrigger}
          skillTrigger={skillTrigger}
          touchMoveVector={touchMoveVector}
        />
      )}

      {/* Main HUD overlays on top of the playing canvas */}
      {(gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
        <HUD
          stats={stats}
          settings={settings}
          onAttack={handleAttackAction}
          onSkill={handleSkillAction}
          onTouchMove={handleTouchMove}
          onRestartGame={handleRestartGame}
          onGoToMenu={handleGoToMenu}
          isGameOver={gameState === 'GAMEOVER'}
        />
      )}

      {/* Main Start Screen Menu */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={handleStartGame}
          settings={settings}
          onUpdateSettings={setSettings}
        />
      )}
    </div>
  );
}
