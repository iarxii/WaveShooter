import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import matplotlib.patches as patches
import matplotlib.lines as mlines
import matplotlib.patheffects as pe
import os
import zipfile

# Create output directory
os.makedirs("hero_effects", exist_ok=True)

def create_effect(filename, builder, *, frames=48, fps=30, size_px=320, dpi=160):
    """Generic effect creator.

    - builder(ax) -> (artists_tuple, init_func, update_func)
      - init_func() -> iterable of artists
      - update_func(frame) -> iterable of artists (for blit)
    """
    # Figure sized to requested pixels
    fig_w_in = size_px / dpi
    fig_h_in = size_px / dpi
    fig, ax = plt.subplots(figsize=(fig_w_in, fig_h_in), dpi=dpi)
    fig.patch.set_alpha(0.0)  # Transparent figure background
    ax.set_facecolor("none")  # Transparent axes background
    ax.axis("off")
    ax.set_aspect('equal', adjustable='box')
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)

    artists, init_func, update_func = builder(ax)

    ani = animation.FuncAnimation(
        fig,
        lambda f: update_func(f),
        frames=frames,
        init_func=init_func,
        blit=True,
        interval=1000.0 / fps,
        repeat=True,
    )
    ani.save(
        f"hero_effects/{filename}",
        writer='pillow',
        fps=fps,
        savefig_kwargs={'transparent': True, 'facecolor': 'none'}
    )
    plt.close(fig)

# Utility: create glow path effect
def glow_effect(color='white', linewidth=6, alpha=0.6):
    return [
        pe.Stroke(linewidth=linewidth, foreground=color, alpha=alpha),
        pe.Normal()
    ]

# Effect builders
def build_green_shield(ax):
    # Rotating hex + pulsing ring with glow and orbiting sparks
    ring = patches.Circle((0, 0), radius=1.2, fill=False, linewidth=1.8, edgecolor='#34d399', alpha=0.9)
    ring.set_path_effects(glow_effect('#34d399', linewidth=8, alpha=0.35))
    ax.add_patch(ring)

    hex_dots = ax.scatter([], [], s=[], c=[], alpha=1.0)
    sparks = ax.scatter([], [], s=[], c=[], alpha=0.9)

    def init():
        hex_dots.set_offsets(np.empty((0, 2)))
        hex_dots.set_sizes([])
        sparks.set_offsets(np.empty((0, 2)))
        sparks.set_sizes([])
        return ring, hex_dots, sparks

    def update(frame):
        t = frame
        # Fast feel
        rot = t * 0.35  # radians per frame
        pulse = 1.15 + 0.12 * np.sin(t * 0.4)
        ring.set_radius(pulse)

        # Hex ring (6 points) rotating
        angles = np.linspace(0, 2*np.pi, 6, endpoint=False) + rot
        x = pulse * np.cos(angles)
        y = pulse * np.sin(angles)
        hex_offsets = np.column_stack((x, y))
        hex_sizes = np.full(6, 85.0)
        hex_colors = ['#34d399'] * 6
        hex_dots.set_offsets(hex_offsets)
        hex_dots.set_sizes(hex_sizes)
        hex_dots.set_color(hex_colors)

        # Orbiting small sparks on inner ring
        ang2 = np.linspace(0, 2*np.pi, 12, endpoint=False) - rot * 1.6
        r2 = 0.9 + 0.05 * np.sin(t * 0.6)
        sx = r2 * np.cos(ang2)
        sy = r2 * np.sin(ang2)
        s_offsets = np.column_stack((sx, sy))
        s_sizes = 18 + 12 * (0.5 + 0.5 * np.sin(ang2*3 + t*0.8))
        s_colors = ['#a7f3d0'] * len(ang2)
        sparks.set_offsets(s_offsets)
        sparks.set_sizes(s_sizes)
        sparks.set_color(s_colors)
        return ring, hex_dots, sparks

    return (ring, hex_dots, sparks), init, update

