export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "Nu trebuie să fii grozav ca să începi, dar trebuie să începi ca să fii grozav.", author: "Zig Ziglar" },
  { text: "Disciplina este puntea dintre obiective și realizări.", author: "Jim Rohn" },
  { text: "Suntem ceea ce facem în mod repetat.", author: "Will Durant" },
  { text: "Fă azi ce alții nu vor, ca mâine să ai ce alții nu pot.", author: "Jerry Rice" },
  { text: "Un pas mic în fiecare zi e tot un drum.", author: "Proverb" },
  { text: "Cel mai bun moment să plantezi un copac a fost acum 20 de ani. Al doilea cel mai bun e acum.", author: "Proverb chinezesc" },
  { text: "Motivația te pornește. Obiceiul te ține în mișcare.", author: "Jim Ryun" },
  { text: "Nu număra zilele. Fă zilele să conteze.", author: "Muhammad Ali" },
  { text: "Calmul este o superputere.", author: "Anonim" },
  { text: "Ai putere asupra minții tale, nu asupra evenimentelor. Înțelege asta și vei găsi puterea.", author: "Marcus Aurelius" },
  { text: "Suferim mai des în imaginație decât în realitate.", author: "Seneca" },
  { text: "Progres, nu perfecțiune.", author: "Anonim" },
  { text: "Ceea ce măsori, poți îmbunătăți.", author: "Peter Drucker" },
  { text: "Energia urmează atenția.", author: "Anonim" },
  { text: "Fii mai bun decât ai fost ieri. Atât.", author: "Anonim" },
  { text: "Succesul este suma unor mici eforturi repetate zi de zi.", author: "Robert Collier" },
  { text: "Corpul obține ce mintea crede.", author: "Anonim" },
  { text: "Simplitatea este sofisticarea supremă.", author: "Leonardo da Vinci" },
  { text: "Nu aștepta. Momentul nu va fi niciodată perfect.", author: "Napoleon Hill" },
  { text: "Odihna face parte din antrenament.", author: "Anonim" },
  { text: "Fericirea nu e ceva gata făcut. Vine din propriile acțiuni.", author: "Dalai Lama" },
  { text: "Concentrează-te pe ce poți controla.", author: "Epictet" },
  { text: "Cine are un «de ce» poate îndura aproape orice «cum».", author: "Friedrich Nietzsche" },
  { text: "Fă un lucru bine, apoi încă unul.", author: "Anonim" },
  { text: "Viitorul depinde de ceea ce faci astăzi.", author: "Mahatma Gandhi" },
  { text: "Curajul nu e lipsa fricii, ci decizia că altceva e mai important.", author: "Ambrose Redmoon" },
  { text: "Tot ce îți dorești se află de cealaltă parte a fricii.", author: "George Addair" },
  { text: "Ziua de azi e o pagină albă. Scrie ceva bun pe ea.", author: "Anonim" },
  { text: "Fii răbdător cu tine. Nimic din natură nu înflorește tot anul.", author: "Anonim" },
  { text: "Calitatea vieții tale e dată de calitatea obiceiurilor tale.", author: "James Clear" },
  { text: "Fiecare acțiune e un vot pentru omul care vrei să devii.", author: "James Clear" },
];

// Același citat toată ziua, altul a doua zi.
export function quoteOfTheDay(date: Date): Quote {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[(dayOfYear + date.getFullYear()) % QUOTES.length];
}
