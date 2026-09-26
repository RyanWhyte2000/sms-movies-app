# Sequence diagrams

Each application interaction is documented as an individual Mermaid sequence
diagram so that it can be reviewed and changed independently.

1. [Browse and search the catalogue](01-browse-and-search-catalogue.md)
2. [View movie details](02-view-movie-details.md)
3. [Sign in](03-sign-in.md)
4. [Register an account](04-register-account.md)
5. [Save or update a personal rating](05-save-or-update-rating.md)
6. [Remove a personal rating](06-remove-rating.md)
7. [Track a click event](07-track-click-event.md)

The application API calls are same-origin requests from the browser. Next.js
proxies them to the Spring Boot backend, while click analytics are handled by a
dedicated Next.js route and stored separately in Supabase.

