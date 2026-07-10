import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, RefreshCw, LogOut, Flame, Shield, Award, Sparkles, Move } from 'lucide-react';
import { PlayerStats, GameSettings } from '../types';

interface HUDProps {
  stats: PlayerStats;
  settings: GameSettings;
  onAttack: () => void;
  onSkill: () => void;
  onTouchMove: (dx: number, dy: number) => void;
  onRestartGame: () => void;
  onGoToMenu: () => void;
  isGameOver: boolean;
}

export default function HUD({
  stats,
  settings,
  onAttack,
  onSkill,
  onTouchMove,
  onRestartGame,
  onGoToMenu,
  isGameOver,
}: HUDProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  // Handle touch events for the joystick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!settings.useVirtualJoystick) return;
    setJoystickActive(true);
    handleTouchUpdate(e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!settings.useVirtualJoystick || !joystickActive) return;
    handleTouchUpdate(e.touches[0]);
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
    onTouchMove(0, 0); // Stop moving
  };

  const handleTouchUpdate = (touch: React.Touch) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    // Limit knob movement to boundary
    let limitedX = dx;
    let limitedY = dy;
    if (distance > maxRadius) {
      limitedX = (dx / distance) * maxRadius;
      limitedY = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: limitedX, y: limitedY });

    // Normalize values between -1 and 1
    const normX = limitedX / maxRadius;
    const normY = limitedY / maxRadius;
    onTouchMove(normX, normY);
  };

  // Standard keyboard listeners can be in parent, but on HUD we show keys
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none z-30 font-sans">
      
      {/* --- Top Bar: Health, Score, Stats --- */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        {/* Left side: HP Hearts */}
        <div className="flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-4 py-3 shadow-lg">
          <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> HP Energy (พลังชีวิต)
          </span>
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: stats.maxHealth }).map((_, idx) => (
              <motion.div
                key={idx}
                animate={{
                  scale: idx < stats.health ? [1, 1.12, 1] : 1,
                  opacity: idx < stats.health ? 1 : 0.25,
                }}
                transition={{ duration: 0.3 }}
              >
                <Heart 
                  className={`w-6 h-6 md:w-7 md:h-7 ${
                    idx < stats.health 
                      ? 'fill-rose-500 text-rose-500 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' 
                      : 'text-slate-600'
                  }`} 
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right side: Stats Score Board */}
        <div className="flex flex-col gap-1 items-end bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-4 py-3 shadow-lg text-right">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-sm md:text-base font-bold">
            <Award className="w-4 h-4" />
            <span>Score: {(stats.enemiesDefeated * 100) + (stats.potionsCollected * 50)}</span>
          </div>
          <div className="flex gap-3 text-[10px] md:text-xs text-slate-400 font-mono mt-1">
            <div>
              <span className="text-slate-500">Defeated: </span>
              <span className="text-rose-400 font-bold">{stats.enemiesDefeated}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div>
              <span className="text-slate-500">Potions: </span>
              <span className="text-emerald-400 font-bold">{stats.potionsCollected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Middle Floating Game Tips/Keys (Visible only on non-mobile by default, hidden on joystick) --- */}
      {!settings.useVirtualJoystick && !isGameOver && (
        <div className="hidden md:flex flex-col gap-1 absolute bottom-6 left-6 bg-slate-950/70 border border-slate-800/60 p-3 rounded-xl max-w-xs text-[11px] font-mono text-slate-400">
          <span className="text-white font-bold mb-1 border-b border-slate-800 pb-1 flex items-center gap-1">
            <Move className="w-3.5 h-3.5 text-amber-500" /> คีย์ควบคุม
          </span>
          <div>• <span className="text-amber-400">WASD / Arrow Keys</span>: เดิน 8 ทิศทาง</div>
          <div>• <span className="text-amber-400">ปุ่ม P</span>: โจมตีปล่อย Hit Box (ไวขึ้น)</div>
          <div>• <span className="text-amber-400">ปุ่ม O</span>: สกิลวงแหวนเวทย์ขยาย</div>
        </div>
      )}

      {/* --- Bottom Row: Joystick & Action Buttons --- */}
      <div className="w-full flex justify-between items-end mt-auto pointer-events-none">
        
        {/* Left Area: Virtual Joystick */}
        {settings.useVirtualJoystick && !isGameOver ? (
          <div className="pointer-events-auto pl-2 pb-2">
            <div
              ref={joystickRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-900/60 border border-slate-700/80 backdrop-blur-md flex items-center justify-center relative touch-none cursor-grab active:cursor-grabbing"
              style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}
            >
              {/* Central base indicator */}
              <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 absolute" />
              
              {/* Move indicator */}
              <motion.div
                animate={{
                  x: knobPos.x,
                  y: knobPos.y,
                  scale: joystickActive ? 0.9 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center justify-center absolute"
              >
                <div className="w-4 h-4 rounded-full bg-white/20" />
              </motion.div>
            </div>
          </div>
        ) : (
          <div /> // Spacer
        )}

        {/* Right Area: Action Buttons (Always available for mobile or screen layout) */}
        {!isGameOver && (
          <div className="pointer-events-auto flex gap-4 pr-2 pb-2">
            {/* Skill Button O */}
            <motion.button
              id="skill-btn"
              whileTap={{ scale: 0.9 }}
              onClick={onSkill}
              className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-400 shadow-[0_4px_15px_rgba(245,158,11,0.45)] flex flex-col items-center justify-center text-slate-950 font-black cursor-pointer group hover:from-amber-400 hover:to-amber-500"
            >
              <Flame className="w-6 h-6 md:w-7 md:h-7 group-hover:animate-bounce" />
              <span className="text-[10px] font-mono font-extrabold mt-0.5">SKILL (O)</span>
            </motion.button>

            {/* Attack Button P */}
            <motion.button
              id="attack-btn"
              whileTap={{ scale: 0.9 }}
              onClick={onAttack}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 border border-rose-400 shadow-[0_4px_18px_rgba(239,68,68,0.45)] flex flex-col items-center justify-center text-white font-black cursor-pointer group hover:from-rose-400 hover:to-rose-500"
            >
              <span className="text-[20px] font-mono leading-none font-black text-rose-100 group-hover:scale-110 transition-transform">⚔️</span>
              <span className="text-[10px] font-mono font-extrabold mt-1 text-rose-100">PUNCH (P)</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* --- Game Over Popup Modal --- */}
      <AnimatePresence>
        {isGameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-slate-950 border border-red-500/30 rounded-3xl p-6 md:p-8 text-center shadow-2xl overflow-hidden"
            >
              {/* Blood splash header backdrop */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-[0_0_20px_rgba(239,68,68,0.8)]" />

              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                className="text-4xl md:text-5xl font-black text-rose-500 tracking-wider mb-2 drop-shadow-[0_4px_10px_rgba(239,68,68,0.4)]"
                style={{ textShadow: '0 0 20px rgba(239,68,68,0.6)' }}
              >
                GAME OVER
              </motion.div>
              <p className="text-slate-400 text-sm font-light mb-6">คุณพ่ายแพ้ในดันเจี้ยนเวทย์มนตร์ 3 มิติแล้ว!</p>

              {/* Stats Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mb-1">ศัตรูที่กำจัด</span>
                  <span className="text-lg font-bold text-rose-400">{stats.enemiesDefeated}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mb-1">น้ำยาที่เก็บได้</span>
                  <span className="text-lg font-bold text-emerald-400">{stats.potionsCollected}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mb-1">เรียกใช้สกิล</span>
                  <span className="text-lg font-bold text-amber-400">{stats.skillsUsed}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mb-1">คะแนนรวมทั้งหมด</span>
                  <span className="text-lg font-bold text-yellow-300 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> {(stats.enemiesDefeated * 100) + (stats.potionsCollected * 50)}
                  </span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  id="restart-game-over-btn"
                  onClick={onRestartGame}
                  className="flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.25)] cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5 animate-spin-reverse" />
                  <span>ท้าทายอีกรอบ (Play Again)</span>
                </button>

                <button
                  id="goto-menu-game-over-btn"
                  onClick={onGoToMenu}
                  className="flex items-center justify-center gap-2.5 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>กลับสู่หน้าหลัก (Main Menu)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
