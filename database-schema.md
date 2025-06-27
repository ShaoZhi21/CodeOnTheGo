# Database Schema Reference

## Tables

### user_problem_progress
- `user_id` (uuid) - References auth.users
- `problem_id` (integer) - LeetCode problem ID
- `is_solved` (boolean) - Whether problem is completed
- `stars` (integer) - Star rating (1-5)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### user_lesson_completion
- `user_id` (uuid) - References auth.users
- `problem_id` (integer) - LeetCode problem ID
- `quiz_completed` (boolean) - Whether quiz is completed
- `quiz_score` (integer) - Quiz score (0-100)
- `completed_at` (timestamp)

### user_profiles
- `user_id` (uuid) - References auth.users
- `skill_level` (text) - 'Beginner', 'Intermediate', 'Advanced'
- `created_at` (timestamp)
- `updated_at` (timestamp)

### topics
- `id` (integer) - Primary key
- `name` (text) - Topic name
- `description` (text) - Topic description

### problems
- `leetcode_id` (integer) - LeetCode problem ID
- `title` (text) - Problem title
- `difficulty` (text) - 'Easy', 'Medium', 'Hard'
- `description` (text) - Problem description
- `topic_id` (integer) - References topics.id

## Common Queries

### Check user progress
```sql
SELECT * FROM user_problem_progress 
WHERE user_id = 'user-uuid' AND problem_id = 1;
```

### Check lesson completion
```sql
SELECT * FROM user_lesson_completion 
WHERE user_id = 'user-uuid' AND problem_id = 1;
```

### Get user skill level
```sql
SELECT skill_level FROM user_profiles 
WHERE user_id = 'user-uuid';
```

### Get problems by topic
```sql
SELECT p.* FROM problems p
JOIN topics t ON p.topic_id = t.id
WHERE t.name = 'Arrays';
``` 