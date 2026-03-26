import type {
  ExamQuestion,
  ExamPaper,
  ExamSection,
  Subject,
} from "@/lib/exam-types";

type RawQ = Omit<ExamQuestion, "id" | "section">;

const flo = (x: number) => Math.round(x * 100) / 100;

function pick<T>(seed: number, arr: readonly T[]): T {
  const u = Math.abs((seed * 9301 + 49297) % 233280) / 233280;
  return arr[Math.floor(u * arr.length) % arr.length];
}

function wrongNumeric(correct: number, seed: number): string {
  const deltas = [0.25, 0.5, 1, 2, 3, 0.1, 1.5, 2.5];
  const d = pick(seed, deltas);
  const wrong = seed % 2 === 0 ? correct + d : Math.max(0.01, correct - d);
  return `${flo(wrong)}`;
}

/** NEET-hard numeric traps: answers close enough to invite sloppy calculation. */
function wrongNumericClose(correct: number, seed: number): string {
  const pct = [0.04, 0.08, 0.11, 0.15, 0.22][seed % 5];
  const wrong =
    seed % 2 === 0
      ? correct * (1 + pct)
      : Math.max(0.0001, correct * (1 - pct));
  return `${flo(wrong)}`;
}

function mcq(opts: {
  subject: Subject;
  topic: string;
  stem: string;
  correctText: string;
  distractors: [string, string, string];
  flavor: ExamQuestion["flavor"];
  seed: number;
}): RawQ {
  const { subject, topic, stem, correctText, distractors, flavor, seed } = opts;
  const choices = [
    correctText,
    distractors[0],
    distractors[1],
    distractors[2],
  ] as [string, string, string, string];
  const rot = seed % 4;
  const rotated = [
    choices[rot],
    choices[(rot + 1) % 4],
    choices[(rot + 2) % 4],
    choices[(rot + 3) % 4],
  ] as [string, string, string, string];
  const answerIndex = (4 - rot) % 4 as 0 | 1 | 2 | 3;
  return {
    subject,
    topic,
    stem,
    options: rotated,
    answerIndex,
    flavor,
  };
}

