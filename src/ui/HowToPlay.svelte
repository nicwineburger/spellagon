<script lang="ts">
// Static rules text. The script tag gives the component a type.
</script>

<p class="lead">Create words using letters from the hive.</p>
<ul class="rules">
  <li>Words must contain at least 4 letters.</li>
  <li>Words must include the center letter.</li>
  <li>Our word list leaves out obscure words, hyphenated words and proper nouns, and there is no swearing.</li>
  <li>Letters can be used more than once.</li>
</ul>
<h3>Score points to increase your rating.</h3>
<ul class="rules">
  <li>A 4-letter word is worth 1 point.</li>
  <li>Longer words are worth 1 point per letter.</li>
  <li>
    Every puzzle has at least one <strong>pangram</strong>, a word that uses all 7 letters. A pangram gets 7 extra points.
  </li>
</ul>
<p>New puzzles are released daily at 3 a.m. ET.</p>
<p class="keys">On a keyboard, type letters, press Enter to submit, Backspace to delete and Space to shuffle.</p>
<p class="fine">Spellagon is a fan project, not affiliated with The New York Times. Your progress stays in this browser.</p>

<style>
  .lead {
    font-size: var(--text-lg);
  }

  h3 {
    margin: var(--space-4) 0 0;
    font-size: var(--text-md);
    font-weight: 700;
  }

  .rules {
    margin: var(--space-2) 0 var(--space-4);
    padding-left: 1.25em;
    list-style: disc;
  }

  .rules li {
    margin-bottom: var(--space-1);
  }

  .keys {
    margin-top: var(--space-4);
  }

  .fine {
    margin-top: var(--space-5);
    color: var(--ink-muted);
    font-size: var(--text-sm);
  }
</style>
