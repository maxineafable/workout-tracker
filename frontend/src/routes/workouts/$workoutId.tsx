import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { meQuery } from '@/lib/query'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/workouts/$workoutId')({
  component: RouteComponent,
})

type Exercise = {
  id: number
  name: string
  sets: number
  reps: number
  weight: number
  weightUnit: number
  note: string | null
}

type Workout = {
  id: number
  title: string
  date: string
  note: string | null
  exercises: Exercise[]
}

const weightUnitLabels: Record<number, string> = {
  0: 'kg',
  1: 'lb',
}

function RouteComponent() {
  const { workoutId } = Route.useParams()

  const me = useQuery(meQuery)

  const workoutQuery = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/${workoutId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Error fetching workout')
      }

      return res.json() as Promise<Workout>
    },
  })

  if (me.isPending) return <div className="">loading...</div>
  if (!me.data) return <Navigate to='/login' />

  if (workoutQuery.isPending) {
    return <div className="p-6 text-sm text-neutral-500">Loading workout...</div>
  }

  if (workoutQuery.isError || !workoutQuery.data) {
    return <div className="p-6 text-sm text-red-600">Unable to load workout.</div>
  }

  const workout = workoutQuery.data

  return (
    <main className="min-h-screen bg-neutral-50 pb-8">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-neutral-600">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-bold">Workout Detail</h1>
          </div>

          <Link
            to="/workouts/$workoutId/edit"
            params={{ workoutId: String(workout.id) }}
            className="text-xs font-medium text-neutral-600"
          >
            Edit
          </Link>
        </header>

        <div className="space-y-5 p-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-base font-bold text-neutral-900">
                {workout.title}
              </h1>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
              <CalendarDays size={16} />
              {formatDate(workout.date)}
            </div>
            {workout.note && (
              <div className="mt-3 border rounded-xl border-neutral-200 bg-neutral-50 p-2.5">
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  Note
                </p>
                <pre className="text-xs leading-relaxed text-neutral-800">
                  {workout.note}
                </pre>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-neutral-900">
                Exercises
              </h2>
              <span className="text-xs text-neutral-500">
                {workout.exercises.length}{' '}
                {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
              </span>
            </div>

            <div className="space-y-3">
              {workout.exercises.map((exercise, index) => (
                <article
                  key={exercise.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-semibold text-pink-800">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {exercise.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                      <p className="text-xs font-light text-neutral-500">Sets</p>
                      <p className="mt-0.5 text-xs font-bold text-neutral-900">
                        {exercise.sets}
                      </p>
                    </div>
                    <div className="border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                      <p className="text-xs font-light text-neutral-500">Reps</p>
                      <p className="mt-0.5 text-xs font-bold text-neutral-900">
                        {exercise.reps}
                      </p>
                    </div>
                    <div className="border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                      <p className="text-xs font-light text-neutral-500">Weight</p>
                      <p className="mt-0.5 text-xs font-bold text-neutral-900">
                        {exercise.weight}{' '}
                        {weightUnitLabels[exercise.weightUnit] ?? 'kg'}
                      </p>
                    </div>
                  </div>

                  {exercise.note && (
                    <p className="mt-2.5 text-[10px] leading-relaxed text-neutral-500">
                      {exercise.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}