"use client"
import { useParams } from "next/navigation"
export default function DiagnosticResumePage() {
  const { id } = useParams()
  return (
    <div style={{padding:"40px"}}>
      <h1>Diagnóstico retomado</h1>
      <p>ID do diagnóstico:</p>
      <strong>{id}</strong>
    </div>
  )
}
