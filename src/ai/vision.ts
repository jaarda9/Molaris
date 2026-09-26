import { callGeminiWithResilience } from './gemini.js';
import { MOLARIS_SYSTEM_PROMPT } from './system-prompt.js';

export interface DentalImageReadInput {
  data: Buffer;
  mimeType: string;
  /** The dentist's question; empty = the default full reading. */
  query?: string;
  language: 'en' | 'fr';
  /** Tooth the reading focuses on (FDI number and its name). */
  focusTooth?: { fdi: number; name: string } | null;
  /** Anonymized context only: never a name or chart number. */
  patient: { age: number; gender?: string; asaStatus?: string; chiefComplaint?: string; medicalAlerts?: string };
  /** The screen's schematic sample drawings (a teaching walkthrough, not a patient image). */
  sample?: boolean;
}

/** The AI second reading of a dental radiograph or intraoral photo (decision support). */
export async function readDentalImage(input: DentalImageReadInput): Promise<{ text: string; modelUsed: string; query: string }> {
  const { language, patient } = input;
  const fr = language === 'fr';
  const query = input.query?.trim() || (fr
    ? 'Évaluation clinique complète de cette image dentaire (rétro-alvéolaire, bitewing, panoramique ou photo intra-orale).'
    : 'Comprehensive clinical evaluation of this dental image (periapical, bitewing, panoramic, or intraoral photograph).');

  // The screen's two sample cases are schematic drawings made for demonstrations: the model
  // is told so, and walks through them as a labelled teaching exercise instead of refusing.
  const sampleNote = input.sample
    ? (fr
      ? `\nCETTE IMAGE EST UN SCHÉMA PÉDAGOGIQUE fourni par le logiciel pour la démonstration, PAS une radiographie de patient. Ne la refusez pas : commencez par « Exemple pédagogique — schéma, pas une radiographie réelle », décrivez ce que le schéma représente (formes sombres = zones radioclaires), puis suivez la structure ci-dessous comme exercice, en rappelant qu'aucune conclusion clinique ne peut en être tirée.\n`
      : `\nTHIS IMAGE IS A SCHEMATIC TEACHING DRAWING supplied by the software for demonstrations, NOT a patient radiograph. Do not refuse it: start with "Teaching example — schematic, not a real radiograph", describe what the drawing depicts (dark shapes = radiolucent areas), then follow the structure below as an exercise, recalling that no clinical conclusion can be drawn from it.\n`)
    : '';

  let prompt = `${sampleNote}
Read this dental radiograph or intraoral image as a decision-support aid for the treating dentist (Tunisia).
Everything you report is a finding to be confirmed by the dentist, not a diagnosis.
FIRST check the image: if it is not a dental radiograph or intraoral photograph, or it is too blurred, dark,
cropped or low-resolution to read, say so in two sentences, say what image is needed, and STOP.
Never describe teeth, bone or lesions you cannot actually see.

CLINICAL QUERY: ${query}
${input.focusTooth ? `FOCUS AREA: tooth ${input.focusTooth.fdi} (FDI) - ${input.focusTooth.name}` : ''}
PATIENT (anonymized): ${patient.age}y ${patient.gender ?? ''} | ASA: ${patient.asaStatus ?? ''} | Chief Complaint: "${patient.chiefComplaint ?? ''}" | Medical Alerts: ${patient.medicalAlerts || 'not recorded'}

Structure the assessment as follows (FDI tooth numbers, no procedure codes):
1. **Image type & quality**: (bitewing, periapical, panoramic, intraoral photo; angulation, contrast, crown/apex coverage).
2. **Radiographic / clinical findings**:
   - Caries (enamel, dentin involvement, pulpal proximity, recurrent caries under existing margins).
   - Periodontal bone (alveolar crest height, horizontal/vertical bone loss, furcation involvement, lamina dura, PDL space widening).
   - Periapical status (normal, periapical radiolucency / apical periodontitis, condensing osteitis, hypercementosis).
   - Existing restorations or endodontic treatments (margins, overhangs, obturation density/length).
3. **Diagnostic hypotheses to confirm**: with the clinical tests that would confirm or rule them out.
4. **Treatment options to discuss**: options for the dentist to weigh, not a prescription.
5. **⚠️ Red flags & chairside precautions**: (anatomical risks: mental foramen, inferior alveolar canal, maxillary sinus floor, root fractures).
State the limits of reading a single image.
`;
  prompt += fr
    ? `\n[DIRECTIVE DE LANGUE OBLIGATOIRE] : Rédigez l'ensemble du rapport exclusivement en français odontologique professionnel (numérotation FDI, médicaments en DCI), intitulés des sections compris : 1. **Type et qualité de l'image** 2. **Constatations radiographiques / cliniques** 3. **Hypothèses diagnostiques à confirmer** 4. **Options thérapeutiques à discuter** 5. **⚠️ Signaux d'alerte et précautions au fauteuil**.\n`
    : `\n[LANGUAGE DIRECTIVE]: write the whole report in English.\n`;

  const result = await callGeminiWithResilience({
    preferredModel: 'gemini-3.8-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: input.data.toString('base64'), mimeType: input.mimeType } }] }],
    config: { systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.2 }
  });
  return { text: result.text, modelUsed: result.modelUsed, query };
}
