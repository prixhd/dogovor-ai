import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-14 sm:px-6" aria-busy="true" aria-label="Загрузка каталога">
      <Skeleton className="h-12 w-80" />
      <Skeleton className="mt-4 h-6 w-full max-w-xl" />
      <Skeleton className="mt-10 h-12 w-full rounded-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[300px] rounded-[22px]" />)}</div>
    </div>
  );
}
