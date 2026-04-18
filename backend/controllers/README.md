# Controllers

This folder is reserved for controller modules in the backend architecture.

Current implementation keeps route handlers directly inside files in `routes/`
to avoid breaking the existing API while the project is being refactored.

Next step (optional): move each route handler into a dedicated controller file
and import those handlers in `routes/*.routes.js`.
