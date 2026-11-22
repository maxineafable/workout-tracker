import Footer from '@/components/main/footer';
import { Button } from '@/components/ui/button';
import { meQuery } from '@/lib/query';
import { formatDate } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'

import {
  Plus,
  Search,
  ChevronRight,
  ArrowUpDown,
  Pencil,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute('/')({
  component: Index,
})

export interface Exercise {
  id: number;
  name: string;
  note: string | null;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: number;
}

export interface Workout {
  id: number;
  title: string;
  note: string | null;
  date: string;
  createdAt: string;
  exercises: Exercise[];
}

function Index() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const me = useQuery(meQuery)

  const workouts = useQuery<Workout[]>({
    queryKey: ['workouts'],
    enabled: !!me.data,
    queryFn: async () => {
      const res = await fetch('/api/workouts', {
        credentials: 'include',
      })

      if (!res.ok)
        throw new Error("failed to fetch workouts");

      return res.json() as Promise<Workout[]>
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    },
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.removeQueries({ queryKey: ['workouts'] })
      navigate({ to: '/login' })
    },
  })

  const deleteWorkout = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/workouts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok)
        throw new Error("Error delete workout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })
    }
  })

  if (me.isPending) return <div className="">loading...</div>
  if (!me.data) return <Navigate to='/login' />

  const workoutCount = workouts.data?.length

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="border-b border-neutral-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-pink-400 font-semibold text-pink-800">
                {me.data.email[0].toUpperCase()}
              </div>

              <div>
                <h1 className="text-xl font-bold leading-tight">Workouts</h1>
                <p className="text-xs text-neutral-600">{me.data.email}</p>
              </div>
            </div>

            <Button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              variant="outline"
              className="text-xs"
            >
              Log out
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <Search size={19} className="shrink-0 text-neutral-600" />
            <input
              type="text"
              placeholder="Search workout title (e.g. Chest, Legs)..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </div>
        </header>

        <main className="flex-1 space-y-6 p-5 pb-28">
          <Link
            to="/workouts/new"
            className="flex items-center gap-3 rounded-2xl bg-pink-400 p-4 transition hover:bg-pink-500"
          >
            <div className="flex size-10 shrink-0 items-center justify-center bg-white rounded-full">
              <Plus className='stroke-pink-400' size={18} />
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-white">Start New Workout</h2>
              <p className="text-xs text-pink-200">
                Create an empty session
              </p>
            </div>

            <ChevronRight className='stroke-white' size={18} />
          </Link>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Previous Workouts</h2>
                <p className="text-xs text-neutral-600">
                  Showing {workoutCount} sessions sorted by latest
                </p>
              </div>

              <button className="flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600">
                <ArrowUpDown size={16} />
                Latest
              </button>
            </div>

            <div className="space-y-3">
              {workouts.data?.map((workout) => (
                <div
                  key={workout.id}
                  className="rounded-2xl border border-neutral-200 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-bold">{workout.title}</h3>
                      <p className="text-xs text-neutral-600">{formatDate(workout.date)}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <Link
                        to="/workouts/$workoutId/edit"
                        params={{ workoutId: String(workout.id) }}
                        className="text-neutral-500 hover:text-pink-500"
                        title="Edit workout"
                      >
                        <Pencil size={18} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => deleteWorkout.mutate(workout.id)}
                        className="text-neutral-500 hover:text-red-500"
                        title="Delete workout"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50/50 px-3">
                    {workout.exercises.map((exercise, index) => (
                      <div
                        key={exercise.name}
                        className={`flex items-center justify-between gap-2 py-2.5 text-sm ${index !== workout.exercises.length - 1
                          ? "border-b border-neutral-200"
                          : ""
                          }`}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {exercise.name}
                        </span>

                        <span className="shrink-0 font-mono text-xs text-neutral-600">
                          {exercise.sets} sets · {exercise.weight} {exercise.weightUnit === 0 ? "kg" : "lb"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-neutral-600">
                      {workout.exercises.length} exercises
                    </span>

                    <Link
                      to="/workouts/$workoutId"
                      params={{ workoutId: String(workout.id) }}
                      className="font-semibold text-pink-800 hover:text-pink-900"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  )
}