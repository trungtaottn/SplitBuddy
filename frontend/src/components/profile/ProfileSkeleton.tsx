import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function ProfileSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6 mb-8">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                   <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                   <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
               <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
               <Skeleton className="h-20 w-full rounded-xl" />
               <Skeleton className="h-20 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           <Skeleton className="h-48 w-full rounded-xl" />
           <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
