import { describe, expect, it } from "vitest";
import usages from "@/assets/data/usages.json";
import type { ProductUsage } from "@/lib/data-context";
import {
  createEphyCultureMatcher,
  getEphyCultureSearchSet,
} from "@/lib/culture-usage-scope";

const matcher = createEphyCultureMatcher("Fraisier");
const bundledUsages = usages as Record<string, ProductUsage[]>;

describe("portée réglementaire des usages E-Phy du fraisier", () => {
  it("prépare les portées CL et Traitements généraux, jamais CF ni Petits fruits", () => {
    expect([...getEphyCultureSearchSet("Fraisier")]).toEqual([
      "Fraisier",
      "Cultures légumières",
      "Traitements généraux",
    ]);
  });

  it.each([
    "Blé",
    "Tomate - Aubergine",
    "Pomme de terre",
    "Pommier",
    "Framboisier",
    "Vigne",
  ])("ne généralise pas la portée Traitements généraux à %s", (culture) => {
    expect(getEphyCultureSearchSet(culture)).not.toContain(
      "Traitements généraux",
    );
    expect(
      createEphyCultureMatcher(culture).matches({
        culture: "Traitements généraux",
      }),
    ).toBe(false);
  });

  it.each(["Fraisier", "Cultures légumières"])(
    "accepte la portée %s sans restriction de culture",
    (culture) => expect(matcher.matches({ culture })).toBe(true),
  );

  it.each([
    "Petits fruits",
    "Petit fruits",
    "Cultures fruitières",
    "Framboisier",
  ])(
    "ne remplace jamais la portée %s par Fraisier, même si la condition mentionne ce mot",
    (culture) =>
      expect(matcher.matches({ culture, condition: "Fraisier" })).toBe(false),
  );

  it.each([
    "Toutes cultures sauf fraisier.",
    "Cultures légumières à l'exclusion des fraisiers.",
    "Ne pas appliquer sur fraisier.",
    "Ne pas utiliser sur les fraisiers.",
    "Uniquement sur vigne.",
    "Uniquement sur 'tomate', 'poivron' et 'concombre'.",
    "Pomme de terre: - En plein sur la parcelle traitée.",
    "Arbres fruitiers et vigne: uniquement en inter-rang.",
    "Intervalle minimum entre les applications : 5 jours.",
  ])("rejette une restriction incompatible : %s", (condition) => {
    expect(
      matcher.matches({ culture: "Traitements généraux", condition }),
    ).toBe(false);
  });

  it.each([
    "Uniquement sur fraisier. Intervalle minimum : 14 jours.",
    "Uniquement sur cultures légumières.",
    "Fraise: - Culture sous abri ou en plein champ.",
    "Uniquement sur 'vigne', fraisier, framboisier. Également sous abri sur fraisier.",
    "Uniquement sur agrumes. Uniquement autorisé sur fraisier sous abri.",
  ])(
    "conserve la condition compatible sans en changer le contenu : %s",
    (condition) => {
      const usage = { culture: "Traitements généraux", condition };
      expect(matcher.matches(usage)).toBe(true);
      expect(usage.condition).toBe(condition);
    },
  );

  it("conserve pour NATUR’NET sa ligne Cultures légumières à deux applications, pas les lignes fruitières à quatre", () => {
    const selected = bundledUsages["2140121"].filter(matcher.matches);
    expect(
      selected.find((row) => row.culture === "Cultures légumières")
        ?.nb_max_appli,
    ).toBe("2");
    expect(
      selected.some((row) =>
        ["Petits fruits", "Cultures fruitières"].includes(row.culture),
      ),
    ).toBe(false);
  });

  it("n'assimile pas le désherbage général de BELOUKHA / EUDICATCH SEVIGNEA à une homologation Fraisier", () => {
    const selected = bundledUsages["2140255"].filter(matcher.matches);
    expect(selected.some((row) => row.culture === "Traitements généraux")).toBe(
      false,
    );
    expect(selected.some((row) => row.culture === "Cultures fruitières")).toBe(
      false,
    );
  });

  it("ne perd pas CIDELY TOP pour ses conditions hors sol ou pleine terre", () => {
    const rows = bundledUsages["2140201"].filter(
      (row) => row.culture === "Fraisier",
    );
    expect(rows).toHaveLength(4);
    expect(rows.filter(matcher.matches)).toEqual(rows);
  });

  it("ne confond pas la cible Spodoptera littoralis de LITTOVIR avec une culture", () => {
    const row = bundledUsages["2160706"].find(
      (row) => row.culture === "Fraisier",
    )!;
    expect(row.condition).toContain("Spodoptera littoralis");
    expect(matcher.matches(row)).toBe(true);
  });

  it("exclut les trois lignes générales de TRICO limitées à d'autres cultures, même sans le mot sur", () => {
    expect(bundledUsages["2120057"].filter(matcher.matches)).toEqual([]);
  });

  it("exclut les lignes légumières de CENTIUM 36 CS limitées à pastèque/courge/courgette", () => {
    expect(bundledUsages["2000299"].filter(matcher.matches)).toEqual([]);
  });
});
