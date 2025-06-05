# LeetCode Data Setup for Supabase

This directory contains scripts and utilities to fetch LeetCode problems and store them in your Supabase database for fast local access in your CodeOnTheGo app.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/src/leetcode-setup
npm install
```

### 2. Configure Environment

Copy the example config and fill in your Supabase credentials:

```bash
cp config.example.env .env
```

Edit `.env` with your Supabase details:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Setup Database

```bash
npm run setup
```

### 4. Test Everything

```bash
npm run test-connection
```

### 5. Populate with Problems

```bash
# Test with 10 problems first
npm run populate -- --test

# If successful, populate all problems (basic info only)
npm run populate

# Or populate with full details (slower but complete)
npm run populate -- --with-details
```

## 📁 Project Structure

```
leetcode-setup/
├── package.json           # Dependencies and scripts
├── config.example.env     # Environment variables template
├── README.md             # This file
├── 
├── config/
│   └── database.js       # Supabase configuration and schema
├── 
├── types/
│   └── leetcode.js       # Type definitions and constants
├── 
├── utils/
│   └── leetcode-client.js # LeetCode API client with rate limiting
├── 
└── scripts/
    ├── setup-database.js      # Initialize database schema
    ├── populate-problems.js   # Fetch and store all problems
    ├── sync-new-problems.js   # Update with new problems
    └── test-connection.js     # Test database and API connections
```

## 🔧 Available Scripts

### `npm run setup`
Creates the database table and indexes. Run this first.

### `npm run test-connection`
Tests your database connection and LeetCode API access.

### `npm run populate [options]`
Fetches LeetCode problems and stores them in your database.

**Options:**
- `--test` - Only fetch 10 problems for testing
- `--limit=N` - Limit to N problems
- `--with-details` - Include full descriptions, examples, constraints, hints

**Examples:**
```bash
npm run populate -- --test
npm run populate -- --limit=100
npm run populate -- --with-details
```

### `npm run sync [options]`
Checks for new problems and adds them to your database.

**Options:**
- `--dry-run` - Show what would be synced without making changes
- `--force` - Skip confirmation prompts
- `--with-details` - Also update existing problems with full details

**Examples:**
```bash
npm run sync -- --dry-run
npm run sync -- --force
npm run sync -- --with-details
```

## 📊 Database Schema

The script creates a `leetcode_problems` table with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-generated primary key |
| `leetcode_id` | INTEGER | LeetCode problem ID (unique) |
| `title` | TEXT | Problem title |
| `slug` | TEXT | URL-friendly slug |
| `difficulty` | TEXT | Easy, Medium, or Hard |
| `description` | TEXT | Problem description (HTML) |
| `description_text` | TEXT | Problem description (plain text) |
| `examples` | JSONB | Array of example inputs/outputs |
| `constraints` | TEXT[] | Problem constraints |
| `hints` | TEXT[] | Problem hints |
| `tags` | TEXT[] | Problem categories/topics |
| `acceptance_rate` | DECIMAL | Success rate percentage |
| `likes` | INTEGER | Number of likes |
| `dislikes` | INTEGER | Number of dislikes |
| `is_premium` | BOOLEAN | Whether problem requires LeetCode Premium |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

## 🔄 Data Flow

1. **Fetch from LeetCode**: Scripts use the `leetcode-query` npm package
2. **Rate Limiting**: Respects LeetCode's API limits (20 req/10sec by default)
3. **Transform Data**: Converts to your app's format
4. **Store in Supabase**: Batch inserts for efficiency
5. **Your App**: Queries Supabase directly for instant loading

## ⚡ Performance Tips

### Initial Population
- **Basic Info Only**: ~5-10 minutes for all problems
- **With Details**: 2-3 hours for all problems (due to rate limiting)

### Recommended Strategy
1. Start with basic info: `npm run populate`
2. Add details for popular problems as needed
3. Set up weekly sync: `npm run sync`

### Rate Limiting
- Default: 500ms between requests (2 req/sec)
- Configurable via `LEETCODE_RATE_LIMIT_DELAY` environment variable
- Built-in retry logic with exponential backoff

## 🔐 Security

- Uses Supabase Service Role Key for admin operations
- Keep your `.env` file secure and never commit it
- Consider using environment-specific configurations

## 🚨 Troubleshooting

### "Table does not exist"
```bash
npm run setup
```

### "Connection failed"
- Check your Supabase URL and keys in `.env`
- Verify your Supabase project is active

### "Rate limited"
- The scripts handle this automatically
- You can adjust `LEETCODE_RATE_LIMIT_DELAY` if needed

### "Some problems failed to insert"
- Usually due to temporary network issues
- Re-run the same command, it will skip existing problems

## 📱 Using in Your App

After populating, update your React Native app to query Supabase instead of hardcoded data:

```typescript
// Instead of hardcoded problems array
const { data: problems } = await supabase
  .from('leetcode_problems')
  .select('id, leetcode_id, title, difficulty')
  .order('leetcode_id');

// For specific problem details
const { data: problem } = await supabase
  .from('leetcode_problems')
  .select('*')
  .eq('leetcode_id', problemId)
  .single();
```

## 🔄 Maintenance

### Weekly Sync (Recommended)
Set up a cron job or GitHub Action to run:
```bash
npm run sync -- --force
```

### Monthly Full Update
```bash
npm run sync -- --with-details --force
```

## 📈 Monitoring

The scripts provide detailed logging:
- Progress indicators
- Rate limiting statistics
- Error handling and retry information
- Final summaries with counts and timing

## 🤝 Contributing

Feel free to enhance these scripts:
- Add support for LeetCode China (leetcode.cn)
- Implement more sophisticated error handling
- Add data validation and cleanup
- Create additional utility scripts

---

## 📋 Checklist

- [ ] Install dependencies
- [ ] Configure `.env` file
- [ ] Run database setup
- [ ] Test connections
- [ ] Populate problems (test first)
- [ ] Update your React Native app
- [ ] Set up periodic sync 