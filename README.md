# DesignStudio Backend

## Setup

1. **Create MySQL database**
```sql
CREATE DATABASE designstudio;
```

2. **Edit .env**
```
DB_PASSWORD=your_mysql_password
JWT_SECRET=a_long_random_secret
```

3. **Install & run**
```bash
npm install
npm run migrate    # Creates tables + seeds fonts
npm run dev        # Starts dev server on :3000
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login, returns JWT
- `GET  /api/auth/me` — Get current user (auth required)

### Projects
- `GET    /api/projects` — List user projects
- `POST   /api/projects` — Create project
- `GET    /api/projects/:id` — Get one project (with canvas_data)
- `PUT    /api/projects/:id` — Update (title, canvas_data, thumbnail)
- `DELETE /api/projects/:id` — Delete
- `POST   /api/projects/:id/duplicate` — Duplicate

### Templates
- `GET /api/templates` — List all (no canvas_data in list)
- `GET /api/templates/:id` — Get one (with canvas_data)

### Other
- `GET /api/backgrounds` — Backgrounds
- `GET /api/assets?type=&category=&search=` — Assets
- `GET /api/fonts` — Fonts
- `GET /api/admin/dashboard` — Stats (admin only)
- `GET /api/admin/users` — User list (admin only)