/** Section B: multi-step / conceptual integration (recent NTA-style load). */
function physicsStretchQ(k: number): RawQ {
  const g = 10;
  const mode = k % 7;

  if (mode === 0) {
    const v0 = 15 + (k % 25);
    const deg = 33 + (k % 29);
    const rad = (deg * Math.PI) / 180;
    const R = (v0 * v0 * Math.sin(2 * rad)) / g;
    return mcq({
      subject: "Physics",
      topic: "Kinematics (multi-step)",
      stem: `A particle projected from level ground has speed ${v0} m/s at ${deg}° above the horizontal. Taking g = ${g} m/s² and neglecting drag, its horizontal range on flat ground is closest to`,
      correctText: `${flo(R)} m`,
      distractors: [
        `${flo(R / 2)} m`,
        `${flo((v0 * v0) / g)} m`,
        `${wrongNumericClose(R, k + 3)} m`,
      ],
      flavor: "predicted",
      seed: k + 1,
    });
  }

  if (mode === 1) {
    const C1 = 2 + (k % 6);
    const C2 = 3 + (k % 8);
    const Cs = (C1 * C2) / (C1 + C2);
    return mcq({
      subject: "Physics",
      topic: "Capacitor networks",
      stem: `${C1} μF and ${C2} μF capacitors are connected in series across the same potential difference. The equivalent capacitance of the combination is`,
      correctText: `${flo(Cs)} μF`,
      distractors: [
        `${flo(C1 + C2)} μF`,
        `${wrongNumericClose(Cs, k)} μF`,
        `${flo((C1 * C2) / Math.max(1, C1 - C2))} μF`,
      ],
      flavor: "pyq-pattern",
      seed: k,
    });
  }

  if (mode === 2) {
    return mcq({
      subject: "Physics",
      topic: "Heat & thermodynamics",
      stem: `Which statement is **incorrect** for a fixed mass of an ideal gas in thermal equilibrium?`,
      correctText:
        "The mean kinetic energy of molecules is independent of absolute temperature",
      distractors: [
        "Equation of state relates pressure, volume and temperature",
        "Collisions between molecules are assumed elastic in the kinetic model",
        "At fixed volume, pressure rises when absolute temperature increases",
      ],
      flavor: "ncert-heavy",
      seed: k + 5,
    });
  }

  if (mode === 3) {
    const M = 4 + (k % 12);
    const R = 0.1 + (k % 7) / 20;
    const v = 2 + (k % 15);
    const omega = v / R;
    const K = 0.5 * M * v * v + 0.5 * 0.5 * M * R * R * omega * omega;
    return mcq({
      subject: "Physics",
      topic: "Rotation (integrated)",
      stem: `A solid cylinder of mass ${M} kg and radius ${flo(R)} m rolls without slipping on a horizontal surface with linear speed ${v} m/s. Its total kinetic energy is closest to`,
      correctText: `${flo(K)} J`,
      distractors: [
        `${flo(0.5 * M * v * v)} J`,
        `${wrongNumericClose(K, k + 2)} J`,
        `${flo(M * v * v)} J`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  if (mode === 4) {
    const lam = 500 + (k % 80);
    const D = 1.2 + (k % 8) / 10;
    const dMm = 0.35 + ((k % 45) / 100);
    const dM = dMm * 1e-3;
    const beta = (lam * 1e-9 * D) / dM;
    return mcq({
      subject: "Physics",
      topic: "Wave optics (YDSE)",
      stem: `In Young’s double-slit setup, slit separation is ${flo(dMm)} mm and screen distance is ${flo(D)} m for wavelength ${lam} nm. Fringe width β = λD/d is nearest to`,
      correctText: `${flo(beta * 1000)} mm`,
      distractors: [
        `${flo((beta * 1000) / 2)} mm`,
        `${wrongNumericClose(beta * 1000, k)} mm`,
        `${flo(beta * 1000 * D)} mm`,
      ],
      flavor: "pyq-pattern",
      seed: k + 7,
    });
  }

  if (mode === 5) {
    const rRatio = 1.2 + ((k % 35) / 100);
    return mcq({
      subject: "Physics",
      topic: "Gravitation",
      stem: `Two uniform solid planets share the same mean density but surface radii in ratio R₂ : R₁ = ${flo(rRatio)} : 1. With M ∝ R³ and v_e = √(2GM/R), escape speed satisfies v_e ∝ R for fixed density, so v₂ : v₁ is nearest to`,
      correctText: `${flo(rRatio)} : 1`,
      distractors: [
        `${flo(Math.sqrt(rRatio))} : 1`,
        `${flo(rRatio * rRatio)} : 1`,
        `1 : ${flo(rRatio)}`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  const lam = 400 + (k % 120);
  const dUm = 1.8 + (k % 50) / 10;
  const dM = dUm * 1e-6;
  const n = 1 + (k % 2);
  const theta = Math.asin(Math.min(1, (n * lam * 1e-9) / dM));
  return mcq({
    subject: "Physics",
    topic: "Wave optics",
    stem: `Light of wavelength ${lam} nm is incident on a diffraction grating with line spacing ${flo(dUm)} μm. For order n = ${n} (use sin θ = nλ/d with d in metres), θ is nearest to`,
    correctText: `${flo((theta * 180) / Math.PI)}°`,
    distractors: [
      `${flo(((theta * 180) / Math.PI) * 2)}°`,
      `${wrongNumericClose((theta * 180) / Math.PI, k)}°`,
      `90°`,
    ],
    flavor: "ncert-heavy",
    seed: k + 11,
  });
}

function physicsQ(seed: number, section: ExamSection): RawQ {
  const k = seed * 17 + 3;
  if (section === "B") {
    return physicsStretchQ(k + seed);
  }
  const mode = k % 14;

  if (mode === 0) {
    const u = 5 + (k % 40);
    const t = 2 + (k % 10);
    const a = u / t;
    const correct = `${flo(a)} m/s²`;
    return mcq({
      subject: "Physics",
      topic: "Kinematics",
      stem: `Starting from rest, a particle reaches velocity ${u} m/s uniformly in ${t} s. The magnitude of acceleration is`,
      correctText: correct,
      distractors: [
        `${wrongNumericClose(a, k + 1)} m/s²`,
        `${wrongNumeric(a, k + 2)} m/s`,
        `${flo(a * 2)} m/s²`,
      ],
      flavor: k % 3 === 0 ? "pyq-pattern" : "predicted",
      seed: k,
    });
  }

  if (mode === 1) {
    const m = 2 + (k % 8);
    const F = 6 + (k % 30);
    const a = F / m;
    return mcq({
      subject: "Physics",
      topic: "Laws of motion",
      stem: `On a smooth horizontal plane, a block of mass ${m} kg is pulled by a horizontal force of magnitude ${F} N. Its acceleration is`,
      correctText: `${flo(a)} m/s²`,
      distractors: [
        `${wrongNumeric(a, k + 3)} m/s²`,
        `${flo(F * m)} m/s²`,
        `${flo(a / 2)} m/s²`,
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }

  if (mode === 2) {
    return mcq({
      subject: "Physics",
      topic: "Rotational motion",
      stem: `Moment of inertia of a thin uniform ring of mass M and radius R about an axis through its centre and perpendicular to its plane is`,
      correctText: "MR²",
      distractors: ["½ MR²", "2 MR²", "¾ MR²"],
      flavor: "pyq-pattern",
      seed: k + 9,
    });
  }

  if (mode === 3) {
    const Th = 500 + (k % 40);
    const Tc = 300 + (k % 30);
    const eta = (1 - Tc / Th) * 100;
    return mcq({
      subject: "Physics",
      topic: "Thermodynamics",
      stem: `A Carnot engine operates between a hot reservoir at ${Th} K and a cold reservoir at ${Tc} K. Its efficiency η = 1 − T_c/T_h is nearest to`,
      correctText: `${flo(eta)}%`,
      distractors: [
        `${flo((1 - Th / Tc) * 100)}%`,
        `${flo((Tc / Th) * 100)}%`,
        `${flo(100 - Tc / Th)}%`,
      ],
      flavor: k % 2 ? "predicted" : "ncert-heavy",
      seed: k,
    });
  }

  if (mode === 4) {
    const f = 50 + (k % 200);
    const lam = 3e8 / f;
    return mcq({
      subject: "Physics",
      topic: "Waves",
      stem: `The wavelength of an electromagnetic wave in vacuum with frequency ${f} Hz is approximately`,
      correctText: `${flo(lam)} m`,
      distractors: [
        `${flo(lam / 2)} m`,
        `${flo(lam * 2)} m`,
        `${flo(3e8 * f)} m`,
      ],
      flavor: "pyq-pattern",
      seed: k + 2,
    });
  }

  if (mode === 5) {
    const q1 = 1 + (k % 5);
    const q2 = 2 + ((k >> 1) % 5);
    const r = 0.02 + ((k % 30) / 1000);
    const F = (9e9 * q1 * q2) / (r * r);
    return mcq({
      subject: "Physics",
      topic: "Electrostatics",
      stem: `Two point charges +${q1} μC and −${q2} μC are separated by ${flo(r * 100)} cm in vacuum. The magnitude of electrostatic force between them is of the order of`,
      correctText: `${flo(F)} N`,
      distractors: [
        `${wrongNumeric(F, k + 1)} N`,
        `${flo(F * r)} N`,
        `${flo(F / r)} N`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  if (mode === 6) {
    const V = 6 + (k % 18);
    const R = 2 + (k % 10);
    const I = V / R;
    return mcq({
      subject: "Physics",
      topic: "Current electricity",
      stem: `A resistor of ${R} Ω is connected across an ideal battery of emf ${V} V. Neglecting internal resistance, the current in the resistor is`,
      correctText: `${flo(I)} A`,
      distractors: [
        `${wrongNumeric(I, k + 5)} A`,
        `${flo(V * R)} A`,
        `${flo(I * R * R)} A`,
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }

  if (mode === 7) {
    const n = 1.5 + ((k % 10) / 10);
    const ang = Math.asin(1 / n);
    return mcq({
      subject: "Physics",
      topic: "Optics",
      stem: `For a material of refractive index μ = ${flo(n)}, the critical angle for total internal reflection from the material to air is nearest to`,
      correctText: `${flo((ang * 180) / Math.PI)}°`,
      distractors: [
        `${flo(((ang * 180) / Math.PI) * 2)}°`,
        `${flo(90 - (ang * 180) / Math.PI)}°`,
        `${flo((1 / n) * 90)}°`,
      ],
      flavor: "pyq-pattern",
      seed: k,
    });
  }

  if (mode === 8) {
    const phi = 2 + (k % 5);
    const lam = 200 + (k % 200);
    const Kmax = 1240 / lam - phi;
    return mcq({
      subject: "Physics",
      topic: "Dual nature",
      stem: `Photoelectric experiment uses monochromatic light of wavelength ${lam} nm. If work function φ = ${phi} eV (use hc/e ≈ 1240 eV·nm as a NEET-style shortcut), the maximum kinetic energy of photoelectrons is closest to`,
      correctText: `${flo(Math.max(0, Kmax))} eV`,
      distractors: [
        `${flo(Kmax + 2)} eV`,
        `${flo(phi + lam / 100)} eV`,
        `${flo(lam / 100)} eV`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  if (mode === 9) {
    const B = 0.02 + ((k % 25) / 1000);
    const v = 2e6 + (k % 50) * 1e4;
    const e = 1.6e-19;
    const F = e * v * B;
    return mcq({
      subject: "Physics",
      topic: "Magnetism",
      stem: `An electron moves with speed ${flo(v / 1e6)} × 10⁶ m/s perpendicular to a uniform magnetic field B = ${flo(B)} T. The magnitude of the magnetic force on it is`,
      correctText: `${flo(F)} N`,
      distractors: [
        `${wrongNumeric(F, k + 4)} N`,
        `${flo(F / (v * B || 1))} N`,
        `${flo(e * B)} N`,
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }

  if (mode === 10) {
    const L = 0.2 + ((k % 15) / 100);
    const diLdt = 4 + (k % 20);
    const emf = L * diLdt;
    return mcq({
      subject: "Physics",
      topic: "Electromagnetic induction",
      stem: `A long solenoid has inductance L = ${flo(L)} H. If current changes at ${diLdt} A/s, the magnitude of induced emf is`,
      correctText: `${flo(emf)} V`,
      distractors: [
        `${wrongNumeric(emf + 1, k)} V`,
        `${flo(diLdt / L)} V`,
        `${flo(L + diLdt)} V`,
      ],
      flavor: "pyq-pattern",
      seed: k,
    });
  }

  if (mode === 11) {
    const m = 4 + (k % 20);
    const E = 20 + (k % 60);
    const lam = 6.626e-34 / Math.sqrt(2 * m * 1.67e-27 * E * 1.6e-19);
    return mcq({
      subject: "Physics",
      topic: "Atoms & nuclei",
      stem: `A neutron of kinetic energy ${E} eV has de Broglie wavelength of the order of (take h = 6.626 × 10⁻³⁴ J·s, m_n ≈ 1.67 × 10⁻²⁷ kg, e = 1.6 × 10⁻¹⁹ C)`,
      correctText: `${flo(lam * 1e10)} Å (order check)`,
      distractors: [
        `${flo((lam * 1e10) / 2)} Å`,
        `${wrongNumeric(lam * 1e10, k)} Å`,
        `${flo(lam)} m`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  return mcq({
    subject: "Physics",
    topic: "Semiconductor electronics",
    stem: `In an ideal junction diode operated in forward bias, the dominant contribution to current across the junction comes from`,
    correctText: "majority carriers diffusion",
    distractors: [
      "minority carrier drift only, without majority contribution",
      "bound ions in the depletion region",
      "displacement current only",
    ],
    flavor: "ncert-heavy",
    seed: k + 11,
  });
}

function chemistryStretchQ(k: number): RawQ {
  const mode = k % 6;

  if (mode === 0) {
    const nH = 1 + (k % 2);
    const nO = 2 + (k % 3);
    return mcq({
      subject: "Chemistry",
      topic: "Stoichiometry",
      stem: `For 2 H₂(g) + O₂(g) → 2 H₂O(ℓ), ${nH} mol H₂ is mixed with ${nO} mol O₂ and reacted to completion (all H₂ consumed). Moles of H₂O formed equal`,
      correctText: `${nH} mol`,
      distractors: [
        `${nO} mol`,
        `${flo(nH / 2)} mol`,
        `${nH + nO} mol`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  if (mode === 1) {
    const pH = 3 + (k % 4);
    return mcq({
      subject: "Chemistry",
      topic: "Ionic equilibrium",
      stem: `At 298 K, the pH of 10⁻${pH} M aqueous HCl (strong acid, full dissociation, dilute) is nearest to`,
      correctText: `${pH}.0`,
      distractors: [
        `${pH + 1}.0`,
        `${14 - pH}.0`,
        `${flo(pH + 0.3)}`,
      ],
      flavor: "pyq-pattern",
      seed: k + 2,
    });
  }

  if (mode === 2) {
    return mcq({
      subject: "Chemistry",
      topic: "Chemical kinetics",
      stem: `Identify the **incorrect** statement about a first-order reaction in a dilute solution at fixed temperature.`,
      correctText:
        "Doubling initial concentration doubles the half-life (it actually stays the same)",
      distractors: [
        "Instantaneous rate is proportional to the first power of concentration",
        "A graph of ln [A] versus time is a straight line",
        "The rate constant carries time⁻¹ in usual concentration units",
      ],
      flavor: "ncert-heavy",
      seed: k + 9,
    });
  }

  if (mode === 3) {
    const kmin = 0.02 + (k % 20) / 200;
    const th = 0.693 / kmin;
    return mcq({
      subject: "Chemistry",
      topic: "Chemical kinetics",
      stem: `A reactant follows first-order kinetics with rate constant k = ${flo(kmin)} min⁻¹. Half-life t½ ≈ ln2/k is closest to`,
      correctText: `${flo(th)} min`,
      distractors: [
        `${wrongNumericClose(th, k)} min`,
        `${flo(1 / kmin)} min`,
        `${flo(kmin * 60)} min`,
      ],
      flavor: "predicted",
      seed: k,
    });
  }

  if (mode === 4) {
    return mcq({
      subject: "Chemistry",
      topic: "Solutions",
      stem: `For dilute aqueous solutions at the same molality, which solute is **expected** to give the **largest** elevation in boiling point per mole of **ions** released (assuming complete dissociation where applicable)?`,
      correctText: "Al₂(SO₄)₃",
      distractors: ["NaCl", "Glucose", "BaCl₂"],
      flavor: "pyq-pattern",
      seed: k + 4,
    });
  }

  return mcq({
    subject: "Chemistry",
    topic: "Coordination compounds",
    stem: `Which statement about a strong-field octahedral complex of a d⁶ metal ion is **least appropriate** as a broad exam shortcut?`,
    correctText: "It always has the same magnetic moment as the free gaseous M²⁺ ion",
    distractors: [
      "Pairing can lower the number of unpaired electrons",
      "CFSE depends on the ligand field splitting Δ₀",
      "High-field ligands favour larger Δ₀",
    ],
    flavor: "predicted",
    seed: k + 11,
  });
}

function chemistryQ(seed: number, section: ExamSection): RawQ {
  const k = seed * 19 + 5;
  if (section === "B") {
    return chemistryStretchQ(k + seed);
  }
  const m = k % 16;

  const flavors = ["pyq-pattern", "ncert-heavy", "predicted"] as const;
  const flavor = flavors[k % 3];

  if (m === 0) {
    return mcq({
      subject: "Chemistry",
      topic: "Some basic concepts",
      stem: `Which quantity has the same dimensions as amount of substance divided by volume for an ideal dilute solution context?`,
      correctText: "molarity (mol L⁻¹)",
      distractors: [
        "molality (mol kg⁻¹)",
        "mole fraction",
        "relative atomic mass",
      ],
      flavor,
      seed: k,
    });
  }
  if (m === 1) {
    return mcq({
      subject: "Chemistry",
      topic: "Atomic structure",
      stem: `The shortest wavelength line of the Balmer series corresponds to an electron transition to n = 2 from`,
      correctText: "n = ∞",
      distractors: ["n = 3", "n = 4", "n = 1"],
      flavor: "pyq-pattern",
      seed: k,
    });
  }
  if (m === 2) {
    return mcq({
      subject: "Chemistry",
      topic: "Chemical bonding",
      stem: `Which molecule is expected to be linear according to VSEPR theory?`,
      correctText: "CO₂",
      distractors: ["H₂O", "NH₃", "ClF₃"],
      flavor,
      seed: k,
    });
  }
  if (m === 3) {
    return mcq({
      subject: "Chemistry",
      topic: "Thermodynamics",
      stem: `For a spontaneous process at constant T and P, which thermodynamic quantity must decrease for the system plus surroundings framework used in NEET-style formulations?`,
      correctText: "Gibbs free energy of the system (ΔG < 0)",
      distractors: [
        "entropy of the system always",
        "internal energy always",
        "enthalpy always",
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }
  if (m === 4) {
    return mcq({
      subject: "Chemistry",
      topic: "Equilibrium",
      stem: `For the exothermic equilibrium A(g) ⇌ B(g), decreasing temperature at constant volume typically`,
      correctText: "shifts equilibrium toward products (Le Chatelier)",
      distractors: [
        "shifts toward reactants",
        "does not shift",
        "only changes catalyst rate",
      ],
      flavor,
      seed: k,
    });
  }
  if (m === 5) {
    return mcq({
      subject: "Chemistry",
      topic: "Ionic equilibrium",
      stem: `A buffer solution resists pH change primarily because it contains`,
      correctText: "a weak acid and its conjugate base (or weak base and conjugate acid)",
      distractors: [
        "strong acid and strong base",
        "only a salt of strong acid",
        "only water",
      ],
      flavor: "predicted",
      seed: k,
    });
  }
  if (m === 6) {
    return mcq({
      subject: "Chemistry",
      topic: "Redox",
      stem: `In acidic medium, MnO₄⁻ is commonly reduced to`,
      correctText: "Mn²⁺",
      distractors: ["MnO₂", "MnO₄²⁻", "Mn"],
      flavor: "pyq-pattern",
      seed: k,
    });
  }
  if (m === 7) {
    return mcq({
      subject: "Chemistry",
      topic: "Electrochemistry",
      stem: `At standard conditions, the electrode potential refers to`,
      correctText: "potential under 1 M, 1 atm gases, 298 K (standard state)",
      distractors: [
        "any concentration",
        "only molten salts",
        "only non-aqueous solvents",
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }
  if (m === 8) {
    return mcq({
      subject: "Chemistry",
      topic: "Solutions",
      stem: `Raoult’s law for an ideal solution relates vapor pressure of component i to`,
      correctText: "mole fraction of i in liquid phase",
      distractors: [
        "mass fraction only",
        "temperature only",
        "only non-volatile solutes regardless of composition",
      ],
      flavor,
      seed: k,
    });
  }
  if (m === 9) {
    return mcq({
      subject: "Chemistry",
      topic: "Organic basics",
      stem: `Which functional group is present in acetone?`,
      correctText: "ketone",
      distractors: ["aldehyde", "alcohol", "ester"],
      flavor: "pyq-pattern",
      seed: k,
    });
  }
  if (m === 10) {
    return mcq({
      subject: "Chemistry",
      topic: "Hydrocarbons",
      stem: `Markovnikov addition of HBr to propene (without peroxide) gives mainly`,
      correctText: "2-bromopropane",
      distractors: ["1-bromopropane", "propane", "propyne"],
      flavor,
      seed: k,
    });
  }
  if (m === 11) {
    return mcq({
      subject: "Chemistry",
      topic: "Haloalkanes",
      stem: `SN1 reactivity is favoured for substrates that`,
      correctText: "form stable carbocations",
      distractors: [
        "are primary only",
        "lack leaving groups",
        "never undergo solvolysis",
      ],
      flavor: "predicted",
      seed: k,
    });
  }
  if (m === 12) {
    return mcq({
      subject: "Chemistry",
      topic: "Alcohols/phenols",
      stem: `Phenol is more acidic than ethanol mainly because`,
      correctText: "phenoxide is stabilized by resonance",
      distractors: [
        "phenol has more H-bonding",
        "phenol is less polar",
        "ethanol lacks oxygen",
      ],
      flavor: "ncert-heavy",
      seed: k,
    });
  }
  if (m === 13) {
    return mcq({
      subject: "Chemistry",
      topic: "Coordination compounds",
      stem: `The coordination number of Ni in a square planar complex is typically`,
      correctText: "4",
      distractors: ["2", "6", "8"],
      flavor: "pyq-pattern",
      seed: k,
    });
  }
  return mcq({
    subject: "Chemistry",
    topic: "d- and f-block",
    stem: `Lanthanoid contraction affects mainly`,
    correctText: "atomic radii of 5d transition metals compared to 4d analogues",
    distractors: [
      "noble gas radii",
      "alkali metal densities only",
      "ionic radii of s-block only",
    ],
    flavor,
    seed: k + 3,
  });
}

const BOTANY_FACTS = [
  {
    topic: "Cell",
    stem: "Which organelle is the primary site of aerobic respiration in eukaryotes?",
    ok: "Mitochondrion",
    bad: ["Golgi apparatus", "Peroxisome", "Rough ER only"],
  },
  {
    topic: "Cell cycle",
    stem: "DNA replication in the eukaryotic cell cycle occurs mainly in",
    ok: "S phase",
    bad: ["G2 phase", "M phase", "G1 phase only"],
  },
  {
    topic: "Genetics",
    stem: "A test cross is performed to determine how many factors?",
    ok: "the genotype of a dominant phenotype",
    bad: ["mutation rate only", "linkage distance in cM only", "DNA replication fidelity only"],
  },
  {
    topic: "Molecular basis",
    stem: "In the lac operon, lactose primarily acts as",
    ok: "inducer by affecting repressor binding",
    bad: ["the repressor polypeptide itself", "a ribosome subunit", "RNA polymerase sigma factor only"],
  },
  {
    topic: "Plant phys",
    stem: "A plant hormone that promotes cell division in tissues such as cambium is mainly",
    ok: "cytokinin",
    bad: ["abscisic acid", "ethylene for all divisions", "gibberellins only"],
  },
  {
    topic: "Plant phys",
    stem: "The photorespiratory pathway becomes significant when Rubisco oxygenates RuBP, mostly at",
    ok: "higher temperature and high O₂ / low CO₂",
    bad: ["only in complete darkness", "only C4 plants", "never in chloroplasts"],
  },
  {
    topic: "Ecology",
    stem: "Species-area relationship (S = CAᶻ) is most consistent with patterns in",
    ok: "island biogeography",
    bad: ["enzyme Michaelis–Menten curves", "nerve impulse speed only", "muscle power law only"],
  },
  {
    topic: "Evolution",
    stem: "Natural selection acts on",
    ok: "phenotypic variation with heritable basis",
    bad: ["acquired somatic changes only", "non-heritable traits only", "random drift only"],
  },
  {
    topic: "Plant morphology",
    stem: "In a typical dicot root, the pericycle gives rise mainly to",
    ok: "lateral roots and part of the vascular cambium",
    bad: ["root hairs", "endodermal Casparian strips", "epidermal stomata"],
  },
  {
    topic: "Plant reproduction",
    stem: "In angiosperms, the female gametophyte is typically housed in the",
    ok: "embryo sac within the ovule",
    bad: ["anther locule", "pollen tube tip only", "nucellus outside the integuments"],
  },
  {
    topic: "Plant taxonomy",
    stem: "Algae are chiefly classified in botany as",
    ok: "thalloid or simple plant-like photosynthetic organisms outside typical embryophyte line",
    bad: ["vascular tracheophytes only", "seed gymnosperms only", "monoecious angiosperms only"],
  },
  {
    topic: "Cell",
    stem: "Plasmodesmata in plant tissues function mainly in",
    ok: "symplastic transport and signalling between cells",
    bad: ["blocking all solute flow", "ATP synthesis", "photosynthetic light capture"],
  },
] as const;

/** Section B: longer, multi-clause stems closer to recent integrated Biology items. */
const BOTANY_STRETCH = [
  {
    topic: "Photosynthesis",
    stem: "In C₄ plants, the initial CO₂ fixation that keeps Rubisco in bundle-sheath cells relatively saturated relies mainly on",
    ok: "PEP carboxylase in mesophyll forming C₄ acids that shuttle carbon",
    bad: [
      "Rubisco acting first in mesophyll before any shuttle",
      "direct refixation only in guard cells",
      "glycolate bypass alone without any spatial separation",
    ],
  },
  {
    topic: "Plant hormones",
    stem: "Epinasty (downward curling of leaves) after ethylene exposure is best interpreted as",
    ok: "differential growth redistribution consistent with ethylene-mediated cell expansion control",
    bad: [
      "solely a purely mechanical effect unrelated to hormones",
      "only abscisic acid antagonism with no ethylene role",
      "chlorophyll destruction as the primary cause",
    ],
  },
  {
    topic: "Genetics",
    stem: "A dihybrid cross with complete dominance shows a 9:3:3:1 phenotypic ratio only when",
    ok: "genes assort independently and each allele pair shows simple dominance",
    bad: [
      "genes are tightly linked on the same chromosome without recombination",
      "one trait shows codominance with four equal phenotypes",
      "there is cytoplasmic inheritance of both traits",
    ],
  },
  {
    topic: "Ecology",
    stem: "In a stable predator–prey oscillation model, a temporary crash in prey numbers most directly pressures predators through",
    ok: "reduced food intake and lowered reproduction or survival",
    bad: [
      "immediate increase in prey mutation rate",
      "automatic increase in plant primary productivity",
      "complete decoupling of energy flow from the web",
    ],
  },
  {
    topic: "Evolution",
    stem: "Neutral theory emphasizes that at the molecular level much variation can persist because",
    ok: "many allele frequency changes are driven by drift rather than selection alone",
    bad: [
      "every amino-acid substitution must raise fitness",
      "hard selection never operates on any locus",
      "mutation rates are zero in large populations",
    ],
  },
  {
    topic: "Molecular basis",
    stem: "During PCR, the annealing step is sensitive to primer Tm mainly because",
    ok: "stable primer–template pairing must form before polymerase extends",
    bad: [
      "ligase requires exact melting of primers",
      "DNA is degraded unless fully denatured first",
      "reverse transcriptase replaces Taq at this step",
    ],
  },
  {
    topic: "Plant reproduction",
    stem: "Apomixis in some angiosperms is agriculturally interesting because it can",
    ok: "produce seed-like offspring without fertilization, fixing hybrid genotypes",
    bad: [
      "eliminate need for any meiosis in the life cycle",
      "guarantee obligate outcrossing every generation",
      "block any maternal contribution to endosperm",
    ],
  },
  {
    topic: "Cell",
    stem: "COPII–coated vesicles budding from the ER are most directly associated with",
    ok: "forward transport of cargoes toward the Golgi and secretory pathway",
    bad: [
      "retrograde retrieval from Golgi back to ER",
      "lysosomal degradation of cytosolic proteins",
      "import of nuclear-encoded proteins into mitochondria",
    ],
  },
  {
    topic: "Plant phys",
    stem: "Blue-light phototropism through phototropins relies on",
    ok: "asymmetric auxin redistribution and differential growth on opposite flanks",
    bad: [
      "equal growth on both sides regardless of auxin",
      "only phytochrome with no auxin gradient",
      "closure of stomata as the sole driver of bending",
    ],
  },
  {
    topic: "Biotech",
    stem: "Agrobacterium-mediated plant transformation exploits Ti plasmid DNA mainly to",
    ok: "integrate T-DNA carrying chosen genes into host nuclear DNA",
    bad: [
      "stably transform chloroplast genomes only in all hosts",
      "replace the plant’s entire chromosome set",
      "transiently express genes only in protoplasts without integration",
    ],
  },
  {
    topic: "Taxonomy",
    stem: "Lichen symbiosis primarily partners",
    ok: "a fungus with a photosynthetic alga or cyanobacterium",
    bad: [
      "two vascular plant roots only",
      "a single bacterial species without phototrophs",
      "animal host tissue and anaerobic protozoa only",
    ],
  },
  {
    topic: "Plant morphology",
    stem: "Secondary growth thickness in dicot stems depends critically on",
    ok: "vascular cambium (and cork cambium) meristematic activity",
    bad: [
      "apical meristem of root tips only",
      "solely enlargement of existing cells without division",
      "abscission layers in petioles only",
    ],
  },
] as const;

const ZOOLOGY_FACTS = [
  {
    topic: "Human phys",
    stem: "Increased firing of aortic baroreceptors due to higher arterial pressure typically leads to",
    ok: "reflex bradycardia and decreased sympathetic tone",
    bad: ["reflex tachycardia", "ADH surge from baroreceptors directly", "fixed cardiac output"],
  },
  {
    topic: "Human phys",
    stem: "HCO₃⁻ reabsorption in the proximal tubule is linked physiologically to",
    ok: "conversion from CO₂ and carbonic anhydrase activity in tubular cells",
    bad: ["direct chloride channel block only", "ADH acting only on distal tubule", "no enzyme involvement"],
  },
  {
    topic: "Reproduction",
    stem: "In human females, the corpus luteum secretes",
    ok: "progesterone and some oestrogen",
    bad: ["FSH primarily", "LH from corpus luteum", "prolactin from follicle"],
  },
  {
    topic: "Animal diversity",
    stem: "Triploblastic coelomate protostomes with segmented body organisation include",
    ok: "annelids",
    bad: ["cnidarians", "flatworms only", "echinoderms"],
  },
  {
    topic: "Biotech",
    stem: "Restriction enzymes used in recombinant DNA technology primarily",
    ok: "cut DNA at specific palindromic sequences",
    bad: ["ligate DNA non-specifically", "amplify DNA by PCR alone", "sequence genomes without digestion"],
  },
  {
    topic: "Health/disease",
    stem: "Innate immunity is characterised by",
    ok: "rapid, non-specific responses such as phagocytosis",
    bad: [
      "only antibody-mediated memory",
      "only MHC-II restricted killing",
      "only vaccine-induced immunity",
    ],
  },
  {
    topic: "Structural organisation",
    stem: "Cartilage matrix is primarily strengthened by",
    ok: "type II collagen and proteoglycans",
    bad: ["keratin fibres", "elastic fibres only in all cartilage", "no collagen"],
  },
  {
    topic: "Neural control",
    stem: "Saltatory conduction in myelinated axons is fastest because depolarisation mainly occurs",
    ok: "at the nodes of Ranvier",
    bad: ["uniformly under myelin", "only in the soma", "only at synaptic terminals"],
  },
  {
    topic: "Respiration",
    stem: "The primary driver of normal quiet inspiration in mammals is",
    ok: "diaphragm contraction increasing thoracic volume",
    bad: ["elastic recoil of lungs alone", "abdominal compression alone", "closure of glottis"],
  },
  {
    topic: "Endocrinology",
    stem: "Negative feedback on ACTH secretion is exerted most strongly by",
    ok: "cortisol from the adrenal cortex",
    bad: ["TSH from pituitary", "renin release", "PTH from thyroid"],
  },
  {
    topic: "Animal physiology",
    stem: "In birds and mammals, the four-chambered heart separates",
    ok: "oxygenated and deoxygenated blood in systemic and pulmonary circuits",
    bad: ["renal and hepatic flows only", "lymph and blood entirely", "arterial and venous plasma proteins"],
  },
  {
    topic: "Development",
    stem: "The three primary germ layers form during",
    ok: "gastrulation",
    bad: ["cleavage only", "fertilisation", "organogenesis without prior layering"],
  },
] as const;

const ZOOLOGY_STRETCH = [
  {
    topic: "Human phys",
    stem: "In heavy exercise, the **primary** acute compensations maintaining cerebral perfusion include",
    ok: "increased cardiac output and redistribution of blood flow",
    bad: [
      "complete shutdown of renal filtration only",
      "paralysis of baroreceptor input",
      "exclusive reliance on anaerobic brain metabolism only",
    ],
  },
  {
    topic: "Neural control",
    stem: "Long-term potentiation at many mammalian synapses is most closely tied to",
    ok: "activity-dependent strengthening of synaptic efficacy (often NMDA-receptor linked)",
    bad: [
      "permanent destruction of presynaptic terminals",
      "exclusive myelination of the same axon within minutes",
      "blockade of all voltage-gated Na⁺ channels as the main mechanism",
    ],
  },
  {
    topic: "Endocrinology",
    stem: "Chronic glucocorticoid excess can produce proximal muscle weakness partly because",
    ok: "protein catabolism and altered muscle maintenance outweigh anabolic signals",
    bad: [
      "ACTH completely stops all cortisol synthesis",
      "thyroid hormone is absent regardless of TSH",
      "PTH stops all bone remodelling permanently",
    ],
  },
  {
    topic: "Immunity",
    stem: "Class switching in B cells allows",
    ok: "the same V region to associate with different heavy-chain constant regions",
    bad: [
      "TCRs to acquire antibody idiotypes directly",
      "NK cells to produce specific memory without antigens",
      "complement C3 to rearrange V(D)J segments",
    ],
  },
  {
    topic: "Reproduction",
    stem: "Human capacitation of sperm in the female tract mainly involves",
    ok: "biochemical maturation enabling zona pellucida penetration and fusion competence",
    bad: [
      "completion of meiosis II in the sperm head",
      "loss of all mitochondria before reaching oviduct",
      "irreversible tail loss prior to contact",
    ],
  },
  {
    topic: "Excretion",
    stem: "Renin release from juxtaglomerular cells is stimulated strongly when",
    ok: "renal perfusion pressure to the afferent arteriole falls",
    bad: [
      "systemic arterial pressure is acutely very high with baroreceptor firing",
      "tubular macula densa senses very high distal NaCl unnecessarily",
      "ADH is absent even with severe dehydration",
    ],
  },
  {
    topic: "Respiration",
    stem: "The Haldane effect describes how",
    ok: "deoxygenated Hb binds CO₂ as HCO₃⁻ chemistry shifts, aiding CO₂ transport",
    bad: [
      "O₂ dissociation is independent of blood pH",
      "CO₂ never binds to plasma proteins",
      "alveolar PO₂ has no effect on CO₂ loading",
    ],
  },
  {
    topic: "Biotech",
    stem: "RNA interference knocks down specific transcripts mainly by guiding",
    ok: "RISC-associated small RNAs to target complementary mRNA for degradation or blockade",
    bad: [
      "DNA methyltransferases to methylate exclusively histones",
      "ribosomes to skip every third codon globally",
      "telomerase to lengthen all mRNA poly-A tails",
    ],
  },
  {
    topic: "Health/disease",
    stem: "Type 1 diabetes mellitus in classic presentation is best characterised by",
    ok: "immune-mediated destruction of pancreatic β cells and insulin dependence",
    bad: [
      "primary insulin resistance without β-cell loss",
      "excess glucagon suppression only",
      "painless chronic pancreatitis with stones as the sole cause",
    ],
  },
  {
    topic: "Structural organisation",
    stem: "Compact bone strength under bending reflects especially",
    ok: "lamellar collagen–hydroxyapatite arrangement in osteons",
    bad: [
      "random collagen only without mineral",
      "elastic cartilage matrix identical to auricle cartilage",
      "osteoclast-only trabeculae without osteoblast activity ever",
    ],
  },
  {
    topic: "Animal diversity",
    stem: "Chordate synapomorphies at the pharyngeal stage classically include",
    ok: "notochord, dorsal hollow nerve cord and paired pharyngeal slits/clefts (post-anal tail)",
    bad: [
      "jointed appendages and chitinous exoskeleton",
      "radial symmetry and diploblastic germ layers only",
      "open circulatory system with hemolymph in all groups",
    ],
  },
  {
    topic: "Human phys",
    stem: "The Frank–Starling mechanism links ventricular end-diastolic volume to",
    ok: "greater myocardial stretch producing a stronger following contraction",
    bad: [
      "faster SA-node automaticity independent of stretch",
      "purely neural stimulation without any length–tension relation",
      "arteriolar vasoconstriction as the only controller of stroke volume",
    ],
  },
] as const;

function botanyStretchQ(seed: number): RawQ {
  const k = seed * 23 + 7;
  const fact = BOTANY_STRETCH[k % BOTANY_STRETCH.length];
  return mcq({
    subject: "Botany",
    topic: fact.topic,
    stem: fact.stem,
    correctText: fact.ok,
    distractors: [fact.bad[0], fact.bad[1], fact.bad[2]] as [
      string,
      string,
      string,
    ],
    flavor: "predicted",
    seed: k + 4000,
  });
}

function zoologyStretchQ(seed: number): RawQ {
  const k = seed * 29 + 13;
  const fact = ZOOLOGY_STRETCH[k % ZOOLOGY_STRETCH.length];
  return mcq({
    subject: "Zoology",
    topic: fact.topic,
    stem: fact.stem,
    correctText: fact.ok,
    distractors: [fact.bad[0], fact.bad[1], fact.bad[2]] as [
      string,
      string,
      string,
    ],
    flavor: "predicted",
    seed: k + 4000,
  });
}

function botanyQ(seed: number, section: ExamSection): RawQ {
  if (section === "B") {
    return botanyStretchQ(seed + 601);
  }
  const k = seed * 23 + 7;
  const fact = BOTANY_FACTS[k % BOTANY_FACTS.length];
  const flavor = (["pyq-pattern", "ncert-heavy", "predicted"] as const)[
    k % 3
  ];
  const stem =
    seed % 5 === 0
      ? `${fact.stem} (NEET-style stem; paper variation ${(k % 9) + 1})`
      : fact.stem;
  return mcq({
    subject: "Botany",
    topic: fact.topic,
    stem,
    correctText: fact.ok,
    distractors: [fact.bad[0], fact.bad[1], fact.bad[2]] as [
      string,
      string,
      string,
    ],
    flavor,
    seed: k,
  });
}

function zoologyQ(seed: number, section: ExamSection): RawQ {
  if (section === "B") {
    return zoologyStretchQ(seed + 701);
  }
  const k = seed * 29 + 13;
  const fact = ZOOLOGY_FACTS[k % ZOOLOGY_FACTS.length];
  const flavor = (["pyq-pattern", "ncert-heavy", "predicted"] as const)[
    k % 3
  ];
  const stem =
    seed % 6 === 0
      ? `${fact.stem} (practice variant ${(k % 8) + 1})`
      : fact.stem;
  return mcq({
    subject: "Zoology",
    topic: fact.topic,
    stem,
    correctText: fact.ok,
    distractors: [fact.bad[0], fact.bad[1], fact.bad[2]] as [
      string,
      string,
      string,
    ],
    flavor,
    seed: k,
  });
}

/**
 * Forward-looking “paper personalities”: how item banks often tilt when authors
 * mix PYQ echoes, NCERT scans, and templated numeric variants—similar to teams
 * using large stem libraries plus AI-assisted variation.
 */
const PAPER_LENSES = [
  "NCERT definition sweep with near-miss distractors",
  "Numeric skins on kinematics, gases & optics classics",
  "Organic reagents, mechanisms & name-reaction density",
  "Human physiology integration & lab-readout style stems",
  "Genetics, plant phys & modern biology crossovers",
  "Modern physics, photons & semiconductor fact mix",
  "Thermo + kinetics + equilibrium reasoning cluster",
  "Ecology, evolution & applied biodiversity vignettes",
  "Cell cycles, enzymes & molecular pathway recall",
  "Electrostatics, circuits & power word problems",
  "Periodic properties, bonding & coordination trivia",
  "Reproductive health & exam-style biotech framing",
  "Wave optics, interference & diffraction literacy",
  "Surface chemistry, solids & extractive metallurgy",
  "Animal diversity & comparative anatomy contrast items",
  "Rotation, COM, work–energy & collision estimates",
  "Electrochemistry, redox & titration numeracy",
  "Biotech tools, enzymes & exam-grade application stems",
  "Neural, endocrine & homeostasis cross-link MCQs",
  "Atoms, nuclei & order-of-magnitude estimate drills",
  "Ionic equilibrium, buffers & salt hydrolysis traps",
  "Photosynthesis, plant hormones & stress physiology",
  "Magnetism, EMI & alternating-current intuition",
  "Hydrocarbons, fuels & environment-context organics",
  "Systemic physiology—transport & gas exchange focus",
  "Ray optics, instruments & apparent depth tricks",
  "d- and f-block chemistry & coordination spectra",
  "Microbes, immunity & public-health style items",
  "Fluids, calorimetry & heat-engine literacy",
  "Mixed high-load mock—second-slot difficulty calibration",
] as const;

/** Full mocks bundled in the app (= PAPER_LENSES.length). */
export const EXAM_PAPER_COUNT = PAPER_LENSES.length;

function withSection(q: RawQ, section: ExamSection): Omit<ExamQuestion, "id"> {
  return { ...q, section };
}

function seriesPhyChem(
  kind: "physics" | "chemistry",
  paperIdx: number,
  countA: number,
  countB: number,
  salt: number,
): Omit<ExamQuestion, "id">[] {
  const offset = paperIdx * 97 + salt;
  const gen = kind === "physics" ? physicsQ : chemistryQ;
  const out: Omit<ExamQuestion, "id">[] = [];
  for (let i = 0; i < countA; i++) {
    out.push(withSection(gen(offset + i * 3, "A"), "A"));
  }
  for (let i = 0; i < countB; i++) {
    out.push(withSection(gen(offset + 500 + i * 3, "B"), "B"));
  }
  return out;
}

function seriesBio(
  kind: "botany" | "zoology",
  paperIdx: number,
  countA: number,
  countB: number,
  salt: number,
): Omit<ExamQuestion, "id">[] {
  const offset = paperIdx * 97 + salt;
  const gen = kind === "botany" ? botanyQ : zoologyQ;
  const out: Omit<ExamQuestion, "id">[] = [];
  for (let i = 0; i < countA; i++) {
    out.push(withSection(gen(offset + i * 5 + 1, "A"), "A"));
  }
  for (let i = 0; i < countB; i++) {
    out.push(withSection(gen(offset + 600 + i * 5 + 1, "B"), "B"));
  }
  return out;
}

export function buildExamPapers(): ExamPaper[] {
  const baseBlurb =
    "180 MCQs: each subject has Section A (35) + Section B (10)—45 per subject × 4 = 180, matching the live exam load (35 compulsory + 10 attempted from the Section B pool). On the real paper, Section B shows 15 items and you answer any 10; this mock uses 10 B questions per subject for a true 180-question countdown. Section B items skew toward multi-step numerics, integrated stems, and tighter distractors (closer to recent high-load papers). 3-hour timer. +4 / −1 / 0; max 720. Original practice items, not NTA reproductions.";

  return Array.from({ length: EXAM_PAPER_COUNT }, (_, paperIdx) => {
    const slug = `paper-${String(paperIdx + 1).padStart(2, "0")}`;
    const qs: Omit<ExamQuestion, "id">[] = [
      ...seriesPhyChem("physics", paperIdx, 35, 10, 11),
      ...seriesPhyChem("chemistry", paperIdx, 35, 10, 23),
      ...seriesBio("botany", paperIdx, 35, 10, 31),
      ...seriesBio("zoology", paperIdx, 35, 10, 41),
    ];

    const questions: ExamQuestion[] = qs.map((q, qi) => ({
      ...q,
      id: `${slug}-q${qi + 1}`,
    }));

    const lens = PAPER_LENSES[paperIdx];

    return {
      slug,
      title: `Full-syllabus NEET mock ${paperIdx + 1} · ${lens}`,
      blurb: `${baseBlurb}

Volume ${paperIdx + 1} lens: ${lens}. Stems are procedurally varied practice items aimed at high-probability NEET topics, common numeric templates, and bank-style distractors—useful when real papers blend human review with large automated item pools.`,
      durationMinutes: 180,
      questions,
    };
  });
}
