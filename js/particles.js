// 3D Particle System for Wing Shimmer, Fruit Bursts, Predator Dust, and Ambient Pollen
(function () {
  class ParticleSystem {
    constructor(scene) {
      this.scene = scene;
      this.burstParticles = [];
      this.sharedGeo = new THREE.OctahedronGeometry(0.16, 0);

      // Ambient floating meadow pollen / sun motes
      this.pollenCount = 140;
      const pollenGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(this.pollenCount * 3);
      const phases = new Float32Array(this.pollenCount);

      for (let i = 0; i < this.pollenCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 110;
        positions[i * 3 + 1] = 1.0 + Math.random() * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
        phases[i] = Math.random() * Math.PI * 2;
      }

      pollenGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.pollenPhases = phases;

      const pollenMat = new THREE.PointsMaterial({
        color: 0xfff5aa,
        size: 0.35,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.pollenPoints = new THREE.Points(pollenGeo, pollenMat);
      this.scene.add(this.pollenPoints);
    }

    spawnBurst(position, color, count = 18, speed = 6, scale = 1.0) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.95
        });
        const mesh = new THREE.Mesh(this.sharedGeo, mat);
        mesh.position.copy(position);
        const s = (0.6 + Math.random() * 0.9) * scale;
        mesh.scale.set(s, s, s);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = (0.35 + Math.random() * 0.85) * speed;
        const vel = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd + 1.5,
          Math.sin(phi) * Math.sin(theta) * spd
        );

        this.scene.add(mesh);
        this.burstParticles.push({
          mesh,
          vel,
          life: 0.45 + Math.random() * 0.45,
          maxLife: 0.85,
          gravity: 8.5
        });
      }
    }

    spawnWingTrail(position, color = 0x55eeff, isDashing = false) {
      if (!isDashing && Math.random() > 0.35) return;
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: isDashing ? 0.85 : 0.55
      });
      const mesh = new THREE.Mesh(this.sharedGeo, mat);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.7;
      mesh.position.y += (Math.random() - 0.5) * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.7;
      const s = isDashing ? 0.85 : 0.45;
      mesh.scale.set(s, s, s);

      this.scene.add(mesh);
      this.burstParticles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          -0.6 - Math.random() * 0.6,
          (Math.random() - 0.5) * 1.2
        ),
        life: isDashing ? 0.45 : 0.32,
        maxLife: isDashing ? 0.45 : 0.32,
        gravity: 0.5
      });
    }

    update(dt, elapsed) {
      // Animate floating meadow pollen
      const posAttr = this.pollenPoints.geometry.attributes.position;
      for (let i = 0; i < this.pollenCount; i++) {
        const phase = this.pollenPhases[i];
        posAttr.array[i * 3] += Math.sin(elapsed * 0.6 + phase) * dt * 0.4;
        posAttr.array[i * 3 + 1] += Math.cos(elapsed * 0.9 + phase) * dt * 0.25;
      }
      posAttr.needsUpdate = true;

      // Update active burst/trail particles
      for (let i = this.burstParticles.length - 1; i >= 0; i--) {
        const p = this.burstParticles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.material.dispose();
          this.burstParticles.splice(i, 1);
          continue;
        }
        p.vel.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += 5 * dt;
        p.mesh.rotation.y += 6 * dt;
        const ratio = Math.max(0, p.life / p.maxLife);
        p.mesh.material.opacity = ratio;
        p.mesh.scale.multiplyScalar(0.98);
      }
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.ParticleSystem = ParticleSystem;
})();