def build_fire_aura(ax):
    # Flickering radial fire with gradient particles + rising embers and additive glow feel
    n = 90
    aura = ax.scatter([], [], s=[], c=[], alpha=0.95)
    # Persistent embers
    m = 40
    emb_pos = np.zeros((m, 2), dtype=float)
    emb_vel = np.zeros((m, 2), dtype=float)
    emb_age = np.zeros(m, dtype=float)
    emb = ax.scatter([], [], s=[], c=[], alpha=0.9)

    # Soft outer glow using a faint large scatter
    glow = ax.scatter([], [], s=[], c=[], alpha=0.25)

    rng = np.random.default_rng(1234)

    def reset_ember(i):
        ang = rng.uniform(0, 2*np.pi)
        r = rng.uniform(0.2, 0.6)
        emb_pos[i, 0] = r*np.cos(ang)
        emb_pos[i, 1] = r*np.sin(ang)
        emb_vel[i, 0] = rng.uniform(-0.02, 0.02)
        emb_vel[i, 1] = rng.uniform(0.03, 0.07)  # rise up
        emb_age[i] = rng.uniform(0.0, 0.3)

    for i in range(m):
        reset_ember(i)

    def init():
        aura.set_offsets(np.empty((0, 2)))
        aura.set_sizes([])
        emb.set_offsets(np.empty((0, 2)))
        emb.set_sizes([])
        glow.set_offsets(np.empty((0, 2)))
        glow.set_sizes([])
        return aura, emb, glow

    def update(frame):
        t = frame
        # Aura burst ring (re-sampled per frame for lively noise)
        angles = rng.uniform(0, 2*np.pi, n)
        base_r = 0.75 + 0.25 * np.sin(t * 0.5)
        jitter = rng.uniform(-0.16, 0.16, n)
        r = base_r + 0.33*np.abs(np.sin(angles*3.2 + t*0.38)) + jitter
        x = r * np.cos(angles)
        y = r * np.sin(angles)
        aura_offsets = np.column_stack((x, y))
        aura_sizes = 50 + 120 * np.abs(np.sin(angles*2.1 + t*0.7))
        # gradient yellow->orange by radius
        norm = (r - r.min()) / (r.max() - r.min() + 1e-6)
        aura_colors = [(
            1.0,
            0.55 + 0.35*(1 - v),
            0.0,
            1.0
        ) for v in norm]
        aura.set_offsets(aura_offsets)
        aura.set_sizes(aura_sizes)
        aura.set_color(aura_colors)

        # Rising embers with fade and slight drift
        emb_age[:] += 0.05
        emb_pos[:] += emb_vel
        # respawn embers that float too high or old
        dead = (emb_pos[:,1] > 1.8) | (emb_age > 1.8)
        for i in np.where(dead)[0]:
            reset_ember(i)
        emb_sizes = 20 + 40*(1 - np.clip(emb_age/1.8, 0, 1))
        emb_colors = [
            (1.0, 0.8 - 0.5*(emb_age[i]/1.8), 0.0, 0.9) for i in range(m)
        ]
        emb.set_offsets(emb_pos)
        emb.set_sizes(emb_sizes)
        emb.set_color(emb_colors)

        # Outer glow cloud
        g_angles = np.linspace(0, 2*np.pi, 24, endpoint=False)
        gr = 1.0 + 0.3*np.sin(t*0.25)
        gx = gr*np.cos(g_angles)
        gy = gr*np.sin(g_angles)
        glow.set_offsets(np.column_stack((gx, gy)))
        glow.set_sizes(np.full_like(gx, 280.0))
        glow.set_color([(1.0, 0.65, 0.0, 0.25)]*len(gx))
        return aura, emb, glow

    return (aura, emb, glow), init, update

