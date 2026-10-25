# ApplyFlow

ApplyFlow is a single Spring Boot application for keeping job applications, interview stages, follow-up dates and outcomes together. The backend serves the HTML, CSS and JavaScript as well as the JSON API. It uses Java 21, Spring Web, Spring Data JPA, H2, Maven and JUnit 5.

## Project structure

```text
applyflow/
├── pom.xml
├── src/main/java/com/applyflow/
│   ├── ApplyFlowApplication.java
│   └── application/
│       ├── ApplicationController.java    # REST routes
│       ├── ApplicationService.java       # Filtering, rules and dashboard totals
│       ├── JobApplication.java           # JPA database record
│       ├── JobApplicationRepository.java  # Database queries
│       ├── *Request.java                  # Validated API input
│       ├── *Response.java                 # API output shapes
│       ├── DashboardController.java
│       ├── ApiExceptionHandler.java       # Consistent JSON errors
│       └── DemoData.java                  # Small local sample dataset
├── src/main/resources/
│   ├── application.properties
│   └── static/                            # Browser interface served by Spring
│       ├── index.html
│       ├── styles.css
│       └── app.js
└── src/test/java/com/applyflow/
    └── ApplicationApiTest.java
```

## Run locally

Install a Java 21 JDK and Maven, then from this folder run:

```bash
mvn spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). The first run creates a local H2 database in `data/` and inserts six example applications when the database is empty. The records are examples; delete or edit them to start using your own data. The H2 browser is at [http://localhost:8080/h2-console](http://localhost:8080/h2-console), using JDBC URL `jdbc:h2:file:./data/applyflow`, username `sa`, and a blank password.

## Build stages

The project is structured so the app is runnable at every stage:

1. **Spring scaffold:** Maven project, Java entry point and a static page served by Spring Boot.
2. **Backend and database:** JPA entity/repository, H2 configuration, DTOs, service rules and CRUD API.
3. **Website and API connection:** responsive browser interface, form and list backed by the REST endpoints.
4. **Workflow views:** company/role search, stage filter, computed dashboard totals, upcoming follow-ups and a drag-and-drop status board.
5. **Finishing:** JUnit integration tests, demo data and this setup/API guide.

The dashboard also includes a **Momentum cue**: it selects the nearest active follow-up (including overdue reminders), shows the role's stage path, and opens that application so you can update the plan. If nothing is scheduled, it points you toward an active role where you can set a reminder. This is a small workflow idea specific to ApplyFlow, built from the dates and stages you already track.

## Beginner-friendly code map

An HTTP request reaches a **controller**, which is the entry point for an API route. The controller passes work to `ApplicationService`, where filtering, date rules and summary counts live. The service uses `JobApplicationRepository` to save or find `JobApplication` records in H2. Request DTOs validate incoming JSON; response DTOs keep database details out of the API. `ApiExceptionHandler` turns validation problems and missing IDs into the same readable JSON shape. The JavaScript calls these routes and turns the returned data into the list, follow-up strip and board.

## API examples

Create an application:

```bash
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{"company":"Northstar","roleTitle":"Product Designer","jobLink":"https://example.com/jobs/1","applicationDate":"2026-10-20","status":"APPLIED","notes":"Prepare a portfolio walkthrough","followUpDate":"2026-10-27"}'
```

List and search (search matches company or role, without case sensitivity):

```text
GET /api/applications
GET /api/applications?q=designer
GET /api/applications?status=INTERVIEW
GET /api/applications?q=north&status=APPLIED
GET /api/applications/{id}
```

Create and update accept `company`, `roleTitle`, `applicationDate` and `status`; `jobLink`, `notes` and `followUpDate` are optional. Dates use `YYYY-MM-DD`. Application dates cannot be in the future; a follow-up cannot be earlier than the application date. Status values are `WISHLIST`, `APPLIED`, `INTERVIEW`, `OFFER` and `REJECTED`.

```text
PUT    /api/applications/{id}          # Replace editable application details
PATCH  /api/applications/{id}/status   # Body: {"status":"INTERVIEW"}
DELETE /api/applications/{id}
GET    /api/dashboard
```

The dashboard returns `totalApplications`, `interviews`, `offers`, `followUpsDue` (due today or overdue), and `upcomingFollowUps` (follow-ups due within the next seven days). Errors use one shape, for example:

```json
{
  "timestamp": "2026-10-24T10:00:00Z",
  "status": 400,
  "error": "Validation failed",
  "message": "Check the highlighted fields and try again",
  "fields": { "company": "Company is required" }
}
```

## Run the tests

```bash
mvn test
```

The API integration tests use a temporary in-memory H2 database and check create/read/search, status changes, deletion, validation errors and dashboard totals. The normal app uses the local file database, so its demo and personal records persist between runs.
