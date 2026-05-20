# Deployment

## Frontend

- Build with `npm run build`
- Deploy to Vercel or Netlify using the `frontend/` directory
- Set `VITE_API_URL` to the backend public URL

## Backend

- Deploy to Railway, Render, or Heroku
- Use `backend/` as the deployment root
- Set environment variables from `.env`
- Run `npm install` and `npm start`

## Database

- Use managed MySQL
- Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`
- Run `npm run migrate` after deployment to sync schema
