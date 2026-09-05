export interface ToothInfo {
  id: number; // Universal 1-32
  fdi: number;
  name: string;
  arch: 'maxillary' | 'mandibular';
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  status: 'sound' | 'caries' | 'restoration' | 'crown' | 'rct' | 'missing' | 'implant' | 'veneer';
  notes?: string;
  surfaces?: {
    mesial?: boolean;
    distal?: boolean;
    occlusal?: boolean;
    buccal?: boolean;
    lingual?: boolean;
  };
}

export const DEFAULT_TEETH: ToothInfo[] = [
  // Maxillary Right (Q1)
  { id: 1, fdi: 18, name: "Maxillary Right 3rd Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  { id: 2, fdi: 17, name: "Maxillary Right 2nd Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  { id: 3, fdi: 16, name: "Maxillary Right 1st Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  { id: 4, fdi: 15, name: "Maxillary Right 2nd Premolar", arch: 'maxillary', type: 'premolar', status: 'sound' },
  { id: 5, fdi: 14, name: "Maxillary Right 1st Premolar", arch: 'maxillary', type: 'premolar', status: 'sound' },
  { id: 6, fdi: 13, name: "Maxillary Right Canine", arch: 'maxillary', type: 'canine', status: 'sound' },
  { id: 7, fdi: 12, name: "Maxillary Right Lateral Incisor", arch: 'maxillary', type: 'incisor', status: 'sound' },
  { id: 8, fdi: 11, name: "Maxillary Right Central Incisor", arch: 'maxillary', type: 'incisor', status: 'sound' },
  // Maxillary Left (Q2)
  { id: 9, fdi: 21, name: "Maxillary Left Central Incisor", arch: 'maxillary', type: 'incisor', status: 'sound' },
  { id: 10, fdi: 22, name: "Maxillary Left Lateral Incisor", arch: 'maxillary', type: 'incisor', status: 'sound' },
  { id: 11, fdi: 23, name: "Maxillary Left Canine", arch: 'maxillary', type: 'canine', status: 'sound' },
  { id: 12, fdi: 24, name: "Maxillary Left 1st Premolar", arch: 'maxillary', type: 'premolar', status: 'sound' },
  { id: 13, fdi: 25, name: "Maxillary Left 2nd Premolar", arch: 'maxillary', type: 'premolar', status: 'sound' },
  { id: 14, fdi: 26, name: "Maxillary Left 1st Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  { id: 15, fdi: 27, name: "Maxillary Left 2nd Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  { id: 16, fdi: 28, name: "Maxillary Left 3rd Molar", arch: 'maxillary', type: 'molar', status: 'sound' },
  // Mandibular Left (Q3)
  { id: 17, fdi: 38, name: "Mandibular Left 3rd Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
  { id: 18, fdi: 37, name: "Mandibular Left 2nd Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
  { id: 19, fdi: 36, name: "Mandibular Left 1st Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
  { id: 20, fdi: 35, name: "Mandibular Left 2nd Premolar", arch: 'mandibular', type: 'premolar', status: 'sound' },
  { id: 21, fdi: 34, name: "Mandibular Left 1st Premolar", arch: 'mandibular', type: 'premolar', status: 'sound' },
  { id: 22, fdi: 33, name: "Mandibular Left Canine", arch: 'mandibular', type: 'canine', status: 'sound' },
  { id: 23, fdi: 32, name: "Mandibular Left Lateral Incisor", arch: 'mandibular', type: 'incisor', status: 'sound' },
  { id: 24, fdi: 31, name: "Mandibular Left Central Incisor", arch: 'mandibular', type: 'incisor', status: 'sound' },
  // Mandibular Right (Q4)
  { id: 25, fdi: 41, name: "Mandibular Right Central Incisor", arch: 'mandibular', type: 'incisor', status: 'sound' },
  { id: 26, fdi: 42, name: "Mandibular Right Lateral Incisor", arch: 'mandibular', type: 'incisor', status: 'sound' },
  { id: 27, fdi: 43, name: "Mandibular Right Canine", arch: 'mandibular', type: 'canine', status: 'sound' },
  { id: 28, fdi: 44, name: "Mandibular Right 1st Premolar", arch: 'mandibular', type: 'premolar', status: 'sound' },
  { id: 29, fdi: 45, name: "Mandibular Right 2nd Premolar", arch: 'mandibular', type: 'premolar', status: 'sound' },
  { id: 30, fdi: 46, name: "Mandibular Right 1st Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
  { id: 31, fdi: 47, name: "Mandibular Right 2nd Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
  { id: 32, fdi: 48, name: "Mandibular Right 3rd Molar", arch: 'mandibular', type: 'molar', status: 'sound' },
];

export interface AnestheticDrug {
  id: string;
  name: string;
  concentration: number; // percentage (e.g. 2 for 2%)
  mgPerMl: number;
  cartridgeVolume: number; // 1.7 or 1.8 ml
  mgPerCartridge: number;
  vasoconstrictor: string;
  epiRatio: string;
  maxDoseMgKg: number;
  absoluteMaxMg: number;
}

export const ANESTHETICS: AnestheticDrug[] = [
  {
    id: 'lido_100k',
    name: 'Lidocaine 2% with 1:100k Epinephrine',
    concentration: 2,
    mgPerMl: 20,
    cartridgeVolume: 1.8,
    mgPerCartridge: 36,
    vasoconstrictor: 'Epi 1:100,000 (0.018mg/carpule)',
    epiRatio: '1:100,000',
    maxDoseMgKg: 7.0, // With epi
    absoluteMaxMg: 500,
  },
  {
    id: 'arti_100k',
    name: 'Articaine 4% with 1:100k Epinephrine (Septocaine)',
    concentration: 4,
    mgPerMl: 40,
    cartridgeVolume: 1.7,
    mgPerCartridge: 68,
    vasoconstrictor: 'Epi 1:100,000 (0.017mg/carpule)',
    epiRatio: '1:100,000',
    maxDoseMgKg: 7.0,
    absoluteMaxMg: 500,
  },
  {
    id: 'mepi_plain',
    name: 'Mepivacaine 3% Plain (Carbocaine - No Epi)',
    concentration: 3,
    mgPerMl: 30,
    cartridgeVolume: 1.8,
    mgPerCartridge: 54,
    vasoconstrictor: 'None (Plain)',
    epiRatio: 'None',
    maxDoseMgKg: 6.6,
    absoluteMaxMg: 400,
  },
  {
    id: 'bupi_200k',
    name: 'Bupivacaine 0.5% with 1:200k Epinephrine (Marcaine)',
    concentration: 0.5,
    mgPerMl: 5,
    cartridgeVolume: 1.8,
    mgPerCartridge: 9,
    vasoconstrictor: 'Epi 1:200,000 (0.009mg/carpule)',
    epiRatio: '1:200,000',
    maxDoseMgKg: 2.0,
    absoluteMaxMg: 90,
  }
];

export const QUICK_PROTOCOLS = [
  {
    id: 'hot-tooth',
    title: 'Hot Tooth / Mandibular Molar Pulpitis',
    category: 'Anesthesia & Emergency',
    summary: 'Standard IANB failure rate is up to 50-70% in symptomatic irreversible pulpitis.',
    steps: [
      '1. Initial Standard IANB + Long Buccal: 1 cartridge 2% Lidocaine 1:100k or 4% Articaine.',
      '2. Mandatory Supplemental Infiltration: 1 cartridge 4% Articaine 1:100k buccal to target molar (percolates through cortical bone).',
      '3. Lingual infiltration: 0.5 cartridge 4% Articaine to block mylohyoid nerve.',
      '4. If still sensitive during access: PDL injection (blanching required, 0.2ml per root) or Intraosseous (X-Tip/Stabident) with 3% Mepivacaine or 2% Lidocaine.',
      '5. Intrapulpal as last resort: High pressure back-resistance with 30-gauge short needle into pulp horn.'
    ]
  },
  {
    id: 'broken-instrument',
    title: 'Separated Rotary File in Canal',
    category: 'Endodontics',
    summary: 'Protocol for managing separated nickel-titanium instruments.',
    steps: [
      '1. Stop immediately: Do not force further files or burs. Keep canal flooded with 17% EDTA.',
      '2. Radiographic confirmation: Determine precise location (coronal, middle, or apical third) and curvature relation.',
      '3. If in coronal/straight middle third: Create straight-line optical access under magnification. Use ultrasonic tips (e.g. Start-X #3, ET20) counter-clockwise on low power dry with light air puff to trough around coronal 2mm of fragment.',
      '4. Retrieval tools: IRS (Instrument Retrieval System), microtubes, or braided Hedstrom technique.',
      '5. If apical to canal curvature: Attempt bypass with pre-curved #08 / #10 K-file with copious EDTA. If bypassed, clean and obturate canal incorporating instrument.',
      '6. If impossible to bypass and no periapical lesion: Seal to instrument level, inform patient in writing, and monitor closely or refer to endodontist.'
    ]
  },
  {
    id: 'dry-socket',
    title: 'Alveolar Osteitis (Dry Socket) Management',
    category: 'Oral Surgery',
    summary: 'Occurs 2-5 days post-extraction due to premature clot lysis (fibrinolysis).',
    steps: [
      '1. Diagnosis: Severe throbbing unremitting pain radiating to ear/temple, fetid odor, empty socket with bare bone, unresponsive to standard analgesics.',
      '2. Irrigation: Gently irrigate socket with copious warm sterile saline or 0.12% Chlorhexidine. DO NOT curette or scrape the socket walls (this causes severe pain and delays healing).',
      '3. Dressing: Place a loose, non-compressed medicated dressing (Alveogyl or gauze soaked in Eugenol/iodoform paste).',
      '4. Patient instruction: Advise patient relief is rapid (within 15-30 minutes). Instruct not to smoke or use straws.',
      '5. Review: Remove or change non-resorbable dressing in 24-48 hours. Continue gentle warm saline rinses at home.'
    ]
  },
  {
    id: 'class2-deep-margin',
    title: 'Class II Deep Margin Elevation (DME)',
    category: 'Restorative',
    summary: 'Elevation of subgingival proximal box margin prior to indirect or direct restoration.',
    steps: [
      '1. Gingival management: Control crevicular fluid and bleeding using Teflon tape, retraction cord, or electrocautery if hyperplastic.',
      '2. Matrix customization: Trim a sectional matrix band (or use Tofflemire modified with curved contour) so it slides 1mm apical to the cavosurface margin without buckling.',
      '3. Wedge with Teflon backup: Firm wedge placement. If gingiva pushes band into prep, back up with packed Teflon tape.',
      '4. Adhesion: Selective enamel etch (15s) -> rinse and air dry -> Universal adhesive applied scrubbed for 20s -> gentle air evaporation -> cure for 20s.',
      '5. Elevation layer: Place 1-1.5mm increment of highly filled flowable composite or heated restorative composite. Polymerize with light tip firmly seated from occlusal and proximal.',
      '6. Check margin: Probe and take bitewing to verify zero overhang and sealed emergence profile.'
    ]
  },
  {
    id: 'sinus-perforation',
    title: 'Oroantral Communication (OAC) Triage',
    category: 'Oral Surgery',
    summary: 'Manage sinus floor violation during maxillary molar/premolar extraction.',
    steps: [
      '1. Verification: Check extracted root tip for sinus floor bone snippet. Instruct patient to gently pinch nose and blow (Valsalva test) while observing socket for bubbling (avoid aggressive blowing).',
      '2. If < 2mm perforation: Promote stable blood clot. Place gelatin sponge (Gelfoam) or collagen plug with figure-eight suture. Clot usually heals spontaneously.',
      '3. If 2mm - 5mm perforation: Place collagen plug or PRF membrane secured with figure-eight resorbable suture. Prescribe sinus precautions + Amoxicillin/Clavulanate (Augmentin) 875mg BID x 7d + nasal decongestant (Oxymetazoline spray x 3d).',
      '4. If > 5mm perforation: Requires surgical primary closure (buccal advancement flap or palatal island flap). If not experienced, pack socket, prescribe antibiotics/sinus protocol, and urgently refer to Oral & Maxillofacial Surgery.',
      '5. Sinus precautions for patient: No nose blowing for 2 weeks, sneeze with mouth wide open, no drinking through straws, no smoking, no playing wind instruments.'
    ]
  }
];
