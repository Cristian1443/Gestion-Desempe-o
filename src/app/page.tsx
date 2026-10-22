import { redirect } from "next/navigation";

// "Inicio" dice qué le toca hacer a cada persona según su rol: es la entrada de
// la app.
export default function HomePage() {
  redirect("/inicio");
}
