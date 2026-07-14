# Workers (Render Cron)

Standalone entrypoints for scheduled jobs — primarily feed polling. Kept
separate so a worker failure can never take down the web app. Not built in v1.
