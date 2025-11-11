## **AI Agent Context Instructions**

### **Project Overview**

*   **Framework**: Vite (with Rollup)
*   **Deployment**: Netlify
*   **Repository**: Uses **Git LFS** for large assets (images, models).
*   **Current Issue**: Netlify build fails with warnings like:
        new URL("../assets/...") doesn't exist at build time
    even though assets exist locally and in GitHub.

***

### **Key Facts**

1.  **Netlify Build Environment**
    *   Does not automatically pull LFS files.
    *   Requires explicit commands in build step:
        ```bash
        git lfs install && git lfs pull && npm run build
        ```
    *   If `git-lfs` is missing, install it:
        ```bash
        apt-get update && apt-get install git-lfs
        ```

2.  **Vite Asset Resolution**
    *   Vite resolves assets at **build time**, not runtime.
    *   Files referenced via `new URL(..., import.meta.url)` must be present under `src` at build time or you'll see warnings and (for non-existent modules) errors.
    *   Updated pattern: Prefer a tolerant helper (`assetUrl(rel)`) that first attempts a `new URL()` and falls back to `/assets/...` public path.
    *   For large binary animations (FBX) now using `import.meta.glob` with graceful absence handling to avoid hard build failures if LFS not hydrated.

***

### **Agent Responsibilities**

*   **Check Build Logs**:
    *   Confirm `git lfs install` and `git lfs pull` run successfully.
    *   Detect if `git-lfs` is missing and suggest installation.

*   **Validate Asset Paths**:
    *   If warnings persist, confirm whether fallbacks came from `assetUrl` (public path) or glob loader.
    *   Move persistent large assets to `public/assets` if they do not need tree-shaken bundling.
    *   Ensure `tsconfig.json` includes `"types": ["vite/client"]` for `import.meta.glob` typings.

*   **Update Build Command**:
    *   Ensure `netlify.toml` includes:
        ```toml
        [build]
          command = "apt-get update && apt-get install git-lfs && git lfs install && git lfs pull && npm run build"
          publish = "dist"
        ```

*   **Provide Fix Options**:
    *   **Option 1**: Move assets to `public/` and use absolute paths.
    *   **Option 2**: Import assets in `src` and reference via variables.
    *   **Option 3**: Use `/* @vite-ignore */` only if runtime resolution is intended.

***

### **Checklist for Successful Deploy**

*   ✅ `netlify.toml` committed and pushed.
*   ✅ Git LFS files downloaded during build.
*   ✅ Assets referenced correctly for Vite.
*   ✅ `tsconfig.json` includes Vite client types enabling glob and env usage.
*   ✅ No `.gitignore` blocking assets.
*   ✅ No spaces in folder names.

***

### **Fallback Plan**

*   If LFS continues to cause issues:
    *   Migrate large assets to external storage (S3, Cloudinary).
    *   Update code to reference external URLs.
    *   Consider pre-uploading critical FBX animations to `public/assets/animations` and referencing via `assetUrl('animations/clip.fbx')` if dynamic processing isn't required.

---

### **New Import Strategy Summary (Post-Refactor)**

| Asset Type | Old Pattern | New Pattern | Notes |
|------------|-------------|-------------|-------|
| Images (heroes/enemies) | `new URL('../assets/...', import.meta.url).href` | `assetUrl('character_imgs/...')` | Falls back to `/assets/...` if missing in src. |
| FBX Animations | Individual static imports | `import.meta.glob('../../../assets/models/dr_dokta_anim_poses/**/*.fbx', { eager: true })` + `findFbxFile()` | Missing clips logged (dev) without failing build. |
| Generic Models (.glb) | `new URL` | Keep or convert to helper if hydration issues appear | `.glb` usually small enough to remain as direct imports. |

Helper location: `src/utils/assetPaths.ts`

Animation map updated: `src/heroes/factory/animMaps/liteSwordShieldMap.ts`

This strategy reduces Netlify build fragility while still allowing full asset usage locally once LFS pulls binaries.


