import { EntryDetail } from "@/components/lancamentos/entry-detail";

export default function ContaAPagarDetalhePage({ params }: { params: { id: string } }) {
  return <EntryDetail entryId={params.id} type="despesa" />;
}
