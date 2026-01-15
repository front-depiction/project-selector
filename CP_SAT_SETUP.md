# CP-SAT Assignment Solver Setup

This project integrates with a CP-SAT based assignment algorithm for optimal student-to-topic matching. The algorithm is hosted as a separate service and called via HTTP.

## Prerequisites

1. **CP-SAT Service Repository**: Clone or have access to the [Assignment-CPSAT repository](https://github.com/hz3BbEGw/Assignment-CPSAT)
2. **uv**: The CP-SAT service requires [uv](https://github.com/astral-sh/uv) for Python package management

## Setup Steps

### 1. Clone and Setup CP-SAT Service

```bash
# Clone the CP-SAT service repository
git clone https://github.com/hz3BbEGw/Assignment-CPSAT.git
cd Assignment-CPSAT

# Install dependencies
uv sync
```

### 2. Start CP-SAT Service

Run the service in server mode:

```bash
uv run python -m src.assignment.main --serve
```

The service will start on `http://localhost:8000` by default. You can verify it's running by visiting `http://localhost:8000/docs` for API documentation.

### 3. Expose Local Service (Development Only)

**Important:** Convex actions run in the cloud and cannot reach `localhost`. For local development, you need to expose your local service using a tunneling tool.

#### Option A: Using ngrok (Recommended)

1. Install ngrok: https://ngrok.com/download
2. Expose your local service:
   ```bash
   ngrok http 8000
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Set it as an environment variable in Convex:
   ```bash
   npx convex env set CP_SAT_SERVICE_URL https://abc123.ngrok.io
   ```

#### Option B: Using Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:8000
```

#### Option C: Deploy the Service

Deploy the CP-SAT service to a public URL (Railway, Heroku, etc.) and use that URL.

### 4. Configure Environment Variable

**For Local Development (with tunneling):**

```bash
npx convex env set CP_SAT_SERVICE_URL https://your-ngrok-url.ngrok.io
```

**For Production/Deployment:**

1. Deploy the CP-SAT service to a public URL
2. Go to your Convex dashboard
3. Navigate to Settings → Environment Variables
4. Add: `CP_SAT_SERVICE_URL` with your deployed service URL

**Or via Convex CLI:**

```bash
npx convex env set CP_SAT_SERVICE_URL https://your-deployed-service.com
```

### 5. Test the Integration

1. Create a test project assignment in your app
2. Add some students with preferences
3. Try assigning students to topics
4. Check the Convex logs to see if CP-SAT service is being called

## How It Works

1. **When Assignment is Triggered**: Clicking "Assign Now" calls the `assignWithCPSAT` action
2. **CP-SAT Call**: The action attempts to call the CP-SAT solver via `assignmentSolver.solveAssignment`
3. **Data Transformation**: Student preferences, questionnaire answers, and topics are transformed into CP-SAT input format
4. **CP-SAT Processing**: The service optimizes assignments based on:
   - Student preferences (rankings)
   - Questionnaire answers (aggregated by category)
   - Group size constraints
   - Category-based criteria (e.g., ensuring diversity)
5. **Result Processing**: CP-SAT results are transformed back into assignments and saved via `saveCPSATAssignments` mutation
6. **Fallback**: If CP-SAT service is unavailable, the system automatically falls back to simple even distribution via `assignNow` mutation

## CP-SAT Input Format

The system automatically transforms your data into this format:

```json
{
  "num_students": 10,
  "num_groups": 2,
  "exclude": [],
  "groups": [
    {
      "id": 0,
      "size": 5,
      "criteria": {
        "Technical Skills": { "type": "constraint", "min_ratio": 0.2 }
      }
    }
  ],
  "students": [
    {
      "id": 0,
      "possible_groups": [0, 1],
      "values": { "Technical Skills": 0.8, "Soft Skills": 0.6 }
    }
  ]
}
```

## Customization

### Adjusting Criteria

Edit `convex/assignmentSolver.ts` in the `transformToCPSATFormat` function to customize:

- **Group sizes**: Currently set to even distribution
- **Category constraints**: Currently ensures 20% minimum per category
- **Optimization targets**: Can add `minimize` or `maximize` criteria

### Adding Student Exclusions

To prevent specific students from being in the same group, add to the `exclude` array in the transformation function.

## Troubleshooting

### Service Not Found

If you see errors about CP-SAT service being unavailable:

1. Verify the service is running: `curl http://localhost:8000/docs`
2. Check the `CP_SAT_SERVICE_URL` environment variable
3. Check Convex logs for detailed error messages

### Fallback Behavior

The system will automatically fall back to simple distribution if CP-SAT is unavailable. Check logs for warnings like:

```
CP-SAT solver unavailable, using simple distribution
```

### Testing Locally

1. Start CP-SAT service: `uv run python -m src.assignment.main --serve`
2. Start your Next.js app: `npm run dev`
3. The services should communicate automatically

## Production Deployment

For production, deploy the CP-SAT service to a hosting platform (Railway, Heroku, etc.) and set the `CP_SAT_SERVICE_URL` environment variable in Convex to point to your deployed service.

The CP-SAT service includes a `Dockerfile` and `railway.toml` for easy deployment.
