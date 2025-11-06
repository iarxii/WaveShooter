import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import os
import zipfile

# Create output directory
os.makedirs("hero_effects", exist_ok=True)

def create_effect(filename, update_func):
    fig, ax = plt.subplots()
    fig.patch.set_alpha(0.0)  # Transparent figure background
    ax.set_facecolor("none")  # Transparent axes background
    ax.axis("off")
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)

    scatter = ax.scatter([], [], s=[], alpha=0.8)

    def init():
        scatter.set_offsets(np.empty((0, 2)))
        scatter.set_sizes([])
        return scatter,

    def update(frame):
        offsets, sizes, colors = update_func(frame)
        scatter.set_offsets(offsets)
        scatter.set_sizes(sizes)
        scatter.set_color(colors)
        return scatter,

    ani = animation.FuncAnimation(fig, update, frames=60, init_func=init, blit=True)
    ani.save(f"hero_effects/{filename}", writer='pillow', fps=20, savefig_kwargs={'transparent': True})
    plt.close(fig)

# Define update functions for each effect
def green_shield(frame):
    angles = np.linspace(0, 2*np.pi, 6, endpoint=False)
    radius = 1.2 + 0.1 * np.sin(frame * 0.1)
    x = radius * np.cos(angles)
    y = radius * np.sin(angles)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 300)
    colors = ['lime'] * len(x)
    return offsets, sizes, colors

def fire_aura(frame):
    angles = np.linspace(0, 2*np.pi, 30)
    radius = 1 + 0.3 * np.sin(angles * 3 + frame * 0.2)
    x = radius * np.cos(angles)
    y = radius * np.sin(angles)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 150)
    colors = ['orange'] * len(x)
    return offsets, sizes, colors

def golden_beam(frame):
    x = np.linspace(-0.2, 0.2, 10)
    y = np.linspace(0, 2, 10) + 0.2 * np.sin(frame * 0.3)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 200)
    colors = ['gold'] * len(x)
    return offsets, sizes, colors

def blue_orb(frame):
    angles = np.linspace(0, 2*np.pi, 20)
    radius = 0.5 + 0.1 * np.sin(frame * 0.2)
    x = radius * np.cos(angles)
    y = radius * np.sin(angles)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 180)
    colors = ['deepskyblue'] * len(x)
    return offsets, sizes, colors

def purple_swirl(frame):
    angles = np.linspace(0, 4*np.pi, 50)
    radius = np.linspace(0.2, 1.5, 50)
    x = radius * np.cos(angles + frame * 0.1)
    y = radius * np.sin(angles + frame * 0.1)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 100)
    colors = ['purple'] * len(x)
    return offsets, sizes, colors

def electric_surge(frame):
    x = np.linspace(-1, 1, 20)
    y = np.sin(x * 10 + frame * 0.5)
    offsets = np.column_stack((x, y))
    sizes = np.full(len(x), 150)
    colors = ['cyan'] * len(x)
    return offsets, sizes, colors

# Generate all effects
effects = [
    ("green_energy_shield.gif", green_shield),
    ("fire_aura.gif", fire_aura),
    ("golden_energy_beam.gif", golden_beam),
    ("blue_glowing_orb.gif", blue_orb),
    ("purple_swirl.gif", purple_swirl),
    ("electric_lightning_surge.gif", electric_surge)
]

for filename, func in effects:
    create_effect(filename, func)

# Bundle into ZIP
with zipfile.ZipFile("hero_effects_bundle.zip", "w") as zipf:
    for file in os.listdir("hero_effects"):
        zipf.write(os.path.join("hero_effects", file), arcname=file)

print("All hero effects generated and bundled into hero_effects_bundle.zip")
