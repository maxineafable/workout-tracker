using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Project.Features.Workouts.DTO;
using Project.Models;

namespace Project.Features.Workouts;

public static class WorkoutEndpoints
{
	public static IEndpointRouteBuilder MapWorkoutEndpoints(this IEndpointRouteBuilder app)
	{
		var group = app.MapGroup("/api/workouts").RequireAuthorization();

		group.MapGet("/", GetAllWorkouts);
		group.MapGet("/{id}", GetWorkout);
		group.MapPost("/", CreateWorkout);
		group.MapPut("/{id}", UpdateWorkout);
		group.MapDelete("/{id}", DeleteWorkout);

		return app;
	}

	private static string? GetUserId(ClaimsPrincipal p) => p.FindFirstValue(ClaimTypes.NameIdentifier);

	public static async Task<IResult> GetAllWorkouts(ClaimsPrincipal principal, ProjectDb db, string? search)
	{
		var userId = GetUserId(principal);

		var query = db.Workouts
		.AsNoTracking()
		.Where(w => w.UserId == userId);

		if (!string.IsNullOrWhiteSpace(search))
		{
			var term = search.Trim();
			query = query.Where(w =>
				EF.Functions.ILike(w.Title, $"%{term}%") ||
				w.Exercises.Any(e => EF.Functions.ILike(e.Name, $"%{term}%"))
			);
		}

		return TypedResults.Ok(await query
			.OrderByDescending(w => w.Date)
			.ThenByDescending(w => w.Id)
			.Include(w => w.Exercises)
			.Select(w => new WorkoutResponse(w))
			.ToArrayAsync());
	}

	public static async Task<IResult> GetWorkout(int id, ClaimsPrincipal principal, ProjectDb db)
	{
		var userId = GetUserId(principal);

		var workout = await db.Workouts
			.AsNoTracking()
			.Include(w => w.Exercises)
			.FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

		return workout is not null
			? TypedResults.Ok(new WorkoutResponse(workout))
			: TypedResults.NotFound();
	}

	public static async Task<IResult> CreateWorkout(ClaimsPrincipal principal, CreateWorkoutRequest request, ProjectDb db)
	{
		var userId = GetUserId(principal);

		if (userId is null)
			return TypedResults.Unauthorized();

		var workout = new Workout
		{
			Title = request.Title,
			Note = request.Note,
			Date = request.Date,
			UserId = userId,
			Exercises = request.Exercises.Select(e => new Exercise
			{
				Name = e.Name,
				Sets = e.Sets,
				Reps = e.Reps,
				Weight = e.Weight,
				WeightUnit = e.WeightUnit,
				Note = e.Note,
			}).ToList()
		};

		db.Workouts.Add(workout);
		await db.SaveChangesAsync();

		return TypedResults.Created($"/workouts/{workout.Id}", new WorkoutResponse(workout));
	}

	public static async Task<IResult> UpdateWorkout(int id, ClaimsPrincipal principal, UpdateWorkoutRequest request, ProjectDb db)
	{
		var userId = GetUserId(principal);

		var workout = await db.Workouts
			.Include(w => w.Exercises)
			.FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

		if (workout is null)
			return TypedResults.NotFound();

		workout.Title = request.Title;
		workout.Note = request.Note;
		workout.Date = request.Date;

		var existing = workout.Exercises.ToDictionary(e => e.Id);

		if (request.Exercises.Any(e => e.Id is int exId && !existing.ContainsKey(exId)))
			return TypedResults.BadRequest("Unknown exercise id.");

		var keepIds = request.Exercises
			.Where(e => e.Id.HasValue)
			.Select(e => e.Id!.Value)
			.ToHashSet();

		db.Exercises.RemoveRange(workout.Exercises.Where(e => !keepIds.Contains(e.Id)));

		foreach (var dto in request.Exercises)
		{
			if (dto.Id is int exId)
			{
				var exercise = existing[exId];
				exercise.Name = dto.Name;
				exercise.Note = dto.Note;
				exercise.Sets = dto.Sets;
				exercise.Reps = dto.Reps;
				exercise.Weight = dto.Weight;
				exercise.WeightUnit = dto.WeightUnit;
			}
			else
			{
				// added
				workout.Exercises.Add(new Exercise
				{
					Name = dto.Name,
					Note = dto.Note,
					Sets = dto.Sets,
					Reps = dto.Reps,
					Weight = dto.Weight,
					WeightUnit = dto.WeightUnit,
				});
			}
		}

		await db.SaveChangesAsync();

		return TypedResults.NoContent();
	}

	public static async Task<IResult> DeleteWorkout(int id, ClaimsPrincipal principal, ProjectDb db)
	{
		var userId = GetUserId(principal);

		var workout = await db.Workouts.FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

		if (workout is null)
			return TypedResults.NotFound();

		db.Workouts.Remove(workout);
		await db.SaveChangesAsync();
		return TypedResults.NoContent();
	}
}