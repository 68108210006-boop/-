import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Settings, Play, Gamepad2, Keyboard, Sparkles, HelpCircle } from 'lucide-react';
import { GameSettings } from '../types';
import { audio } from '../utils/audio';

interface MainMenuProps {
  onStartGame: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

export default function MainMenu({ onStartGame, settings, onUpdateSettings }: MainMenuProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const toggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    onUpdateSettings(updated);
    audio.updateSettings(updated.soundEnabled, updated.bgmVolume, updated.sfxVolume);
    // Play a test sound if enabling
    if (updated.soundEnabled) {
      setTimeout(() => audio.playCollect(), 100);
    }
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    const updated = { ...settings, bgmVolume: vol };
    onUpdateSettings(updated);
    audio.updateSettings(updated.soundEnabled, updated.bgmVolume, updated.sfxVolume);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    const updated = { ...settings, sfxVolume: vol };
    onUpdateSettings(updated);
    audio.updateSettings(updated.soundEnabled, updated.bgmVolume, updated.sfxVolume);
    // Play test hit to let user hear SFX volume
    audio.playAttack();
  };

  const toggleJoystickSetting = () => {
    const updated = { ...settings, useVirtualJoystick: !settings.useVirtualJoystick };
    onUpdateSettings(updated);
    if (settings.soundEnabled) {
      audio.playCollect();
    }
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden flex flex-col justify-between items-center bg-radial from-slate-900 to-black select-none text-white px-4 py-8 md:py-12"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      {/* Dynamic particles in background for feeling */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-amber-500 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-rose-500 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header Info */}
      <div className="z-10 w-full max-w-4xl flex justify-between items-center">
        <span className="text-xs font-mono text-amber-500 tracking-wider flex items-center gap-1.5 uppercase">
          <Sparkles className="w-3.5 h-3.5" /> ThreeJS Engine v1.0
        </span>
        <button
          id="toggle-audio-header"
          onClick={toggleSound}
          className="p-2.5 rounded-full bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-700 transition-all cursor-pointer text-slate-300 hover:text-white"
        >
          {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Hero Central Area (Logo + Play) */}
      <div className="z-10 flex flex-col items-center max-w-md text-center flex-1 justify-center my-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="w-full max-w-[280px] md:max-w-[340px] drop-shadow-[0_10px_15px_rgba(245,158,11,0.2)] mb-4"
        >
          <img 
            src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png" 
            alt="Game Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain select-none pointer-events-none"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4 }}
          className="text-xs md:text-sm font-light text-slate-300 max-w-sm leading-relaxed mb-8"
        >
          ตะลุยดันเจี้ยน 2.5D บังคับ 8 ทิศทาง จัดการศัตรู เก็บน้ำยาเติมพลัง และระเบิดคลื่นพลังเวทย์มนต์!
        </motion.p>

        {/* Buttons Grid */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          <motion.button
            id="start-game-btn"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (settings.soundEnabled) audio.playCollect();
              onStartGame();
            }}
            className="group relative flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer overflow-hidden border-t border-amber-300/35"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Play className="w-5 h-5 fill-slate-950" />
            <span className="tracking-wide">เริ่มเกม (Start Game)</span>
          </motion.button>

          <div className="flex gap-3">
            <button
              id="open-options-btn"
              onClick={() => {
                if (settings.soundEnabled) audio.playCollect();
                setShowOptions(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-200 font-medium rounded-xl transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>ตั้งค่า (Options)</span>
            </button>

            <button
              id="open-tutorial-btn"
              onClick={() => {
                if (settings.soundEnabled) audio.playCollect();
                setShowTutorial(true);
              }}
              className="px-4 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-200 font-medium rounded-xl transition-all cursor-pointer"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Branding & Disclaimer */}
      <div className="z-10 text-center">
        <p className="text-[10px] font-mono text-slate-500">
          Created with Three.js & Tailwind CSS • Mobile Touch Screen Optimized
        </p>
      </div>

      {/* --- Options Modal --- */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-100 z-10"
            >
              <h2 className="text-lg font-bold tracking-tight text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5 text-amber-500" />
                <span>การตั้งค่า (Options & Control Settings)</span>
              </h2>

              <div className="flex flex-col gap-5 my-2">
                {/* Audio Master Toggle */}
                <div className="flex items-center justify-between bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">ระบบเสียงในเกม</span>
                    <span className="text-xs text-slate-400">เปิดหรือปิดเสียงดนตรีและเอฟเฟกต์</span>
                  </div>
                  <button
                    id="modal-toggle-audio"
                    onClick={toggleSound}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                      settings.soundEnabled 
                        ? 'bg-amber-500 text-slate-950 shadow-[0_2px_8px_rgba(245,158,11,0.2)]' 
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {settings.soundEnabled ? 'เปิดใช้งาน (ON)' : 'ปิดใช้งาน (OFF)'}
                  </button>
                </div>

                {/* BGM Volume */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">ความดังเพลง (Music Volume)</span>
                    <span className="text-amber-500">{Math.round(settings.bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.bgmVolume}
                    disabled={!settings.soundEnabled}
                    onChange={handleBgmVolumeChange}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>

                {/* SFX Volume */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">ความดังเอฟเฟกต์ (SFX Volume)</span>
                    <span className="text-amber-500">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    disabled={!settings.soundEnabled}
                    onChange={handleSfxVolumeChange}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>

                {/* Touch Controls Switch */}
                <div className="flex items-center justify-between bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 mt-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-amber-500" /> จอยสติ๊กสัมผัสบนจอ
                    </span>
                    <span className="text-xs text-slate-400">แสดงหน้าจอบังคับทัชสกรีน (Touch Controls)</span>
                  </div>
                  <button
                    id="modal-toggle-joystick"
                    onClick={toggleJoystickSetting}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                      settings.useVirtualJoystick 
                        ? 'bg-amber-500 text-slate-950 shadow-[0_2px_8px_rgba(245,158,11,0.2)]' 
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {settings.useVirtualJoystick ? 'แสดง (ON)' : 'ซ่อน (OFF)'}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="close-options-btn"
                onClick={() => {
                  if (settings.soundEnabled) audio.playCollect();
                  setShowOptions(false);
                }}
                className="w-full py-3 mt-6 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer text-center text-sm"
              >
                บันทึกและปิดหน้าต่าง
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Tutorial/Help Modal --- */}
      <AnimatePresence>
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTutorial(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-100 z-10"
            >
              <h2 className="text-lg font-bold tracking-tight text-white mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>วิธีการเล่น (Keyboard & Touch Guide)</span>
              </h2>

              <div className="flex flex-col gap-4 text-xs md:text-sm text-slate-300 leading-relaxed my-2">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center bg-slate-800 rounded-lg p-2 font-mono text-xs text-amber-500 min-w-[70px] border border-slate-700">
                    <span>WASD</span>
                    <span className="text-[9px] text-slate-400">หรือปุ่มลูกศร</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">เคลื่อนที่ 8 ทิศทาง</h4>
                    <p className="text-xs text-slate-400">เดินไปรอบๆ แผนที่ 3 มิติ เพื่อสัญจรและหลบหลีก</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center bg-slate-800 rounded-lg w-[70px] h-10 font-mono text-sm text-amber-500 border border-slate-700">
                    <span>P</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">โจมตีธรรมดา (Punch)</h4>
                    <p className="text-xs text-slate-400">ต่อยโจมตีปล่อย Hit Box ด้านหน้าอนิเมชั่นจะรวดเร็วขึ้น</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center bg-slate-800 rounded-lg w-[70px] h-10 font-mono text-sm text-amber-500 border border-slate-700">
                    <span>O</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">ระเบิดพลังสกิลเวทย์ (Skill Energy Circle)</h4>
                    <p className="text-xs text-slate-400">สร้างวงแหวนขยายรอบตัวทำลายล้างศัตรูทั้งหมดในระยะประชิด</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <img 
                    src="https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png" 
                    alt="Potion" 
                    className="w-[40px] h-[40px] rounded-lg bg-slate-800 border border-slate-700 p-1 object-contain"
                  />
                  <div>
                    <h4 className="font-semibold text-white">ขวดน้ำยาวิเศษ (Health Potions)</h4>
                    <p className="text-xs text-slate-400">เก็บรักษาพลังชีวิต เดินผ่านขวดยาเพื่อเติมเลือด (HP สูงสุด 5)</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl flex items-center gap-2 mt-2">
                  <Gamepad2 className="w-5 h-5 flex-shrink-0" />
                  <span>สามารถเปิด "จอยสติ๊กสัมผัสบนจอ" ในเมนูตั้งค่าสำหรับเล่นบนโทรศัพท์มือถือหรือแท็บเล็ตได้</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="close-tutorial-btn"
                onClick={() => {
                  if (settings.soundEnabled) audio.playCollect();
                  setShowTutorial(false);
                }}
                className="w-full py-3 mt-5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer text-center text-sm"
              >
                รับทราบ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
