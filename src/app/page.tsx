import BloomCalendar from "@/components/BloomCalendar";
import { plants } from "@/data/plants";

export default function Home() {
  return (
    <main className="flex-1">
      <BloomCalendar plants={plants} />
    </main>
  );
}
