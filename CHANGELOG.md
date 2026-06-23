# Changelog

All notable changes to Hoard are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe changes in player-meaningful terms, not raw commit subjects. Once
[release-please](https://github.com/googleapis/release-please) is adopted (#169), the
sections below `Unreleased` will be generated automatically from Conventional Commits.

## [0.0.2](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.1...v0.0.2) (2026-06-23)


### Added

* 3D dice roller — table-throw tray (WIP, draft) ([45dd7b4](https://github.com/joshuafuller/hoard-hp-tracker/commit/45dd7b4bb22c3531a6e4dee03dbefb732322723d))
* **about:** "Share Hoard" — Web Share API with clipboard fallback ([#183](https://github.com/joshuafuller/hoard-hp-tracker/issues/183)) ([24cfcf9](https://github.com/joshuafuller/hoard-hp-tracker/commit/24cfcf9b120f60b4c260d1121eff5f712ea04e98))
* **about:** "Share Hoard" link — Web Share API + clipboard fallback ([#183](https://github.com/joshuafuller/hoard-hp-tracker/issues/183)) ([82a8176](https://github.com/joshuafuller/hoard-hp-tracker/commit/82a81762d14511dc65ac1b7d00537932bfc9a7b8))
* **coins:** auto-convert across denominations on spend + add platinum ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([325c2e3](https://github.com/joshuafuller/hoard-hp-tracker/commit/325c2e3c09dc489ef4325425dafe66551f664574))
* **coins:** auto-convert across denominations on spend + add platinum ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([217cdcd](https://github.com/joshuafuller/hoard-hp-tracker/commit/217cdcddb8c62c8b3f694d5fa9582376847ceb4b))
* **coins:** auto-distill + unified coin console (and a spend-conversion fix) ([8f17b6c](https://github.com/joshuafuller/hoard-hp-tracker/commit/8f17b6ca5b7995b139c3b1d433f7b26faf513a99))
* **coins:** auto-distill with visual confirmation + coin sheet rethink ([246ba8f](https://github.com/joshuafuller/hoard-hp-tracker/commit/246ba8fc790add12475c437fb25566696dc01a8f))
* **coins:** unify the keypad into one switchable, retargetable console ([2185a8e](https://github.com/joshuafuller/hoard-hp-tracker/commit/2185a8edd020bbc043f19a16959371655fd07d75))
* **concentration:** add concentrating field and store actions (TDD) ([f36d643](https://github.com/joshuafuller/hoard-hp-tracker/commit/f36d64359fc04ffbde9df4e0e70f3a9e5972e1a6))
* **concentration:** add concentration toggle + prompt UI and wire into App ([#30](https://github.com/joshuafuller/hoard-hp-tracker/issues/30)) ([506eaac](https://github.com/joshuafuller/hoard-hp-tracker/commit/506eaac94c18411fb99a0a077232419b0ce216ce))
* **concentration:** add pure concentrationDC domain helper (TDD) ([7f6120a](https://github.com/joshuafuller/hoard-hp-tracker/commit/7f6120a617c6ba4c283e0776950d318b2478a5f1))
* **controls:** add shared button-system primitives ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([7ea6857](https://github.com/joshuafuller/hoard-hp-tracker/commit/7ea68578b747698b1b3e2a4d7de2c512f745155c))
* **controls:** button-system primitives — phase 1 ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([676ec60](https://github.com/joshuafuller/hoard-hp-tracker/commit/676ec60e057fd860ea3cc40ca888612941dad479))
* **controls:** distinct press states + migrate close-X to IconButton ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([274d615](https://github.com/joshuafuller/hoard-hp-tracker/commit/274d6157d6f2d0ef5525c2c25b6f169cd6e38bdf))
* **controls:** migrate chrome, rest & dice surfaces onto button primitives ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([e264906](https://github.com/joshuafuller/hoard-hp-tracker/commit/e2649061bf173066718b79a1f0aceb4a39d5bb94))
* **controls:** migrate death-save roll, distill & coin-undo triggers ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([ffb47df](https://github.com/joshuafuller/hoard-hp-tracker/commit/ffb47dffd506045eb7619ffdcbc7f0c8634892a7))
* **controls:** migrate death-save roll, distill & coin-undo triggers ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([5cee289](https://github.com/joshuafuller/hoard-hp-tracker/commit/5cee28934ac1874bb729143e260f83087f154a5e))
* **controls:** migrate the CON-save (concentration) prompt buttons ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([f131143](https://github.com/joshuafuller/hoard-hp-tracker/commit/f13114302654df6e7e9caf976a94132de42628ca))
* **controls:** migrate the quick-entry keypad onto Key + Button ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([03763e7](https://github.com/joshuafuller/hoard-hp-tracker/commit/03763e7cdf7988c7b64ad45b5c073168b182922e))
* **controls:** migrate the quick-entry keypad onto Key + Button ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([cd6a339](https://github.com/joshuafuller/hoard-hp-tracker/commit/cd6a33954b5cff840e59c70f8df3be76d9da4d25))
* **controls:** migrate undo, apply-as-heal & distill buttons ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([169661f](https://github.com/joshuafuller/hoard-hp-tracker/commit/169661feda6986ce5aa33e1b6236e3882be7cd97))
* **controls:** migrate undo, apply-as-heal & distill buttons ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([90e6895](https://github.com/joshuafuller/hoard-hp-tracker/commit/90e6895db73852bff42a5201c47c739f63e99d67))
* **controls:** standardize buttons — migrate chrome, rest & dice onto primitives ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([c185391](https://github.com/joshuafuller/hoard-hp-tracker/commit/c1853918a804ea52b0749c2efce15ab56f5c8419))
* **controls:** standardize the CON-save (concentration) prompt buttons ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([61bc0ee](https://github.com/joshuafuller/hoard-hp-tracker/commit/61bc0ee3da3bda8141266c99222a449347014285))
* **controls:** Stepper interactive-value slot; migrate coin-row & hp-editor ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([557f971](https://github.com/joshuafuller/hoard-hp-tracker/commit/557f971327b9c57d96a1f3e01db8578f318fb56b))
* **controls:** Stepper interactive-value slot; migrate coin-row & hp-editor ([#132](https://github.com/joshuafuller/hoard-hp-tracker/issues/132)) ([c5d99c1](https://github.com/joshuafuller/hoard-hp-tracker/commit/c5d99c10f16e35d61ff6c2c5d1f50d33f1933528))
* **design:** apply Molten Hoard gold-outline theme to the controls ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([aa8c5f8](https://github.com/joshuafuller/hoard-hp-tracker/commit/aa8c5f8b65116e0440c53c910679e33c37c8782a))
* **design:** apply the Molten Hoard gold-outline theme to the controls ([60d104d](https://github.com/joshuafuller/hoard-hp-tracker/commit/60d104db089b67861e9f7677925c16953cecdab9))
* **design:** charcoal stat card + bigger name header (match Claude Design layout) ([082f91c](https://github.com/joshuafuller/hoard-hp-tracker/commit/082f91c9fda6fd34e55a2a3d3676c9727bda3493))
* **design:** CoinToken minted-gold medallion component ([c7b1261](https://github.com/joshuafuller/hoard-hp-tracker/commit/c7b1261b60c4bca915953f733ad16e90dc817367))
* **design:** CoinToken minted-gold medallion component ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([ca10eef](https://github.com/joshuafuller/hoard-hp-tracker/commit/ca10eeffacba2baa959232d80daec60c8414d87e))
* **design:** drop ±/±5 steppers — orb-drag + keypad replace them ([b336abb](https://github.com/joshuafuller/hoard-hp-tracker/commit/b336abb80b8c4e9319bdd6bef79b8376d4fe00ea))
* **design:** drop the ±/±5 steppers — orb-drag + keypad replace them ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([0cf20d5](https://github.com/joshuafuller/hoard-hp-tracker/commit/0cf20d5137e21d4ed260d97a8f2af5bf61dc9196))
* **design:** foil orb reads as a 3D globe (spherical shade + moving specular hotspot) ([375a00e](https://github.com/joshuafuller/hoard-hp-tracker/commit/375a00e5df4ee0ac7486682bab415e215b7ccd48))
* **design:** game-icons speaker for the sound toggle + Molten Hoard icon set ([6b62efb](https://github.com/joshuafuller/hoard-hp-tracker/commit/6b62efbd5310b5b8d2f453ae51532918ab4bd485))
* **design:** give the controls the real polished-gold metal finish ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([bbfd504](https://github.com/joshuafuller/hoard-hp-tracker/commit/bbfd504af4178158f255d69ccdfae952a7fe4257))
* **design:** gold-forward orb + brushed-foil shimmer (the actual Molten Hoard look) ([56f695f](https://github.com/joshuafuller/hoard-hp-tracker/commit/56f695fdb97f56f7783a431c643c6f6cead3ac3e))
* **design:** gold-forward orb + brushed-foil shimmer + milled rim ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([b7d0299](https://github.com/joshuafuller/hoard-hp-tracker/commit/b7d0299fb70f4f5102f4155d9432edd6486ef6f8))
* **design:** gyro-driven foil shimmer (tilt the phone, not a timer) ([b103472](https://github.com/joshuafuller/hoard-hp-tracker/commit/b10347208050f0416d7ef75f7d7a81ff9bda58e9))
* **design:** make the foil orb read as a 3D globe, not a flat band ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([6f4a310](https://github.com/joshuafuller/hoard-hp-tracker/commit/6f4a310c234df9475f4846d5b329d99564a4c0cd))
* **design:** match Claude Design orb finish (smooth gold + thin ring frame + engraved numerals) ([de5061c](https://github.com/joshuafuller/hoard-hp-tracker/commit/de5061ca3d80f7d8bec058bf983a00b0f0a66abe))
* **design:** match the Claude Design orb finish — smooth gold + ring frame ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([e0b5fcd](https://github.com/joshuafuller/hoard-hp-tracker/commit/e0b5fcdcef7b49f59a905f655963ae07ee44c8a0))
* **design:** Molten Hoard reskin slice — palette, fonts, orb tint ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([3cb3a02](https://github.com/joshuafuller/hoard-hp-tracker/commit/3cb3a02cf16d4dcacdb2c6f3a190136dcff905d5))
* **design:** Molten Hoard reskin slice (visible on /beta/) ([953e7f6](https://github.com/joshuafuller/hoard-hp-tracker/commit/953e7f6c6dfbceefa3daa9cbe1ce4e2b9b72a0e9))
* **design:** orb-as-input drag (damage/heal) + controls on the card ([e9ecaa4](https://github.com/joshuafuller/hoard-hp-tracker/commit/e9ecaa4e63bfa06b6af5a4ba4cab68fb55bb8d47))
* **design:** orb-as-input drag (damage/heal) + controls on the card ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([c292d9f](https://github.com/joshuafuller/hoard-hp-tracker/commit/c292d9f06b53c69f437204f29ae9c2bd54faf3f9))
* **design:** polished-gold metal finish on the controls (match Claude Design) ([290048a](https://github.com/joshuafuller/hoard-hp-tracker/commit/290048a0f0f09fa8d9b8796a226c24c0a338a8ff))
* **design:** tie the foil shimmer to the device gyro (not a timer) ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([01a7486](https://github.com/joshuafuller/hoard-hp-tracker/commit/01a74863d6df344030ec41fecd2fc02608ee86eb))
* **design:** use game-icons speaker glyphs for the sound toggle ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([f41fbbe](https://github.com/joshuafuller/hoard-hp-tracker/commit/f41fbbec1d9147247d3a1d3f6560c3d7b5fb7233))
* **design:** wrap the stat display in a charcoal card + bigger name header ([#51](https://github.com/joshuafuller/hoard-hp-tracker/issues/51)) ([51cc872](https://github.com/joshuafuller/hoard-hp-tracker/commit/51cc872542be3bc1ac443c0292bcce63765afa92))
* **dice:** dice-pool builder + clip-proof chip layout (TDD) ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([ea825ec](https://github.com/joshuafuller/hoard-hp-tracker/commit/ea825ec9693b79eb34454118c7d9f9ae68b66d51))
* **dice:** engine adapter + vendored dice-box, lazy-loaded, offline ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([2615f60](https://github.com/joshuafuller/hoard-hp-tracker/commit/2615f60849802c500edae9b70bd5bc382f0ceeae))
* **dice:** explosions tally + display correctly; crit-highlight nat 1/20 ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([5ab136d](https://github.com/joshuafuller/hoard-hp-tracker/commit/5ab136db9374de02d5303e864ebe7e59c2124fda))
* **dice:** inline editable notation field — drop the separate panel ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([8f901b9](https://github.com/joshuafuller/hoard-hp-tracker/commit/8f901b95fe047a4210449f5064574ea8aca74dad))
* **dice:** log close-X + relocate Clear to footer; stronger total backdrop ([3f721bf](https://github.com/joshuafuller/hoard-hp-tracker/commit/3f721bf6cef909720742888875e23ed95982cc4c))
* **dice:** order roll-log dice so a roll is walkable to its total ([#190](https://github.com/joshuafuller/hoard-hp-tracker/issues/190)) ([7975248](https://github.com/joshuafuller/hoard-hp-tracker/commit/79752484a947ac9fa51be950ba3456029cb89ae4))
* **dice:** order roll-log dice so a roll is walkable to its total ([#190](https://github.com/joshuafuller/hoard-hp-tracker/issues/190)) ([49015f5](https://github.com/joshuafuller/hoard-hp-tracker/commit/49015f54b580cb188335b59924df6252cdceadaa))
* **dice:** present the roll result as one cohesive plate ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75), [#82](https://github.com/joshuafuller/hoard-hp-tracker/issues/82)) ([f7c48a9](https://github.com/joshuafuller/hoard-hp-tracker/commit/f7c48a90e315a21365eeef17d3d5d9d35f178ee0))
* **dice:** pure domain — buildNotation + toRollRecord (TDD) ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([74ca154](https://github.com/joshuafuller/hoard-hp-tracker/commit/74ca154ee0f6b68e24e37b1faec9d203f5ab4729))
* **dice:** roll-history store + v6 rolls table (TDD) ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([041fa03](https://github.com/joshuafuller/hoard-hp-tracker/commit/041fa03ce76fe683199e5c4ff2af56ca34a4d5a3))
* **dice:** route death-save d20 + Hit Die through the shared tray ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75) step 5) ([63f8cef](https://github.com/joshuafuller/hoard-hp-tracker/commit/63f8cef4c7107401e84c2ea4d84e9a4112e7e935))
* **dice:** route death-save d20 + Hit Die through the shared tray ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75) step 5) ([7410979](https://github.com/joshuafuller/hoard-hp-tracker/commit/74109790612256df87ee4855a6b49306f6a6bfd7))
* **dice:** synth dice-clatter cue (filtered-noise ticks), not an oscillator ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([f06b32e](https://github.com/joshuafuller/hoard-hp-tracker/commit/f06b32ea08c34806d9ad4e869f05623db4742731))
* **dice:** table-throw tray UI + chrome token, wired into App (TDD) ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([92fa321](https://github.com/joshuafuller/hoard-hp-tracker/commit/92fa321410d67eb2451ffd73e5ce904aa75c5747))
* **dice:** timestamp roll log with clock time + relative 'how long ago' ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([a570257](https://github.com/joshuafuller/hoard-hp-tracker/commit/a570257609399473a17744d0cce2c4c9e13115e1))
* **domain:** pure coin math (add/spend/set/totalGp) ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([0935481](https://github.com/joshuafuller/hoard-hp-tracker/commit/093548188a64bfc50c792e8c808234cfa80475b9))
* **e2e:** add Playwright layout guard for mobile viewports ([#32](https://github.com/joshuafuller/hoard-hp-tracker/issues/32)) ([dee4d5b](https://github.com/joshuafuller/hoard-hp-tracker/commit/dee4d5b3ef2f257e1153404f78ed67d1702f380f))
* HP color fades continuously instead of snapping at tiers ([#20](https://github.com/joshuafuller/hoard-hp-tracker/issues/20)) ([#28](https://github.com/joshuafuller/hoard-hp-tracker/issues/28)) ([cc95e04](https://github.com/joshuafuller/hoard-hp-tracker/commit/cc95e0433819ecf64c87739d9c37782a530010b1))
* **hub:** layered depth + spring animation polish for the radial hub ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74)) ([a24de20](https://github.com/joshuafuller/hoard-hp-tracker/commit/a24de20f1a34a0b85158739d237a7c5e88cae2fc))
* **hub:** premium About panel, button-matched chips, intuitive sound toggle, a11y ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74)) ([24fa055](https://github.com/joshuafuller/hoard-hp-tracker/commit/24fa0557bde4c4d0ef0348499c5a7d0e6d65b1a3))
* **hub:** radial action hub replaces the chrome row + About panel ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74), [#52](https://github.com/joshuafuller/hoard-hp-tracker/issues/52)) ([0872abd](https://github.com/joshuafuller/hoard-hp-tracker/commit/0872abd06e78a0d07f513a6fa06228623bd2e696))
* **hub:** radial action hub replaces the chrome row + About panel ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74), [#52](https://github.com/joshuafuller/hoard-hp-tracker/issues/52)) ([7dd473d](https://github.com/joshuafuller/hoard-hp-tracker/commit/7dd473d6f856c364d5a4db52347e90354bf554df))
* **hub:** RadialHub component — open/select/cancel/keyboard ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74) slice 1, TDD) ([9f7a778](https://github.com/joshuafuller/hoard-hp-tracker/commit/9f7a7783b5857e723efbf1487ef4cb9f6964494d))
* **hub:** style RadialHub as an animated radial fan ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74) slice 3 brought forward) ([8f1e3b4](https://github.com/joshuafuller/hoard-hp-tracker/commit/8f1e3b4a9dc6ca6a79ce133d77c1ea916d60677d))
* optional character name by the orb ([#31](https://github.com/joshuafuller/hoard-hp-tracker/issues/31)) ([8b31caf](https://github.com/joshuafuller/hoard-hp-tracker/commit/8b31caf56107601fa248e57e25c702825ab2f5ca))
* **orb:** teach the drag interaction with a first-run hint ([#94](https://github.com/joshuafuller/hoard-hp-tracker/issues/94)) ([d53e3ce](https://github.com/joshuafuller/hoard-hp-tracker/commit/d53e3ce527de66283a2601345df43c4af309180b))
* **orb:** teach the drag interaction with a first-run hint ([#94](https://github.com/joshuafuller/hoard-hp-tracker/issues/94)) ([9d07c37](https://github.com/joshuafuller/hoard-hp-tracker/commit/9d07c3731f1567258688484a87ae326afa897cb0))
* **pwa:** "Updated to vX" toast after a silent auto-update ([#167](https://github.com/joshuafuller/hoard-hp-tracker/issues/167)) ([d06ba92](https://github.com/joshuafuller/hoard-hp-tracker/commit/d06ba921c4353725454193da1d2aef10294e7d67))
* **pwa:** "Updated to vX" toast after a silent auto-update ([#167](https://github.com/joshuafuller/hoard-hp-tracker/issues/167)) ([e751186](https://github.com/joshuafuller/hoard-hp-tracker/commit/e7511868110077573b9aef4890c4eea8596809bc))
* **pwa:** show the running app version in About ([#166](https://github.com/joshuafuller/hoard-hp-tracker/issues/166)) ([0d6f485](https://github.com/joshuafuller/hoard-hp-tracker/commit/0d6f48543e9d68bb3e735f56b948dc1bb51317f3))
* **pwa:** show the running app version in About ([#166](https://github.com/joshuafuller/hoard-hp-tracker/issues/166)) ([8e805ce](https://github.com/joshuafuller/hoard-hp-tracker/commit/8e805ce3237e087166a05e808c1f553fd004f14f))
* quick damage/heal keypad + undo (US-1, US-2, US-5) ([#24](https://github.com/joshuafuller/hoard-hp-tracker/issues/24)) ([6b7e8c8](https://github.com/joshuafuller/hoard-hp-tracker/commit/6b7e8c8d68ebf8ef04fbbee2b252f63a400095ac))
* **release:** build identity (__BUILD__) + release-please automation ([#169](https://github.com/joshuafuller/hoard-hp-tracker/issues/169)) ([8f89587](https://github.com/joshuafuller/hoard-hp-tracker/commit/8f89587eb365a594c06628c1ce3b948fb14762d3))
* **release:** build identity + release-please automation ([#169](https://github.com/joshuafuller/hoard-hp-tracker/issues/169)) ([498b0a5](https://github.com/joshuafuller/hoard-hp-tracker/commit/498b0a53aaf122685e7da753086ec530bbd66335))
* **sound:** coin add / spend transactional cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([43df757](https://github.com/joshuafuller/hoard-hp-tracker/commit/43df7572bb780731571c3b3c49d3e345c8075c61))
* **sound:** coin add / spend transactional cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([b2df5f0](https://github.com/joshuafuller/hoard-hp-tracker/commit/b2df5f0db05b5fbc3a451b4c467ce8734b6913d3))
* **sound:** coin distill cascade cue ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([8c628b8](https://github.com/joshuafuller/hoard-hp-tracker/commit/8c628b8e74ea7faf56d30bd224d14f2587cb5f39))
* **sound:** coin distill cascade cue ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([3190f44](https://github.com/joshuafuller/hoard-hp-tracker/commit/3190f44ecbec496c2a7aa8942a2353a845309eb7))
* **sound:** concentration toggle cue, baselined ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([736c5c7](https://github.com/joshuafuller/hoard-hp-tracker/commit/736c5c7d4b3f48d2f6f90f42937cbe9b998a55e8))
* **sound:** concentration toggle cue, baselined at the App level ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([bd67be7](https://github.com/joshuafuller/hoard-hp-tracker/commit/bd67be74908f6b89a6c23e77d745b11bc030f588))
* **sound:** down + revive HP-state cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([d2e4ec3](https://github.com/joshuafuller/hoard-hp-tracker/commit/d2e4ec39f59fcf787a4b2ac323baf2594e6c323b))
* **sound:** down + revive HP-state cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([b93389a](https://github.com/joshuafuller/hoard-hp-tracker/commit/b93389aef881a82d1643a9c8c20520ec1d9c32ad))
* **sound:** toggle on/off + undo cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([76f08d8](https://github.com/joshuafuller/hoard-hp-tracker/commit/76f08d8b9c472258fb109a1b90c32b4d061153d2))
* **sound:** toggle on/off + undo cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([67de957](https://github.com/joshuafuller/hoard-hp-tracker/commit/67de957491d77e5cbec7f5432dba9e4b7a8d0b29))
* **sound:** wire keypad tap cue + loudness-ceiling guard ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([556b077](https://github.com/joshuafuller/hoard-hp-tracker/commit/556b077a3cdde6f92bd88949f60ffa6f96fd3548))
* **sound:** wire the keypad tap cue + add a loudness-ceiling guard ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([3acb024](https://github.com/joshuafuller/hoard-hp-tracker/commit/3acb02456f2171baa3d0fce3b2178911b5807a88))
* **store:** coin fields + useCoins hook ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([ae26ce8](https://github.com/joshuafuller/hoard-hp-tracker/commit/ae26ce836601039360f772468c49d647d351bd48))
* **ui:** CoinSheet + CoinButton ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([6db180e](https://github.com/joshuafuller/hoard-hp-tracker/commit/6db180e423b550f81b2b89d40cc20cbcb9fb1875))
* **ui:** discoverable character-name affordance + notch clearance ([#163](https://github.com/joshuafuller/hoard-hp-tracker/issues/163)) ([ed1d621](https://github.com/joshuafuller/hoard-hp-tracker/commit/ed1d6214ab5c109c0678bc8a834462724066415c))
* **ui:** make the character-name slot discoverable + clear the notch ([#163](https://github.com/joshuafuller/hoard-hp-tracker/issues/163)) ([b6caec7](https://github.com/joshuafuller/hoard-hp-tracker/commit/b6caec7577ce1c716d84fb0d85054ebde8f2848c))
* wire coin button + sheet into the app ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([6ee078a](https://github.com/joshuafuller/hoard-hp-tracker/commit/6ee078abc0727f0133e9050bd27900e7cac24b33))


### Fixed

* **a11y:** complete modal focus-traps + Escape consistency ([#104](https://github.com/joshuafuller/hoard-hp-tracker/issues/104)) ([3935002](https://github.com/joshuafuller/hoard-hp-tracker/commit/3935002284d8852db7d1a43a1681137726acb9f8))
* **a11y:** complete modal focus-traps + Escape consistency ([#104](https://github.com/joshuafuller/hoard-hp-tracker/issues/104)) ([3cd728a](https://github.com/joshuafuller/hoard-hp-tracker/commit/3cd728aa87866c5578618d9c1bcf8665ec5a6e37))
* **a11y:** move focus into HitDicePanel on open; exclude disabled in traps ([#104](https://github.com/joshuafuller/hoard-hp-tracker/issues/104)) ([b1b0833](https://github.com/joshuafuller/hoard-hp-tracker/commit/b1b0833f3313b47ca8e6bd4aed0249e28f95f53c))
* **about:** robust share AbortError, timer cleanup, deflaked test ([#207](https://github.com/joshuafuller/hoard-hp-tracker/issues/207)) ([c756b86](https://github.com/joshuafuller/hoard-hp-tracker/commit/c756b86c5042738587c69a7104f0302b0b29bc24))
* **coins:** break the smallest *sufficient* higher coin, preserving smaller ones ([abad71f](https://github.com/joshuafuller/hoard-hp-tracker/commit/abad71fc1e89cfb119cfb8b978517f46d894f5ff))
* **coins:** drop dead distill min-height override (Copilot [#140](https://github.com/joshuafuller/hoard-hp-tracker/issues/140)) ([82f05d7](https://github.com/joshuafuller/hoard-hp-tracker/commit/82f05d753258cb5ebf5c9db1033ac03f474e1456))
* **coins:** enable cross-denomination quick-spend on CoinRow ([#103](https://github.com/joshuafuller/hoard-hp-tracker/issues/103)) ([cb26045](https://github.com/joshuafuller/hoard-hp-tracker/commit/cb26045885bd628221bcde18450dd9e674cd227a))
* **coins:** scope distill-undo to the distill; switcher a11y ([464edbe](https://github.com/joshuafuller/hoard-hp-tracker/commit/464edbe6e3373649145cea17c55ebd8fb96d34bd))
* **coins:** tabular-nums on the temp-HP badge for legibility ([#95](https://github.com/joshuafuller/hoard-hp-tracker/issues/95)) ([8b11f2e](https://github.com/joshuafuller/hoard-hp-tracker/commit/8b11f2edcb84b22b2007dbf14014721ad9488aa9))
* **coins:** temp-badge tabular-nums ([#95](https://github.com/joshuafuller/hoard-hp-tracker/issues/95)) + cross-denom quick-spend ([#103](https://github.com/joshuafuller/hoard-hp-tracker/issues/103)) ([8bdf954](https://github.com/joshuafuller/hoard-hp-tracker/commit/8bdf95479b2759fecbf7313128a1f98db601b3ff))
* **controls:** address PR review on removable Chip ([#89](https://github.com/joshuafuller/hoard-hp-tracker/issues/89)) ([3c8ac29](https://github.com/joshuafuller/hoard-hp-tracker/commit/3c8ac29dc0d1ff014dfb5d3252603542d1795388))
* **css:** repair coin/concentration CSS mangled by the merge union ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)/[#30](https://github.com/joshuafuller/hoard-hp-tracker/issues/30)) ([eb046c1](https://github.com/joshuafuller/hoard-hp-tracker/commit/eb046c1bd6d2ddc4d62c7220130a9f8deda9e66c))
* **deps:** pin qs to 6.15.2 to clear the qs.stringify DoS advisory ([#18](https://github.com/joshuafuller/hoard-hp-tracker/issues/18)) ([f6dd70e](https://github.com/joshuafuller/hoard-hp-tracker/commit/f6dd70e9ffeadcd7a06f3eec3741ce06b63a5cd6))
* **design:** address Codex + Copilot review on the reskin ([3a425d1](https://github.com/joshuafuller/hoard-hp-tracker/commit/3a425d10a410f377932b750eb18a46942a9f40d1))
* **design:** living aura — drifting blobs instead of a spinning square ([e2078f2](https://github.com/joshuafuller/hoard-hp-tracker/commit/e2078f2626419251f125b46fdd88e9029da112c1))
* **design:** make the living aura actually visible (bigger, brighter, wider drift) ([1e14cfc](https://github.com/joshuafuller/hoard-hp-tracker/commit/1e14cfc12297bfeacccf83e7654fedb9dace5eec))
* **design:** make the living aura noticeable ([cfe9982](https://github.com/joshuafuller/hoard-hp-tracker/commit/cfe998279a2556f37d284c4d6269f292657d8040))
* **design:** replace the spinning-square aura with drifting organic blobs ([e696209](https://github.com/joshuafuller/hoard-hp-tracker/commit/e696209dc25ed62e55673abca174779db71c5286))
* **dice:** a settled Hit Die commits via Apply only — no discard-Done (Codex [#130](https://github.com/joshuafuller/hoard-hp-tracker/issues/130)) ([6852d0a](https://github.com/joshuafuller/hoard-hp-tracker/commit/6852d0a568e39408f722d4752e7229e9bc2df2b4))
* **dice:** address PR review findings ([#97](https://github.com/joshuafuller/hoard-hp-tracker/issues/97), [#99](https://github.com/joshuafuller/hoard-hp-tracker/issues/99)) ([f620293](https://github.com/joshuafuller/hoard-hp-tracker/commit/f620293b927e0ac8a9a5f42a99f97d19df49d892))
* **dice:** bare k/d tokens + mutation-hardened normalizeNotation (Codex/Copilot [#194](https://github.com/joshuafuller/hoard-hp-tracker/issues/194)) ([eb1b0cf](https://github.com/joshuafuller/hoard-hp-tracker/commit/eb1b0cfb35ed135bd2756fff38253572dc5cc4d3))
* **dice:** closing the tray applies a settled Hit Die, never discards it ([#184](https://github.com/joshuafuller/hoard-hp-tracker/issues/184)) ([c4910a7](https://github.com/joshuafuller/hoard-hp-tracker/commit/c4910a7397359a85239061de56e7d9eb0eda4313))
* **dice:** closing the tray applies a settled Hit Die, never discards it ([#184](https://github.com/joshuafuller/hoard-hp-tracker/issues/184)) ([04e77c4](https://github.com/joshuafuller/hoard-hp-tracker/commit/04e77c41e1fc94563b2e8c9a9cb119b5b0c8b371))
* **dice:** crisp render (AA+DPR) + safe-area inset so dice stay on-screen ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75), [#81](https://github.com/joshuafuller/hoard-hp-tracker/issues/81)) ([496206c](https://github.com/joshuafuller/hoard-hp-tracker/commit/496206cc99472e835d6db7baee7f423287091575))
* **dice:** dark outline + halo on the total for legibility over dice ([5bd87c0](https://github.com/joshuafuller/hoard-hp-tracker/commit/5bd87c07b278f03113f523af114f3089506fe1dd))
* **dice:** dark pill behind the per-die result line for legibility ([#82](https://github.com/joshuafuller/hoard-hp-tracker/issues/82)) ([3f15a46](https://github.com/joshuafuller/hoard-hp-tracker/commit/3f15a4605e2332d4f32e61557b64feda032496f3))
* **dice:** dice land above the dock + never hang on Throwing ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([b0f3ec0](https://github.com/joshuafuller/hoard-hp-tracker/commit/b0f3ec0f870719df25f297207e089b99b714ce25))
* **dice:** discard rolls abandoned mid-throw + decouple history + scrim guard ([9ab54b9](https://github.com/joshuafuller/hoard-hp-tracker/commit/9ab54b97dc634b9f28b1b1c3e158f1d9338926be))
* **dice:** drop the wrong synth throw cue; keep haptic ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([aaa247d](https://github.com/joshuafuller/hoard-hp-tracker/commit/aaa247dfd57dde409661a670dfa7e3db58ec45e0))
* **dice:** explode + keep/drop composes via notation normalization ([#108](https://github.com/joshuafuller/hoard-hp-tracker/issues/108)) ([1bdcd8f](https://github.com/joshuafuller/hoard-hp-tracker/commit/1bdcd8f347034602b151a7a1a0701c804c2603c1))
* **dice:** explode + keep/drop now composes via notation normalization ([#108](https://github.com/joshuafuller/hoard-hp-tracker/issues/108)) ([356e1be](https://github.com/joshuafuller/hoard-hp-tracker/commit/356e1be593c29c4d3ebf935308251f2ff6e1e4c7))
* **dice:** full-screen tray canvas + ResizeObserver refit ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([92a0d77](https://github.com/joshuafuller/hoard-hp-tracker/commit/92a0d77a199ca454a720c5f66476a2d7ec7f4f48))
* **dice:** gate re-throw after a contextual roll settles ([#129](https://github.com/joshuafuller/hoard-hp-tracker/issues/129) follow-up) ([65134a6](https://github.com/joshuafuller/hoard-hp-tracker/commit/65134a692fc9bf8fe45313c5ee1a1e9d6ecf35fd))
* **dice:** gate re-throw after a contextual roll settles ([#129](https://github.com/joshuafuller/hoard-hp-tracker/issues/129) follow-up) ([a466e01](https://github.com/joshuafuller/hoard-hp-tracker/commit/a466e01f2254ef6232714e39eeecc9d8f2fa3695))
* **dice:** group exploding dice by round (one + per round) ([e833530](https://github.com/joshuafuller/hoard-hp-tracker/commit/e8335309710897c567d31d4a7996132ee6f0fd23))
* **dice:** group exploding dice by ROUND (one + per round), not per-die ([e3b8581](https://github.com/joshuafuller/hoard-hp-tracker/commit/e3b8581d25a605b449d75cf910d0eebd36fa417b))
* **dice:** guard against an abandoned throw's late settle (Codex [#130](https://github.com/joshuafuller/hoard-hp-tracker/issues/130) P2) ([7dbf515](https://github.com/joshuafuller/hoard-hp-tracker/commit/7dbf5152e5fe3298df1b3299de37f223ab0d23f2))
* **dice:** guard malformed engine rolls + fuzz/regression tests ([4d94170](https://github.com/joshuafuller/hoard-hp-tracker/commit/4d94170bc47248f8cacf39259757ccf264ad9036))
* **dice:** guard malformed engine rolls + fuzz/regression/mutation coverage ([ced64fa](https://github.com/joshuafuller/hoard-hp-tracker/commit/ced64fa156fc9de41b16684f3bc988533c7169b1))
* **dice:** isolate onProgress from the engine loop; add timer-reset test (Copilot [#151](https://github.com/joshuafuller/hoard-hp-tracker/issues/151)) ([4b69195](https://github.com/joshuafuller/hoard-hp-tracker/commit/4b691957491ef239ed34a476d7c9313b788155cb))
* **dice:** keep exploding percentile (d%) rolls on the physical path (Codex P2 [#194](https://github.com/joshuafuller/hoard-hp-tracker/issues/194)) ([a08adc1](https://github.com/joshuafuller/hoard-hp-tracker/commit/a08adc151f97b17470fd01b1b7131fc051a3908d))
* **dice:** let the Normal button reset advantage in manual-notation mode ([#107](https://github.com/joshuafuller/hoard-hp-tracker/issues/107)) ([fb15e29](https://github.com/joshuafuller/hoard-hp-tracker/commit/fb15e290e995b0a06852804d5556e4143f9bb18d))
* **dice:** load engine via indirect import + selector container ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([b55d20e](https://github.com/joshuafuller/hoard-hp-tracker/commit/b55d20e7fb04ed0f621e3a77f73904bf24ae3468))
* **dice:** migrate the contextual dock buttons too (Codex [#131](https://github.com/joshuafuller/hoard-hp-tracker/issues/131) P2) ([db6f08e](https://github.com/joshuafuller/hoard-hp-tracker/commit/db6f08e27c748f3c4aa0d4d6afe8b03f6db9fe93))
* **dice:** move Roll-log button off the radial hub's corner ([#153](https://github.com/joshuafuller/hoard-hp-tracker/issues/153)) ([320add9](https://github.com/joshuafuller/hoard-hp-tracker/commit/320add9472db4dec1194944c688a7adf968f9318))
* **dice:** move the Roll-log button off the radial hub's corner ([#153](https://github.com/joshuafuller/hoard-hp-tracker/issues/153)) ([1a9f9e3](https://github.com/joshuafuller/hoard-hp-tracker/commit/1a9f9e3f2704dc65bafc75c95b8624bbeb6d0466))
* **dice:** never emit NaN — drop non-finite dice + recompute total ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([a0a639e](https://github.com/joshuafuller/hoard-hp-tracker/commit/a0a639e89fa0689b23160ecc60fa41584b0ba527))
* **dice:** normalize the animated/WebGL parse path too (Codex P1/P2 [#194](https://github.com/joshuafuller/hoard-hp-tracker/issues/194)) ([09a83e9](https://github.com/joshuafuller/hoard-hp-tracker/commit/09a83e9759ed016e7dbdc7ad25fe3f9b4e637b3e))
* **dice:** normalizeNotation recognizes Fudge (dF) and percentile (d%) dice (Codex P2 [#194](https://github.com/joshuafuller/hoard-hp-tracker/issues/194)) ([f175a42](https://github.com/joshuafuller/hoard-hp-tracker/commit/f175a42c873ea9f85d7aab4934f228be11b6a7bb))
* **dice:** physics-authoritative record for exploding rolls ([#97](https://github.com/joshuafuller/hoard-hp-tracker/issues/97)) ([508e5dd](https://github.com/joshuafuller/hoard-hp-tracker/commit/508e5dde9280e46075e63d0158c9a81533202326))
* **dice:** physics-authoritative record for exploding rolls ([#97](https://github.com/joshuafuller/hoard-hp-tracker/issues/97)) ([4eacd89](https://github.com/joshuafuller/hoard-hp-tracker/commit/4eacd89ae87d6a7404aa3c00923ce8b0ca57e34b))
* **dice:** re-arm roll safety timeout per settle, not per throw ([#149](https://github.com/joshuafuller/hoard-hp-tracker/issues/149)) ([18330d6](https://github.com/joshuafuller/hoard-hp-tracker/commit/18330d697edabc49340ef240f2ad48f6ec2b7458))
* **dice:** re-arm the roll safety timeout per settle, not per throw ([#149](https://github.com/joshuafuller/hoard-hp-tracker/issues/149)) ([d9f55d5](https://github.com/joshuafuller/hoard-hp-tracker/commit/d9f55d51c8d6b56de0385aa65cb8ac4286cabea8))
* **dice:** roll-log scrollbar no longer overlaps the result totals ([#189](https://github.com/joshuafuller/hoard-hp-tracker/issues/189)) ([4d60104](https://github.com/joshuafuller/hoard-hp-tracker/commit/4d60104cdd5dd92a78934c2a51a7ff218da8be74))
* **dice:** roll-log scrollbar no longer overlaps the result totals ([#189](https://github.com/joshuafuller/hoard-hp-tracker/issues/189)) ([a2cd3a1](https://github.com/joshuafuller/hoard-hp-tracker/commit/a2cd3a1d3b872092b82b2ef472dcdaa4fc7dff6c))
* **dice:** route bare keep/drop explosions through the parser (Codex P2 [#194](https://github.com/joshuafuller/hoard-hp-tracker/issues/194)) ([196a928](https://github.com/joshuafuller/hoard-hp-tracker/commit/196a92828168801e24f7a8d75efc3fd30bedbb54))
* **dice:** soft radial black backdrop behind the total for legibility ([f26f1c0](https://github.com/joshuafuller/hoard-hp-tracker/commit/f26f1c001567125feb5fbe3e07422e03e80f747c))
* **dice:** SVG icons instead of text glyphs — reliably centered ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([cfbfee8](https://github.com/joshuafuller/hoard-hp-tracker/commit/cfbfee811040ae4c139cf55780e43f3d00517b74))
* **dice:** tapping the tray mid-roll no longer sweeps the die / sticks on Throwing ([034b34f](https://github.com/joshuafuller/hoard-hp-tracker/commit/034b34fce27af31697169f5bbbb2c146bf3374b1))
* **dice:** tie Log offset to the close button's size token (Copilot [#157](https://github.com/joshuafuller/hoard-hp-tracker/issues/157)) ([5c22255](https://github.com/joshuafuller/hoard-hp-tracker/commit/5c22255d022c77c0377b8c93ffd460046629d85a))
* **dice:** timeout fallback must win the race over the sweep's rejection (Codex [#130](https://github.com/joshuafuller/hoard-hp-tracker/issues/130) P2) ([f5e2b6a](https://github.com/joshuafuller/hoard-hp-tracker/commit/f5e2b6a227029e7dc093e7f9f7409d8787b66a2f))
* **dice:** tray robustness & polish (timeout, fast-close, manual notation, heal cleanup) ([#107](https://github.com/joshuafuller/hoard-hp-tracker/issues/107)) ([471a06b](https://github.com/joshuafuller/hoard-hp-tracker/commit/471a06b3511b5614a4cf24cb1f58d4dcfd4bad3d))
* **dice:** tray robustness & polish (timeout, fast-close, manual notation, heal cleanup) ([#107](https://github.com/joshuafuller/hoard-hp-tracker/issues/107)) ([d623681](https://github.com/joshuafuller/hoard-hp-tracker/commit/d6236810a17c24938fafee4f2a8ac6d67f9cb577))
* **hit-dice:** open editor as a bottom sheet (was overflowing the card) ([18d2471](https://github.com/joshuafuller/hoard-hp-tracker/commit/18d24710d3e947a059ddb5f59d5ace168ec8d6c5))
* **hit-dice:** open the editor as a bottom sheet, not an inline overflow ([ef290ef](https://github.com/joshuafuller/hoard-hp-tracker/commit/ef290efe3cd0f01099b2287410a1ee70cc2517d1))
* **hp:** keep concentration state + prompt in sync; restore on undo ([#102](https://github.com/joshuafuller/hoard-hp-tracker/issues/102)) ([db4a9f2](https://github.com/joshuafuller/hoard-hp-tracker/commit/db4a9f2c9b56635e3294f62a8deede1eb7c4d0d4))
* **hp:** keep concentration state + prompt in sync; restore on undo ([#102](https://github.com/joshuafuller/hoard-hp-tracker/issues/102)) ([2b3a76f](https://github.com/joshuafuller/hoard-hp-tracker/commit/2b3a76f3b4eb9bfaa91ce9b5135e926b2bc73692))
* **hp:** max-HP editor no longer renders off-screen on narrow viewports ([#210](https://github.com/joshuafuller/hoard-hp-tracker/issues/210)) ([467ca65](https://github.com/joshuafuller/hoard-hp-tracker/commit/467ca65e220b651071d9d87c93d4cded583b6e80))
* **hp:** max-HP editor renders off-screen on narrow viewports ([#210](https://github.com/joshuafuller/hoard-hp-tracker/issues/210)) ([ac8852f](https://github.com/joshuafuller/hoard-hp-tracker/commit/ac8852fea07188f2834508dcc58cd1e88bce5d41))
* **hub:** solid gold on-state + opaque chips — fix washed Sound chip ([#74](https://github.com/joshuafuller/hoard-hp-tracker/issues/74)) ([3bdde6b](https://github.com/joshuafuller/hoard-hp-tracker/commit/3bdde6b5ba5b86761603537311c8b93b21ce8734))
* **hub:** stacking + scrim + e2e green for the radial hub ([#152](https://github.com/joshuafuller/hoard-hp-tracker/issues/152)) ([09afb91](https://github.com/joshuafuller/hoard-hp-tracker/commit/09afb913d5d33a2ea8255c742aac39cb9c9901fc))
* **layout:** anchor the HP orb & fit the shell to one phone screen ([#12](https://github.com/joshuafuller/hoard-hp-tracker/issues/12), [#13](https://github.com/joshuafuller/hoard-hp-tracker/issues/13)) ([#15](https://github.com/joshuafuller/hoard-hp-tracker/issues/15)) ([dc145f6](https://github.com/joshuafuller/hoard-hp-tracker/commit/dc145f6f61742e5a5de145a196e80ff4a0abb404))
* **layout:** svh shell + height-aware footer so the UI never clips on real phones ([#19](https://github.com/joshuafuller/hoard-hp-tracker/issues/19)) ([#21](https://github.com/joshuafuller/hoard-hp-tracker/issues/21)) ([78307e6](https://github.com/joshuafuller/hoard-hp-tracker/commit/78307e617503bf12f2fda824888933340ff4c2d0))
* **liquid:** full HP orb reads full instead of ~1/3 empty ([#14](https://github.com/joshuafuller/hoard-hp-tracker/issues/14)) ([#16](https://github.com/joshuafuller/hoard-hp-tracker/issues/16)) ([b998af0](https://github.com/joshuafuller/hoard-hp-tracker/commit/b998af020615926c38769c931f35af8202ba5b44))
* **liquid:** gravity projection no longer reverses past vertical ([#8](https://github.com/joshuafuller/hoard-hp-tracker/issues/8)) ([#9](https://github.com/joshuafuller/hoard-hp-tracker/issues/9)) ([e58ad18](https://github.com/joshuafuller/hoard-hp-tracker/commit/e58ad18add3883755882cbf523006f71a88f0a55))
* **liquid:** keep a grid build for the iterations=0 case ([#100](https://github.com/joshuafuller/hoard-hp-tracker/issues/100)) ([ae0c209](https://github.com/joshuafuller/hoard-hp-tracker/commit/ae0c209ca5058c2fa096fb53d98cc3e46bd587bf))
* **liquid:** preserve roll on gamma-only orientation events ([#10](https://github.com/joshuafuller/hoard-hp-tracker/issues/10)) ([8a94bbc](https://github.com/joshuafuller/hoard-hp-tracker/commit/8a94bbc9202cea3ab9802017defd013cd674301d))
* **liquid:** rebuild SPH grid per iteration + real-time rAF pacing ([#100](https://github.com/joshuafuller/hoard-hp-tracker/issues/100)) ([1db0c03](https://github.com/joshuafuller/hoard-hp-tracker/commit/1db0c03bff89f239cacfd80a70f5cfdd6fae3f40))
* **liquid:** SPH grid rebuild per iteration + real-time rAF pacing ([#100](https://github.com/joshuafuller/hoard-hp-tracker/issues/100)) ([7a7c3b5](https://github.com/joshuafuller/hoard-hp-tracker/commit/7a7c3b57268e701801e4f56482a5d8d0eea7737a))
* **orb:** drop stale drag-delta comment; harden stacking-order test (Copilot [#147](https://github.com/joshuafuller/hoard-hp-tracker/issues/147)) ([403253a](https://github.com/joshuafuller/hoard-hp-tracker/commit/403253a39d1e65ffaa3e4df8d6087af847e40e35))
* **orb:** float the drag heal/damage delta above the totals on a slick surface ([2f8150b](https://github.com/joshuafuller/hoard-hp-tracker/commit/2f8150bbfba14d72e686dcc4b124c6dc8cdc1b2d))
* **orb:** float the drag heal/damage delta ABOVE the totals on a slick surface ([c2d15a5](https://github.com/joshuafuller/hoard-hp-tracker/commit/c2d15a50207ea7d1aa049a04e0407e6adf0705ee))
* **orb:** isolate the orb stacking context; tidy hint tests (Copilot [#141](https://github.com/joshuafuller/hoard-hp-tracker/issues/141)) ([f885788](https://github.com/joshuafuller/hoard-hp-tracker/commit/f885788f996d70fff63cb73368042fd92432e749))
* **pwa:** scope update-toast version key to the deploy base + wrap text ([#206](https://github.com/joshuafuller/hoard-hp-tracker/issues/206)) ([38cc3fa](https://github.com/joshuafuller/hoard-hp-tracker/commit/38cc3faeff3f07049977888e1b162b6e2ef26f20))
* **rest:** keep the short-screen height clamp winning over the Button size rule (Codex [#131](https://github.com/joshuafuller/hoard-hp-tracker/issues/131) P2) ([e36e32a](https://github.com/joshuafuller/hoard-hp-tracker/commit/e36e32ac62891dac663102a3db95390b8e403fc3))
* **scripts:** resolve video path after close; clean temp dir; fix docs (bots [#143](https://github.com/joshuafuller/hoard-hp-tracker/issues/143)) ([df65d15](https://github.com/joshuafuller/hoard-hp-tracker/commit/df65d1580b51efbd885f3e77c0678cfcd5dde576))
* **scripts:** tmpdir video, drop stale GIF, fix header command (Codex [#143](https://github.com/joshuafuller/hoard-hp-tracker/issues/143)) ([4986981](https://github.com/joshuafuller/hoard-hp-tracker/commit/49869819eb8c1a58cf3410ca520ecd545c5005e8))
* **sound:** cancel a pending staggered status cue on a fast follow-up (Codex [#162](https://github.com/joshuafuller/hoard-hp-tracker/issues/162)) ([6a2e8e2](https://github.com/joshuafuller/hoard-hp-tracker/commit/6a2e8e2ca04752ad25ec94a12c5f43be04cb5907))
* **sound:** confirm concentration only on a real state change (Codex [#145](https://github.com/joshuafuller/hoard-hp-tracker/issues/145)) ([2c0e63a](https://github.com/joshuafuller/hoard-hp-tracker/commit/2c0e63a82f877625332f1943408d7e53f151e121))
* **sound:** cue concentration from the gesture, not a watcher (Codex/Copilot [#158](https://github.com/joshuafuller/hoard-hp-tracker/issues/158)) ([d845159](https://github.com/joshuafuller/hoard-hp-tracker/commit/d845159a766cd12c8abd1618dafe02fc858d5528))
* **sound:** defer concentration cue to a follow-up (Codex [#145](https://github.com/joshuafuller/hoard-hp-tracker/issues/145)) ([3c535dd](https://github.com/joshuafuller/hoard-hp-tracker/commit/3c535dd068816599d8866e0e0a54d7780319f8c6))
* **sound:** drive coin cues from the real purse value; guard tick gain (bots [#148](https://github.com/joshuafuller/hoard-hp-tracker/issues/148)) ([0b96289](https://github.com/joshuafuller/hoard-hp-tracker/commit/0b96289425e217cb9f19ad797d91cc8c6e2698e2))
* **sound:** mute override is synchronous; toggle-on only on enable (Copilot [#145](https://github.com/joshuafuller/hoard-hp-tracker/issues/145)) ([41743f6](https://github.com/joshuafuller/hoard-hp-tracker/commit/41743f6d05b5791fe6686956e1d165dd08cf0986))
* **sound:** stagger down/revive after the base cue (Codex [#162](https://github.com/joshuafuller/hoard-hp-tracker/issues/162)) ([5b4785b](https://github.com/joshuafuller/hoard-hp-tracker/commit/5b4785b50e56f5b29ff08c0ce11796537ae321ea))
* **store:** include coin fields in useHp in-memory SEED (review) ([78073dd](https://github.com/joshuafuller/hoard-hp-tracker/commit/78073dd3a868ac07c977a65ecae94733c3ea2d34))
* **store:** surface IndexedDB write failures (no silent data loss) ([#101](https://github.com/joshuafuller/hoard-hp-tracker/issues/101)) ([24d8e70](https://github.com/joshuafuller/hoard-hp-tracker/commit/24d8e70c58909f70b184bb3b3a0997a1bf18ac4f))
* **store:** surface IndexedDB write failures instead of swallowing them ([#101](https://github.com/joshuafuller/hoard-hp-tracker/issues/101)) ([ffee72d](https://github.com/joshuafuller/hoard-hp-tracker/commit/ffee72d96b0e5b580023d776d21dd5cd052df5d1))
* **store:** surface IndexedDB write failures via saveError signal + banner ([#101](https://github.com/joshuafuller/hoard-hp-tracker/issues/101)) ([7569df8](https://github.com/joshuafuller/hoard-hp-tracker/commit/7569df85d73cb85db501cb9d170e1b16159c50f7))
* **ui:** address Copilot findings on CharacterName ([#34](https://github.com/joshuafuller/hoard-hp-tracker/issues/34)) ([6179804](https://github.com/joshuafuller/hoard-hp-tracker/commit/61798048fa1eed41153afea7170438e4f884926c))
* **ui:** coin keypad returns to the rows on commit (match spec) ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([cfe0fff](https://github.com/joshuafuller/hoard-hp-tracker/commit/cfe0fffdddad3e4390cc856068e05436dfa4e429))
* **ui:** cover heavy DM Sans weight + reconcile DESIGN.md dice-total decision ([#114](https://github.com/joshuafuller/hoard-hp-tracker/issues/114)) ([e65a769](https://github.com/joshuafuller/hoard-hp-tracker/commit/e65a7691af44a03b8b457b1b63fb2466d133f976))
* **ui:** empty-name accessible name = its visible text (Copilot [#204](https://github.com/joshuafuller/hoard-hp-tracker/issues/204)) ([074f19d](https://github.com/joshuafuller/hoard-hp-tracker/commit/074f19dc657d95304e4abab544bef6a495280c97))
* **ui:** keypad buttons fill the sheet width — bigger, easier tap targets ([#25](https://github.com/joshuafuller/hoard-hp-tracker/issues/25)) ([#26](https://github.com/joshuafuller/hoard-hp-tracker/issues/26)) ([2025d86](https://github.com/joshuafuller/hoard-hp-tracker/commit/2025d86aa45b0c9ca4e29dda73aed946763ca70d))
* **ui:** unify large numeric readouts via --font-num token ([#114](https://github.com/joshuafuller/hoard-hp-tracker/issues/114)) ([b8a7dcf](https://github.com/joshuafuller/hoard-hp-tracker/commit/b8a7dcfed0bb15bb89a665c16b86fc2e946e46cf))
* **ui:** unify numeric readouts to the orb typeface ([#114](https://github.com/joshuafuller/hoard-hp-tracker/issues/114)) ([43a1d23](https://github.com/joshuafuller/hoard-hp-tracker/commit/43a1d235261e0be93a8411299f87322057222e01))
* **vessel:** keep fallback temp-HP band visible at full HP (Codex P2 [#119](https://github.com/joshuafuller/hoard-hp-tracker/issues/119)) ([311852a](https://github.com/joshuafuller/hoard-hp-tracker/commit/311852a7ed4e6f79028ba2d77155499c2676d7f0))
* **vessel:** orb drag correctness, aura hit-testing, readout legibility ([#105](https://github.com/joshuafuller/hoard-hp-tracker/issues/105) [#106](https://github.com/joshuafuller/hoard-hp-tracker/issues/106) [#110](https://github.com/joshuafuller/hoard-hp-tracker/issues/110)) ([7bb2071](https://github.com/joshuafuller/hoard-hp-tracker/commit/7bb20719ceb3562238e8b7771ce7160cc8503269))
* **vessel:** orb drag correctness, aura hit-testing, readout legibility ([#105](https://github.com/joshuafuller/hoard-hp-tracker/issues/105) [#106](https://github.com/joshuafuller/hoard-hp-tracker/issues/106) [#110](https://github.com/joshuafuller/hoard-hp-tracker/issues/110)) ([c9be281](https://github.com/joshuafuller/hoard-hp-tracker/commit/c9be2817758a77d7063e7ddba6f6e32fd89cd383))


### Changed

* **ci:** incremental mutation testing — slowest job ~6min → seconds ([#43](https://github.com/joshuafuller/hoard-hp-tracker/issues/43)) ([80c1e0a](https://github.com/joshuafuller/hoard-hp-tracker/commit/80c1e0ad116ceef8144b51fd2d80e99c5745fbe3))
* **ci:** incremental mutation testing — slowest job from ~6min to seconds ([#43](https://github.com/joshuafuller/hoard-hp-tracker/issues/43)) ([a038d11](https://github.com/joshuafuller/hoard-hp-tracker/commit/a038d1150f33135f27167ce09d49939956ef3f72))
* **coins:** move distill + undo ONTO the console, drop the sheet footer ([11d246c](https://github.com/joshuafuller/hoard-hp-tracker/commit/11d246ce610937fdbe5b54d2ca2887e2b762d248))
* **controls:** delete dead bespoke chrome CSS; fix segment focus clip (Copilot [#131](https://github.com/joshuafuller/hoard-hp-tracker/issues/131)) ([f74821b](https://github.com/joshuafuller/hoard-hp-tracker/commit/f74821ba6a7d6f9fe36516f40393b46428f520c3))
* **dice:** flex-group close + log, drop the hard-coded offset (Codex [#157](https://github.com/joshuafuller/hoard-hp-tracker/issues/157)) ([86de171](https://github.com/joshuafuller/hoard-hp-tracker/commit/86de17109145d63ae0fe0a5c07fe984cefb32a54))
* **sound:** coinDistill ring as a guarded RECIPES voice (Copilot [#159](https://github.com/joshuafuller/hoard-hp-tracker/issues/159)) ([9b2a757](https://github.com/joshuafuller/hoard-hp-tracker/commit/9b2a757ea881ffc9b3cd1cadaed44e2d7f6b9725))
* **ui:** extract AmountKeypad from HpKeypad (closeOnCommit, configurable actions) ([#23](https://github.com/joshuafuller/hoard-hp-tracker/issues/23)) ([c979012](https://github.com/joshuafuller/hoard-hp-tracker/commit/c979012aaed9184cf39b2281a91b01b6f16baab7))
* **ui:** shared centered SVG Glyph; fix CoinSheet close too ([#75](https://github.com/joshuafuller/hoard-hp-tracker/issues/75)) ([a8d653b](https://github.com/joshuafuller/hoard-hp-tracker/commit/a8d653b72b875f75a08c7749f95d6a706b0d986d))

## [Unreleased]

_Nothing yet — changes land here before the next version is cut._

## [0.0.1] - 2026-06-23

The honest pre-release: Hoard's first tracked version. A single player's offline,
at-the-table utility belt — HP, coins, and dice — with no accounts and no servers.

### Added
- **Liquid HP orb** — track current/max HP by tapping or dragging the orb; the fill
  responds as you take damage and heal.
- **Quick-entry keypad** — tap the HP number to set, damage, or heal by an exact amount.
- **Temp HP** — a distinct sapphire overshield layered over the base HP.
- **Coins** — track coin denominations with steppers and a keypad, with one-tap
  **distill** (convert up) and **undo**.
- **Dice tray** — build a roll from dice chips and throw physical 3D dice; the roll log
  shows each die so a result is walkable to its total.
- **Radial hub** — a single sigil opens coins, dice, the About panel, and the sound and
  concentration toggles.
- **Concentration** — taking damage while concentrating prompts a save with Keep/Drop.
- **Rests & death saves** — short/long rest and death-save tracking at the table.
- **Name your character** — a discoverable, tap-to-edit character name.
- **Share Hoard** — share the app via the native share sheet, with a copy-link fallback.
- **App version in About** — the running build's version is shown in the About panel.
- **"Updated to vX" toast** — a subtle, dismissible notice after a silent PWA update.
- **Offline-first PWA** — installable to a phone's home screen and fully usable offline;
  all state persists locally (IndexedDB), no accounts, no network.

### Changed
- Roll-log dice are ordered so a roll is easy to verify (walk the dice to the total).

### Fixed
- Max-HP (HP Total) editor no longer renders off the right edge on narrow viewports.
- Roll-log scrollbar no longer overlaps the result totals.

[Unreleased]: https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/joshuafuller/hoard-hp-tracker/releases/tag/v0.0.1
