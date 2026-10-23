# v02实际编辑提示词

输入：generated/starting-gate-states-v01.png。方法：内置image_gen，transparent_background=true。结果仍只有五格，未采用。

```text
Edit this transparent pixel-art starting-gate spritesheet. Fix ONLY the stall count and retain the two-state sheet layout, pixel-art material style, dark-green/ochre palette, right-facing horse exit direction and transparent alpha.
Both the left CLOSED unit and right OPEN unit currently have FIVE rows of horse stalls. They MUST EACH have EXACTLY SIX complete equal-height stall rows. Rebuild the internal vertical subdivision within the existing overall silhouette to fit SIX rows: six left/back entries, six padded longitudinal channels, six forward exit door pairs (12 leaves) per unit. Count the exit pairs from top to bottom as 1,2,3,4,5,6 but do not draw numbers or any lettering. The SIXTH row must be a full usable stall above the bottom structural beam, not a small decorative strip. Keep all six row heights equal and all six exits unobstructed in the OPEN unit. Keep fixed frame geometry and every row boundary perfectly matched between CLOSED and OPEN states.
Each closed pair blocks only its own horse chest path, with clearance under the leaves. Each open pair swings aside about the side hinges so the horse can run toward screen RIGHT. Preserve true transparent background, transparent empty openings, clear gap between the two units, and remove any faint background glow/haze outside the actual metalwork. Do not add floor bars, ramps, horses, jockeys, scenery, text, fake checkerboard or extra gates. Retain original canvas dimensions and full-object margins. This is one corrected spritesheet, six stalls per state, not five or seven.
```