def build_golden_beam(ax):
    # Vertical golden beam with moving bright bands, diagonal streaks, and subtle chroma layers
    core = patches.Rectangle((-0.18, -2.0), 0.36, 4.0, linewidth=0, facecolor='#ffd166', alpha=0.9)
    halo = patches.Rectangle((-0.38, -2.0), 0.76, 4.0, linewidth=0, facecolor='#ffea9d', alpha=0.26)
    ax.add_patch(halo)
    ax.add_patch(core)
    core.set_path_effects(glow_effect('#ffd166', linewidth=10, alpha=0.5))

    band1 = patches.Rectangle((-0.4, -2.0), 0.8, 0.22, linewidth=0, facecolor='#fff3bf', alpha=0.95)
    band2 = patches.Rectangle((-0.4, -2.0), 0.8, 0.18, linewidth=0, facecolor='#ffeaa7', alpha=0.9)
    ax.add_patch(band1)
    ax.add_patch(band2)

    # Diagonal cross streaks
    streak1 = patches.Rectangle((-2.0, -2.0), 1.6, 0.08, angle=35, linewidth=0, facecolor='#fff1b1', alpha=0.35)
    streak2 = patches.Rectangle((0.4, -2.0), 1.6, 0.08, angle=-35, linewidth=0, facecolor='#ffe28a', alpha=0.3)
    ax.add_patch(streak1)
    ax.add_patch(streak2)

    # Slight chromatic side glows (simulated aberration)
    left_chroma = patches.Rectangle((-0.21, -2.0), 0.06, 4.0, linewidth=0, facecolor='#ffd6a5', alpha=0.25)
    right_chroma = patches.Rectangle((0.15, -2.0), 0.06, 4.0, linewidth=0, facecolor='#fff0b3', alpha=0.25)
    ax.add_patch(left_chroma)
    ax.add_patch(right_chroma)

    sparks = ax.scatter([], [], s=[], c=[], alpha=0.95)

    def init():
        sparks.set_offsets(np.empty((0, 2)))
        sparks.set_sizes([])
        for p in (core, halo, band1, band2, streak1, streak2, left_chroma, right_chroma):
            p.set_y(-2.0)
        return core, halo, band1, band2, streak1, streak2, left_chroma, right_chroma, sparks

    def update(frame):
        t = frame
        # Beam flicker width
        w = 0.32 + 0.04 * np.sin(t * 0.7)
        core.set_x(-w/2); core.set_width(w)
        halo.set_x(-w*2.0/2); halo.set_width(w*2.0)

        # Bands moving upwards quickly
        band_y1 = -2.0 + (t * 0.18) % 4.0
        band_y2 = -2.0 + ((t * 0.18) + 1.2) % 4.0
        band1.set_y(band_y1)
        band2.set_y(band_y2)

        # Diagonal streaks drift downwards, loop
        streak1.set_y(-2.0 + (t * 0.12) % 4.0)
        streak2.set_y(-2.0 + ((t * 0.12) + 2.0) % 4.0)

        # Subtle chromatic shimmer: nudge side glows horizontally
        left_chroma.set_x(-0.23 + 0.01*np.sin(t*0.9))
        right_chroma.set_x(0.17 + 0.01*np.cos(t*0.8))

        # Upward sparks
        n = 18
        x = np.random.uniform(-w*0.6, w*0.6, n)
        y = np.random.uniform(-1.5, 1.8, n)
        sizes = 30 + 60*np.random.rand(n)
        colors = ['#fff3bf']*n
        sparks.set_offsets(np.column_stack((x, y)))
        sparks.set_sizes(sizes)
        sparks.set_color(colors)
        return core, halo, band1, band2, streak1, streak2, left_chroma, right_chroma, sparks

    return (core, halo, band1, band2, streak1, streak2, left_chroma, right_chroma, sparks), init, update

