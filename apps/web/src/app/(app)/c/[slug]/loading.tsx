import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[440px_1fr]" aria-busy="true" aria-label="Загрузка конструктора">
      <div className="flex flex-col gap-4"><Skeleton className="h-56" /><Skeleton className="h-96" /></div>
      <div className="rounded-3xl bg-surface-2/60 p-8"><Skeleton className="mx-auto h-[800px] max-w-[760px] !bg-white" /></div>
    </div>
  );
}
