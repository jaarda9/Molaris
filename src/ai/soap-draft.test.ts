import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSoapDraft } from './soap-draft.js';

test('a SOAP draft loses its chat introduction and separators, keeps the note', () => {
  const draft = `Voici une proposition de compte-rendu clinique structuré selon la méthode SOAP, à compléter et valider par vos soins.

***

**Date :** [Date du jour]

**S (Subjectif)**
* Motif : [à compléter]

---

**P (Plan)**
* Anesthésie : articaïne 4 %`;
  const clean = cleanSoapDraft(draft, '25/09/2026');
  assert.ok(clean.startsWith('**Date :** 25/09/2026'));
  assert.ok(!/Voici une proposition/.test(clean));
  assert.ok(!/^\s*(\*\*\*|---)\s*$/m.test(clean));
  assert.match(clean, /Motif : \[à compléter\]/);
  assert.match(clean, /articaïne 4 %/);
});

test('a draft that already starts with the date is unchanged', () => {
  const draft = 'Date : 25/09/2026\n\nS : douleur 46';
  assert.equal(cleanSoapDraft(draft, '25/09/2026'), draft);
});
