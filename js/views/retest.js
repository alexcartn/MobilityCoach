import { h, icon, toast, download } from '../ui.js';
import { TESTS } from '../data/tests.js';
import { loadAssessments, loadPlan, savePlan, pickTargetTests, totalMinutes, toDateKey, fromDateKey } from '../assessment.js';
import { loadSessions, dayKey } from '../sessions.js';
import { retestIcs } from '../ics.js';

const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export async function render(root) {
  root.classList.add('has-bar');
  const [assessments, plan, sessions] = await Promise.all([loadAssessments(), loadPlan(), loadSessions()]);
  const last = assessments.at(-1);
  if (!last) { location.hash = '#/bilan'; return; }

  const today = startOfDay(new Date());
  const doneDays = new Set(sessions.map((s) => dayKey(new Date(s.at))));
  const cadence0 = plan?.cadence ?? 4;
  let date;
  if (plan?.date) date = plan.date;
  else {
    const d = new Date(last.at);
    d.setDate(d.getDate() + cadence0 * 7);
    date = toDateKey(d < today ? new Date(today.getTime() + 86400000) : d);
  }
  const state = { type: plan?.type ?? 'target', date, cadence: cadence0, remind: plan?.remind ?? true };
  let view = startOfDay(fromDateKey(state.date));
  view.setDate(1);

  const targetIds = pickTargetTests(last.scores);
  const typeDefs = [
    { id: 'target', title: 'Re-test ciblé', sub: `${targetIds.length} tests sur tes priorités · ${totalMinutes(targetIds)} min` },
    { id: 'full', title: 'Bilan complet', sub: `${TESTS.length} tests, toutes les zones · ${totalMinutes(TESTS.map((t) => t.id))} min` },
  ];

  const typesBox = h('div', { class: 'section', role: 'radiogroup', 'aria-label': 'Type de re-test', style: 'gap:10px' });
  const calBox = h('div', { class: 'section', style: 'gap:12px' });
  const cadBox = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Fréquence des re-tests' });
  const remindBox = h('div');
  const cta = h('button', { type: 'button', class: 'btn dark grow' });

  function paintTypes() {
    typesBox.replaceChildren(...typeDefs.map((t) =>
      h('button', {
        type: 'button', class: 'opt', role: 'radio', 'aria-checked': String(state.type === t.id),
        onClick: () => { state.type = t.id; paintTypes(); },
      }, h('span', { class: 'txt' }, h('b', null, t.title), h('span', null, t.sub)), h('span', { class: 'radio' }))));
  }

  function paintCal() {
    const y = view.getFullYear();
    const m = view.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7; // semaine commençant le lundi
    const count = new Date(y, m + 1, 0).getDate();
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();
    const days = [];
    for (let n = 1; n <= count; n++) {
      const d = new Date(y, m, n);
      const key = toDateKey(d);
      const past = d < today;
      const isToday = d.getTime() === today.getTime();
      const done = doneDays.has(key);
      days.push(h('button', {
        type: 'button', disabled: past, 'aria-pressed': String(state.date === key),
        'aria-label': `${fmtLong.format(d)}${done ? ', séance faite' : ''}`,
        class: [isToday ? 'today' : '', done ? 'done' : ''].join(' ').trim() || null,
        onClick: () => { state.date = key; paintCal(); paintCta(); },
      }, String(n)));
    }
    calBox.replaceChildren(
      h('div', { class: 'card section', style: 'gap:12px', 'aria-labelledby': 'cal-t' },
        h('div', { class: 'cal-head' },
          h('h2', { id: 'cal-t', class: 'card-title' }, cap(fmtMonth.format(view))),
          h('div', { class: 'cal-nav' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mois précédent', disabled: isCurrentMonth, onClick: () => { view = new Date(y, m - 1, 1); paintCal(); } }, icon('chevronLeft', 18)),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mois suivant', onClick: () => { view = new Date(y, m + 1, 1); paintCal(); } }, icon('chevronRight', 18)),
          ),
        ),
        h('div', { class: 'cal-dow', 'aria-hidden': 'true' }, 'LMMJVSD'.split('').map((l) => h('span', null, l))),
        h('div', { class: 'cal', role: 'group', 'aria-label': 'Choisir une date' }, Array.from({ length: offset }, () => h('span')), days),
        h('div', { class: 'cal-legend' },
          h('span', null, h('i'), 'Re-test choisi'),
          h('span', null, h('i', { class: 't' }), 'Aujourd\'hui'),
          h('span', null, h('i', { class: 'd' }), 'Séance faite'),
        ),
      ),
    );
  }

  function paintCad() {
    cadBox.replaceChildren(...[2, 4, 6].map((w) =>
      h('button', { type: 'button', 'aria-pressed': String(state.cadence === w), onClick: () => { state.cadence = w; paintCad(); } }, `${w} semaines`)));
  }

  function paintRemind() {
    remindBox.replaceChildren(
      h('div', { class: 'switch-row' },
        h('span', { class: 'txt' }, h('b', { style: 'font-weight:650' }, 'Rappel dans mon agenda'), h('span', null, 'La veille et le jour même, à 8 h (fichier .ics)')),
        h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(state.remind), 'aria-label': 'Rappel dans mon agenda', onClick: () => { state.remind = !state.remind; paintRemind(); } }, h('span')),
      ),
    );
  }

  function paintCta() {
    cta.textContent = `Planifier le ${fmtLong.format(fromDateKey(state.date))}`;
  }

  cta.addEventListener('click', async () => {
    await savePlan({ date: state.date, type: state.type, cadence: state.cadence, remind: state.remind });
    if (state.remind) {
      const tests = state.type === 'full' ? TESTS.length : targetIds.length;
      download('re-test-mobilite.ics', retestIcs({
        date: state.date,
        title: 'Re-test de mobilité',
        description: `Ouvre Supple Leopard : ${tests} test${tests > 1 ? 's' : ''}, environ ${state.type === 'full' ? totalMinutes(TESTS.map((t) => t.id)) : totalMinutes(targetIds)} minutes.`,
      }), 'text/calendar');
      toast('Re-test planifié. Ouvre le fichier téléchargé pour l\'ajouter à ton agenda.', { duration: 6000 });
    } else {
      toast('Re-test planifié.');
    }
    location.hash = '#/progress';
  });

  root.append(
    h('div', { class: 'flow-head' },
      h('a', { class: 'round-link', href: '#/progress', 'aria-label': 'Retour' }, icon('chevronLeft')),
      h('h1', { class: 'page-title', style: 'font-size:26px' }, 'Planifier un re-test'),
    ),
    h('section', { class: 'section', 'aria-labelledby': 'type-t' }, h('h2', { id: 'type-t', class: 'section-title' }, 'Quel test ?'), typesBox),
    calBox,
    h('section', { class: 'section', 'aria-labelledby': 'rep-t' },
      h('h2', { id: 'rep-t', class: 'section-title' }, 'Ensuite, tous les…'),
      cadBox,
      h('p', { class: 'hint' }, 'Assez espacé pour voir un vrai changement, assez proche pour rester motivé.'),
    ),
    remindBox,
    h('p', { class: 'hint' }, 'Une application installée ne peut pas t\'envoyer de notification quand elle est fermée : c\'est l\'agenda de ton téléphone qui te prévient. Le re-test apparaît aussi dans Aujourd\'hui et dans Suivi.'),
    h('div', { class: 'bottom-bar' }, h('div', null,
      plan ? h('button', {
        type: 'button', class: 'btn',
        onClick: async () => { await savePlan(null); toast('Re-test retiré.'); location.hash = '#/progress'; },
      }, 'Retirer') : null,
      cta,
    )),
  );
  paintTypes();
  paintCal();
  paintCad();
  paintRemind();
  paintCta();
}
