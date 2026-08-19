import { splitByKind, teamLabel } from '../lib/teams';

/**
 * Opções de equipe para um <select>, separando supervisores das equipes.
 * Supervisores guardam equipamento igual às equipes — só ficam num grupo
 * próprio para a lista não virar uma coisa só.
 */
export default function TeamOptions({ teams, disabledId }) {
  const { equipes, supervisores } = splitByKind(teams);
  const option = (t) => (
    <option key={t.id} value={t.id} disabled={disabledId === t.id}>{teamLabel(t)}</option>
  );
  return (
    <>
      {equipes.length > 0 && <optgroup label="Equipes">{equipes.map(option)}</optgroup>}
      {supervisores.length > 0 && <optgroup label="Supervisores">{supervisores.map(option)}</optgroup>}
    </>
  );
}
