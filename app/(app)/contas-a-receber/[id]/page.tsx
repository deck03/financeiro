import { EntryDetail } from "@/components/lancamentos/entry-detail";

export default function ContaAReceberDetalhePage({ params }: { params: { id: string } }) {
  return <EntryDetail entryId={params.id} type="receita" />;
}
