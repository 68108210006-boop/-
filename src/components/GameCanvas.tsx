import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameSettings, PlayerStats } from '../types';
import { audio } from '../utils/audio';
import { Loader2, Zap } from 'lucide-react';

interface GameCanvasProps {
  settings: GameSettings;
  stats: PlayerStats;
  onUpdateStats: (stats: PlayerStats) => void;
  onGameOver: () => void;
  gameState: string;
  // Trigger refs for HUD buttons
  attackTrigger: number;
  skillTrigger: number;
  // Touch joystick vectors passed from parent
  touchMoveVector: { x: number; y: number };
}

export default function GameCanvas({
  settings,
  stats,
  onUpdateStats,
  onGameOver,
  gameState,
  attackTrigger,
  skillTrigger,
  touchMoveVector,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game states in React for loading HUD
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Keep stats and triggers in refs for the animation loop
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const attackTriggerRef = useRef(attackTrigger);
  const skillTriggerRef = useRef(skillTrigger);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    // --- ThreeJS Setup ---
    const width = mountRef.current?.clientWidth || window.innerWidth;
    const height = mountRef.current?.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19'); // Deep space blue/black
    scene.fog = new THREE.FogExp2('#0b0f19', 0.04);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    // Position camera isometric-like
    camera.position.set(0, 8, 10);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight('#2a324b', 1.8); // soft ambient blue
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffdfa9', 1.5); // warm key light
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Additional blue/purple rim light for arcade glow
    const rimLight = new THREE.DirectionalLight('#7928ca', 1.2);
    rimLight.position.set(-10, 5, -10);
    scene.add(rimLight);

    // --- Loading Manager & Assets ---
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setLoadingProgress(Math.round((itemsLoaded / itemsTotal) * 100));
    };

    loadingManager.onLoad = () => {
      setLoading(false);
      audio.startBgm();
    };

    // Load textures
    const groundUrl = 'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png';
    const playerUrl = 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png';
    const enemyUrl = 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png';
    const potionUrl = 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png';

    const groundTexture = textureLoader.load(groundUrl);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(22, 22); // fine tiling

    const playerTexture = textureLoader.load(playerUrl);
    const enemyTexture = textureLoader.load(enemyUrl);
    const potionTexture = textureLoader.load(potionUrl);

    // --- Game Environment Objects ---

    // 1. Ground Plane (Size 50)
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper overlay for a techy cyber feel
    const gridHelper = new THREE.GridHelper(50, 25, '#475569', '#1e293b');
    gridHelper.position.y = 0.01; // slightly above ground
    scene.add(gridHelper);

    // Invisible boundaries to lock player in
    const BOUND_SIZE = 24.5;

    // --- Entities Representation ---

    // 1. Player Entity
    const playerTexClone = playerTexture.clone();
    playerTexClone.needsUpdate = true;
    playerTexClone.repeat.set(0.25, 0.25); // 4x4 layout

    const playerMat = new THREE.SpriteMaterial({
      map: playerTexClone,
      color: 0xffffff,
      transparent: true,
    });

    const playerSprite = new THREE.Sprite(playerMat);
    playerSprite.scale.set(1.8, 1.8, 1.8);
    playerSprite.position.set(0, 0.9, 0); // rest slightly on ground
    scene.add(playerSprite);

    // Visual Indicator Ring below player feet
    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const playerFootRing = new THREE.Mesh(ringGeo, ringMat);
    playerFootRing.rotation.x = -Math.PI / 2;
    playerFootRing.position.y = 0.02;
    scene.add(playerFootRing);

    // Player states in the loop
    const playerState = {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      row: 0, // 0: Idle, 1: Walk, 2: Attack, 3: Dance
      frame: 0,
      lastFrameTime: 0,
      isAttacking: false,
      isDancing: false,
      facingRight: true,
      screenShake: 0,
      hurtFlash: 0,
    };

    // 2. Enemies
    interface EnemyInstance {
      id: number;
      sprite: THREE.Sprite;
      tex: THREE.Texture;
      x: number;
      z: number;
      hp: number;
      state: 'IDLE' | 'WALK' | 'ATTACK' | 'KNOCKBACK' | 'DEAD';
      row: number; // 0: Idle, 1: Walk
      frame: number;
      lastFrameTime: number;
      facingRight: boolean;
      knockbackVel: THREE.Vector3;
      flashRedTime: number;
      flashWhiteTime: number;
      attackCooldown: number;
      deathTimer: number;
    }

    const enemiesList: EnemyInstance[] = [];
    let enemyIdCounter = 0;

    const spawnEnemy = (x: number, z: number) => {
      const eTex = enemyTexture.clone();
      eTex.needsUpdate = true;
      eTex.repeat.set(0.25, 0.5); // 4 cols, 2 rows

      const eMat = new THREE.SpriteMaterial({
        map: eTex,
        transparent: true,
        color: 0xffffff,
      });

      const eSprite = new THREE.Sprite(eMat);
      eSprite.scale.set(1.6, 1.6, 1.6);
      eSprite.position.set(x, 0.8, z);
      scene.add(eSprite);

      // Simple circular shadow under enemy
      const shadowGeo = new THREE.RingGeometry(0, 0.4, 16);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.78; // offset from center of sprite
      eSprite.add(shadow);

      enemiesList.push({
        id: enemyIdCounter++,
        sprite: eSprite,
        tex: eTex,
        x,
        z,
        hp: 2,
        state: 'WALK',
        row: 1,
        frame: Math.floor(Math.random() * 4),
        lastFrameTime: 0,
        facingRight: true,
        knockbackVel: new THREE.Vector3(),
        flashRedTime: 0,
        flashWhiteTime: 0,
        attackCooldown: 1,
        deathTimer: 0,
      });
    };

    // Initial Spawns
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 8;
      spawnEnemy(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }

    // 3. Potions / Items
    interface PotionInstance {
      id: number;
      sprite: THREE.Sprite;
      x: number;
      z: number;
      floatTime: number;
    }

    const potionsList: PotionInstance[] = [];
    let potionIdCounter = 0;

    const spawnPotion = (x: number, z: number) => {
      const pMat = new THREE.SpriteMaterial({
        map: potionTexture,
        transparent: true,
      });
      const pSprite = new THREE.Sprite(pMat);
      pSprite.scale.set(1.1, 1.1, 1.1);
      pSprite.position.set(x, 0.6, z);
      scene.add(pSprite);

      // Small magic glow under potion
      const glowGeo = new THREE.RingGeometry(0, 0.35, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -0.55;
      pSprite.add(glow);

      potionsList.push({
        id: potionIdCounter++,
        sprite: pSprite,
        x,
        z,
        floatTime: Math.random() * 10,
      });
    };

    // Initial potions
    for (let i = 0; i < 5; i++) {
      spawnPotion(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 35
      );
    }

    // 4. Skills (expanding shockwave)
    interface SkillRing {
      mesh: THREE.Mesh;
      currentRadius: number;
      maxRadius: number;
      life: number;
      damageDealt: Set<number>;
    }
    const skillRings: SkillRing[] = [];

    // 5. Particles
    interface ParticleInstance {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    const particlesList: ParticleInstance[] = [];

    const spawnHitParticles = (x: number, y: number, z: number, colorHex: number = 0xff0000, count: number = 8) => {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          x + (Math.random() - 0.5) * 0.4,
          y + (Math.random() - 0.5) * 0.4,
          z + (Math.random() - 0.5) * 0.4
        );
        scene.add(mesh);

        particlesList.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 3 + 2,
            (Math.random() - 0.5) * 4
          ),
          life: 1.0,
          maxLife: 1.0,
        });
      }
    };

    // --- Controls Listeners ---
    const keysPressed: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = true;

      // Quick hotkeys
      if (e.key.toLowerCase() === 'p') {
        triggerAttack();
      }
      if (e.key.toLowerCase() === 'o') {
        triggerSkill();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Action Functions ---

    const triggerAttack = () => {
      if (playerState.isAttacking || playerState.hurtFlash > 0) return;
      playerState.isAttacking = true;
      playerState.isDancing = false;
      playerState.row = 2; // Attack
      playerState.frame = 0;
      playerState.lastFrameTime = performance.now();

      audio.playAttack();

      // Punch swing effect (Visual trail)
      const attackDirX = playerState.facingRight ? 1.6 : -1.6;
      const swipeGeo = new THREE.RingGeometry(0.3, 0.9, 16, 1, 0, Math.PI);
      const swipeMat = new THREE.MeshBasicMaterial({
        color: 0xfca5a5,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const swipe = new THREE.Mesh(swipeGeo, swipeMat);
      // Flip rotation based on direction
      swipe.position.set(playerState.x + (playerState.facingRight ? 0.8 : -0.8), 0.9, playerState.z);
      swipe.rotation.y = playerState.facingRight ? -Math.PI / 2 : Math.PI / 2;
      scene.add(swipe);

      // Self-cleaning visual swipe mesh
      setTimeout(() => {
        scene.remove(swipe);
        swipeGeo.dispose();
        swipeMat.dispose();
      }, 150);

      // Hitbox logic
      // Calculate attack center
      const hitX = playerState.x + (playerState.facingRight ? 1.5 : -1.5);
      const hitZ = playerState.z;

      // Spawn visual hitbox sweep indicator briefly
      const hitIndicatorGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const hitIndicatorMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.15,
        wireframe: true,
      });
      const hitIndicator = new THREE.Mesh(hitIndicatorGeo, hitIndicatorMat);
      hitIndicator.position.set(hitX, 0.8, hitZ);
      scene.add(hitIndicator);

      setTimeout(() => {
        scene.remove(hitIndicator);
        hitIndicatorGeo.dispose();
        hitIndicatorMat.dispose();
      }, 120);

      // Check collisions with all enemies
      enemiesList.forEach((enemy) => {
        if (enemy.state === 'DEAD') return;

        const dist = Math.sqrt((enemy.x - hitX) ** 2 + (enemy.z - hitZ) ** 2);
        if (dist <= 2.2) {
          // Hits registered
          enemy.hp -= 1;
          audio.playHit();
          spawnHitParticles(enemy.x, 1.0, enemy.z, 0xef4444, 10);

          if (enemy.hp === 1) {
            // First hit: knockback backwards
            enemy.state = 'KNOCKBACK';
            // Knockback direction is player's facing direction
            const kbX = playerState.facingRight ? 10 : -10;
            // Also knock up a tiny bit
            enemy.knockbackVel.set(kbX, 1.5, (Math.random() - 0.5) * 4);
            enemy.flashRedTime = 0.4;
          } else if (enemy.hp <= 0) {
            // Second hit: Death knock-out/dissolve
            enemy.state = 'DEAD';
            enemy.deathTimer = 1.2; // 1.2s to fade/fly away
            // Fly out high
            const kbX = playerState.facingRight ? 12 : -12;
            enemy.knockbackVel.set(kbX, 10, (Math.random() - 0.5) * 6);
            enemy.flashWhiteTime = 1.2;

            // Increment stats
            const currentStats = statsRef.current;
            onUpdateStats({
              ...currentStats,
              enemiesDefeated: currentStats.enemiesDefeated + 1,
            });
          }
        }
      });
    };

    const triggerSkill = () => {
      if (playerState.isAttacking || playerState.hurtFlash > 0) return;

      // Spawn skill shockwave ring mesh
      const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const skillMesh = new THREE.Mesh(ringGeo, ringMat);
      skillMesh.rotation.x = -Math.PI / 2;
      skillMesh.position.set(playerState.x, 0.05, playerState.z);
      scene.add(skillMesh);

      skillRings.push({
        mesh: skillMesh,
        currentRadius: 0.3,
        maxRadius: 5.5,
        life: 0.8, // 0.8 seconds life
        damageDealt: new Set<number>(),
      });

      // Play skill sound
      audio.playSkill();

      // Trigger a visual dust particle wave under feet
      spawnHitParticles(playerState.x, 0.1, playerState.z, 0xd97706, 15);

      // Increment stats
      const currentStats = statsRef.current;
      onUpdateStats({
        ...currentStats,
        skillsUsed: currentStats.skillsUsed + 1,
      });
    };

    // --- Core Game Loop ---
    let animationFrameId: number;
    let lastTime = performance.now();
    let enemySpawnTimer = 0;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1); // cap delta to prevent crazy jumps
      lastTime = time;

      // Check external HUD buttons triggers
      if (attackTriggerRef.current !== attackTrigger) {
        attackTriggerRef.current = attackTrigger;
        triggerAttack();
      }
      if (skillTriggerRef.current !== skillTrigger) {
        skillTriggerRef.current = skillTrigger;
        triggerSkill();
      }

      const currentStats = statsRef.current;

      // 1. Process Input for Player
      let moveX = 0;
      let moveZ = 0;

      // Handle Keyboard
      if (keysPressed['w'] || keysPressed['arrowup']) moveZ -= 1;
      if (keysPressed['s'] || keysPressed['arrowdown']) moveZ += 1;
      if (keysPressed['a'] || keysPressed['arrowleft']) moveX -= 1;
      if (keysPressed['d'] || keysPressed['arrowright']) moveX += 1;

      // Combine with touch controls (Virtual Joystick takes priority if active)
      if (settings.useVirtualJoystick && (touchMoveVector.x !== 0 || touchMoveVector.y !== 0)) {
        moveX = touchMoveVector.x;
        moveZ = touchMoveVector.y;
      }

      // Check Dance key (L)
      if (keysPressed['l']) {
        if (!playerState.isDancing && !playerState.isAttacking) {
          playerState.isDancing = true;
          playerState.row = 3; // Row index 3 (bottom row, dance)
          playerState.frame = 0;
          playerState.lastFrameTime = time;
        }
      }

      // Compute Movement
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (length > 0 && !playerState.isAttacking && playerState.hurtFlash <= 0) {
        playerState.isDancing = false;
        
        // Normalize
        const nx = moveX / length;
        const nz = moveZ / length;

        // Apply walk velocity
        const speed = 5.2; // comfortable movement speed
        playerState.vx = nx * speed;
        playerState.vz = nz * speed;

        // Update animation row
        playerState.row = 1; // Row 1 (index 1): Walk

        // Determine horizontal flip
        if (nx > 0.05) playerState.facingRight = true;
        if (nx < -0.05) playerState.facingRight = false;
      } else {
        // Stop moving
        playerState.vx *= 0.15;
        playerState.vz *= 0.15;
        if (Math.abs(playerState.vx) < 0.01) playerState.vx = 0;
        if (Math.abs(playerState.vz) < 0.01) playerState.vz = 0;

        // Reset to Idle (Row 0) or Dance if active
        if (!playerState.isAttacking && playerState.hurtFlash <= 0) {
          if (playerState.isDancing) {
            playerState.row = 3; // Dance
          } else {
            playerState.row = 0; // Standing Idle
          }
        }
      }

      // Update Player position
      playerState.x += playerState.vx * delta;
      playerState.z += playerState.vz * delta;

      // Bound locking
      playerState.x = Math.max(-BOUND_SIZE, Math.min(BOUND_SIZE, playerState.x));
      playerState.z = Math.max(-BOUND_SIZE, Math.min(BOUND_SIZE, playerState.z));

      // Move Sprite & indicator ring
      playerSprite.position.set(playerState.x, 0.9, playerState.z);
      playerFootRing.position.set(playerState.x, 0.02, playerState.z);
      playerFootRing.rotation.z += 1.5 * delta; // rotate foot ring slowly

      // Animate Player Sprite
      const animInterval = playerState.isAttacking ? 55 : 140; // Attack anim is significantly FASTER (55ms vs 140ms)
      if (time - playerState.lastFrameTime > animInterval) {
        playerState.frame = (playerState.frame + 1) % 4;
        playerState.lastFrameTime = time;

        // If attack finished 4 frames, stop attacking
        if (playerState.isAttacking && playerState.frame === 0) {
          playerState.isAttacking = false;
          playerState.row = 0; // Return to idle
        }
      }

      // Texture coordinate shift for player.png
      // Layout is 4 rows, 4 columns (256x256px per cell)
      // Normal:
      // Row indices: 0 = Standing, 1 = Walk, 2 = Attack, 3 = Dance
      // In WebGL texture space, V (Y) = 0 is bottom, V = 1 is top.
      // So Row 0 (standing) is at top: v = 0.75
      // Row 1 (walking) is at v = 0.50
      // Row 2 (attack) is at v = 0.25
      // Row 3 (dance) is at v = 0.00
      const currentFrame = playerState.frame;
      const currentRow = playerState.row;

      // Handle horizontal flip via texture offset!
      if (playerState.facingRight) {
        playerTexClone.repeat.set(0.25, 0.25);
        playerTexClone.offset.set(currentFrame * 0.25, (3 - currentRow) * 0.25);
      } else {
        // Flipping horizontally: offset shifts right by 1 cell, repeat.x negative
        playerTexClone.repeat.set(-0.25, 0.25);
        playerTexClone.offset.set((currentFrame + 1) * 0.25, (3 - currentRow) * 0.25);
      }

      // Hurt glow flashing effect
      if (playerState.hurtFlash > 0) {
        playerState.hurtFlash -= delta;
        const flashIntensity = Math.sin(time * 0.05) * 0.5 + 0.5;
        playerMat.color.setRGB(1.0, 1.0 - flashIntensity * 0.8, 1.0 - flashIntensity * 0.8); // flash red
        // Scale shake
        playerSprite.scale.set(2.0, 2.0, 2.0);
      } else {
        playerMat.color.setRGB(1.0, 1.0, 1.0);
        playerSprite.scale.set(1.8, 1.8, 1.8);
      }

      // 2. Process Enemies AI & Movement
      // Periodically spawn enemies if count < 6
      enemySpawnTimer += delta;
      if (enemySpawnTimer > 3.0 && enemiesList.filter(e => e.state !== 'DEAD').length < 6) {
        enemySpawnTimer = 0;
        // Spawn off-screen relative to player
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 6;
        spawnEnemy(
          playerState.x + Math.cos(angle) * dist,
          playerState.z + Math.sin(angle) * dist
        );
      }

      for (let i = enemiesList.length - 1; i >= 0; i--) {
        const enemy = enemiesList[i];

        // Decelerate color flashes
        if (enemy.flashRedTime > 0) enemy.flashRedTime -= delta;
        if (enemy.flashWhiteTime > 0) enemy.flashWhiteTime -= delta;

        // Apply sprite color highlights based on states
        const eMat = enemy.sprite.material as THREE.SpriteMaterial;
        if (enemy.flashWhiteTime > 0) {
          // Rapid arcade white flashing
          const isWhite = Math.floor(time * 0.02) % 2 === 0;
          if (isWhite) {
            eMat.color.setRGB(5, 5, 5); // very bright emission-like white
          } else {
            eMat.color.setRGB(0.2, 0.2, 0.2);
          }
        } else if (enemy.flashRedTime > 0) {
          eMat.color.setRGB(1.0, 0.1, 0.1); // deep blood red
        } else {
          eMat.color.setRGB(1.0, 1.0, 1.0); // normal
        }

        // Enemy dead loop
        if (enemy.state === 'DEAD') {
          enemy.deathTimer -= delta;

          // Physics for flying out of screen
          enemy.knockbackVel.y -= 18 * delta; // Gravity downwards
          enemy.x += enemy.knockbackVel.x * delta;
          enemy.z += enemy.knockbackVel.z * delta;
          const currentY = enemy.sprite.position.y + enemy.knockbackVel.y * delta;
          enemy.sprite.position.y = Math.max(-10, currentY);

          // Fly away spinning!
          enemy.sprite.rotation.z += 10 * delta;
          enemy.sprite.scale.multiplyScalar(0.96); // scale down

          enemy.sprite.position.x = enemy.x;
          enemy.sprite.position.z = enemy.z;

          if (enemy.deathTimer <= 0) {
            // Delete enemy
            scene.remove(enemy.sprite);
            enemy.tex.dispose();
            eMat.dispose();
            enemiesList.splice(i, 1);
          }
          continue;
        }

        // Enemy knockback deceleration
        if (enemy.state === 'KNOCKBACK') {
          // Slide back
          enemy.x += enemy.knockbackVel.x * delta;
          enemy.z += enemy.knockbackVel.z * delta;
          enemy.sprite.position.y += enemy.knockbackVel.y * delta;

          // Apply friction
          enemy.knockbackVel.x *= 0.85;
          enemy.knockbackVel.z *= 0.85;
          enemy.knockbackVel.y -= 9.8 * delta; // small hop gravity

          if (enemy.sprite.position.y <= 0.8) {
            enemy.sprite.position.y = 0.8;
            enemy.knockbackVel.y = 0;
          }

          enemy.sprite.position.x = enemy.x;
          enemy.sprite.position.z = enemy.z;

          if (Math.abs(enemy.knockbackVel.x) < 0.1 && Math.abs(enemy.knockbackVel.z) < 0.1) {
            enemy.state = 'WALK';
            enemy.row = 1;
          }
          continue;
        }

        // Normal follow AI
        const dx = playerState.x - enemy.x;
        const dz = playerState.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Turn to player
        enemy.facingRight = dx >= 0;

        // Setup walking or idle
        if (dist > 1.3) {
          enemy.state = 'WALK';
          enemy.row = 1; // walking row

          const eSpeed = 1.8 + Math.min(statsRef.current.enemiesDefeated * 0.08, 1.2); // gets slightly faster as score increases!
          const ex = (dx / dist) * eSpeed;
          const ez = (dz / dist) * eSpeed;

          // Separation logic to prevent enemies overlaps
          let sepX = 0;
          let sepZ = 0;
          enemiesList.forEach((other) => {
            if (other.id === enemy.id || other.state === 'DEAD') return;
            const od = Math.sqrt((other.x - enemy.x) ** 2 + (other.z - enemy.z) ** 2);
            if (od < 1.1) {
              sepX += (enemy.x - other.x) * 1.5;
              sepZ += (enemy.z - other.z) * 1.5;
            }
          });

          enemy.x += (ex + sepX) * delta;
          enemy.z += (ez + sepZ) * delta;
        } else {
          // Close range attack player!
          enemy.state = 'ATTACK';
          enemy.row = 0; // standing animation row

          enemy.attackCooldown -= delta;
          if (enemy.attackCooldown <= 0 && playerState.hurtFlash <= 0 && currentStats.health > 0) {
            enemy.attackCooldown = 1.3; // attack rate
            enemy.flashRedTime = 0.5; // flash red when attacking

            // Deal damage!
            const newHealth = currentStats.health - 1;
            onUpdateStats({
              ...currentStats,
              health: newHealth,
            });

            audio.playHurt();
            playerState.hurtFlash = 0.7; // flash red for 0.7s
            playerState.screenShake = 0.35; // screenshake magnitude

            // Slight knockback to player away from this enemy
            const pPushX = dx > 0 ? -4 : 4;
            const pPushZ = dz > 0 ? -4 : 4;
            playerState.vx = pPushX;
            playerState.vz = pPushZ;

            // Check game over
            if (newHealth <= 0) {
              audio.playGameOver();
              onGameOver();
            }
          }
        }

        // Apply Position
        enemy.sprite.position.x = enemy.x;
        enemy.sprite.position.z = enemy.z;

        // Animate Enemy Sprite
        if (time - enemy.lastFrameTime > 150) {
          enemy.frame = (enemy.frame + 1) % 4;
          enemy.lastFrameTime = time;
        }

        // Texture shift for enemy.png (4 cols, 2 rows)
        // Row 0 = Standing (top row: offset.y = 0.5)
        // Row 1 = Walking (bottom row: offset.y = 0.0)
        const ecFrame = enemy.frame;
        const ecRow = enemy.row;

        if (enemy.facingRight) {
          enemy.tex.repeat.set(0.25, 0.5);
          enemy.tex.offset.set(ecFrame * 0.25, (1 - ecRow) * 0.5);
        } else {
          enemy.tex.repeat.set(-0.25, 0.5);
          enemy.tex.offset.set((ecFrame + 1) * 0.25, (1 - ecRow) * 0.5);
        }
      }

      // 3. Process Potions bobbing & picking up
      for (let i = potionsList.length - 1; i >= 0; i--) {
        const pot = potionsList[i];
        pot.floatTime += delta * 3;
        // Hover bobbing effect
        pot.sprite.position.y = 0.5 + Math.sin(pot.floatTime) * 0.12;

        const pdx = playerState.x - pot.x;
        const pdz = playerState.z - pot.z;
        const pdist = Math.sqrt(pdx * pdx + pdz * pdz);

        if (pdist < 1.25) {
          // Collect potion!
          audio.playCollect();

          // Spawn sparkle healing particles
          spawnHitParticles(pot.sprite.position.x, pot.sprite.position.y, pot.sprite.position.z, 0x10b981, 10);

          // Heal player
          const restoredHealth = Math.min(currentStats.maxHealth, currentStats.health + 1);
          onUpdateStats({
            ...currentStats,
            health: restoredHealth,
            potionsCollected: currentStats.potionsCollected + 1,
          });

          // Clear 3D
          scene.remove(pot.sprite);
          potionsList.splice(i, 1);

          // Spawn replacement potion elsewhere after a small delay
          setTimeout(() => {
            if (gameState === 'PLAYING') {
              spawnPotion(
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 35
              );
            }
          }, 4000);
        }
      }

      // 4. Process active Skill rings (expanding waves)
      for (let i = skillRings.length - 1; i >= 0; i--) {
        const ring = skillRings[i];
        ring.life -= delta;

        // Expand radius
        ring.currentRadius += (ring.maxRadius - ring.currentRadius) * 4 * delta;
        const geoScale = ring.currentRadius / 0.3; // scale up mesh
        ring.mesh.scale.set(geoScale, geoScale, 1);

        // Fade opacity
        const ringMat = ring.mesh.material as THREE.MeshBasicMaterial;
        ringMat.opacity = Math.max(0, ring.life / 0.8);

        // Check damage collision
        enemiesList.forEach((enemy) => {
          if (enemy.state === 'DEAD') return;
          if (ring.damageDealt.has(enemy.id)) return;

          const edist = Math.sqrt((enemy.x - playerState.x) ** 2 + (enemy.z - playerState.z) ** 2);
          // If within expanding ring frontier
          if (edist <= ring.currentRadius && edist >= ring.currentRadius - 1.8) {
            ring.damageDealt.add(enemy.id);

            // Double hit (Instant kill or heavy knockback)
            enemy.hp -= 2; // massive damage!
            audio.playHit();
            spawnHitParticles(enemy.x, 1.0, enemy.z, 0xf59e0b, 12);

            if (enemy.hp <= 0) {
              enemy.state = 'DEAD';
              enemy.deathTimer = 1.2;
              // Blast high in the air
              const blastDirX = enemy.x >= playerState.x ? 12 : -12;
              const blastDirZ = enemy.z >= playerState.z ? 6 : -6;
              enemy.knockbackVel.set(blastDirX, 12, blastDirZ);
              enemy.flashWhiteTime = 1.2;

              // Stats
              const statsNow = statsRef.current;
              onUpdateStats({
                ...statsNow,
                enemiesDefeated: statsNow.enemiesDefeated + 1,
              });
            } else {
              // Heavy push back
              enemy.state = 'KNOCKBACK';
              const kbX = enemy.x >= playerState.x ? 14 : -14;
              const kbZ = enemy.z >= playerState.z ? 14 : -14;
              enemy.knockbackVel.set(kbX, 4, kbZ);
              enemy.flashRedTime = 0.5;
            }
          }
        });

        if (ring.life <= 0) {
          scene.remove(ring.mesh);
          ring.mesh.geometry.dispose();
          ringMat.dispose();
          skillRings.splice(i, 1);
        }
      }

      // 5. Process Particles physical move
      for (let i = particlesList.length - 1; i >= 0; i--) {
        const p = particlesList[i];
        p.life -= delta;

        // Apply physical velocity
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 9.8 * delta; // gravity

        // Shrink particle
        p.mesh.scale.setScalar(p.life / p.maxLife);

        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          particlesList.splice(i, 1);
        }
      }

      // 6. Camera Follow with screenshake
      let targetCamX = playerState.x;
      let targetCamZ = playerState.z + 8.5; // offset backward
      let targetCamY = 7.5; // height offset

      if (playerState.screenShake > 0) {
        playerState.screenShake -= delta;
        const shakeVal = playerState.screenShake * 1.5;
        targetCamX += (Math.random() - 0.5) * shakeVal;
        targetCamY += (Math.random() - 0.5) * shakeVal;
        targetCamZ += (Math.random() - 0.5) * shakeVal;
      }

      // LERP camera
      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(playerState.x, 0.8, playerState.z);

      // Render Scene
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // --- On Resize Handler ---
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- Cleanups on Component Unmount ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      audio.stopBgm();

      // Clear remaining Three.js assets
      groundGeo.dispose();
      groundMat.dispose();
      groundTexture.dispose();
      playerTexture.dispose();
      playerTexClone.dispose();
      playerMat.dispose();
      enemyTexture.dispose();
      potionTexture.dispose();
      ringGeo.dispose();
      ringMat.dispose();

      enemiesList.forEach((enemy) => {
        scene.remove(enemy.sprite);
        enemy.tex.dispose();
        (enemy.sprite.material as THREE.Material).dispose();
      });

      potionsList.forEach((pot) => {
        scene.remove(pot.sprite);
        (pot.sprite.material as THREE.Material).dispose();
      });

      skillRings.forEach((ring) => {
        scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
      });

      particlesList.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });

      if (renderer) {
        renderer.dispose();
      }
    };
  }, [gameState]);

  return (
    <div ref={mountRef} className="w-full h-full absolute inset-0 overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loader screen when texture assets or audio are starting */}
      {loading && (
        <div className="absolute inset-0 bg-[#0b0f19] flex flex-col justify-center items-center select-none text-white z-40">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold font-mono tracking-wider text-amber-400 uppercase">
            กำลังโหลดทรัพย์สินในดันเจี้ยน...
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Loading ThreeJS Assets ({loadingProgress}%)
          </p>

          <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-150" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
