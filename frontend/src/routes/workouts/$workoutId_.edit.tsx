import { meQuery } from '@/lib/query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import Form, { type Workout } from '@/components/workouts/form';

export const Route = createFileRoute('/workouts/$workoutId_/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { workoutId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const me = useQuery(meQuery);

  const [workout, setWorkout] = useState<Workout>({
    title: '',
    date: '',
    note: null,
    exercises: [],
  });

  const workoutQuery = useQuery({
    queryKey: ['workout', workoutId],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/workouts/${workoutId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Error fetching workout');
      }

      return res.json() as Promise<Workout>;
    },
  });

  useEffect(() => {
    if (workoutQuery.data) {
      setWorkout(workoutQuery.data);
    }
  }, [workoutQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: workout.title,
        note: workout.note,
        date: workout.date,
        exercises: workout.exercises.map(e => ({
          ...e,
          id: e.id > 0 ? e.id : undefined, // new ones get no id
        })),
      };

      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Error updating workout');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });

      navigate({ to: '/' });
    },
  });

  const nextTempId = useRef(-1);

  const removeExercise = (id: number) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((exercise) => exercise.id !== id),
    }));
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
    navigate({ to: '/' })
  };

  if (me.isPending || workoutQuery.isPending) {
    return <div>Loading...</div>;
  }

  if (!me.data) {
    return <Navigate to="/login" />;
  }

  if (workoutQuery.isError) {
    return <div>Unable to load workout.</div>;
  }

  return (
    <Form
      handleSubmit={handleSubmit}
      setWorkout={setWorkout}
      workout={workout}
      nextTempId={nextTempId}
      removeExercise={removeExercise}
      isEdit
    />
  );
}