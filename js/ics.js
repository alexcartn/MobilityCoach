// Rappel de re-test au format agenda (.ics) : la veille à 8 h et le jour même à 8 h.
// Une PWA sans serveur ne peut pas envoyer de notification quand elle est fermée : l'agenda du téléphone s'en charge.

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

export function retestIcs({ date, title, description }) {
  const day = new Date(`${date}T08:00:00`);
  const end = new Date(day.getTime() + 15 * 60000);
  const now = new Date();
  const utc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const esc = (t) => t.replace(/[\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Supple Leopard//Re-test//FR',
    'BEGIN:VEVENT',
    `UID:retest-${stamp(day)}@supple-leopard`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(day)}T080000`,
    `DTEND:${stamp(end)}T${pad(end.getHours())}${pad(end.getMinutes())}00`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title + ' demain')}`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
