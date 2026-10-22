import { redirect } from "next/navigation";

// Todo colaborador tiene objetivos individuales, así que "Mis objetivos" es
// el home natural del dashboard. Cuando existan más módulos (fase 4 en
// adelante) esto puede convertirse en un selector según el rol.
export default function HomePage() {
  redirect("/mis-objetivos");
}
