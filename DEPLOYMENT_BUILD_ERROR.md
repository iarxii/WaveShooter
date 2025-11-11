2:37:59 AM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
2:37:57 AM: Netlify Build                                                 
2:37:57 AM: ────────────────────────────────────────────────────────────────
2:37:57 AM: ​
2:37:57 AM: ❯ Version
2:37:57 AM:   @netlify/build 35.3.3
2:37:57 AM: ​
2:37:57 AM: ❯ Flags
2:37:57 AM:   accountId: 67b878ce6be54653effa3b1a
2:37:57 AM:   baseRelDir: true
2:37:57 AM:   buildId: 6912853d8030c80008805531
2:37:57 AM:   deployId: 6912853d8030c80008805533
2:37:57 AM: ​
2:37:57 AM: ❯ Current directory
2:37:57 AM:   /opt/build/repo
2:37:57 AM: ​
2:37:57 AM: ❯ Config file
2:37:57 AM:   /opt/build/repo/netlify.toml
2:37:57 AM: ​
2:37:57 AM: ❯ Context
2:37:57 AM:   production
2:37:57 AM: ​
2:37:57 AM: build.command from netlify.toml                               
2:37:57 AM: ────────────────────────────────────────────────────────────────
2:37:57 AM: ​
2:37:57 AM: $ git lfs install && git lfs pull && npm run build
2:37:57 AM: Updated Git hooks.
2:37:57 AM: Git LFS initialized.
2:37:57 AM: > wave-shooter@0.0.0 build
2:37:57 AM: > vite build
2:37:58 AM: rolldown-vite v7.1.14 building for production...
2:37:58 AM: 
2:37:58 AM: transforming...
2:37:58 AM: new URL("../assets/character_imgs/Hero/Dr_Dokta/dokta_idle.jpg", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime. If this is intended, you can use the /* @vite-ignore */ comment to suppress this warning.
2:37:58 AM: new URL("../assets/character_imgs/enemy_avatar/Pathogen/sample_enemies.jpg", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime. If this is intended, you can use the /* @vite-ignore */ comment to suppress this warning.
2:37:59 AM: new URL("../assets/models/textured_mesh.glb", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime. If this is intended, you can use the /* @vite-ignore */ comment to suppress this warning.
✓ 694 modules transformed.
2:37:59 AM: ✗ Build failed in 964ms
2:37:59 AM: error during build:
2:37:59 AM: Build failed with 1 error:
2:37:59 AM: [UNRESOLVED_IMPORT] Error: Could not resolve '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Block Idle.fbx' in src/heroes/factory/animMaps/liteSwordShieldMap.ts
2:37:59 AM:    ╭─[ src/heroes/factory/animMaps/liteSwordShieldMap.ts:1:18 ]
2:37:59 AM:    │
2:37:59 AM:  1 │ import idle from "../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Block Idle.fbx";
2:37:59 AM:    │                  ───────────────────────────────────────────────────┬───────────────────────────────────────────────────
2:37:59 AM:    │                                                                     ╰───────────────────────────────────────────────────── Module not found.
2:37:59 AM: ───╯
2:37:59 AM: 
2:37:59 AM:     at normalizeErrors (file:///opt/build/repo/node_modules/rolldown/dist/shared/src-DkvlJJsC.mjs:2157:18)
2:37:59 AM:     at handleOutputErrors (file:///opt/build/repo/node_modules/rolldown/dist/shared/src-DkvlJJsC.mjs:2892:34)
2:37:59 AM:     at transformToRollupOutput (file:///opt/build/repo/node_modules/rolldown/dist/shared/src-DkvlJJsC.mjs:2886:2)
2:37:59 AM:     at RolldownBuild.write (file:///opt/build/repo/node_modules/rolldown/dist/shared/src-DkvlJJsC.mjs:4093:10)
2:37:59 AM:     at async buildEnvironment (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-ySrR9pW8.js:33173:64)
2:37:59 AM:     at async Object.build (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-ySrR9pW8.js:33577:19)
2:37:59 AM:     at async Object.buildApp (file:///opt/build/repo/node_modules/vite/dist/node/chunks/dep-ySrR9pW8.js:33574:153)
2:37:59 AM:     at async CAC.<anonymous> (file:///opt/build/repo/node_modules/vite/dist/node/cli.js:641:3)
2:37:59 AM: ​
2:37:59 AM: "build.command" failed                                        
2:37:59 AM: ────────────────────────────────────────────────────────────────
2:37:59 AM: ​
2:37:59 AM:   Error message
2:37:59 AM:   Command failed with exit code 1: git lfs install && git lfs pull && npm run build (https://ntl.fyi/exit-code-1)
2:37:59 AM: ​
2:37:59 AM:   Error location
2:37:59 AM:   In build.command from netlify.toml:
2:37:59 AM:   git lfs install && git lfs pull && npm run build
2:37:59 AM: ​
2:37:59 AM:   Resolved config
2:37:59 AM:   build:
2:37:59 AM:     command: git lfs install && git lfs pull && npm run build
2:37:59 AM:     commandOrigin: config
2:37:59 AM:     publish: /opt/build/repo/dist
2:37:59 AM:     publishOrigin: config
2:37:59 AM: Build failed due to a user error: Build script returned non-zero exit code: 2
2:37:59 AM: Failing build: Failed to build site
2:37:59 AM: Finished processing build request in 41.101s