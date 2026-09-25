<script lang="ts">
let { size = 64 }: { size?: number } = $props();
// Seven flat-top hexagons in the hive layout. Our own mark, not a copy of any NYT icon.
const HEX = "0,8.66 5,0 15,0 20,8.66 15,17.32 5,17.32";
const cells = [
  [0, 0],
  [0, -17.32],
  [15, -8.66],
  [15, 8.66],
  [0, 17.32],
  [-15, 8.66],
  [-15, -8.66],
];
</script>

<svg width={size} height={size} viewBox="-26 -28 72 72" aria-hidden="true">
  {#each cells as [x, y], i (i)}
    <polygon points={HEX} transform="translate({x} {y})" class:center={i === 0} />
  {/each}
</svg>

<style>
  polygon {
    fill: var(--bg);
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  polygon.center {
    fill: var(--ink);
  }
</style>
