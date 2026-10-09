import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../composants/Notifications";
import { useConfirmation } from "../../composants/Confirmation";
import { Modale } from "../../composants/Modale";
import type { Groupe, ModulePermissions } from "../../types";

interface FormGroupe {
  id?: number;
  nom: string;
  description: string;
  etat: boolean;
  fonctionnalites: string[];
}

const FORM_VIDE: FormGroupe = { nom: "", description: "", etat: true, fonctionnalites: [] };

export function PageGroupes() {
  const { autorise } = useAuth();
  const peutGerer = autorise("groupes.gerer");
  const { notifierSucces, notifierErreur } = useNotifications();
  const { demanderConfirmation } = useConfirmation();

  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [catalogue, setCatalogue] = useState<ModulePermissions[]>([]);
  const [form, setForm] = useState<FormGroupe | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function recharger() {
    const { data } = await api.get("/utilisateurs/groupes/");
    setGroupes(data);
  }

  useEffect(() => {
    recharger().catch((e) => notifierErreur(messageErreur(e)));
    api.get("/utilisateurs/permissions/").then(({ data }) => setCatalogue(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function basculer(code: string) {
    setForm((f) => f && ({
      ...f,
      permissions: f.fonctionnalites.includes(code) ? f.fonctionnalites.filter((c) => c !== code) : [...f.fonctionnalites, code],
    }));
  }

  function basculerModule(module: ModulePermissions, coche: boolean) {
    const codes = module.permissions.map((p) => p.code);
    setForm((f) => f && ({
      ...f,
      fonctionnalites: coche
        ? Array.from(new Set([...f.fonctionnalites, ...codes]))
        : f.fonctionnalites.filter((c) => !codes.includes(c)),
    }));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setEnvoi(true);
    try {
      const corps = { nom: form.nom, description: form.description, etat: form.etat, fonctionnalites: form.fonctionnalites };
      if (form.id) await api.patch(`/utilisateurs/groupes/${form.id}/`, corps);
      else await api.post("/utilisateurs/groupes/", corps);
      notifierSucces("Groupe enregistre.");
      setForm(null);
      await recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(g: Groupe) {
    const ok = await demanderConfirmation({
      titre: "Supprimer le groupe",
      message: `Supprimer le groupe « ${g.nom} » ?`,
    });
    if (!ok) return;
    try {
      await api.delete(`/utilisateurs/groupes/${g.id}/`);
      notifierSucces("Groupe supprime.");
      await recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-texte">Groupes et permissions</h1>
        {peutGerer && (
          <button onClick={() => setForm({ ...FORM_VIDE })} className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce">
            <Plus size={16} /> Nouveau groupe
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groupes.map((g) => (
          <div key={g.id} className="rounded-md border border-bordure bg-fond-carte p-4 shadow-carte">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-texte">{g.nom}</h2>
                <p className="text-xs text-texte-attenue">{g.description || "Sans description"}</p>
              </div>
              {peutGerer && (
                <div className="flex gap-2">
                  <button onClick={() => setForm({ id: g.id, nom: g.nom, description: g.description, etat: g.etat, fonctionnalites: g.fonctionnalites })} className="text-texte-attenue hover:text-entete"><Pencil size={15} /></button>
                  <button onClick={() => supprimer(g)} className="text-texte-attenue hover:text-accent-rouge"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-texte">
              {g.etat ? `${g.fonctionnalites.length} fonctionnalite(s)` : "Groupe inactif"}
              <span className="text-texte-attenue"> · {g.nombre_utilisateurs} utilisateur(s)</span>
            </p>
          </div>
        ))}
      </div>

      <Modale titre={form?.id ? "Modifier le groupe" : "Nouveau groupe"} ouverte={!!form} onFermer={() => setForm(null)} largeur="max-w-3xl">
        {form && (
          <form onSubmit={enregistrer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom <span className="text-accent-rouge">*</span></label>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.etat} onChange={(e) => setForm({ ...form, etat: e.target.checked })} />
              Groupe actif
            </label>

            {(
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {catalogue.map((m) => {
                  const tout = m.permissions.every((p) => form.fonctionnalites.includes(p.code));
                  return (
                    <fieldset key={m.module} className="rounded border border-bordure p-3">
                      <legend className="px-1 text-sm font-semibold text-texte">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={tout} onChange={(e) => basculerModule(m, e.target.checked)} />
                          {m.libelle}
                        </label>
                      </legend>
                      <div className="space-y-1">
                        {m.permissions.map((p) => (
                          <label key={p.code} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-0.5" checked={form.fonctionnalites.includes(p.code)} onChange={() => basculer(p.code)} />
                            {p.libelle}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
              <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Enregistrer</button>
            </div>
          </form>
        )}
      </Modale>
    </div>
  );
}
