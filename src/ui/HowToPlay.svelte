<script lang="ts">
// Static rules text. The script tag gives the component a type.
</script>

<p class="lead">Make words from the letters in the hive.</p>
<ul class="rules">
  <li>Words need at least 4 letters.</li>
  <li>Every word must use the center letter.</li>
  <li>You can use a letter more than once.</li>
  <li>The word list leaves out proper nouns, hyphenated words, obscure words and swearing.</li>
</ul>
<h3>Scoring</h3>
<ul class="rules">
  <li>A 4-letter word earns 1 point.</li>
  <li>Longer words earn 1 point per letter.</li>
  <li>
    Every puzzle has at least one <strong>pangram</strong>, a word that uses all 7 letters. A pangram earns 7 extra points.
  </li>
</ul>
<p>Your rank rises as you score. A new puzzle arrives every day at 3 a.m. Eastern.</p>
<h3>Keys</h3>
<p>Type letters, press Enter to submit, Backspace to delete and Space to shuffle.</p>
<p class="fine">Spellagon is a fan project, not affiliated with The New York Times. Your progress stays in this browser.</p>

<style>
  .lead {
    font-size: var(--text-lg);
  }

  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--text-md);
  }

  .rules {
    margin: var(--space-2) 0;
    padding-left: 1.25em;
    list-style: disc;
  }

  .rules li {
    margin-bottom: var(--space-1);
  }

  .fine {
    margin-top: var(--space-5);
    color: var(--ink-muted);
    font-size: var(--text-sm);
  }
</style>
