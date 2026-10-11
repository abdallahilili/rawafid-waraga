import { useEffect, useState } from "react";
import { api } from "../services/api";

export interface Entreprise {
  nom: string;
  logo: string;
  afficherLogo: boolean;
  adresse: string;
  telephones: string[];
  email: string;
  nif: string;
  message: string;
  messageDevis: string;
  messageBL: string;
  messageFacture: string;
  devise: string;
}

const PAR_DEFAUT: Entreprise = {
  nom: "Papeterie & Imprimerie", logo: "", afficherLogo: true, adresse: "", telephones: [],
  email: "", nif: "", message: "", messageDevis: "", messageBL: "", messageFacture: "", devise: "MRU",
};

type Auditeur = (e: Entreprise) => void;

let cache: Entreprise | null = null;
let enCours: Promise<Entreprise> | null = null;
const auditeurs = new Set<Auditeur>();

/** Convertit les parametres du serveur (cle/valeur) en coordonnees d'entreprise. */
export function versEntreprise(data: Record<string, string>): Entreprise {
  return {
    nom: data.NOM_ENTREPRISE || PAR_DEFAUT.nom,
    logo: data.LOGO_ENTREPRISE || "",
    afficherLogo: data.AFFICHER_LOGO_DOCUMENTS !== "0",
    adresse: data.ADRESSE_ENTREPRISE || "",
    telephones: [data.TELEPHONE_ENTREPRISE, data.TELEPHONE_ENTREPRISE_2].filter(Boolean),
    email: data.EMAIL_ENTREPRISE || "",
    nif: data.NIF_ENTREPRISE || "",
    message: data.MESSAGE_RECU || "",
    messageDevis: data.MESSAGE_DEVIS || "",
    messageBL: data.MESSAGE_BL || "",
    messageFacture: data.MESSAGE_FACTURE || "",
    devise: data.DEVISE || PAR_DEFAUT.devise,
  };
}

/** Coordonnees de l'entreprise (parametres du serveur), mises en cache. */
export function chargerEntreprise(): Promise<Entreprise> {
  if (cache) return Promise.resolve(cache);
  enCours ??= api.get("/parametres/").then(({ data }) => {
    cache = versEntreprise(data);
    return cache;
  }).catch(() => PAR_DEFAUT).finally(() => { enCours = null; });
  return enCours;
}

/** A appeler apres l'enregistrement des parametres : met a jour toute l'interface. */
export function actualiserEntreprise(data: Record<string, string>) {
  cache = versEntreprise(data);
  auditeurs.forEach((a) => a(cache!));
}

export function useEntreprise() {
  const [entreprise, setEntreprise] = useState<Entreprise>(cache ?? PAR_DEFAUT);
  useEffect(() => {
    chargerEntreprise().then(setEntreprise);
    auditeurs.add(setEntreprise);
    return () => { auditeurs.delete(setEntreprise); };
  }, []);
  return entreprise;
}
