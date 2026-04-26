import { createFileRoute } from "@tanstack/react-router"
import { InvokeSequence } from "../components/altar/InvokeSequence"

export const Route = createFileRoute("/")({ component: AltarPage })

function AltarPage() {
  return <InvokeSequence />
}
