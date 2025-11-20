// Bullet object pool for performance
export class BulletPool {
    constructor(size) {
        this.bullets = [];
        this.activeBullets = new Map();
        this.nextId = 1;
        // Maintain a freelist of indices for O(1) allocation
        this.freeList = [];
        // Pre-create bullet objects
        for (let i = 0; i < size; i++) {
            this.bullets.push({
                id: 0,
                active: false,
                pos: [0, 0, 0],
                dir: [0, 0, 0],
                timeAlive: 0,
                style: null,
            });
            this.freeList.push(i);
        }
    }

    getBullet(pos, dir, style = null) {
        if (this.freeList.length === 0) return null;
        const idx = this.freeList.pop();
        const bullet = this.bullets[idx];
        bullet.id = this.nextId++;
        bullet.active = true;
        bullet.pos[0] = pos[0];
        bullet.pos[1] = pos[1];
        bullet.pos[2] = pos[2];
        bullet.dir[0] = dir[0];
        bullet.dir[1] = dir[1];
        bullet.dir[2] = dir[2];
        bullet.timeAlive = 0;
        bullet.style = style;
        this.activeBullets.set(bullet.id, bullet);
        return bullet;
    }

    returnBullet(id) {
        const bullet = this.activeBullets.get(id);
        if (bullet) {
            bullet.active = false;
            // Push its index back to freelist (index is its position in this.bullets)
            const idx = this.bullets.indexOf(bullet);
            if (idx >= 0) this.freeList.push(idx);
            this.activeBullets.delete(id);
        }
    }

    getActiveBullets() {
        return Array.from(this.activeBullets.values());
    }

    clear() {
        this.bullets.forEach((b) => (b.active = false));
        this.activeBullets.clear();
        this.freeList.length = 0;
        for (let i = 0; i < this.bullets.length; i++) this.freeList.push(i);
    }
}