def build_blue_orb(ax):
    # Pulsing orb with halo, fast orbiting sparkles, and starburst spokes
    halo = patches.Circle((0, 0), radius=0.9, facecolor='#38bdf8', alpha=0.18, linewidth=0)
    core = patches.Circle((0, 0), radius=0.55, facecolor='#0ea5e9', alpha=0.95, linewidth=0)
    ax.add_patch(halo)
    ax.add_patch(core)

    sparks = ax.scatter([], [], s=[], c=[], alpha=0.95)

    # Starburst spokes
    spoke_count = 8
    spokes = [mlines.Line2D([], [], color='#e0f2fe', linewidth=1.2, alpha=0.85) for _ in range(spoke_count)]
    for s in spokes:
        s.set_path_effects(glow_effect('#93c5fd', linewidth=5, alpha=0.35))
        ax.add_line(s)

    def init():
        for s in spokes:
            s.set_data([], [])
        return tuple([halo, core, sparks] + spokes)

    def update(frame):
        t = frame
        rcore = 0.48 + 0.10*np.sin(t*0.45)
        rhalo = 0.85 + 0.12*np.sin(t*0.35 + 0.8)
        core.set_radius(rcore)
        halo.set_radius(rhalo)

        # fast orbiting sparkles on two radii
        n = 16
        ang = np.linspace(0, 2*np.pi, n, endpoint=False)
        ang = ang + t*0.5
        r1 = 0.7
        r2 = 1.0
        x = np.concatenate([r1*np.cos(ang), r2*np.cos(-ang*1.3)])
        y = np.concatenate([r1*np.sin(ang), r2*np.sin(-ang*1.3)])
        sizes = np.concatenate([np.full(n, 30.0), np.full(n, 18.0)])
        colors = ['#93c5fd']*n + ['#e0f2fe']*n
        sparks.set_offsets(np.column_stack((x, y)))
        sparks.set_sizes(sizes)
        sparks.set_color(colors)
        # spokes rotate and flicker length
        spin = t*0.25
        for i, s in enumerate(spokes):
            a = spin + (2*np.pi*i)/spoke_count
            length = 0.4 + 0.2*np.sin(t*0.9 + i)
            x0, y0 = 0.0, 0.0
            x1, y1 = length*np.cos(a), length*np.sin(a)
            s.set_data([x0, x1], [y0, y1])
        return tuple([halo, core, sparks] + spokes)

    return tuple([halo, core, sparks] + spokes), init, update

def build_purple_swirl(ax):
    # Spiraling arc with glow and particle tips
    line = mlines.Line2D([], [], color='#c084fc', linewidth=2.8, alpha=0.95)
    line.set_path_effects(glow_effect('#a78bfa', linewidth=8, alpha=0.35))
    ax.add_line(line)
    tips = ax.scatter([], [], s=[], c=[], alpha=0.95)

    def init():
        line.set_data([], [])
        tips.set_offsets(np.empty((0, 2)))
        tips.set_sizes([])
        return line, tips

    def update(frame):
        t = frame
        theta = np.linspace(0, 3*np.pi, 120)
        # fast rotation
        theta = theta + t*0.18
        r = 0.2 + 1.4 * (theta / (3*np.pi))
        x = r * np.cos(theta)
        y = r * np.sin(theta)
        line.set_data(x, y)

        # tips at end section
        idx = -12
        xt = x[idx:]
        yt = y[idx:]
        sizes = np.linspace(80, 20, len(xt))
        colors = ['#f5d0fe']*len(xt)
        tips.set_offsets(np.column_stack((xt, yt)))
        tips.set_sizes(sizes)
        tips.set_color(colors)
        return line, tips

    return (line, tips), init, update

