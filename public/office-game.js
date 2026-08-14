(() => {
  const WORKERS = [
    { id: 0, token: '#001', slug: 'pixel-agent-0', asset: '/assets/office/workers/pixel-agent-0.png?v=pa-2', name: 'THE RED LEDGER', role: 'RISK & LEDGER', brand: 'BNB' },
    { id: 1, token: '#002', slug: 'pixel-agent-1', asset: '/assets/office/workers/pixel-agent-1.png?v=pa-2', name: 'THE GREEN CANDLE', role: 'MARKET SIGNALS', brand: 'FLAP' },
    { id: 2, token: '#003', slug: 'pixel-agent-2', asset: '/assets/office/workers/pixel-agent-2.png?v=pa-2', name: 'THE SQUEEZE MECHANIC', role: 'LIQUIDITY OPS', brand: 'BNB' },
    { id: 3, token: '#004', slug: 'pixel-agent-3', asset: '/assets/office/workers/pixel-agent-3.png?v=pa-2', name: 'THE NIGHT AUDITOR', role: 'VAULT ACCOUNTING', brand: 'FLAP' },
    { id: 4, token: '#005', slug: 'pixel-agent-4', asset: '/assets/office/workers/pixel-agent-4.png?v=pa-3', name: 'THE LAST HOLDER', role: 'LONG-TERM STORAGE', brand: 'BNB' },
    { id: 5, token: '#006', slug: 'pixel-agent-5', asset: '/assets/office/workers/pixel-agent-5.png?v=pa-3', name: 'THE PURPLE OPERATOR', role: 'VAULT ROUTING', brand: 'FLAP' }
  ];

  const PIXEL_FLOOR_PATH = '/assets/office/pixel-agents/floors/floor_';
  const PIXEL_WALL_PATH = '/assets/office/pixel-agents/walls/wall_0.png';
  const PIXEL_FURNITURE_PATH = '/assets/office/pixel-agents/furniture/';
  const TILE = 32;
  const CHARACTER_SITTING_OFFSET_PX = 6;
  const CHARACTER_Z_SORT_OFFSET = 0.5;
  const DISPLAY_SCALE = 2;
  const OFFICE = { x: 32, y: 30, cols: 28, rows: 15 };

  const FURNITURE = {
    desk: 'DESK/DESK_FRONT.png',
    pc1: 'PC/PC_FRONT_ON_1.png',
    pc2: 'PC/PC_FRONT_ON_2.png',
    pc3: 'PC/PC_FRONT_ON_3.png',
    chair: 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',
    bookshelf: 'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png',
    hangingPlant: 'HANGING_PLANT/HANGING_PLANT.png',
    painting: 'LARGE_PAINTING/LARGE_PAINTING.png',
    paintingSmall: 'SMALL_PAINTING_2/SMALL_PAINTING_2.png',
    clock: 'CLOCK/CLOCK.png',
    plant: 'PLANT/PLANT.png',
    plant2: 'PLANT_2/PLANT_2.png',
    largePlant: 'LARGE_PLANT/LARGE_PLANT.png',
    sofaBack: 'SOFA/SOFA_BACK.png',
    sofaFront: 'SOFA/SOFA_FRONT.png',
    sofaSide: 'SOFA/SOFA_SIDE.png',
    coffeeTable: 'COFFEE_TABLE/COFFEE_TABLE.png',
    coffee: 'COFFEE/COFFEE.png',
    whiteboard: 'WHITEBOARD/WHITEBOARD.png',
    meetingTable: 'TABLE_FRONT/TABLE_FRONT.png',
    bench: 'CUSHIONED_BENCH/CUSHIONED_BENCH.png',
    bin: 'BIN/BIN.png'
  };

  const seat = (col, row, approachRow) => ({
    x: OFFICE.x + col * TILE + TILE / 2,
    y: OFFICE.y + row * TILE + TILE / 2,
    approachX: OFFICE.x + col * TILE + TILE / 2,
    approachY: OFFICE.y + approachRow * TILE + TILE / 2
  });

  const OFFICE_CONFIGS = {
    trading: {
      label: 'GMEB Trading Floor', mainFloor: 'pa-floor-5', mainTint: 0xb97b48,
      lowerFloor: 'pa-floor-1', lowerTint: 0x7c8790, sideTint: 0x6687a8,
      seats: [seat(3, 6, 8), seat(8, 6, 8), seat(13, 6, 8), seat(3, 12, 13), seat(9, 12, 13)]
    },
    'bnb-strategy': {
      label: 'BNB Strategy Room', mainFloor: 'pa-floor-3', mainTint: 0xd0a038,
      lowerFloor: 'pa-floor-5', lowerTint: 0x9d6c3d, sideTint: 0xb88b2d,
      seats: [seat(3, 5, 7), seat(8, 5, 7), seat(13, 5, 7), seat(3, 11, 13), seat(8, 11, 13), seat(13, 11, 13)]
    },
    'flap-lab': {
      label: 'Flap Vault Lab', mainFloor: 'pa-floor-0', mainTint: 0x79558f,
      lowerFloor: 'pa-floor-1', lowerTint: 0x545d79, sideTint: 0x8b63a8,
      seats: [seat(3, 5, 7), seat(8, 5, 7), seat(13, 5, 7), seat(3, 11, 13), seat(8, 11, 13), seat(13, 11, 13)]
    }
  };

  class OfficeScene extends Phaser.Scene {
    constructor() {
      super('OfficeScene');
      this.workers = new Map();
      this.debugVisible = false;
      this.seatOwners = new Map();
    }

    init(data = {}) {
      const selected = document.querySelector('#office-location')?.value;
      this.officeId = data.officeId || selected || 'trading';
      this.officeConfig = OFFICE_CONFIGS[this.officeId] || OFFICE_CONFIGS.trading;
      this.workstations = this.officeConfig.seats;
      this.workers = new Map();
      this.seatOwners = new Map();
      this.collisionSpecs = [];
      this.debugVisible = false;
    }

    preload() {
      [0, 1, 3, 5, 7].forEach(index => this.load.image(`pa-floor-${index}`, `${PIXEL_FLOOR_PATH}${index}.png?v=pa-3`));
      this.load.spritesheet('pa-wall', `${PIXEL_WALL_PATH}?v=pa-2`, { frameWidth: 16, frameHeight: 16 });
      Object.entries(FURNITURE).forEach(([key, path]) => {
        this.load.image(`pa-furn-${key}`, `${PIXEL_FURNITURE_PATH}${path}?v=pa-2`);
      });
      WORKERS.forEach(worker => {
        this.load.spritesheet(worker.slug, worker.asset, { frameWidth: 16, frameHeight: 32 });
      });
    }

    create() {
      this.createWorkerAnimations();
      this.drawOffice();
      this.obstacles = this.physics.add.staticGroup();
      this.buildCollisionMap();
      this.agents = this.physics.add.group({ collideWorldBounds: true });
      WORKERS.forEach(worker => this.spawnMintedWorker(worker.id, { instant: true }));
      this.selectWorker(WORKERS[0]);
      this.physics.add.collider(this.agents, this.obstacles, worker => this.turnWorker(worker));
      this.physics.add.collider(this.agents, this.agents, left => this.turnWorker(left));
      this.physics.world.setBounds(OFFICE.x + TILE, OFFICE.y + TILE, (OFFICE.cols - 2) * TILE, (OFFICE.rows - 2) * TILE);
      this.bindControls();
      window.gmebOffice = this;
      window.dispatchEvent(new CustomEvent('office-ready', { detail: { workers: WORKERS.length } }));
    }

    createWorkerAnimations() {
      WORKERS.forEach(worker => {
        const add = (suffix, frames, frameRate) => {
          const key = `${worker.slug}-${suffix}`;
          if (!this.anims.exists(key)) {
            this.anims.create({ key, frames: frames.map(frame => ({ key: worker.slug, frame })), frameRate, repeat: -1 });
          }
        };
        add('walk-down', [0, 1, 2, 1], 7);
        add('walk-up', [7, 8, 9, 8], 7);
        add('walk-side', [14, 15, 16, 15], 7);
        add('type-front', [3, 4], 3);
        add('read-front', [5, 6], 2);
      });
    }

    tileCenter(col, row) {
      return { x: OFFICE.x + col * TILE + TILE / 2, y: OFFICE.y + row * TILE + TILE / 2 };
    }

    addTile(key, col, row, tint) {
      const { x, y } = this.tileCenter(col, row);
      const tile = this.add.image(x, y, key).setScale(2).setDepth(1);
      if (tint) tile.setTint(tint);
      return tile;
    }

    placeFurniture(key, col, row, options = {}) {
      const x = OFFICE.x + col * TILE;
      const y = OFFICE.y + row * TILE;
      const image = this.add.image(x, y, `pa-furn-${key}`)
        .setOrigin(0, 0)
        .setScale(2)
        .setFlipX(Boolean(options.flipX));
      const bottom = y + image.displayHeight;
      let zY = bottom;
      if (options.category === 'chairs') {
        zY = options.orientation === 'back'
          ? y + (options.footprintH ?? 1) * TILE + 1
          : y + TILE;
      }
      if (options.canPlaceOnSurfaces) zY += CHARACTER_Z_SORT_OFFSET;
      image.zY = zY;
      image.setDepth(options.depth ?? 8 + zY / 1000);
      if (options.blocked) this.collisionSpecs.push({ col, row, ...options.blocked });
      return image;
    }

    drawOffice() {
      const config = this.officeConfig;
      this.add.rectangle(480, 270, 960, 540, 0x111c31).setDepth(0);
      for (let row = 0; row < OFFICE.rows; row += 1) {
        for (let col = 0; col < OFFICE.cols; col += 1) {
          const border = row === 0 || row === OFFICE.rows - 1 || col === 0 || col === OFFICE.cols - 1;
          if (border) {
            const wall = this.addTile('pa-wall', col, row, 0x536078).setFrame(8).setDepth(5);
            if (row === 0) wall.setTint(0x3a465c);
          } else if (col >= 19 && row >= 10) {
            this.addTile('pa-floor-7', col, row);
          } else if (col >= 19) {
            this.addTile('pa-floor-0', col, row, config.sideTint);
          } else if (row >= 9) {
            this.addTile(config.lowerFloor, col, row, config.lowerTint);
          } else {
            this.addTile(config.mainFloor, col, row, config.mainTint);
          }
        }
      }
      for (let row = 1; row <= 8; row += 1) {
        if (row !== 7) this.addTile('pa-wall', 19, row, 0x46556d).setFrame(12).setDepth(5);
      }
      for (let col = 19; col < OFFICE.cols - 1; col += 1) {
        if (col !== 23) this.addTile('pa-wall', col, 9, 0x46556d).setFrame(12).setDepth(5);
      }
      this.drawOfficeFurniture();
      this.time.addEvent({
        delay: 520,
        loop: true,
        callback: () => {
          this.children.list.filter(child => child.pcPhase !== undefined).forEach(monitor => {
            monitor.pcPhase = (monitor.pcPhase + 1) % 3;
            monitor.setTexture(`pa-furn-pc${monitor.pcPhase + 1}`);
          });
        }
      });
    }

    placeDeskRow(cols, row, phaseOffset = 0) {
      cols.forEach((col, index) => {
        this.placeFurniture('desk', col, row, { blocked: { w: 3, h: 2, backgroundRows: 1 } });
        const monitor = this.placeFurniture(`pc${((index + phaseOffset) % 3) + 1}`, col + 1, row, { canPlaceOnSurfaces: true });
        monitor.pcPhase = (index + phaseOffset) % 3;
        this.placeFurniture('chair', col + 1, row + 2, { category: 'chairs', orientation: 'front' });
      });
    }

    drawWallDecor() {
      this.placeFurniture('bookshelf', 2, 1, { depth: 6 });
      this.placeFurniture('bookshelf', 7, 1, { depth: 6 });
      this.placeFurniture('clock', 5, 1, { depth: 6 });
      this.placeFurniture('hangingPlant', 11, 1, { depth: 6 });
      this.placeFurniture('painting', 14, 1, { depth: 6 });
      this.placeFurniture('paintingSmall', 17, 1, { depth: 6 });
    }

    drawOfficeFurniture() {
      this.drawWallDecor();
      if (this.officeId === 'trading') {
        this.placeDeskRow([2, 7, 12], 4);
        this.placeDeskRow([2, 8], 10, 1);
        this.placeFurniture('meetingTable', 13, 9, { blocked: { w: 3, h: 4, backgroundRows: 0 } });
        this.placeFurniture('whiteboard', 16, 6, { depth: 6 });
      } else {
        const flap = this.officeId === 'flap-lab';
        this.placeDeskRow([2, 7, 12], 3, flap ? 1 : 0);
        this.placeDeskRow([2, 7, 12], 9, flap ? 2 : 1);
        if (this.officeId === 'bnb-strategy') {
          this.placeFurniture('meetingTable', 22, 3, { blocked: { w: 3, h: 4, backgroundRows: 0 } });
          this.placeFurniture('whiteboard', 24, 1, { depth: 6 });
          this.placeFurniture('bench', 21, 7, { category: 'chairs', orientation: 'front' });
          this.placeFurniture('bench', 25, 7, { category: 'chairs', orientation: 'front' });
        } else {
          this.placeFurniture('whiteboard', 16, 6, { depth: 6 });
          this.placeFurniture('sofaBack', 21, 3, { category: 'chairs', orientation: 'back' });
          this.placeFurniture('sofaSide', 20, 4, { category: 'chairs', orientation: 'side', footprintH: 2, blocked: { w: 1, h: 2, backgroundRows: 0 } });
          this.placeFurniture('sofaSide', 25, 4, { category: 'chairs', orientation: 'side', footprintH: 2, flipX: true, blocked: { w: 1, h: 2, backgroundRows: 0 } });
          this.placeFurniture('sofaFront', 21, 7, { category: 'chairs', orientation: 'front' });
          this.placeFurniture('coffeeTable', 22, 5, { blocked: { w: 2, h: 2, backgroundRows: 0 } });
          this.placeFurniture('coffee', 22, 6, { canPlaceOnSurfaces: true });
        }
      }
      this.placeFurniture('plant', 1, 7, { blocked: { w: 1, h: 2, backgroundRows: 1 } });
      this.placeFurniture('plant2', 17, 7, { blocked: { w: 1, h: 2, backgroundRows: 1 } });
      this.placeFurniture('bin', 17, 12, { blocked: { w: 1, h: 1, backgroundRows: 0 } });
      this.placeFurniture('largePlant', 25, 1, { depth: 6 });
      this.placeFurniture('plant2', 20, 10, { blocked: { w: 1, h: 2, backgroundRows: 1 } });
      this.placeFurniture('plant', 25, 11, { blocked: { w: 1, h: 2, backgroundRows: 1 } });
    }

    staticRect(x, y, width, height, color = 0xff00ff, alpha = 0) {
      const rect = this.add.rectangle(x, y, width, height, color, alpha);
      this.physics.add.existing(rect, true);
      this.obstacles.add(rect);
      return rect;
    }

    buildCollisionMap() {
      const left = OFFICE.x + TILE;
      const right = OFFICE.x + (OFFICE.cols - 1) * TILE;
      const top = OFFICE.y + TILE;
      const bottom = OFFICE.y + (OFFICE.rows - 1) * TILE;
      this.staticRect(480, top, right - left, 8);
      this.staticRect(480, bottom, right - left, 8);
      this.staticRect(left, 270, 8, bottom - top);
      this.staticRect(right, 270, 8, bottom - top);

      this.collisionSpecs.forEach(({ col, row, w, h, backgroundRows = 0 }) => {
        const solidRows = h - backgroundRows;
        if (solidRows <= 0) return;
        const x = OFFICE.x + (col + w / 2) * TILE;
        const y = OFFICE.y + (row + backgroundRows + solidRows / 2) * TILE;
        this.staticRect(x, y, w * TILE - 4, solidRows * TILE - 4);
      });
      this.staticRect(640, 159, 16, 194);
      this.staticRect(752, 318, 208, 16);
    }

    spawnMintedWorker(workerId, { instant = false } = {}) {
      const data = WORKERS[workerId];
      if (!data) return null;
      const previous = this.workers.get(workerId);
      if (previous) this.removeWorker(previous);

      const start = instant
        ? { x: 520 + (workerId % 3) * 54, y: 330 + Math.floor(workerId / 3) * 70 }
        : { x: 736, y: 478 };
      const sprite = this.physics.add.sprite(start.x, start.y, data.slug, 1)
        .setOrigin(0.5, 1)
        .setScale(2.25)
        .setDepth(8)
        .setInteractive({ useHandCursor: true });
      sprite.workerData = data;
      sprite.activity = 'wander';
      sprite.activityAt = 0;
      sprite.seatIndex = null;
      sprite.body.setSize(8, 6).setOffset(4, 25);
      sprite.setCollideWorldBounds(true).setBounce(1);
      this.agents?.add(sprite);
      this.workers.set(workerId, sprite);
      sprite.on('pointerdown', () => this.selectWorker(data));

      if (instant && workerId < 3) {
        this.beginWork(sprite, workerId, true);
      } else if (instant) {
        this.beginWander(sprite, 1700 + workerId * 500);
      } else {
        sprite.body.enable = false;
        sprite.setAlpha(0).setScale(1);
        this.tweens.add({ targets: sprite, alpha: 1, scale: 2.25, duration: 300, ease: 'Back.Out', onComplete: () => this.beginWander(sprite, 1300) });
        this.logActivity(`Mint preview: ${data.token} ${data.name} entered the office.`);
      }
      return sprite;
    }

    removeWorker(sprite) {
      if (sprite.seatIndex !== null) this.seatOwners.delete(sprite.seatIndex);
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }

    beginWander(sprite, duration = Phaser.Math.Between(3500, 7000)) {
      if (!sprite?.active) return;
      if (sprite.sittingOffsetApplied) {
        sprite.y -= CHARACTER_SITTING_OFFSET_PX * DISPLAY_SCALE;
        sprite.sittingOffsetApplied = false;
      }
      if (sprite.seatIndex !== null) this.seatOwners.delete(sprite.seatIndex);
      sprite.seatIndex = null;
      sprite.activity = 'wander';
      sprite.body.enable = true;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(34, 52);
      sprite.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      sprite.activityAt = this.time.now + duration;
      this.playWalk(sprite);
    }

    chooseFreeSeat(sprite) {
      const free = this.workstations.map((seat, index) => ({ seat, index }))
        .filter(({ index }) => !this.seatOwners.has(index) || this.seatOwners.get(index) === sprite.workerData.id);
      if (!free.length) return null;
      return Phaser.Utils.Array.GetRandom(free);
    }

    goToWork(sprite) {
      if (!sprite?.active || sprite.activity === 'to-seat') return;
      const choice = this.chooseFreeSeat(sprite);
      if (!choice) {
        this.beginWander(sprite, 1800);
        return;
      }
      this.seatOwners.set(choice.index, sprite.workerData.id);
      sprite.seatIndex = choice.index;
      sprite.activity = 'to-seat';
      sprite.body.setVelocity(0, 0);
      sprite.body.enable = false;
      const seat = choice.seat;
      const horizontalFirst = Math.abs(sprite.x - seat.approachX) > 12;
      sprite.setFlipX(sprite.x > seat.approachX);
      sprite.play(`${sprite.workerData.slug}-${horizontalFirst ? 'walk-side' : (sprite.y > seat.approachY ? 'walk-up' : 'walk-down')}`, true);
      this.tweens.add({
        targets: sprite,
        x: seat.approachX,
        y: seat.approachY,
        duration: Phaser.Math.Between(700, 1100),
        ease: 'Linear',
        onComplete: () => {
          if (!sprite.active) return;
          sprite.setFlipX(false).play(`${sprite.workerData.slug}-${sprite.y > seat.y ? 'walk-up' : 'walk-down'}`, true);
          this.tweens.add({
            targets: sprite,
            x: seat.x,
            y: seat.y,
            duration: 420,
            ease: 'Linear',
            onComplete: () => this.beginWork(sprite, choice.index)
          });
        }
      });
    }

    beginWork(sprite, seatIndex, initial = false) {
      if (!sprite?.active) return;
      const seat = this.workstations[seatIndex];
      this.seatOwners.set(seatIndex, sprite.workerData.id);
      sprite.seatIndex = seatIndex;
      sprite.setPosition(seat.x, seat.y + CHARACTER_SITTING_OFFSET_PX * DISPLAY_SCALE).setFlipX(false);
      sprite.sittingOffsetApplied = true;
      sprite.body.setVelocity(0, 0);
      sprite.body.enable = false;
      sprite.activity = initial
        ? (sprite.workerData.id % 2 === 0 ? 'typing' : 'reading')
        : (Phaser.Math.Between(0, 1) ? 'typing' : 'reading');
      sprite.play(`${sprite.workerData.slug}-${sprite.activity === 'typing' ? 'type-front' : 'read-front'}`);
      sprite.activityAt = this.time.now + (initial ? 3500 + sprite.workerData.id * 900 : Phaser.Math.Between(5000, 9500));
    }

    selectWorker(data) {
      window.dispatchEvent(new CustomEvent('office-worker-selected', { detail: data }));
      this.workers.forEach(sprite => sprite.clearTint());
      this.workers.get(data.id)?.setTint(0xffffc7);
    }

    turnWorker(sprite) {
      if (!sprite?.body || sprite.activity !== 'wander') return;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(34, 52);
      sprite.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.playWalk(sprite);
    }

    playWalk(sprite) {
      if (!sprite?.body) return;
      const { x, y } = sprite.body.velocity;
      sprite.setFlipX(false);
      if (Math.abs(x) > Math.abs(y)) {
        sprite.setFlipX(x < 0);
        sprite.play(`${sprite.workerData.slug}-walk-side`, true);
      } else {
        sprite.play(`${sprite.workerData.slug}-${y < 0 ? 'walk-up' : 'walk-down'}`, true);
      }
    }

    bindControls() {
      const debugButton = document.querySelector('#collision-debug');
      const replayButton = document.querySelector('#replay-mint');
      const locationSelect = document.querySelector('#office-location');
      this.onDebugClick = () => {
        if (!this.physics.world.debugGraphic) this.physics.world.createDebugGraphic();
        this.debugVisible = !this.debugVisible;
        this.physics.world.debugGraphic.setVisible(this.debugVisible);
        debugButton.textContent = `COLLISIONS: ${this.debugVisible ? 'ON' : 'OFF'}`;
      };
      this.onReplayClick = () => {
        const selected = Number(document.querySelector('.worker-tab.selected')?.dataset.worker || 0);
        this.spawnMintedWorker(selected);
      };
      this.onLocationChange = event => {
        const officeId = event.target.value;
        if (!OFFICE_CONFIGS[officeId] || officeId === this.officeId) return;
        this.scene.restart({ officeId });
      };
      debugButton?.addEventListener('click', this.onDebugClick);
      replayButton?.addEventListener('click', this.onReplayClick);
      locationSelect?.addEventListener('change', this.onLocationChange);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        debugButton?.removeEventListener('click', this.onDebugClick);
        replayButton?.removeEventListener('click', this.onReplayClick);
        locationSelect?.removeEventListener('change', this.onLocationChange);
        delete window.gmebOffice;
      });
    }

    logActivity(message) {
      const log = document.querySelector('#activity-log');
      if (!log) return;
      const entry = document.createElement('p');
      entry.innerHTML = `<b>+</b> ${message}`;
      log.prepend(entry);
    }

    update() {
      this.workers.forEach(sprite => {
        if (!sprite.active) return;
        const sittingOffset = sprite.sittingOffsetApplied ? CHARACTER_SITTING_OFFSET_PX * DISPLAY_SCALE : 0;
        sprite.setDepth(8 + (sprite.y + TILE / 2 + CHARACTER_Z_SORT_OFFSET - sittingOffset) / 1000);
        if (sprite.activity === 'wander') {
          this.playWalk(sprite);
          if (Phaser.Math.Between(0, 260) === 0) this.turnWorker(sprite);
          if (this.time.now >= sprite.activityAt) {
            if (Phaser.Math.Between(0, 100) < 72) this.goToWork(sprite);
            else this.beginWander(sprite);
          }
        } else if ((sprite.activity === 'typing' || sprite.activity === 'reading') && this.time.now >= sprite.activityAt) {
          this.beginWander(sprite);
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (!window.Phaser || !document.querySelector('#office-canvas')) return;
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'office-canvas',
      width: 960,
      height: 540,
      backgroundColor: '#111c31',
      pixelArt: true,
      antialias: false,
      transparent: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: OfficeScene
    });
  });
})();
