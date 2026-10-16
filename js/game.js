// Main Game Controller, Camera Orbit, HUD Updates, Radar Minimap & 2-Lives Loop
(function () {
  class Game {
    constructor() {
      this.canvasContainer = document.getElementById('canvas-container');
      this.radarCanvas = document.getElementById('radar-canvas');
      this.radarCtx = this.radarCanvas.getContext('2d');

      this.sound = new window.ButterflyGame.SoundEngine();
      this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER

      this.score = 0;
      this.bestScore = Number(localStorage.getItem('butterfly_best_score') || 0);
      this.fruitsEaten = 0;
      this.survivalTime = 0;
      this.shakeTimer = 0;
      this.shakeIntensity = 0;
      this.lowFuelBeepCooldown = 0;

      // Camera spherical orbit angles
      this.cameraYaw = Math.PI;
      this.cameraPitch = 0.28;
      this.cameraDistance = 8.2;
      this.isPointerLocked = false;
      this.isDraggingMouse = false;

      this.input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        turnLeft: false,
        turnRight: false
      };

      this.initThree();
      this.particles = new window.ButterflyGame.ParticleSystem(this.scene);
      this.world = new window.ButterflyGame.World(this.scene);
      this.butterfly = new window.ButterflyGame.Butterfly(
        this.scene,
        this.world,
        this.particles,
        this.sound
      );
      this.fruitManager = new window.ButterflyGame.FruitManager(
        this.scene,
        this.world,
        this.particles
      );
      this.predatorManager = new window.ButterflyGame.PredatorManager(
        this.scene,
        this.world,
        this.particles,
        this.sound
      );

      this.fruitManager.reset();
      this.predatorManager.reset();

      this.bindEvents();
      this.updateBestScoreUI();

      this.clock = new THREE.Clock();
      this.elapsed = 0;
      this.animate = this.animate.bind(this);
      this.applyUrlDemoPreset();
      requestAnimationFrame(this.animate);
    }

    applyUrlDemoPreset() {
      const params = new URLSearchParams(window.location.search);
      const demo = params.get('demo');
      if (!demo) return;

      document.getElementById('start-screen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      this.state = 'PLAYING';

      if (demo === 'flight') {
        this.butterfly.position.set(3.5, 4.2, 14.5);
        this.butterfly.heading = Math.PI * 0.92;
        this.cameraYaw = Math.PI * 0.92;
        this.cameraPitch = 0.22;
        this.score = 450;
        this.fruitsEaten = 4;
        this.survivalTime = 18.4;
        this.butterfly.fuel = 82;
        this.showToast('🍓 Ate Dewberry Cluster! +32% Fuel (+150 pts)', 'success');
      } else if (demo === 'hunt') {
        this.butterfly.setTheme('morpho');
        this.butterfly.position.set(-8.0, 3.8, 10.0);
        this.butterfly.heading = 2.4;
        this.butterfly.lives = 1;
        this.butterfly.fuel = 44;
        this.butterfly.nectarRushTimer = 4.2;
        this.cameraYaw = 2.4;
        this.cameraPitch = 0.25;
        this.score = 1280;
        this.fruitsEaten = 11;
        this.survivalTime = 54.2;

        const fox = this.predatorManager.predators.find((p) => p.type === 'fox');
        if (fox) {
          fox.position.set(-12.5, this.world.getTerrainHeight(-12.5, 5.5), 5.5);
          fox.state = 'CHASE';
          fox.alertSprite.visible = true;
          fox.group.position.copy(fox.position);
        }
        const hawk = this.predatorManager.predators.find((p) => p.type === 'hawk');
        if (hawk) {
          hawk.position.set(-13.5, 7.8, 3.0);
          hawk.state = 'DIVE';
          hawk.alertSprite.visible = true;
          hawk.group.position.copy(hawk.position);
        }
        this.showToast('⚠️ Hunted by a Red Fox! Only 1 Life Left — Fly High & Refuel!', 'danger');
      }
      this.updateHUD();
      this.drawRadar();
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        260
      );

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.canvasContainer.appendChild(this.renderer.domElement);
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      window.addEventListener('keydown', (e) => this.onKey(e, true));
      window.addEventListener('keyup', (e) => this.onKey(e, false));

      // Mouse look support (both pointer lock on canvas click AND click-drag fallback)
      const dom = this.renderer.domElement;
      dom.addEventListener('mousedown', (e) => {
        if (this.state !== 'PLAYING') return;
        if (e.button === 2) {
          this.butterfly.triggerDash();
          return;
        }
        this.isDraggingMouse = true;
        if (!this.isPointerLocked && dom.requestPointerLock) {
          dom.requestPointerLock();
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDraggingMouse = false;
      });

      window.addEventListener('contextmenu', (e) => e.preventDefault());

      document.addEventListener('pointerlockchange', () => {
        this.isPointerLocked = document.pointerLockElement === dom;
      });

      window.addEventListener('mousemove', (e) => {
        if (this.state !== 'PLAYING') return;
        if (this.isPointerLocked || this.isDraggingMouse) {
          this.cameraYaw -= e.movementX * 0.0032;
          this.cameraPitch = THREE.MathUtils.clamp(
            this.cameraPitch + e.movementY * 0.0026,
            -0.15,
            1.15
          );
        }
      });

      window.addEventListener(
        'wheel',
        (e) => {
          if (this.state !== 'PLAYING') return;
          this.cameraDistance = THREE.MathUtils.clamp(
            this.cameraDistance + e.deltaY * 0.005,
            4.8,
            14.5
          );
        },
        { passive: true }
      );

      // UI Buttons
      document.getElementById('start-btn').addEventListener('click', () => {
        this.startGame();
      });

      document.getElementById('restart-btn').addEventListener('click', () => {
        this.startGame();
      });

      document.getElementById('resume-btn').addEventListener('click', () => {
        this.togglePause();
      });

      document.getElementById('dash-mobile-btn')?.addEventListener('click', () => {
        if (this.state === 'PLAYING') this.butterfly.triggerDash();
      });

      const muteBtn = document.getElementById('mute-btn');
      muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        muteBtn.textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
      });

      // Butterfly wing species selector cards
      document.querySelectorAll('.species-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.species-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const themeKey = btn.getAttribute('data-theme');
          this.butterfly.setTheme(themeKey);
        });
      });
    }

    onKey(e, isDown) {
      const code = e.code;
      if (isDown && this.state === 'PLAYING') {
        if (code === 'KeyF' || code === 'ControlLeft') {
          this.butterfly.triggerDash();
        } else if (code === 'KeyP') {
          this.togglePause();
        }
      } else if (isDown && this.state === 'PAUSED' && code === 'KeyP') {
        this.togglePause();
      }

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          this.input.forward = isDown;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.input.backward = isDown;
          break;
        case 'KeyA':
          this.input.left = isDown;
          break;
        case 'KeyD':
          this.input.right = isDown;
          break;
        case 'ArrowLeft':
        case 'KeyQ':
          this.input.turnLeft = isDown;
          break;
        case 'ArrowRight':
        case 'KeyE':
          this.input.turnRight = isDown;
          break;
        case 'Space':
          this.input.up = isDown;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          this.input.down = isDown;
          break;
      }
    }

    startGame() {
      this.sound.init();
      this.score = 0;
      this.fruitsEaten = 0;
      this.survivalTime = 0;
      this.cameraYaw = Math.PI;
      this.cameraPitch = 0.28;

      this.butterfly.resetState();
      this.fruitManager.reset();
      this.predatorManager.reset();

      document.getElementById('start-screen').classList.add('hidden');
      document.getElementById('gameover-screen').classList.add('hidden');
      document.getElementById('pause-screen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');

      this.state = 'PLAYING';
      this.updateHUD();
      this.showToast('🦋 Eat small fruits to refuel! Watch out for wild predators!', 'info');

      const dom = this.renderer.domElement;
      if (dom.requestPointerLock) {
        dom.requestPointerLock();
      }
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
        if (document.exitPointerLock) document.exitPointerLock();
      } else if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
      }
    }

    triggerScreenShake(duration = 0.45, intensity = 0.65) {
      this.shakeTimer = duration;
      this.shakeIntensity = intensity;
      const flash = document.getElementById('damage-flash');
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 420);
    }

    handlePlayerDamage(reasonText) {
      const lost = this.butterfly.takeHit();
      if (!lost) return;

      this.triggerScreenShake(0.55, 0.85);
      this.updateHUD();

      if (this.butterfly.lives > 0) {
        this.showToast(
          `⚠️ ${reasonText}! Only 1 Life Left — Fly High & Refuel!`,
          'danger'
        );
      } else {
        this.endGame(reasonText);
      }
    }

    endGame(causeOfDeath) {
      this.state = 'GAMEOVER';
      if (document.exitPointerLock) document.exitPointerLock();

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('butterfly_best_score', String(this.bestScore));
      }
      this.updateBestScoreUI();

      document.getElementById('gameover-cause').textContent = causeOfDeath;
      document.getElementById('final-score').textContent = Math.floor(this.score);
      document.getElementById('final-fruits').textContent = this.fruitsEaten;
      document.getElementById('final-time').textContent = `${this.survivalTime.toFixed(1)}s`;
      document.getElementById('gameover-screen').classList.remove('hidden');
    }

    updateBestScoreUI() {
      document.querySelectorAll('.best-score-val').forEach((el) => {
        el.textContent = Math.floor(this.bestScore);
      });
    }

    showToast(message, type = 'info') {
      const banner = document.getElementById('event-toast');
      banner.textContent = message;
      banner.className = `event-toast show ${type}`;
      clearTimeout(this.toastTimeout);
      if (new URLSearchParams(window.location.search).get('screenshot') !== '1') {
        this.toastTimeout = setTimeout(() => {
          banner.classList.remove('show');
        }, 2800);
      }
    }

    updateHUD() {
      // Update 2 Lives Hearts / Butterfly Icons
      const life1 = document.getElementById('life-1');
      const life2 = document.getElementById('life-2');
      life1.classList.toggle('lost', this.butterfly.lives < 1);
      life2.classList.toggle('lost', this.butterfly.lives < 2);

      // Update Fuel Bar
      const fuelPct = Math.max(0, Math.min(100, this.butterfly.fuel));
      const fuelFill = document.getElementById('fuel-fill');
      const fuelText = document.getElementById('fuel-pct');
      fuelFill.style.width = `${fuelPct}%`;
      fuelText.textContent = `${Math.ceil(fuelPct)}%`;

      if (this.butterfly.nectarRushTimer > 0) {
        fuelFill.className = 'fuel-fill golden';
      } else if (fuelPct < 25) {
        fuelFill.className = 'fuel-fill critical';
      } else if (fuelPct < 50) {
        fuelFill.className = 'fuel-fill warning';
      } else {
        fuelFill.className = 'fuel-fill';
      }

      // Low fuel or Starvation alert banner
      const fuelAlert = document.getElementById('fuel-warning');
      if (this.butterfly.fuel <= 0.1) {
        const remain = Math.max(0, 4.5 - this.butterfly.starvationTimer).toFixed(1);
        fuelAlert.textContent = `🚨 OUT OF FUEL! Eat a fruit in ${remain}s or lose a life!`;
        fuelAlert.classList.remove('hidden');
      } else if (this.butterfly.fuel < 22) {
        fuelAlert.textContent = '⚠️ Low Nectar Fuel! Swoop down & eat small fruits!';
        fuelAlert.classList.remove('hidden');
      } else {
        fuelAlert.classList.add('hidden');
      }

      // Score, Fruits & Time
      document.getElementById('score-val').textContent = Math.floor(this.score);
      document.getElementById('fruits-val').textContent = this.fruitsEaten;
      document.getElementById('time-val').textContent = `${Math.floor(this.survivalTime)}s`;

      // Dash status badge
      const dashBadge = document.getElementById('dash-status');
      if (this.butterfly.nectarRushTimer > 0) {
        dashBadge.textContent = `✨ GOLDEN RUSH (${this.butterfly.nectarRushTimer.toFixed(1)}s)`;
        dashBadge.className = 'dash-badge rush';
      } else if (this.butterfly.dashCooldown > 0) {
        dashBadge.textContent = '⏳ Dash Recharging...';
        dashBadge.className = 'dash-badge cooldown';
      } else {
        dashBadge.textContent = '⚡ Flutter Dash Ready [F / R-Click]';
        dashBadge.className = 'dash-badge ready';
      }

      // Predator active threat detector
      let closestThreat = null;
      let minDist = Infinity;
      for (const p of this.predatorManager.predators) {
        if (p.state !== 'PATROL' && p.state !== 'COOLDOWN' && p.state !== 'CLIMB') {
          const d = p.position.distanceTo(this.butterfly.position);
          if (d < minDist) {
            minDist = d;
            closestThreat = p;
          }
        }
      }

      const threatEl = document.getElementById('threat-indicator');
      if (closestThreat && minDist < 26) {
        threatEl.textContent = `🐾 ${closestThreat.name.toUpperCase()} HUNTING YOU (${Math.ceil(
          minDist
        )}m)!`;
        threatEl.classList.remove('hidden');
      } else {
        threatEl.classList.add('hidden');
      }
    }

    drawRadar() {
      const ctx = this.radarCtx;
      const w = this.radarCanvas.width;
      const h = this.radarCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = w / 2 - 8;
      const scale = radius / this.world.mapRadius;

      ctx.clearRect(0, 0, w, h);

      // Radar background circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12, 28, 20, 0.78)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.45)';
      ctx.stroke();
      ctx.clip();

      // Central pond circle on radar
      ctx.beginPath();
      ctx.arc(cx, cy, this.world.pondRadius * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 166, 217, 0.35)';
      ctx.fill();

      // Draw fruits as glowing dots
      for (const f of this.fruitManager.fruits) {
        const fx = cx + f.group.position.x * scale;
        const fy = cy + f.group.position.z * scale;
        ctx.beginPath();
        ctx.arc(fx, fy, f.spec.isGolden ? 4.2 : 3.0, 0, Math.PI * 2);
        ctx.fillStyle = f.spec.isGolden
          ? '#ffd700'
          : f.typeKey === 'blueberry'
          ? '#60a5fa'
          : '#fb7185';
        ctx.fill();
      }

      // Draw predators
      for (const p of this.predatorManager.predators) {
        const px = cx + p.position.x * scale;
        const py = cy + p.position.z * scale;
        const isHunting =
          p.state === 'CHASE' ||
          p.state === 'WINDUP' ||
          p.state === 'LUNGE' ||
          p.state === 'DIVE' ||
          p.state === 'STRIKE';

        ctx.beginPath();
        ctx.arc(px, py, isHunting ? 5.2 : 3.8, 0, Math.PI * 2);
        ctx.fillStyle = isHunting ? '#ef4444' : '#f97316';
        ctx.fill();
        if (isHunting) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      }

      // Draw player butterfly at its position with heading arrow
      const bx = cx + this.butterfly.position.x * scale;
      const by = cy + this.butterfly.position.z * scale;
      ctx.translate(bx, by);
      ctx.rotate(-this.butterfly.heading);

      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore();
    }

    updateCamera(dt, elapsed) {
      if (this.state === 'MENU') {
        // Scenic orbit around the butterfly in the meadow
        const angle = elapsed * 0.28;
        const focus = this.butterfly.position;
        this.camera.position.set(
          focus.x + Math.sin(angle) * 7.5,
          focus.y + 2.4,
          focus.z + Math.cos(angle) * 7.5
        );
        this.camera.lookAt(focus.x, focus.y + 0.4, focus.z);
        return;
      }

      // Keyboard camera rotation support (Q / E or Left / Right arrows)
      if (this.input.turnLeft) this.cameraYaw += 1.9 * dt;
      if (this.input.turnRight) this.cameraYaw -= 1.9 * dt;

      // Smoothly follow behind the butterfly
      const target = this.butterfly.position;
      const horizDist = Math.cos(this.cameraPitch) * this.cameraDistance;
      const vertDist = Math.sin(this.cameraPitch) * this.cameraDistance;

      const desiredCamPos = new THREE.Vector3(
        target.x + Math.sin(this.cameraYaw) * horizDist,
        target.y + vertDist + 1.1,
        target.z + Math.cos(this.cameraYaw) * horizDist
      );

      // Prevent camera from dipping below terrain
      const camGround = this.world.getTerrainHeight(desiredCamPos.x, desiredCamPos.z) + 0.85;
      if (desiredCamPos.y < camGround) desiredCamPos.y = camGround;

      this.camera.position.lerp(desiredCamPos, Math.min(1, dt * 10));

      // Apply camera shake if damaged
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
      }

      const lookTarget = new THREE.Vector3(
        target.x - Math.sin(this.cameraYaw) * 2.2,
        target.y + 0.45,
        target.z - Math.cos(this.cameraYaw) * 2.2
      );
      this.camera.lookAt(lookTarget);
    }

    animate() {
      const isStaticShot = new URLSearchParams(window.location.search).get('screenshot') === '1';
      this.frameCount = (this.frameCount || 0) + 1;
      if (!isStaticShot || this.frameCount < 3) {
        requestAnimationFrame(this.animate);
      }

      const dt = Math.min(0.05, this.clock.getDelta());
      this.elapsed += dt;

      this.world.update(dt, this.elapsed);
      this.particles.update(dt, this.elapsed);

      if (this.state === 'PLAYING') {
        this.survivalTime += dt;
        this.score += dt * 5; // Passive survival points

        // Difficulty gently scales as you survive longer
        const difficultyScale = 1.0 + Math.min(0.55, this.survivalTime / 140);

        this.butterfly.update(dt, this.elapsed, this.input, this.cameraYaw);

        // Low fuel warning beep
        if (this.butterfly.fuel < 22) {
          this.lowFuelBeepCooldown -= dt;
          if (this.lowFuelBeepCooldown <= 0) {
            this.sound.playLowFuelBeep();
            this.lowFuelBeepCooldown = this.butterfly.fuel <= 0.1 ? 0.55 : 1.3;
          }
        }

        // Check starvation life loss if fuel stays empty for 4.5s
        if (this.butterfly.starvationTimer >= 4.5) {
          this.butterfly.starvationTimer = 0;
          this.handlePlayerDamage('Starved out of Nectar Fuel');
        }

        // Update fruits & check eating
        this.fruitManager.update(dt, this.elapsed, this.butterfly, (fruitSpec) => {
          this.fruitsEaten += 1;
          this.score += fruitSpec.score;
          if (fruitSpec.isGolden) {
            this.showToast(
              `🌟 Ate ${fruitSpec.name}! +${fruitSpec.fuel}% Fuel & Golden Nectar Rush!`,
              'gold'
            );
          } else {
            this.showToast(
              `🍓 Ate ${fruitSpec.name}! +${fruitSpec.fuel}% Fuel (+${fruitSpec.score} pts)`,
              'success'
            );
          }
        });

        // Update wild animal predators & check hunting catches
        this.predatorManager.update(
          dt,
          this.elapsed,
          this.butterfly,
          difficultyScale,
          (predatorName) => {
            this.handlePlayerDamage(`Hunted by a ${predatorName}`);
          }
        );

        this.updateHUD();
        this.drawRadar();
      } else if (this.state === 'MENU') {
        // Gentle idle wing flap on start screen
        this.butterfly.wingPhase += dt * 10;
        const wingAngle = Math.sin(this.butterfly.wingPhase) * 0.85 + 0.12;
        this.butterfly.leftWingPivot.rotation.z = -wingAngle;
        this.butterfly.rightWingPivot.rotation.z = wingAngle;
        this.butterfly.group.position.y = 7.5 + Math.sin(this.elapsed * 2.2) * 0.35;
      }

      this.updateCamera(dt, this.elapsed);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
  });
})();