def build_electric_surge(ax):
    # Branching lightning with glow and burst sparks
    main = mlines.Line2D([], [], color='#67e8f9', linewidth=2.0, alpha=1.0)
    main.set_path_effects(glow_effect('#22d3ee', linewidth=9, alpha=0.55))
    branch = mlines.Line2D([], [], color='#99f6e4', linewidth=1.4, alpha=0.9)
    ax.add_line(main)
    ax.add_line(branch)
    sparks = ax.scatter([], [], s=[], c=[], alpha=0.95)

    rng = np.random.default_rng(5678)

    def subdivide(p0, p1, depth=4, disp=0.25):
        # Midpoint displacement for jagged path
        if depth == 0:
            return np.array([p0, p1])
        mid = (p0 + p1) / 2.0
        # perpendicular jitter
        dirv = p1 - p0
        if np.linalg.norm(dirv) == 0:
            jitter = np.array([0.0, 0.0])
        else:
            nrm = np.array([-dirv[1], dirv[0]])
            nrm = nrm / (np.linalg.norm(nrm) + 1e-8)
            jitter = nrm * rng.normal(0, disp)
        mid += jitter
        left = subdivide(p0, mid, depth-1, disp*0.6)
        right = subdivide(mid, p1, depth-1, disp*0.6)
        return np.vstack((left[:-1], right))

    def init():
        main.set_data([], [])
        branch.set_data([], [])
        sparks.set_offsets(np.empty((0, 2)))
        sparks.set_sizes([])
        return main, branch, sparks

    def update(frame):
        t = frame
        # Base endpoints sweep horizontally a bit
        x0, y0 = -1.7, -0.8 + 0.2*np.sin(t*0.12)
        x1, y1 = 1.7, 0.8 + 0.2*np.cos(t*0.14)
        path = subdivide(np.array([x0, y0]), np.array([x1, y1]), depth=5, disp=0.35)
        main.set_data(path[:,0], path[:,1])

        # Branch off near a random segment
        if len(path) > 4:
            k = rng.integers(1, len(path)-2)
            p = path[k]
            # branch direction roughly upward/outward
            ang = rng.uniform(-np.pi/4, np.pi/4) + 0.5
            blen = 0.8 + 0.4*np.sin(t*0.3)
            p2 = p + blen*np.array([np.cos(ang), np.sin(ang)])
            bpath = subdivide(p, p2, depth=3, disp=0.25)
            branch.set_data(bpath[:,0], bpath[:,1])
        else:
            branch.set_data([], [])

        # Sparks concentrated near brightest portions (random picks)
        nsp = 18
        idx = rng.choice(len(path), size=nsp, replace=True)
        sx = path[idx,0] + rng.normal(0, 0.02, size=nsp)
        sy = path[idx,1] + rng.normal(0, 0.02, size=nsp)
        s_sizes = 20 + 60*rng.random(nsp)
        s_colors = ['#a5f3fc']*nsp
        sparks.set_offsets(np.column_stack((sx, sy)))
        sparks.set_sizes(s_sizes)
        sparks.set_color(s_colors)
        return main, branch, sparks

    return (main, branch, sparks), init, update


# Generate all effects (fast, high-contrast, transparent)
effects = [
    ("green_energy_shield.gif", build_green_shield, dict(frames=48, fps=30)),
    ("fire_aura.gif", build_fire_aura, dict(frames=48, fps=30)),
    ("golden_energy_beam.gif", build_golden_beam, dict(frames=48, fps=30)),
    ("blue_glowing_orb.gif", build_blue_orb, dict(frames=48, fps=30)),
    ("purple_swirl.gif", build_purple_swirl, dict(frames=48, fps=30)),
    ("electric_lightning_surge.gif", build_electric_surge, dict(frames=48, fps=30)),
]

for filename, builder, kw in effects:
    create_effect(filename, builder, **kw)

# Bundle into ZIP
with zipfile.ZipFile("hero_effects_bundle.zip", "w") as zipf:
    for file in os.listdir("hero_effects"):
        zipf.write(os.path.join("hero_effects", file), arcname=file)

print("All hero effects generated and bundled into hero_effects_bundle.zip")
